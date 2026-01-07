1. Function Search Path Mutable
security

Entity
public.populate_poll_from_json
Issue
Function public.populate_poll_from_json has a role mutable search_path.:

#Description
Detects functions where the search_path parameter is not set.

*** This is a **very common Supabase / Postgres warning**, and it’s good you noticed it. Let’s break it down clearly and practically.

---

## What this warning means (plain English)

PostgreSQL functions run with a **`search_path`**, which tells Postgres **where to look first** when resolving table names, functions, extensions, etc.

Your function:

```
public.populate_poll_from_json
```

does **not explicitly set** its `search_path`.

That means:

* It will **inherit the caller’s search_path**
* And that search_path **can change depending on role or context**

Supabase flags this as a **security warning**, not a syntax or runtime error.

---

## Why Supabase considers this a risk

If **all of these are true**, it *can* be exploited:

1. The function runs as `SECURITY DEFINER`
2. The function references objects **without schema qualification**

   ```sql
   INSERT INTO polls ...
   ```

   instead of:

   ```sql
   INSERT INTO public.polls ...
   ```
3. A malicious role can manipulate `search_path` to point to a fake object
4. The function runs with higher privileges than the caller

This is called a **search_path hijack**.

⚠️ Important:
If **any of the above is false**, the risk drops significantly.

---

## Should you fix it or leave it?

### ✅ **You should FIX it** if:

* The function is `SECURITY DEFINER`
* The function is called from:

  * RPC endpoints
  * Client apps
  * Edge functions
* It inserts/updates **critical data** (polls, votes, ratings)

Given your app:

* Poll creation affects **public trust, ratings, and political data**
* Functions like `populate_poll_from_json` are likely RPC-facing

👉 **Fixing is strongly recommended**

---

### 🟡 You can *technically* leave it if:

* Function is `SECURITY INVOKER` (default)
* Only called internally
* All objects are already schema-qualified
* MVP or dev-only environment

But even then — **fixing is low effort and best practice**.

---

## How to fix it (recommended solution)

### 🔒 Best practice fix (simple & safe)

Explicitly set the search path inside the function:

```sql
CREATE OR REPLACE FUNCTION public.populate_poll_from_json(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- function body
END;
$$;
```

Or, if already created:

```sql
ALTER FUNCTION public.populate_poll_from_json(...)
SET search_path = public;
```

✅ This:

* Locks object resolution to `public`
* Prevents hijacking
* Clears the Supabase warning

---

## Extra hardening (optional but excellent)

Inside the function body:

* **Always schema-qualify tables**

  ```sql
  INSERT INTO public.polls ...
  ```
* Avoid relying on implicit resolution

This makes your function safe **even if someone forgets the SET search_path later**.

---

## Risk level summary

| Aspect        | Rating                                  |
| ------------- | --------------------------------------- |
| Security risk | **Medium → High** (if SECURITY DEFINER) |
| Runtime risk  | Low                                     |
| Effort to fix | **Very low**                            |
| Should fix?   | **Yes** ✅                               |

---

## Supabase-specific note

Supabase highlights this because:

* RPC functions are exposed via PostgREST
* Attack surface is larger than vanilla Postgres
* RLS + SECURITY DEFINER is a sensitive combo

They are **right to warn you** here.

---

### Bottom line

👉 **Fix it.**
It’s a one-line change, eliminates a real class of exploits, and aligns with Supabase security expectations.



2. Function Search Path Mutable
security

Entity
public.update_updated_at_column
Issue
Function public.update_updated_at_column has a role mutable search_path

Description
Detects functions where the search_path parameter is not set.:

*** This one is **very familiar** — it’s the classic Supabase / Postgres **timestamp trigger function** warning.

Short answer first 👇
**You *can* leave this, but it’s still best practice to fix it.**
It’s **low risk**, unlike your poll function.

Let’s go step-by-step.

---

## What this function usually is

`public.update_updated_at_column` is almost always this function (or extremely close):

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

And used like:

