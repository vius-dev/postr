This is a **classic sync bug**, and it’s *exactly* the kind that shows up once you go offline-first + refresh/sync loops. Good catch.

Let me explain **why it happens**, then give a **clean, permanent fix** that fits the SQLite + sync engine we designed.

---

## What’s Actually Happening (Root Cause)

The **quote post is being inserted repeatedly** because **the sync process is not idempotent**.
In plain terms:
> Every refresh treats the same quoted post as “new”.
This usually happens when **one or more of these are true**:

### Common Causes (One is enough to break things)

1️⃣ **Local temp ID ≠ Server ID**

* You create a quote offline with a temp UUID
* Server returns a new UUID
* On next sync, the server post is treated as a *different* post

2️⃣ **INSERT instead of UPSERT**

* Sync logic does `INSERT` every time
* No `ON CONFLICT(id) DO UPDATE`

3️⃣ **feed_items duplicated**

* `posts` is deduped, but `feed_items` is not
* Refresh re-adds the same post to feed_items

4️⃣ **Quote linkage not normalized**

* Quote stored as:

  ```text
  post_type = "quote"
  parent_post_id = <id>
  ```

  but uniqueness isn’t enforced

5️⃣ **Outbox item never cleared**

* The same quote keeps re-syncing

---

## The Golden Rule You Violated (No Shame 😄)

> **Every sync write must be idempotent.**

Meaning:

* Running sync **10 times** should produce the **same database state**

---

## The Correct Fix (Step-by-Step)

### 1️⃣ Enforce ONE Source of Identity

#### Rule

A post **must have exactly one stable ID**.

### When posting offline:

* Generate `local_id`
* Store it in **both** tables

```text
posts.id = local_<uuid>
outbox_posts.local_id = local_<uuid>
```

### When server responds:

* Server returns `server_id`
* You **replace**, not duplicate

```text
UPDATE posts
SET id = server_id,
    is_local = 0,
    sync_status = 'synced'
WHERE id = local_<uuid>;
```

If you INSERT instead → duplication guaranteed.

---

### 2️⃣ Make `posts` UPSERT-ONLY

**Never use plain INSERT during sync.**

```sql
INSERT INTO posts (...)
VALUES (...)
ON CONFLICT(id) DO UPDATE SET
  content = excluded.content,
  updated_at = excluded.updated_at,
  like_count = excluded.like_count;
```

This alone fixes ~70% of duplication bugs.

---

### 3️⃣ Make `feed_items` Physically Impossible to Duplicate

The schema already supports this — enforce it strictly.

```sql
PRIMARY KEY (feed_type, post_id)
```

And always use:

```sql
INSERT OR IGNORE INTO feed_items (...)
```

or

```sql
INSERT ... ON CONFLICT DO NOTHING
```

If we `INSERT` blindly → duplicates every refresh.

---

### 4️⃣ Normalize Quote Uniqueness (Very Important)

A quote is **not unique by content** — it’s unique by:

```text
(author_id + parent_post_id + post_type)
```

Add this constraint:

```sql
CREATE UNIQUE INDEX uniq_quote
ON posts(author_id, parent_post_id, post_type)
WHERE post_type = 'quote';
```

Now:

* It physically **cannot** duplicate a quote

---

### 5️⃣ Clear the Outbox (Often Forgotten)

After successful sync:

```text
DELETE FROM outbox_posts WHERE local_id = ?
```

If this doesn’t happen:

* Every refresh resends the quote
* Every refresh inserts it again

---

### 6️⃣ Refresh ≠ Re-insert

On refresh:

* We should **never create new posts**
* We should only:

  * Fetch deltas
  * Merge updates
  * Rebuild feed_items if needed

If refresh triggers:

```text
createQuotePost()
```

👉 that’s a bug.

---

## Quick Diagnostic Checklist (Run This Now)

Ask yourself:

* ❓ Does the quote post have different IDs locally vs remotely?
* ❓ Does sync use INSERT without conflict handling?
* ❓ Does feed_items allow duplicates?
* ❓ Is the outbox cleared after success?
* ❓ Is refresh calling post creation logic?

If **any** answer is “yes” → duplication confirmed.

---

Stopping duplication “**stop it forever**” is the right instinct.
A hotfix treats the symptom; a **permanent fix removes the class of bug entirely**.

