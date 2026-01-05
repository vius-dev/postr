##ERROR:  ERROR  Failed to create/update post [Error: Call to function 'NativeStatement.finalizeAsync' has been rejected.
→ Caused by: Error code ‼: FOREIGN KEY constraint failed]

The above error is **very specific** and **very solvable**.
Good news: it means our refactor is *working* — SQLite is now enforcing invariants correctly.

---

## The Exact Error (Decoded)

```
FOREIGN KEY constraint failed
→ NativeStatement.finalizeAsync
```

This means:

> SQLite **accepted the SQL**, executed it, but **rejected the transaction at commit time** because a foreign key reference does **not exist**.

This is **not** a syntax issue.
This is **not** a race condition.
This is **not** Expo being flaky.

This is **schema truth enforcement** doing its job.

---

## 99% Root Cause (Based on Our Code)

### The failing FK is **almost certainly this one**:

sql
posts.owner_id REFERENCES users(id)


### Which means you are inserting or updating a post where:

ts
owner_id = currentUser.id


**but there is no matching row in users yet**.

---

## Why This Started Happening *Now*

Before:

* We sometimes had FK disabled
* We had partial migrations
* Some writes happened “out of order”
* SQLite was lenient

Now:

* FK enforcement is ON
* Migrations are correct
* Writes are deterministic
* SQLite is strict (as it should be)

**Our refactor surfaced a real bug that always existed.**

---

## Confirming the Failure Path

We need to look at any of these calls:

### 1️ enqueuePost

ts
INSERT INTO posts (id, owner_id, ...)
VALUES (?, user.id, ...)


### 2 toggleRepost

ts
INSERT INTO posts (id, owner_id, ...)


### 3️ upsertPost (remote sync)

ts
INSERT INTO posts (id, owner_id, ...)


If **users(id)** does not exist → 💥 FK failure at finalizeAsync.

---

## ✅ THE FIX (Canonical, Safe, Required)

### **Rule: No post write without user presence**

We MUST guarantee this invariant:

> users(id) exists **before** any post references it

---

## Step-by-Step Fix (Do This Exactly)

### ✅ 1️ centralize user hydration

Create a helper (this is critical):