```sql
CREATE TRIGGER update_x_updated_at
BEFORE UPDATE ON public.some_table
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Why Supabase flags it

Same reason as before:

* No explicit `SET search_path`
* Postgres defaults to caller’s search path
* Supabase scanner is **generic**, not context-aware

But **context matters** a lot here.

---

## Real risk analysis (important)

### 🔐 Can this function be exploited?

**Practically: no.**

Why:

* It **does not access tables**
* It **does not run dynamic SQL**
* It **only modifies `NEW`**
* It does **not resolve any object names**
* It’s almost never `SECURITY DEFINER`
* It runs **inside a trigger context**

There is **nothing to hijack** via `search_path`.

---

## Should you fix it?

### ✅ Recommended (clean & correct)

Yes — because:

* It silences the warning
* It’s a 1-line fix
* It aligns with best practice
* It avoids audit noise later

### 🟡 Safe to leave (common in production)

Also yes — many production Supabase projects leave this unfixed without any real-world issue.

---

## How to fix it (best practice)

### Preferred fix

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

Or if it already exists:

```sql
ALTER FUNCTION public.update_updated_at_column()
SET search_path = public;
```

That’s it.

---

## Risk level summary

| Aspect            | Rating              |
| ----------------- | ------------------- |
| Security risk     | **Low**             |
| Exploitability    | **Very low / none** |
| Production impact | None                |
| Fix effort        | **Trivial**         |
| Should fix?       | **Nice-to-have** ✅  |

---

## Recommendation for your project

Given:

* You’re building a **large, modular Supabase backend**
* You already have real **SECURITY DEFINER RPCs**
* You care about **clean security posture**

👉 **Fix it for consistency**, but **don’t lose sleep over it**.

---

## Rule of thumb (useful going forward)

### 🔴 Always fix immediately

* `SECURITY DEFINER` + table access
* RPC-exposed functions
* Functions inserting/updating sensitive data

### 🟡 Fix when convenient

* Trigger helpers (`updated_at`)
* Utility functions
* No table lookups


3. Extension in Public
security

Entity
public.pg_trgm
Issue
Extension pg_trgm is installed in the public schema. Move it to another schema.

Description
Detects extensions installed in the public schema.:

*** This is another **very common Supabase security warning**, and unlike the trigger one, this has **real architectural implications** — but the *actual risk* depends on how you use `pg_trgm`.

Let’s unpack it carefully.

---

## What this warning means (plain English)

The PostgreSQL extension **`pg_trgm`** (used for fuzzy text search / similarity) is installed in the **`public` schema**:

```
public.pg_trgm
```

Supabase warns because:

* The `public` schema is often **writable or readable** by many roles
* Extensions create **functions and operators**
* If extensions live in `public`, they can interact badly with:

  * `search_path`
  * `SECURITY DEFINER` functions
  * Poorly configured grants

---

## Why Supabase flags this as a security issue

In theory:

* Objects in `public` are easier to reference implicitly
* Combined with a mutable `search_path`, extension functions could be:

  * Shadowed
  * Misused
  * Accidentally exposed

This is a **defense-in-depth warning**, not a guaranteed vulnerability.

---

## Reality check (important)

### 🚨 Is this an active vulnerability?

**No — not by itself.**

* `pg_trgm` is a **trusted, read-only extension**
* It does not write data
* It does not escalate privileges
* It does not create tables or triggers

Most Supabase projects **leave pg_trgm in public**.

---

## Should you move it?

### ✅ You SHOULD move it if:

* You use **many SECURITY DEFINER functions**
* You allow **untrusted SQL execution**
* You want a **clean audit / compliance posture**
* You are building a **long-lived production system**

### 🟡 You can safely leave it if:

* You only use it for:

  * `GIN` / `GiST` indexes
  * `similarity()`, `%`, `<->`
* You don’t expose raw SQL execution to users
* This is MVP / early production

Given your project scale and longevity:
👉 **Recommended to fix**, but **not urgent**

---

## How to fix it properly (recommended)

### 1️⃣ Create a dedicated extensions schema

```sql
CREATE SCHEMA IF NOT EXISTS extensions;
```

### 2️⃣ Move the extension

```sql
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
```

That’s it.

Postgres will:

* Move all functions/operators safely
* Preserve existing indexes
* Not break queries

---

## What about existing indexes?

✅ **Safe**

* `GIN`/`GiST` trigram indexes continue working
* Operator resolution still works via `search_path`

---

## Important follow-up (very important)

After moving the extension, make sure your DB roles can still see it:

```sql
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
```

Supabase usually handles this automatically, but it’s worth verifying.

---

## Risk level summary

| Aspect                 | Rating                |
| ---------------------- | --------------------- |
| Actual exploit risk    | **Low**               |
| Defense-in-depth value | **Medium**            |
| Production break risk  | Low                   |
| Fix effort             | **Low**               |
| Should fix?            | **Yes (recommended)** |

---

## Supabase-specific context

Supabase flags this because:

* Many apps use `SECURITY DEFINER`
* `public` is often over-permissive
* Extensions + mutable search_path = bad combo *in theory*

They’re nudging you toward **best-practice Postgres hygiene**.

---

## Final recommendation for your backend

Based on:

* Your modular backend
* Heavy use of RPC
* Long-term production intent

👉 **Move `pg_trgm` out of `public`**
👉 **Set `search_path` explicitly on all SECURITY DEFINER functions**

This combination:

* Eliminates an entire class of warnings
* Hardens your backend properly
* Keeps Supabase security scans clean


4. RLS Policy Always True
security

Entity
public.post_views
Issue
Table public.post_views has an RLS policy Users can record views for INSERT that allows unrestricted access (WITH CHECK clause is always true). This effectively bypasses row-level security for -.

Description
Detects RLS policies that use overly permissive expressions like USING (true) or WITH CHECK (true) for UPDATE, DELETE, or INSERT operations. SELECT policies with USING (true) are intentionally excluded as this pattern is often used deliberately for public read access.:

*** This is an **important warning** — not theoretical, not cosmetic.
It means **RLS is effectively disabled for INSERT on this table**.

Let’s be very clear and precise.

---

## What this warning means (plain English)

Your table:

```
public.post_views
```

has an RLS policy like:

```sql
CREATE POLICY "Users can record views"
ON public.post_views
FOR INSERT
WITH CHECK (true);
```

That means:

* **Any role that can reach the table can insert anything**
* No user binding
* No ownership check
* No relationship to the post being viewed

This **bypasses RLS entirely for INSERT**.

Supabase is 100% correct to flag this.

---

## Why this is dangerous (real impact)

### 🚨 What a malicious client can do

Anyone can:

* Insert **fake views**
* Spam millions of rows
* Inflate engagement
* Poison analytics
* Cause storage bloat
* Trigger downstream logic (feeds, rankings, trending)

And they can do it:

* Without being logged in (if `anon` has access)
* From a script
* Without touching your app

---

## Is this *ever* acceptable?

### 🟡 Only acceptable if ALL of these are true:

* `post_views` is:

  * Non-authoritative
  * Non-billable
  * Non-ranking
* You already:

  * De-duplicate aggressively
  * Aggregate defensively
  * Ignore raw counts
* You treat it as **best-effort telemetry**

Even then — **it should still be constrained**.

---

## Your app context (important)

Given your system:

* Views affect **engagement scoring**
* Engagement affects **home feed ranking**
* You care about **political manipulation**
* You have offline + realtime sync

👉 This is **NOT safe to leave as-is**.

This is a **MUST FIX**.

---

## How this usually happens

Developers often do this intentionally to:

* Allow anonymous view tracking
* Avoid blocking UX
* Reduce friction

That’s fine — but **you must still bind the insert to something real**.

---

## Correct ways to fix it (choose one)

### ✅ Option 1: Bind view to authenticated user (recommended)

```sql
WITH CHECK (
  auth.uid() IS NOT NULL
)
```

And also:

```sql
user_id = auth.uid()
```

Full example:

```sql
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
)
```

This alone eliminates abuse.

---

### ✅ Option 2: Allow anon views, but constrain them

If you allow anonymous viewing:

```sql
WITH CHECK (
  post_id IS NOT NULL
)
```

But **this is still weak** unless combined with:

* Unique constraints
* Rate limiting
* De-duplication

---

### ✅ Option 3: One view per user per post (best practice)

Add a unique constraint:

```sql
UNIQUE (post_id, user_id)
```

And policy:

```sql
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
)
```

This is the **gold standard**.

---

### ✅ Option 4: Move views to a SECURITY DEFINER RPC (advanced)

* Disable direct INSERT
* Expose a function like `record_post_view(post_id)`
* Apply:

  * Dedup logic
  * Rate limiting
  * Time windows

Best for high-scale feeds.

---

## What NOT to do ❌

* ❌ Leave `WITH CHECK (true)`
* ❌ Rely on client honesty
* ❌ Assume “views don’t matter”
* ❌ Aggregate raw rows without safeguards

---

## Risk level summary

| Aspect              | Rating                   |
| ------------------- | ------------------------ |
| Security risk       | **High**                 |
| Data integrity risk | **High**                 |
| Abuse potential     | **Very High**            |
| Fix effort          | Medium                   |
| Should fix?         | **YES – immediately** 🚨 |

---

## Supabase warning verdict

> “This effectively bypasses row-level security”

This is **accurate**.
This is not noise.
This is not theoretical.

---

## Final recommendation for your backend

👉 **Fix this now**

At minimum:

* Bind inserts to `auth.uid()`
* Add uniqueness constraints

Ideally:

* Use a controlled RPC for view recording