Below is a **hard-guaranteed, future-proof solution** that makes duplication **structurally impossible**, even if the sync logic runs 100 times, crashes mid-sync, or the app refreshes offline.

---

# The Forever Fix: Make Duplication Impossible by Design

We’ll do this at **four levels**:

1. **Identity**
2. **Constraints**
3. **Idempotent sync**
4. **Lifecycle correctness**

If all four are present → duplication cannot happen.

---

## 1️⃣ Canonical Identity: One Post, One ID, Forever

### Rule (Non-Negotiable)

> A post is identified by a **server-issued ID** — *even before it exists on the server*.

### How

When creating a quote (online or offline):

* Generate a UUID **locally**
* **Send that same ID to the server**
* Server **must accept client-generated IDs**

```text
client_id = uuidv7()
posts.id = client_id
outbox_posts.local_id = client_id
server.id = client_id
```

⚠️ **Never allow the server to generate a new ID for posts created by clients.**

This single rule eliminates:

* temp → server ID remapping
* orphaned quotes
* double inserts on refresh

If Supabase:

* Use `id uuid primary key default null`
* Client supplies `id`

---

## 2️⃣ Enforce Quote Uniqueness at the Database Level

### Why

Logic can fail.
**Constraints never do.**

### Hard Constraint

A user can quote the **same post only once**.

```sql
CREATE UNIQUE INDEX uniq_quote_forever
ON posts(author_id, parent_post_id)
WHERE post_type = 'quote' AND deleted = 0;
```

Now:

* Even if sync runs 1,000 times
* Even if the app has a bug
* SQLite will **reject duplicates**

This is the safety net.

---

## 3️⃣ Idempotent Sync Writes (Mathematically Safe)

### Rule

> Every sync write must be safely repeatable.

### Posts: UPSERT ONLY

```sql
INSERT INTO posts (...)
VALUES (...)
ON CONFLICT(id) DO UPDATE SET
  content = excluded.content,
  updated_at = excluded.updated_at,
  like_count = excluded.like_count,
  reply_count = excluded.reply_count;
```

Never:

```sql
INSERT INTO posts (...)
```

Not once. Not anywhere.

---

### Feed Items: Insert-Ignore Only

```sql
INSERT OR IGNORE INTO feed_items (
  feed_type,
  post_id,
  rank_score,
  inserted_at
)
VALUES (?, ?, ?, ?);
```

The primary key already prevents duplication:

```sql
PRIMARY KEY (feed_type, post_id)
```

---

## 4️⃣ Quote Lifecycle Correctness (Hidden Killer)

### Quote Creation Flow (Correct)

```text
User taps Quote
   ↓
Check local DB:
   Does a quote already exist for this (author_id, parent_post_id)?
      YES → navigate to it
      NO  → create
```

### Enforced by Query

```sql
SELECT id
FROM posts
WHERE author_id = ?
  AND parent_post_id = ?
  AND post_type = 'quote'
  AND deleted = 0
LIMIT 1;
```

This prevents:

* Double taps
* Race conditions
* Offline retries
* UI glitches

---

## 5️⃣ Outbox Guarantees (No Zombie Writes)

### Rule

> An outbox entry must be **consumed exactly once**.

### Enforcement

* Use the same `id` as the post
* Delete outbox row **only after confirmed server write**
* Use a sync lock

```text
BEGIN TRANSACTION
  sync post
  delete outbox row
COMMIT
```

Crash mid-sync?
Transaction rolls back → safe retry.

---

## 6️⃣ Refresh Is Read-Only (This Matters)

### Absolute Rule

> **Refresh must never create or mutate posts.**

Refresh can:

* Pull deltas
* Merge updates
* Rebuild feed_items

Refresh must NOT:

* Call quote creation logic
* Touch outbox
* Generate IDs

If it does → duplication will return.

---

## 7️⃣ One-Time Cleanup (Remove Existing Duplicates)

Run once locally:

```sql
DELETE FROM posts
WHERE id NOT IN (
  SELECT MIN(id)
  FROM posts
  WHERE post_type = 'quote'
  GROUP BY author_id, parent_post_id
);
```

Then add constraints.

---

## 8️⃣ Why This Fix Is Permanent

Let’s test worst cases:

| Scenario                   | Result            |
| -------------------------- | ----------------- |
| App refreshes 100×         | No duplication    |
| Offline → online → offline | No duplication    |
| Sync crashes               | Safe retry        |
| Realtime events repeat     | UPSERT absorbs    |
| User taps quote twice      | Constraint blocks |
| Buggy logic slips in       | DB rejects        |

