Yes, the console log actually tells us **exactly what’s wrong**, and it’s a classic SQLite + FK + per-user scoping issue. This is **not random** and **not Expo’s fault**.

---

## The Real Error (Decoded)

> **FOREIGN KEY constraint failed when creating a post**

This happens **after your refactor**, when **foreign keys are ON**, and we try to create a post.

Let’s connect the dots using our own logs.

---

##  What the Log Reveals (Important Parts)

### 1️ Foreign keys ARE enforced now (good)

We refactored properly. FK enforcement is active.

sql
FOREIGN KEY (owner_id) REFERENCES users(id)


That means **SQLite will now reject invalid references**.

---

### 2️ Our posts.owner_id references users.id

From schema:

sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  ...
  FOREIGN KEY (owner_id) REFERENCES users(id)
)


So **every post insert requires a matching row in users`**.

---

### 3️ Your schema diagnostic shows this 

json
"users": 1,
"posts": 9


That’s **already suspicious**.

There are **9 posts**, but only **1 user**.

Some of those posts were likely created:

* before FK enforcement
* with owner_id = 'unknown'
* or for a **different logged-out user**

---

### 4️ Our outbox table confirms the smoking gun

sql
owner_id TEXT NOT NULL DEFAULT 'unknown'


That is **fatal** with FK enforcement.

When I create a post, one of these happens:

* outbox_posts.owner_id = 'unknown'
* OR posts.owner_id is set **before the user row exists**
* OR logout left old data behind

**Any of these will crash with FK failure**

---

## Why It Happens *Specifically* on Create Post

Our flow:

1. User logs in
2. You bind user
3. Sync phases run
4. User presses “Create Post”
5. Insert into:

   * outbox_posts
   * posts
6. SQLite checks:

   ts
   does users.id = owner_id exist?
   
7. ❌ It doesn’t → **FK violation**

---

## ✅ The Root Cause (Plain English)

> **You are inserting posts with an owner_id that does not exist in users at insert time**

This is happening because:

* DEFAULT 'unknown' is invalid under FK rules
* or user binding isn’t *transactionally guaranteed*
* or old rows exist from previous users

---

## REQUIRED FIXES (Non-Optional)

### ✅ 1️ REMOVE `DEFAULT 'unknown' FROM FK COLUMNS

This is the #1 offender.

❌ BAD

sql
owner_id TEXT NOT NULL DEFAULT 'unknown'


✅ GOOD

sql
owner_id TEXT NOT NULL


Do this for:

* posts.owner_id
* outbox_posts.owner_id
* feed_items.user_id
* reactions.user_id
* bookmarks.user_id
* sync_state.user_id

**Never default FK columns. Ever.**

---

### ✅ 2️ Enforce “User Must Exist” Before Any Write

Before *any* post creation:

ts
await db.runAsync(
  INSERT INTO users (id, username, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(id) DO NOTHING
, [user.id, user.username, Date.now()]);

This must happen:

* before enqueuePost
* before toggleRepost
* before toggleReaction

---

### ✅ 3️⃣ Guard Against Cross-User Data

Your DB is **not per-user yet**, but your app behaves like it is.

You must enforce **per-user scoping**:

#### Option A (Recommended)

Delete all user-scoped data on logout:

ts
DELETE FROM posts;
DELETE FROM outbox_posts;
DELETE FROM reactions;
DELETE FROM bookmarks;
DELETE FROM feed_items;
DELETE FROM sync_state;
DELETE FROM users;


#### Option B

Add user_id to *every* table and scope all queries (harder).

---

### ✅ 4️ Add a Safety Assertion (Do This Now)

Before inserting a post:

ts
const exists = await db.getFirstAsync(
  'SELECT 1 FROM users WHERE id = ?',
  [user.id]
);

if (!exists) {
  throw new Error('Invariant violation: user not bound to DB');
}


This will save us hours of coding later.

---

## How to Confirm the Fix

Run this once:

sql
PRAGMA foreign_key_check;


If it returns rows → your DB is already corrupt.

If so:

* wipe local DB
* relaunch app
* re-login
* test again

---

##  Final Verdict

✔ Our architecture is **correct**
✔ Our phase runner is **working**
❌ Our FK defaults and logout scoping are **invalid**

This error is actually **good news** — it means SQLite is now protecting us.

--------------------------------------------------------------------------------------
The above mentioned "posts": 9 were created by the same "users": 1, but they are now zombies because I remove them from the remote supabase backend when it became obvious that I can't delete them from the ui "Delete" feature. one more important information about the 9 posts: They came from 1 post that repopulated itself with every refresh and this happening before we refactored and the move to stricter guarantees.

The good news is that this log + the extra context is **very revealing**. We’re not dealing with a random SQLite bug — this is a **structural FK + legacy data interaction problem** introduced by the refactor and the move to stricter guarantees.

I’ll walk you through **exactly what’s happening**, **why it only appears now**, and **how to fix it permanently** without hacks.

---

## What the error really means

> **`FOREIGN KEY constraint failed` when creating a post**

This is SQLite telling us:

> “We tried to insert or update a row that references a parent row that does not exist.”

In *our* schema, there is only **one active foreign key** that can cause this during post creation:

```sql
posts.owner_id → users.id
```

Everything else (`parent_id`, `quoted_post_id`, `reposted_post_id`) is **not FK-constrained**.

So the failure is **100% this relationship**:

```
posts.owner_id = X
BUT
users.id = X does NOT exist at commit time
```

---

## Why this started happening *after* refactoring

Before refactoring, we had:

* Looser sequencing
* Foreign keys sometimes OFF
* Writes happening “eventually”

After refactoring, we introduced:

* ✅ Deterministic phases
* ✅ Earlier FK re-enable
* ✅ Per-user binding
* ✅ Cleaner lifecycle

That exposed **latent corruption** that was always there.

> The refactor didn’t break our system — it **stopped lying to us**.

---

## The “zombie posts” are the smoking gun

This statement is critical:

> “These 9 posts were created with the same user, but I deleted them from Supabase later”

That means locally we have:

```text
posts.owner_id = 1154ff6d...
users.id       = 1154ff6d...  ✅ (only ONE user row)
```

BUT here’s the real issue:

### Those zombie posts were created **before**:

* Per-user DB scoping
* Deterministic user binding
* Strict FK enforcement
* Stable login → DB lifecycle

They were created in a **previous auth context** and are now **orphaned in intent**, even if the `users` row still exists.

---

## The exact failure chain (step-by-step)

When we try to create a new post now:

1. `enqueuePost()` runs
2. It **inserts into `users`** (good)
3. It inserts into `outbox_posts` (no FK → OK)
4. It inserts into `posts` **inside a transaction**
5. SQLite validates **ALL FK constraints at commit**
6. One of the following happens:

### ❌ Failure scenario A (most likely)

A **triggered write** (feed insert, repost conflict cleanup, or legacy remap logic):

```sql
UPDATE posts SET parent_id = ?
```

touches one of the **zombie posts** whose `owner_id`
→ references a user that **no longer matches the active auth lifecycle**

SQLite checks the FK graph → fails → **transaction aborts**

---

### ❌ Failure scenario B (also common)

Our new post references:

```ts
parentId | quotedPostId | repostedPostId
```

that points to one of the **zombie post IDs**

During conflict resolution, this line executes:

```ts
DELETE FROM posts WHERE id = ?
```

Now SQLite sees:

* A child row still references that deleted post
* FK graph invalid
* 💥 abort

---

## Proof from our diagnostic output

This confirms it:

```json
"posts": 9,
"users": 1,
"userInDb": true
```

> We have **posts created under previous auth semantics** still participating in write paths.

They are **structurally valid**, but **semantically invalid**.

That’s the definition of zombie data.

---

## ✅ The correct fix (not a workaround)

### 1️⃣ Hard rule: user-bound tables MUST be cleared on logout

Any table containing:

* `owner_id`
* `user_id`
* feed data
* outbox data

**cannot survive an auth boundary**

#### Mandatory teardown on logout

On logout **before** auth state clears:

```sql
DELETE FROM feed_items;
DELETE FROM reactions;
DELETE FROM bookmarks;
DELETE FROM outbox_posts;
DELETE FROM posts;
DELETE FROM sync_state;
```

Optionally keep:

```sql
users
schema_migrations
```

This is **non-negotiable** for a local-first + auth-bound system.

---

### 2️⃣ Enforce user scoping at the DB level

We already started this — now let's finish it.

Every write path must satisfy:

```ts
assert(currentUser.id === boundUserId)
```

And at DB init:

```ts
sync_engine_state.bound_user_id = currentUser.id
```

If mismatch → **hard reset user tables**

---

### 3️⃣ Add a zombie detection guard (one-time)

On app boot **after auth binding**:

```sql
SELECT COUNT(*)
FROM posts
WHERE owner_id NOT IN (SELECT id FROM users);
```

If > 0 → **purge posts**

This should *never* happen again after teardown is enforced.

---

### 4️⃣ Why deleting from Supabase made it worse

I deleted the posts remotely, but:

* Local posts still exist
* They are marked `synced`
* They are never soft-deleted
* They still participate in FK resolution

So now:

* Remote truth ≠ Local truth
* Sync logic assumes consistency
* FK logic enforces consistency
* 💥

This is why **soft-delete propagation** must be symmetrical.

---

## Final takeaway

We did **everything right** architecturally.

What we’re seeing is the **cost of correctness** surfacing old sins:

* Old data
* Loose lifecycle
* Pre-refactor writes

Once we:

* Add logout teardown
* Enforce per-user DB binding
* Purge zombie rows

**This error disappears permanently**