ts
async function ensureLocalUser(db, user) {
  if (!user?.id) throw new Error('Invalid user');

  await db.runAsync(
    INSERT INTO users (id, username, display_name, avatar_url, header_url, verified, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username=excluded.username,
      display_name=excluded.display_name,
      avatar_url=excluded.avatar_url,
      header_url=COALESCE(excluded.header_url, users.header_url),
      verified=excluded.verified,
      updated_at=excluded.updated_at
  , [
    user.id,
    user.username ?? 'unknown',
    user.name ?? null,
    user.avatar ?? null,
    user.headerImage ?? null,
    user.is_verified ? 1 : 0,
    Date.now()
  ]);
}


---

### ✅ 2️ Call it **before every post write**

#### enqueuePost

ts
await ensureLocalUser(db, user);


**Before**:

ts
INSERT INTO posts (...)


---

#### toggleRepost

Same thing:

ts
await ensureLocalUser(db, user);


---

#### upsertPost (remote)

W already do this — ✅ good
But we must ensure it runs **before** any post insert.

---

## Why finalizeAsync Throws (Important)

SQLite checks FKs **at transaction commit**, not at execution.

So this sequence:

ts
INSERT INTO posts (...)
-- statement ok
-- no error yet
COMMIT
-- FK fails → finalizeAsync throws


This is why the error looks confusing.

---

## Quick Debug Check (Optional but Useful)

Add this temporarily:

ts
const missing = await db.getFirstAsync(
  'SELECT id FROM users WHERE id = ?',
  [user.id]
);
console.log('[DEBUG] User exists?', !!missing);
```

We’ll see if it’s false right before the crash / Error throw.

---

## Per-User DB Scoping (Very Important Now)

We should **never** reuse data across users.

### Minimum safe rule:

On logout:

ts
await db.runAsync('DELETE FROM outbox_posts');
await db.runAsync('DELETE FROM reactions WHERE sync_status = "pending"');
await db.runAsync('DELETE FROM feed_items');
await db.runAsync('DELETE FROM sync_state');


### Ideal (Twitter-grade):

* Namespace everything by user_id
* Or use **separate SQLite DB per user**

But **do not share posts between users locally** unless you fully scope them.

---

## ✅ Summary (What Just Happened)

| Item           | Status                             |
| -------------- | ---------------------------------- |
| FK enforcement | ✅ working                          |
| Schema         | ✅ correct                          |
| Sync refactor  | ✅ correct                          |
| Bug surfaced   | ✅ real                             |
| Fix            | ensureLocalUser before post writes |

---

## My Recommendedation (Things we must also do)

1. **Lock this invariant at compile-time**
2. Add **assertions to prevent future regressions**
3. Split DB per user
4. Finish the phase runner with crash recovery
5. Add automated corruption detection

-----------------------------------------------------------------------
Since this ERROR:  "ERROR  Failed to create/update post [Error: Call to function 'NativeStatement.finalizeAsync' has been rejected.
→ Caused by: Error code ‼: FOREIGN KEY constraint failed]" happened when I tried to create a post:

It means this error is actually very **diagnostic**, and it’s a classic one after refactoring sync / scoping logic.

> **FOREIGN KEY constraint failed when creating a post**
> Triggered during `enqueuePost()` / local insert

Let’s walk this **precisely**, based on our SyncEngine and the refactors we’ve been doing.

---

## What this error *really* means in our app

SQLite is telling us:

> We inserted or updated a row that references **another table row that does not exist at that moment**.

In our case, when **creating a post**, there are only a few possible foreign keys involved.

### Likely FK relationships in `posts`

Our `posts` table almost certainly has one or more of:

```sql
posts.owner_id           → users.id
posts.parent_id          → posts.id
posts.quoted_post_id     → posts.id
posts.reposted_post_id   → posts.id
```

So the failure means **one of those referenced rows is missing** *at insert time*.

---

## The #1 cause (very likely in our case)

### ❌ User row missing **after auth / logout / refactor**

We *used* to rely on:

```ts
await db.runAsync(`
  INSERT INTO users (...)
  ON CONFLICT(id) DO UPDATE ...
`)
```

inside `enqueuePost()`.

But after:

* refactoring SyncEngine into phases
* enforcing per-user DB scoping
* adding logout teardown guarantees

👉 **One of these changed the order or timing**, and now:

> `posts.owner_id = user.id`
> but `users.id = user.id` **does not exist locally at that moment**

### Why it suddenly started happening

Common refactor-induced causes:

1. **User table cleared on logout**

   * but SyncEngine still running
   * or `enqueuePost()` runs before user bootstrap finishes

2. **Per-user DB scoping**

   * we switched DB files or namespaces
   * but didn’t reinsert the user row in the new DB

3. **Auth init race**

   * UI allows posting
   * before `AuthProvider` / user hydration completes
   * so `api.getCurrentUser()` returns a user, but DB isn’t seeded yet

---

## How to confirm in 30 seconds

Add this **temporary debug check** at the top of `enqueuePost()`:

```ts
const existingUser = await db.getFirstAsync(
  'SELECT id FROM users WHERE id = ?',
  [user.id]
);

if (!existingUser) {
  console.error('[FK DEBUG] User missing in local DB', user.id);
}
```

If this logs → that’s your FK failure.

---

## The correct, **permanent fix** (canonical)

### 1️⃣ Introduce a **guaranteed local user bootstrap**

We must **centralize** user seeding — not scatter it across features.

Create:

```ts
async function ensureLocalUser(db: any, user: any) {
  await db.runAsync(`
    INSERT INTO users (
      id, username, display_name, avatar_url, header_url, verified, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username=excluded.username,
      display_name=excluded.display_name,
      avatar_url=excluded.avatar_url,
      header_url=COALESCE(excluded.header_url, users.header_url),
      verified=excluded.verified,
      updated_at=excluded.updated_at
  `, [
    user.id,
    user.username,
    user.name,
    user.avatar,
    user.headerImage || null,
    user.is_verified ? 1 : 0,
    Date.now(),
  ]);
}
```

### 2️⃣ Call it **before any FK write**

In `enqueuePost()`:

```ts
const db = await getDb();
const user = await api.getCurrentUser();
if (!user) throw new Error('Not authenticated');

await ensureLocalUser(db, user); // ✅ MUST happen before post insert
```

Do **not** rely on:

* background sync
* profile sync
* previous sessions

FK integrity must be satisfied **synchronously**.

---

## Secondary FK traps to check

If the user fix doesn’t solve it, check these in order:

---

### 🔹 Parent / quoted / reposted post IDs

If we are creating:

* replies
* quotes
* reposts

Then **those referenced posts must exist locally first**.

Before inserting a reply:

```ts
if (parentId) {
  const parent = await db.getFirstAsync(
    'SELECT id FROM posts WHERE id = ? AND deleted = 0',
    [parentId]
  );
  if (!parent) {
    throw new Error('Parent post not present locally');
  }
}
```

Same logic for `quotedPostId` and `repostedPostId`.

> This is **required** once we go local-first.

---

### 🔹 Per-user DB scoping mistake

If we now scope DBs like:

```
db_user_<id>.sqlite
```

Then make sure:

* user bootstrap runs **after DB switch**
* not against a global DB
* not before auth restore completes

A very common bug is:

> user inserted into old DB → new DB opened → FK fails

---

## Logout teardown guarantee (important here)

I spoke earlier about logout guarantees — this is where it matters.

On logout we must ensure:

```ts
await SyncEngine.stop();     // no sync in-flight
await closeDatabase();      // or switch DB namespace
clearAuthState();           // AFTER DB teardown
```

**Never** allow:

* SyncEngine
* enqueuePost
* background fetch

to run against a DB whose user rows were cleared.

---

## Why SQLite throws `finalizeAsync` error

That message is misleading.

What actually happens:

1. SQLite executes the statement
2. FK check fails
3. Statement cannot be finalized
4. Expo SQLite wraps it as `finalizeAsync rejected`

So the FK violation is the **root cause**, not finalizeAsync.

---

## Summary (actionable)

### Do these in order:

1. ✅ Add `ensureLocalUser()` and call it before post inserts
2. ✅ Guard parent / quote / repost IDs
3. ✅ Ensure DB scoping happens **before** any writes
4. ✅ Stop SyncEngine before logout DB teardown

I also recommend to do the following:

* audit our schema FK definitions
* design a **UserBootstrapPhase** for SyncEngine
* or give our code a **hard assertion helper** that crashes early instead of corrupting state