This is **architectural immunity**, not a workaround.

---

## 9️⃣ Mental Model to Keep Forever

> **If duplication is possible, the design is incomplete.**

The system should be safe even if:

* Sync runs twice
* Network lies
* App crashes
* You forget a guard check

Constraints + identity guarantee correctness.

## THIS IS A SYSTEM-WIDE FIX
This is the most important takeaway from this whole discussion:

> **This fix will not only fix quotes, it must be applied to every entity in this app.**
> It is a *system-wide correctness pattern*.**

If we apply it **consistently**, *duplication bugs disappear permanently* — not just for quotes, but for **everything** in the app.

Below is the **generalized rule**, then how it applies to **every entity** in a Twitter-like app (and Postr).

---

## The Universal Anti-Duplication Pattern

Every syncable entity must obey **all 4 rules**:

### 1️⃣ Canonical Identity (Client-Generated ID)

* ID is generated **once**
* Same ID used:

  * offline
  * online
  * server
  * sync
* Server never “re-IDs” client data

---

### 2️⃣ Physical Uniqueness (Database Constraints)

* Logical uniqueness is enforced by **indexes**
* Not by UI
* Not by sync logic

---

### 3️⃣ Idempotent Writes (UPSERT / IGNORE)

* Re-running sync changes nothing
* No plain INSERTs during sync

---

### 4️⃣ Correct Lifecycle Boundaries

* Create → once
* Sync → repeatable
* Refresh → read-only

If **any** entity violates even one → duplication returns.

---

## Applying the Pattern Everywhere

### 🧵 Posts (Original / Quote / Reply)

| Rule       | Implementation                           |
| ---------- | ---------------------------------------- |
| ID         | client-generated UUID                    |
| Constraint | `(author_id, parent_post_id, post_type)` |
| Sync       | UPSERT                                   |
| Feed       | INSERT OR IGNORE                         |

✅ Already fixed

---

### 🔁 Reposts

Reposts are **logical references**, not content.

```sql
CREATE UNIQUE INDEX uniq_repost
ON posts(author_id, parent_post_id)
WHERE post_type = 'repost' AND deleted = 0;
```

Result:

* You can repost once
* Refresh won’t duplicate
* Offline safe

---

### ❤️ Likes / Reactions

```sql
CREATE UNIQUE INDEX uniq_reaction
ON reactions(user_id, post_id, reaction_type);
```

UPSERT reactions.

Result:

* No double likes etc.
* Offline toggles safe
* Realtime replays harmless

---

### 💬 Replies

Replies are content, but still:

* Client-generated ID
* UPSERT on sync
* Feed insertion ignored on conflict

No special uniqueness beyond ID.

---

### 🔖 Bookmarks

```sql
PRIMARY KEY (user_id, post_id)
```

Insert-ignore forever.

---

### 🗳 Poll Votes

```sql
CREATE UNIQUE INDEX uniq_poll_vote
ON poll_votes(user_id, poll_id);
```

Even offline:

* Vote once
* Sync repeatedly
* Safe

---

### 🛒 Marketplace Listings

```sql
PRIMARY KEY (listing_id)
```

Client-generated IDs.

For offers:

```sql
CREATE UNIQUE INDEX uniq_offer
ON offers(buyer_id, listing_id)
WHERE status = 'active';
```

---

### ⭐ Ratings (Your Political Module)

```sql
CREATE UNIQUE INDEX uniq_rating
ON ratings(user_id, entity_id, rating_cycle);
```

This is **critical** for the quarterly reset logic.

---

### 📩 Messages

```sql
PRIMARY KEY (message_id)
```

Client-generated.

Thread membership:

```sql
UNIQUE (thread_id, message_id)
```

---

## One Rule to Memorize (Tattoo This in your mind and brains)

> **If an entity can be described as
> “User X did Y to Z”
> it MUST have a uniqueness constraint.**

Examples:

* User liked post
* User quoted post
* User voted in poll
* User bookmarked post etc.

---

## What This Gives us

| Benefit         | Result |
| --------------- | ------ |
| Offline-first   | Safe   |
| Realtime        | Safe   |
| Retry           | Safe   |
| Refresh         | Safe   |
| Crashes         | Safe   |
| Race conditions | Safe   |
| Future features | Safe   |

