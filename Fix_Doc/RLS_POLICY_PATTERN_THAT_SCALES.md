## 0. The One Rule That Prevents RLS Collapse

> **RLS should answer only one question:**
> **“Is this user allowed to access this row?”**

❌ RLS should NOT:

* Implement business logic
* Calculate scores
* Decide feed ranking
* Handle side effects
* Encode feature interactions

If we remember only one thing:
**RLS = access, not behavior.**

---

## 1. Schema-Level Separation (Critical)

### Use schema boundaries intentionally

```
public      → client-readable via RLS
private     → edge functions only
internal    → system / cron / analytics
```

### Why this matters

* RLS complexity grows *per schema*
* Private schemas don’t need RLS
* You stop writing “god policies”

**Golden rule**

> If a table needs more than 4 policies, question the schema.

---

## 2. Ownership-First Pattern (The Backbone)

Every user-generated table should have **one canonical owner column**.

```
owner_id UUID NOT NULL
```

### Base policies (copy everywhere)

```sql
-- SELECT
USING (owner_id = auth.uid())

-- INSERT
WITH CHECK (owner_id = auth.uid())

-- UPDATE
USING (owner_id = auth.uid())

-- DELETE
USING (owner_id = auth.uid())
```

### Why this never collapses

* Predictable
* Testable
* Feature-agnostic
* Composable with exceptions

We can add *exceptions* later without rewriting ownership.

---

## 3. Visibility-Based Access (Instead of Joins)

Never write RLS that depends on **deep joins**.

### ❌ Fragile pattern

```sql
USING (
  EXISTS (
    SELECT 1 FROM followers f
    JOIN blocks b ON ...
    JOIN mutes m ON ...
  )
)
```

This will break.

---

### ✅ Stable pattern: **visibility enum**

```
visibility ENUM ('public', 'followers', 'private')
```

Store visibility on the row.

### RLS example

```sql
USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR (
    visibility = 'followers'
    AND EXISTS (
      SELECT 1 FROM followers
      WHERE follower_id = auth.uid()
      AND following_id = owner_id
    )
  )
)
```

**Why this works**

* Visibility logic is localized
* Easy to extend (muted, circles, lists)
* Joins are shallow and indexed

---

## 4. “Actor vs Subject” Pattern (For Interactions)

For tables like:

* likes
* reactions
* ratings
* votes

Use **actor_id**, not owner_id.

```
actor_id UUID NOT NULL
subject_id UUID NOT NULL
```

### RLS rules

```sql
USING (actor_id = auth.uid())
WITH CHECK (actor_id = auth.uid())
```

### Why this scales

* No ambiguity
* Prevents impersonation
* Easy to revoke or anonymize later

This is **essential** for your anonymized reactions system.

---

## 5. Read Public, Write Private Pattern

Used for:

* reaction aggregates
* counters
* reputation
* feed cache

### Example: `reaction_aggregates`

```
post_id
like_count
dislike_count
```

### Policies

```sql
-- Anyone can read
USING (true)

-- Nobody can write from client
WITH CHECK (false)
```

### Writes only via:

* Edge Functions
* Triggers
* Jobs

This prevents:

* Counter poisoning
* Race conditions
* Client abuse

---

## 6. Denormalize for RLS, Not for Speed

This is subtle but powerful.

### Example: comments

Instead of:

```
comments → posts → visibility
```

Store:

```
comments.post_visibility
comments.post_owner_id
```

### Why?

* RLS doesn’t need joins
* Policies stay readable
* Visibility stays consistent even if post changes

**RLS likes denormalization.**

---

## 7. Negative Access Tables (Blocks & Mutes)

Never inline block logic everywhere.

### Tables

```
blocks (blocker_id, blocked_id)
mutes  (muter_id, muted_id)
```

### Pattern

Use a **single NOT EXISTS clause**, everywhere.

```sql
AND NOT EXISTS (
  SELECT 1 FROM blocks
  WHERE blocker_id = owner_id
  AND blocked_id = auth.uid()
)
```

### Why this doesn’t collapse

* Centralized logic
* Indexed
* Copy-paste safe
* Easy to cache later

---

## 8. Moderation Override Pattern

You *will* need this later.

### Add:

```
is_hidden BOOLEAN DEFAULT false
hidden_reason TEXT
```

### RLS

```sql
USING (
  is_hidden = false
  OR owner_id = auth.uid()
)
```

### Moderator access

Handled via:

* service_role
* Edge Functions
* separate admin schema

**Never embed role checks deep in RLS.**

---

## 9. Soft Deletes Only

Never hard-delete user content.

```
deleted_at TIMESTAMP NULL
```

### RLS

```sql
USING (
  deleted_at IS NULL
  OR owner_id = auth.uid()
)
```

### Why

* Recovery
* Auditing
* Legal compliance
* Feed stability

---

## 10. One Policy Per Intent (Readability Rule)

Bad:

```sql
USING (
  complex AND unreadable OR logic
)
```

Good:

```
SELECT_own_rows
SELECT_public_rows
SELECT_followers_rows
```

Supabase evaluates them as OR.

This is how you:

* Debug faster
* Add features safely
* Avoid regressions

---

## 11. What NEVER Goes in RLS ❌

Do **not** put these in RLS:

* Ranking logic
* Time decay
* Token rewards
* Quotas
* Invitation limits
* Analytics
* Notifications

Those belong in:

* Edge Functions
* Jobs
* Private schemas

---

## 12. RLS Mental Model (Memorize This)

> **RLS is a firewall, not a brain.**

If a policy starts to feel “smart”, it’s wrong.