This is how **large-scale social apps stay sane**.

---

## Final Architecture Law (This Is the Real Lesson)

> **Correctness lives in the database, not in code.**

Code changes.
Refresh logic changes.
UI evolves.

Constraints do not lie.
-------------------------------------------------------------------------

Below is a **feature-launch checklist** We can literally paste into our repo (e.g. `FEATURE_CHECKLIST.md`) and apply **every single time** we add something new to our app.

---

# ✅ Offline-First, Duplication-Proof Feature Checklist

> **If a feature fails any item below, it is not ready.**

---

## 1️⃣ Identity & Creation

### ☐ Does every entity have a **single, canonical ID**?

* Generated **client-side**
* Used offline & online
* Sent to server unchanged
* Stored locally and remotely as-is

❌ Red flags:

* Server generates IDs
* Temp IDs later replaced
* “We’ll remap it later”

✔ Rule:

> **IDs are born once and never change**

---

## 2️⃣ Logical Uniqueness (CRITICAL)

### ☐ Can this action be described as

**“User X did Y to Z”**?

If YES → we **must** enforce uniqueness.

Examples:

* User liked post
* User voted in poll
* User quoted post
* User rated official
* User bookmarked item

### ☐ Is there a **database uniqueness constraint** enforcing this?

❌ Not UI checks
❌ Not sync logic
❌ Not API guards

✔ Must be enforced by:

* UNIQUE INDEX
* PRIMARY KEY

---

## 3️⃣ Write Semantics (Idempotency)

### ☐ Are **all sync writes idempotent**?

Check:

* ☐ No plain `INSERT` during sync
* ☐ Uses `UPSERT` or `INSERT OR IGNORE`
* ☐ Re-running sync produces same DB state

✔ Rule:

> **Sync must be safely repeatable**

---

## 4️⃣ Offline Behavior

### ☐ Can the feature be used **fully offline**?

* Create
* Edit
* Delete (soft delete)

### ☐ Are offline actions written to:

* Local DB immediately
* Outbox queue
* With retry metadata

❌ No network calls in UI logic

---

## 5️⃣ Outbox Safety

### ☐ Does the outbox entry use the **same ID** as the entity?

### ☐ Is the outbox item:

* Deleted only after confirmed sync
* Wrapped in a transaction
* Retry-limited

✔ Rule:

> **Outbox items must be consumed exactly once**

---

## 6️⃣ Refresh Safety

### ☐ Is refresh strictly **read-only**?

* No entity creation
* No ID generation
* No outbox writes

✔ Refresh may:

* Fetch deltas
* Merge updates
* Rebuild derived tables

❌ Refresh must never:

* Create posts
* Trigger side effects

---

## 7️⃣ Derived Data Protection

### ☐ Is derived data (feeds, counters, caches):

* Rebuildable
* Non-authoritative
* Protected by constraints

Examples:

* feed_items
* ranking tables
* aggregates

✔ Use:

* `INSERT OR IGNORE`
* Deterministic rebuild logic

---

## 8️⃣ Conflict Resolution Rules

### ☐ Are conflicts explicitly defined?

For example:

| Entity    | Rule              |
| --------- | ----------------- |
| Posts     | Latest updated_at |
| Reactions | Last action wins  |
| Ratings   | One per cycle     |
| Votes     | First wins        |

❌ “It probably won’t happen” is not a rule.

---

## 9️⃣ Failure & Retry Handling

### ☐ What happens if sync fails 3×?

* Mark failed
* Show subtle UI state
* Allow manual retry

### ☐ Does the feature survive:

* App crash mid-sync
* Network flapping
* Duplicate realtime events

---

## 🔟 Schema Guarantees (Final Gate)

Before shipping, answer **YES** to all:

* ☐ Duplication is **physically impossible**
* ☐ Logic bugs cannot corrupt data
* ☐ Sync can run multiple times safely
* ☐ Offline and online flows are identical
* ☐ Deleting data does not break uniqueness

If not → fix schema, not code.

---

## 🧠 The One-Line Test (Use This Always)

> **“If this function runs twice, will anything break?”**

If YES → feature is not safe.
If NO → ship it.

## Why This Works Long-Term

We stop:

* Fighting duplication bugs
* Adding defensive UI checks
* Writing fragile sync logic

We start:

* Designing correct systems
* Shipping faster
* Trusting refresh & realtime
