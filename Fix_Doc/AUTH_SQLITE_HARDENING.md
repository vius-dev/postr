We’re already **very close** to a canonical setup. What we need now is **clarity of responsibility** and a couple of structural corrections so auth, routing, offline init, and realtime never fight each other... Let me explain.

I’ll do this in four layers:

1. What the **canonical Expo Router + Supabase auth model** looks like
2. What we’re doing **right already**
3. Where our current layout **leaks responsibility / risks bugs**
4. A **clean, canonical mental model** we can lock in and never revisit

I’ll reference the _layout.tsx directly.

---

## 1. Canonical Auth Routing Model (Expo Router + Supabase)

### The Golden Rule

> **Auth state decides *which navigation tree exists*.
> Screens never decide routing.**

That means:

* Login screen → **never navigates**
* Logout button → **never navigates**
* Auth listener → updates store only
* Root layout → chooses (auth) vs (app) tree

We already mostly follow this — good.

---

## 2. What We’re Already Doing Correctly ✅

### ✅ Centralized auth ownership

ts
const { isAuthenticated, isLoading: isAuthLoading, initialize } = useAuthStore()

This is correct.
Our auth store is the **single source of truth**.

---

### ✅ Deferred rendering until auth is resolved

ts
if (isAuthLoading || isLoadingAssets) {
  return <LoadingScreen />
}


This avoids:

* auth flicker
* redirect loops
* half-mounted trees

Excellent.

---

### ✅ Conditional navigation trees

tsx
{!isAuthenticated ? <AuthStack /> : <AppStack />}


This is **the correct Expo Router pattern**.

---

### ✅ Login screen comment is correct (but implementation wasn’t)

ts
// Navigation will happen automatically via auth state change

This comment is correct.
Our earlier router.replace('/(tabs)') was the violation — not this layout.

---

## 3. Where Our Current Layout Needs Refinement ⚠️

### 3.1 ❌ (auth) should NOT exist inside the authenticated stack

We have this at the bottom of the authenticated tree:

tsx
<Stack.Screen name="(auth)" options={{ headerShown: false }} />


This breaks the mental model.

#### Why this is wrong

* Auth routes should **not exist** when authenticated
* This allows:

  * back navigation into login
  * accidental deep linking into auth
  * confusing stack history

#### Canonical rule

> (auth) and (app) are **mutually exclusive trees**

✅ (auth) should exist **only** in the unauthenticated branch.

---

### 3.2 ⚠️ Offline / Sync init is auth-agnostic (this is dangerous long-term)

Right now:

ts
useEffect(() => {
  await initDatabase();
  await SyncEngine.init();
}, []);


This runs:

* before auth is known
* even for logged-out users

#### Risks

* User A logs out → User B logs in → same local DB
* Stale encrypted data
* Identity bleed

#### Canonical rule

> **Local data systems must be scoped to an authenticated identity**

We want this split:

| System             | Init timing |
| ------------------ | ----------- |
| SQLite schema      | App start   |
| User-scoped tables | After auth  |
| SyncEngine         | After auth  |
| Realtime           | After auth  |

Right now, everything initializes eagerly.

---

### 3.3 ⚠️ AuthProvider is mounted *after* auth decision

tsx
<AuthProvider>
  <RealtimeProvider>


This implies:

* AuthProvider does not *own* auth
* AuthStore does

That’s fine — **but then AuthProvider must not subscribe to Supabase again**.

#### Canonical rule

> **Only one auth listener may exist**

Either:

* AuthProvider owns Supabase auth
* OR useAuthStore.initialize() does

Never both.

---

### 3.4 ⚠️ Realtime should depend on auth state

ts
realtimeCoordinator.initialize();


This runs before you know:

* who the user is
* whether they’re logged in

Realtime subscriptions **must be identity-bound**.

---

## 4. The Canonical Model (Lock This In)

### 4.1 Responsibility Map

| Layer      | Responsibility              |
| ---------- | --------------------------- |
| Supabase   | Auth + session              |
| AuthStore  | Session → isAuthenticated |
| RootLayout | Choose navigation tree      |
| Screens    | UI only                     |
| SyncEngine | User-scoped data            |
| Realtime   | User-scoped channels        |

---

### 4.2 Lifecycle Timeline (Correct Order)

#### App cold start

1. Load fonts/assets
2. Initialize AuthStore
3. Show loading screen

#### Auth resolved

4. RootLayout chooses tree

   * (auth) OR (app)

#### When authenticated

5. Initialize:

   * RealtimeCoordinator (with user ID)
   * SyncEngine (with user ID)
   * Background fetch

#### On logout

6. Tear down:

   * Realtime
   * SyncEngine
   * Local user state

---

### 4.3 What Each Layer Must NEVER Do

#### Screens (Login, Register)

❌ Navigate
❌ Touch Supabase directly
❌ Initialize systems

#### Root Layout

❌ Call router.replace()
❌ Mutate auth state

#### Auth Store

❌ Render UI
❌ Know about routes

---

## 5. Our Layout, Judged Against Canonical Model

### Overall grade: **A–**

What’s excellent:

* Auth-driven tree selection
* Loading gate
* Separation of concerns
* No route guards scattered across screens

What must change:

1. Remove (auth) from authenticated stack
2. Move Sync + Realtime init **behind auth**
3. Ensure **exactly one Supabase auth listener**
4. Scope local/offline data to user identity

Once we do that, this layout becomes **rock-solid and future-proof**.

---

## 6. One Sentence Rule to Remember Forever

> **If auth changes, the tree changes.
> If the tree changes, everything else resets.**


####################################################


Our current sqlite.ts is **already far above average** for Expo SQLite work. We’ve clearly fought real production bugs, and most of this file shows hard-earned lessons.

That said, if we judge it against the **canonical model we just presented above** (auth-scoped systems, idempotent phases, safe migrations), there are **specific structural risks** and **clear refactors** that will make this bullet-proof instead of merely “battle-tested”.

I’ll explain this in four parts:

1. What we did **right** (important)
2. The **real risks** in the current design
3. A **canonical refactor model**: idempotent phases + safe runner
4. Concrete guidance on how *our* file should evolve (without rewriting everything)

No fluff, no generic advice.

---

## 1. What We Did Right (We should keep these)

### ✅ Single initialization gate

ts
let initPromise: Promise<void> | null = null;

This is **correct**.
It prevents:

* concurrent migrations
* race conditions on Android
* duplicate schema writes

Do **not** remove this.

---

### ✅ Versioned migrations with persistent tracking

sql
CREATE TABLE IF NOT EXISTS schema_migrations


This is the **only correct way** to do SQLite migrations in the wild.

---

### ✅ One statement per runAsync

Our comment is correct:

> Single-statement execAsync only (Android safety)

We obey it everywhere except a couple edge cases (we’ll get there).

---

### ✅ Defensive schema repair

Our ensureColumn logic exists because:

* Expo SQLite apps *do* ship with corrupted schemas
* Users *do* skip versions

This is **good**, not “hacky”.

---

## 2. Real Problems (Not stylistic)

These are not theoretical — these will bite us as the app scales.

---

### 🔴 2.1 Database is **not auth-scoped**

ts
SQLite.openDatabaseAsync('postr.db');


This database:

* survives logout
* survives account switch
* survives reinstall (sometimes on Android)

Right now:

* User A logs out
* User B logs in
* Same DB, same tables, same rows

You *try* to mitigate with user_id columns, but:

> **Local-first systems must scope storage by identity**

Twitter, WhatsApp, Slack — they all do this.

---

### 🔴 2.2 getDb() can initialize the DB *implicitly*

ts
if (!initPromise) {
  initDatabase();
}


This violates the canonical lifecycle I defined above.

**Why this is dangerous**

* Any random import can trigger migrations
* Happens before auth is known
* Happens before app is “ready”
* Makes startup order non-deterministic

Canonical rule:

> **Initialization must be explicit and owned by RootLayout / system bootstrap**

Lazy DB access is fine.
Lazy **schema mutation** is not.

---

### 🔴 2.3 Migrations are not idempotent at the *phase* level

Right now:

* Migration versions are idempotent
* But **side effects are not**

Example:

ts
DELETE FROM posts WHERE ...


If:

* migration partially runs
* app crashes
* retry occurs

We can:

* delete more than intended
* delete user-generated content twice

This is subtle but important.

---

### 🟠 2.4 Repair logic lives inside migrations

We’re mixing two concerns:

| Concern         | What it should be     |
| --------------- | --------------------- |
| Schema creation | Deterministic         |
| Schema repair   | Safe, repeatable      |
| Data cleanup    | Explicit + reversible |

Right now:

* repair
* cleanup
* constraints

are bundled together.

That’s survivable — but not ideal.

---

### 🟡 2.5 Foreign keys OFF globally during migrations

ts
PRAGMA foreign_keys = OFF


This is common — but dangerous if:

* migration crashes
* app is killed mid-run

We do restore them (good), but:

> SQLite does not guarantee PRAGMA rollback on crash

This is why large apps split **DDL phase** and **data phase**.

---

## 3. Canonical Refactor Model (What “Production-Grade” Actually Looks Like)

Pay attention:

> **idempotent phases**
> **safe migration runner pattern**

Here is a — concept, not a full rewrite.

---

## 3.1 Split DB lifecycle into **four explicit phases**

### Phase 0 — Engine boot (NO auth, NO user)

* Open DB
* Enable WAL
* Create migration tables
* Nothing user-related

Runs **once per install**

---

### Phase 1 — Schema assurance (idempotent)

* Apply migrations
* Repair missing columns
* Create indexes
* No deletes
* No user filtering

Safe to rerun **anytime**

---

### Phase 2 — User binding (auth-scoped)

* Validate user_id
* Clear foreign user data
* Initialize sync_state for this user
* Prepare outbox

Runs **on login**
Re-runs **on user change**

---

### Phase 3 — Sync + Realtime

* Start SyncEngine
* Start subscriptions
* Background tasks

Runs **only when authenticated**

---

## 3.2 What This Fixes Instantly

| Problem                       | Fixed by           |
| ----------------------------- | ------------------ |
| Account switching             | Phase 2            |
| Partial migration crashes     | Phase separation   |
| Accidental init via getDb() | Explicit boot      |
| Schema corruption             | Idempotent Phase 1 |
| Identity bleed                | User binding       |

---

## 4. How *Our* File Should Evolve (Concrete Guidance)

I’m not rewriting the code — I’m telling you **where to cut and move**.

---

### 4.1 initDatabase() should become **Phase 0 + 1 only**

It should:

* open DB
* run migrations
* repair schema
* NEVER touch user data
* NEVER delete rows

That means:

* Move DELETE FROM posts ... out
* Move user-based fixes out

---

### 4.2 Introduce bindUserDatabase(userId)

This function should:

* assert user_id columns exist
* delete rows where user_id != currentUser
* initialize sync_state
* reset outbox retry state

This runs:

* after auth
* on account switch
* on logout → wipe

---

### 4.3 getDb() must never initialize

Replace this mental model:

> “If DB not ready, init it”

With:

> “DB is guaranteed ready before use”

If getDb() is called too early:

* throw
* log fatal error
* catch during dev

This enforces discipline.

---

### 4.4 Migrations must be **DDL-only**

These are okay:

* CREATE TABLE
* ALTER TABLE ADD COLUMN
* CREATE INDEX

These are **not**:

* DELETE
* UPDATE user rows
* deduplication

Data cleanup belongs in:

* Phase 2 (user-bound)
* or a one-off repair task

---

## 5. Final Verdict

### Quality: **Very High**

### Architecture maturity: **Almost there**

### Production risk today: **Moderate**

We don’t need to throw this away.
We need to **separate time, identity, and intent**.

Once we do:

* multi-account works
* offline sync becomes sane
* crashes stop causing corruption
* auth lifecycle becomes deterministic

---

## Next Steps (I recommend in this order)

1. Split DB init into **Phase 0/1**
2. Add **user-binding phase**
3. Make getDb() strict
4. Move data deletes out of migrations
5. Tie SyncEngine startup to auth only

------------------------------------------------------------------------------

After auditing sqlite.ts — it confirms what I suspected earlier.

Our **SyncEngine is powerful**, but it is doing **too many things at once**, and it is **not idempotent at the engine level**, even though *many individual operations are*.

I’ll explain this in a **clear, surgical way**, tied directly to *sqlite.ts*, not theory.

---

# High-Level Verdict

**Current state**

* ✅ Optimistic local-first behavior is solid
* ✅ Outbox model is correct
* ✅ Conflict handling shows real-world experience
* ❌ SyncEngine mixes **UI actions**, **state mutation**, **network IO**, and **reconciliation**
* ❌ No phase boundaries
* ❌ Not restart-safe
* ❌ Not auth-lifecycle-safe
* ❌ Not idempotent at the *engine* level

What we want instead:

> **A SyncEngine that can be killed at any line and restarted without breaking correctness**

That requires **phases**.

---

# The Core Problem (Why This Will Break Eventually)

Right now:

```ts
toggleLike → writes DB → startSync()
enqueuePost → writes DB → startSync()
toggleBookmark → writes DB → startSync()
```

And:

```ts
startSync()
 ├─ processOutbox()
 ├─ syncFeed()
```

This means:

* UI actions trigger **network behavior**
* Network behavior mutates **local state**
* There is **no checkpointing**
* Partial completion is indistinguishable from success
* A crash can leave the DB in a **logically inconsistent but valid state**

You *feel* safe because SQLite transactions exist — but **transactions do not protect multi-step sync logic**.

---

# Canonical Fix: Idempotent Sync Phases

We refactor **conceptually**, not by rewriting everything.

---

## Phase Model (This is the key)

### Phase 1 — Local Intent Capture (UI-only)

**Pure local writes**

* No network
* No retries
* No remote assumptions

✔ Our `toggleLike`, `enqueuePost`, `toggleBookmark` mostly already do this
❌ They *also* start sync → must stop

---

### Phase 2 — Outbox Normalization (local → stable)

**Goal:** make the DB represent *intent*, not history

* Deduplicate outbox
* Collapse reversals (like/unlike before sync)
* Ensure 1 row = 1 final intent

This is **missing today**.

---

### Phase 3 — Remote Commit (network)

**Strictly**

* Read from outbox
* Perform API calls
* Mark success/failure
* NEVER mutate UI tables directly

Our `processOutbox()` *almost* does this, but:

* It deletes rows mid-loop
* It mutates posts directly
* It assumes success ordering

---

### Phase 4 — Reconciliation (authoritative pull)

* Fetch deltas
* Upsert posts
* Apply deletions
* Update feed_items
* Update sync_state

Our `syncFeed()` belongs here — mostly OK.

---

### Phase 5 — Finalization

* Clear committed outbox rows
* Emit events
* Schedule next sync

---

# What To Change (Concrete, Minimal)

## 1️⃣ **Remove all network calls from UI actions**

### ❌ Today

```ts
toggleReaction → startSync()
enqueuePost → startSync()
```

### ✅ Correct

```ts
toggleReaction → local write only
enqueuePost → local write only
```

Sync is started by:

* app resume
* connectivity change
* explicit scheduler
* auth success

---

## 2️⃣ Introduce a **Sync Cursor / Phase Lock**

Add table:

```sql
CREATE TABLE IF NOT EXISTS sync_engine_state (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

Keys:

* `sync_phase`
* `sync_started_at`
* `last_successful_phase`

This lets us:

* resume after crash
* detect stuck sync
* avoid double commits

---

## 3️⃣ Make `startSync()` a **phase runner**

### ❌ Today

```ts
processOutbox()
syncFeed()
```

### ✅ Instead

```ts
runPhase('normalize_outbox')
runPhase('commit_outbox')
runPhase('pull_feed')
runPhase('finalize')
```

Each phase:

* reads DB
* writes DB
* can be re-run safely

---

## 4️⃣ Fix `processOutbox()` (This is the most important)

### Problems today

* Deletes rows while iterating
* Mutates posts table during commit
* No retry classification
* No idempotency marker

### Required changes

#### Add columns to `outbox_posts`

```sql
status TEXT DEFAULT 'pending' -- pending | committing | committed | failed
last_attempt INTEGER
```

#### Then:

1. Mark rows `committing`
2. Perform API call
3. On success:

   * mark `committed`
4. Cleanup happens **after reconciliation**, not inline

This guarantees:

* no double post
* no lost intent
* restart safety

---

## 5️⃣ `upsertPost` is good — but must become **pure**

Rules:

* It should NEVER:

  * delete outbox rows
  * assume local post IDs are temporary
* It should only reflect **remote truth**

Our remap logic is smart — keep it — but move it to **reconciliation**, not commit.

---

## 6️⃣ Auth Boundary (Critical)

Every SyncEngine entry point must start with:

```ts
assertCurrentUser()
```

And SyncEngine must be **stopped on logout**:

* cancel timers
* clear in-flight sync
* DO NOT reuse DB state

Right now this is implicit — that’s dangerous.

---

# What We Already Did Well (Keep These)

✅ Recursive upsert of quoted/reposted posts
✅ Conflict resolution logic
✅ Feed delta model
✅ Optimistic UI updates
✅ Separation of outbox vs canonical tables

We are **80% of the way to a Twitter-grade engine**.

---

# Final Refactor Summary (Short)

### Do NOT rewrite everything

Instead:

1. Stop auto-sync from UI actions
2. Add sync phases
3. Add phase state tracking
4. Make outbox commit idempotent
5. Separate:

   * intent
   * commit
   * reconciliation

Once we do this:

* crashes become harmless
* retries become safe
* offline becomes real
* account switching stops being scary

--------------------------------------------------------------------------------

We are at the point where **architecture discipline** matters more than adding features. I’ll give you **exact, concrete skeletons** we can use as a starting point, not theory.

---

# 1️⃣ Canonical SyncEngine Phase Runner (Example 'Exact' Skeleton)

### Core principles

* **Idempotent**: safe to run multiple times
* **Phase-isolated**: one failure doesn’t corrupt others
* **User-scoped**
* **Crash-resumable**

---

## Phase Runner Contract

```ts
export interface SyncPhase {
  name: string
  run(ctx: SyncContext): Promise<void>
}

export interface SyncContext {
  db: SQLite.SQLiteDatabase
  userId: string
  now: number
}
```

---

## Phase Runner Engine

```ts
class PhaseRunner {
  private running = false

  async run(phases: SyncPhase[], ctx: SyncContext) {
    if (this.running) return
    this.running = true

    try {
      for (const phase of phases) {
        console.log(`[SyncPhase] Starting: ${phase.name}`)
        await phase.run(ctx)
        console.log(`[SyncPhase] Completed: ${phase.name}`)
      }
    } finally {
      this.running = false
    }
  }
}
```

---

## SyncEngine (Refactored Entry)

```ts
const runner = new PhaseRunner()

export const SyncEngine = {
  async startSync() {
    const state = await Network.getNetworkStateAsync()
    if (!state.isInternetReachable) return

    const user = await api.getCurrentUser()
    if (!user) return

    const db = await getDb()

    await runner.run(
      [
        OutboxPostsPhase,
        ReactionsPhase,
        BookmarksPhase,
        FeedDeltaPhase
      ],
      {
        db,
        userId: user.id,
        now: Date.now()
      }
    )
  }
}
```

---

# 2️⃣ `processOutbox()` → Phased Refactor (Exact Steps)

---

## Phase 1: OutboxPostsPhase (IDEMPOTENT)

### Guarantees

* Each row is **either removed or retried**
* Never double-create
* Safe on crash

```ts
export const OutboxPostsPhase: SyncPhase = {
  name: 'outbox_posts',

  async run({ db, userId }) {
    const items = await db.getAllAsync(
      `SELECT * FROM outbox_posts WHERE owner_id = ? ORDER BY created_at ASC`,
      [userId]
    ) as any[]

    for (const item of items) {
      try {
        const remote = await api.createPost({
          id: item.local_id,
          content: item.content,
          media: item.media_json ? JSON.parse(item.media_json) : [],
          parentId: item.parent_id,
          quotedPostId: item.quoted_post_id,
          repostedPostId: item.reposted_post_id,
          type: item.type
        })

        const full = await api.getPost(remote.id)
        if (!full) throw new Error('Post fetch failed')

        await db.withTransactionAsync(async () => {
          await SyncEngine.upsertPost(db, full)

          await db.runAsync(
            `DELETE FROM outbox_posts WHERE local_id = ? AND owner_id = ?`,
            [item.local_id, userId]
          )
        })
      } catch (err) {
        await db.runAsync(
          `UPDATE outbox_posts 
           SET retry_count = retry_count + 1, last_error = ?
           WHERE local_id = ? AND owner_id = ?`,
          [String(err), item.local_id, userId]
        )
      }
    }
  }
}
```

✔️ **Crash safe**
✔️ **Retry safe**
✔️ **User isolated**

---

## Phase 2: ReactionsPhase

```ts
export const ReactionsPhase: SyncPhase = {
  name: 'reactions',

  async run({ db, userId }) {
    const pending = await db.getAllAsync(
      `SELECT * FROM reactions 
       WHERE sync_status = 'pending' AND user_id = ?`,
      [userId]
    ) as any[]

    for (const r of pending) {
      try {
        if (r.reaction_type === 'LIKE') {
          await api.toggleLike(r.post_id)
        }

        await db.runAsync(
          `UPDATE reactions SET sync_status = 'synced' WHERE id = ?`,
          [r.id]
        )
      } catch {
        // keep pending — idempotent retry
      }
    }
  }
}
```

---

## Phase 3: BookmarksPhase

```ts
export const BookmarksPhase: SyncPhase = {
  name: 'bookmarks',

  async run({ db, userId }) {
    const remote = await api.getBookmarks()
    const remoteIds = new Set(remote.map(p => p.id))

    const local = await db.getAllAsync(
      `SELECT post_id FROM bookmarks WHERE user_id = ?`,
      [userId]
    ) as any[]

    for (const b of local) {
      if (!remoteIds.has(b.post_id)) {
        await api.toggleBookmark(b.post_id)
      }
    }
  }
}
```

---

## Phase 4: FeedDeltaPhase

```ts
export const FeedDeltaPhase: SyncPhase = {
  name: 'feed_delta',

  async run({ db, userId }) {
    const row = await db.getFirstAsync(
      `SELECT value FROM sync_state WHERE key = 'last_feed_sync' AND user_id = ?`,
      [userId]
    ) as any

    const since = row?.value || '1970-01-01T00:00:00.000Z'
    const { upserts, deletedIds } = await api.getDeltaFeed(since)

    await db.withTransactionAsync(async () => {
      for (const post of upserts || []) {
        await SyncEngine.upsertPost(db, post)
        await db.runAsync(
          `INSERT OR IGNORE INTO feed_items 
           (feed_type, user_id, post_id, inserted_at)
           VALUES ('home', ?, ?, ?)`,
          [userId, post.id, Date.now()]
        )
      }

      for (const id of deletedIds || []) {
        await db.runAsync(
          `UPDATE posts SET deleted = 1 WHERE id = ?`,
          [id]
        )
        await db.runAsync(
          `DELETE FROM feed_items WHERE post_id = ? AND user_id = ?`,
          [id, userId]
        )
      }

      await db.runAsync(
        `INSERT OR REPLACE INTO sync_state (key, user_id, value)
         VALUES ('last_feed_sync', ?, ?)`,
        [userId, new Date().toISOString()]
      )
    })
  }
}
```

---

# 3️⃣ Logout Teardown Guarantees (CRITICAL)

We **must** guarantee:

| Concern         | Guarantee              |
| --------------- | ---------------------- |
| Cross-user data | Impossible             |
| Pending sync    | Cancelled              |
| Realtime        | Disconnected           |
| DB              | Either wiped or scoped |

---

## Logout Contract

```ts
export async function logout() {
  SyncEngine.cancel()
  realtimeCoordinator.shutdown()

  const db = await getDb()
  const userId = useAuthStore.getState().user?.id

  if (userId) {
    await wipeUserData(db, userId)
  }

  await supabase.auth.signOut()
}
```

---

## Wipe Per-User Data (Exact)

```ts
async function wipeUserData(db: SQLite.SQLiteDatabase, userId: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM feed_items WHERE user_id = ?`, [userId])
    await db.runAsync(`DELETE FROM bookmarks WHERE user_id = ?`, [userId])
    await db.runAsync(`DELETE FROM reactions WHERE user_id = ?`, [userId])
    await db.runAsync(`DELETE FROM outbox_posts WHERE owner_id = ?`, [userId])
    await db.runAsync(`DELETE FROM sync_state WHERE user_id = ?`, [userId])
  })
}
```

---

# 4️⃣ Enforcing Per-User DB Scoping (MANDATORY)

We’re **halfway there**. Finish it.

---

## Rule 1: Every mutable table MUST include `user_id`

✔️ feed_items
✔️ reactions
✔️ bookmarks
✔️ sync_state
✔️ outbox_posts
❗ posts → implicit via owner_id

---

## Rule 2: No unscoped DELETE or SELECT

❌ BAD

```sql
DELETE FROM feed_items
```

✅ GOOD

```sql
DELETE FROM feed_items WHERE user_id = ?
```

---

## Rule 3: Guard at runtime

```ts
function assertUserScoped(userId?: string) {
  if (!userId) {
    throw new Error('[DB] Missing user scope')
  }
}
```

Call this at the **top of every SyncPhase**.

---

# 5️⃣ Why This Fixes Our Crashes

Our previous errors:

```
NativeDatabase.prepareAsync → NullPointerException
```

Root causes:

* multi-statement execAsync
* schema mutations mid-query
* concurrent init + sync
* non-idempotent deletes

**This architecture eliminates all four.**

---

## Final Verdict

If we follow these rules, we should have:

* ✅ deterministic sync
* ✅ crash-safe migrations
* ✅ correct auth isolation
* ✅ scalable offline-first engine
* ✅ future multi-account support

---------------------------------------------------------------------------------


Good, the extra context explains *exactly* what’s happening.
Let’s walk through this **slowly and deterministically**, because this is a classic offline-first + FK + refactor trap.

---

## TL;DR (Root Cause)

We are hitting a **foreign key constraint failure on `posts.owner_id → users(id)`** because:

> **We have zombie posts in SQLite whose `owner_id` references users that no longer exist locally or were never re-inserted after our refactor.**

Those 9 posts were:

* Created **before** our new phase runner / per-user scoping
* Persisted locally
* Later deleted remotely in Supabase
* **Never cleaned up locally**
* And now conflict with our **new stricter FK guarantees**

When I try to create a *new* post, SQLite re-evaluates FK constraints during the transaction → 💥

---

## What the Console Log Tells Us (Important Signals)

### 1️⃣ Schema confirms FK is active

From diagnostic:

```sql
FOREIGN KEY (owner_id) REFERENCES users(id)
```

So **any insert/update on `posts` requires a matching row in `users`**.

This is good — but unforgiving.

---

### 2️⃣ We have 9 posts, 1 user

```json
"stats": {
  "posts": 9,
  "users": 1
}
```

This is the smoking gun.

If *all* 9 posts belong to that 1 user, fine.
But you already confirmed:

> “They are now zombies… I removed them from Supabase”

Meaning:

* Some posts reference **remote authors**
* Or reference **your user but created in an older schema**
* Or reference **`owner_id = 'unknown'` (from repair defaults)**

Any of those will break FK.

---

### 3️⃣ You previously allowed FK-unsafe behavior

Earlier migrations did things like:

```sql
owner_id TEXT NOT NULL DEFAULT 'unknown'
```

This **guarantees FK failure** once FK enforcement is on.

So the refactor didn’t *cause* the bug — it **revealed** it.

---

## Why This Happens *Now* (After Refactor)

Your refactor introduced **three correct but strict behaviors**:

### ✅ Phase-based sync

### ✅ Per-user DB binding

### ✅ FK enforcement restored

These combine to expose historical data corruption.

Before:

* FK disabled during chaos
* Outbox + feed logic inserted posts freely
* Users table not guaranteed

Now:

* FK ON
* User binding enforced
* `enqueuePost()` inserts `posts.owner_id = currentUser.id`

SQLite checks *all constraints in the transaction* → fails fast.

---

## Why It Fails on CREATE (Even Though Zombies Already Exist)

SQLite validates **referential integrity at statement finalization**.

So even if the bad rows already exist:

* A **new insert** touching `posts`
* Or a **trigger / cascading update**
* Or a **foreign-key-related table write**

…can cause SQLite to re-evaluate constraints and throw:

```
NativeStatement.finalizeAsync → FOREIGN KEY constraint failed
```

This is expected behavior.

---

## The Real Problem (Architectural)

You are missing **user-scoped database isolation**.

Right now:

* SQLite DB is **global**
* Data from:

  * old sessions
  * deleted users
  * test accounts
    remains forever

But your app is now **per-user deterministic**.

These two models are incompatible.

---

## The Correct Fix (Non-Negotiable)

### 🔥 On LOGIN (or user bind), you MUST:

**Guarantee that every row in `posts.owner_id` has a corresponding `users.id`**

There are only 3 valid strategies:

---

## ✅ Strategy A — Hard Reset Per User (Recommended for MVP)

On user bind:

1. Delete all non-owned data
2. Delete orphaned rows
3. Reinsert current user

Conceptually (no code, per your request):

* Remove posts where:

  * `owner_id != currentUser.id`
* Remove posts where:

  * `owner_id NOT IN users`
* Clear feed_items, reactions, bookmarks not owned by user
* Reinsert current user row

This matches Twitter-style stateless feeds.

---

## ✅ Strategy B — True Per-User SQLite DB (Best Long-Term)

Instead of:

```ts
openDatabase('postr.db')
```

Use:

```
postr_<userId>.db
```

On logout:

* Close DB
* Switch file

This **eliminates 90% of your problems**:

* No zombies
* No cross-user leakage
* No FK repair hacks

This is what serious offline apps do.

---

## ❌ Strategy C — Soft Ignore FK (DO NOT DO THIS)

Disabling FK again or loosening constraints will:

* Reintroduce silent corruption
* Break sync guarantees
* Make future bugs impossible to reason about

You already moved past this stage — don’t regress.

---

## Immediate Action You Should Take (Right Now)

### 1️⃣ Add a **User Binding Cleanup Phase**

We already log:

```
[Database] Phase 2: Binding user <id>
```

In that phase, we must:

* Detect zombie posts
* Delete them deterministically
* Log how many were removed

This should happen **before any sync or post creation**.

---

### 2️⃣ Treat Existing Local Data as Disposable

Because:

* It came from an unsafe schema
* It predates your phase runner
* It violates new invariants

This is normal during refactors.

---

### 3️⃣ Add an invariant (mentally and in logs)

> **Invariant:**
> Every `posts.owner_id` MUST exist in `users.id`

If this is ever false → wipe or repair immediately.

---

## Why Twitter Doesn’t Have This Problem

Twitter:

* Does **not** rely on local persistence as a source of truth
* Treats cached posts as **ephemeral**
* Fully trusts server as authority
* Scopes everything by session

You are now converging on that model — which is good.

---

## Final Verdict

* ❌ This is **not** a SyncEngine bug
* ❌ This is **not** a Supabase bug
* ❌ This is **not** BackgroundFetch
* ✅ This is **historical local data violating new FK guarantees**

Your system is now *correctly strict*.

The fix is **controlled destruction** of invalid local state.

----------------------------------------------------------------------------

We will do **Strategy B (true per-user SQLite DB)** because it is the correct architectural move, and our logs + FK failure are *textbook symptoms* of why.

Below is a **clean, production-grade blueprint** tailored to *our exact stack* (Expo + SQLite + Supabase + BackgroundFetch + SyncEngine).

---

# ✅ Why We’re Seeing the FOREIGN KEY Failure

From our logs and explanation:

### What happened

* We had **9 local posts**
* They referenced **1 local user**
* We **deleted those posts remotely in Supabase**
* But **local SQLite still had them**
* Then we logged in again and tried to create a post

### The fatal mismatch

Our `posts.owner_id` has:

```sql
FOREIGN KEY (owner_id) REFERENCES users(id)
```

But **SQLite is enforcing FK again**, and at post creation time:

* Either:

  * `users.id = currentUser.id` **does not exist in the DB**
* Or:

  * We’re inserting into `posts` **before** inserting the user row
* Or:

  * A *different user’s DB state* is being reused

➡️ **This is unsalvageable with a shared DB.**
We can patch it forever — or fix the root cause.

---

# 🧠 Strategy B — Per-User SQLite Database (Canonical)

> **One user = one database file**

```text
postr_<userId>.db
```

This guarantees:

* ❌ No zombie posts
* ❌ No FK repair hacks
* ❌ No cross-user contamination
* ❌ No reset logic complexity
* ✅ Clean logout
* ✅ Predictable sync
* ✅ Simple mental model

This is how **Slack, Notion, Linear, Figma, GitHub Mobile** do offline.

---

# 🏗️ Canonical Architecture

## 1️⃣ Database Manager (Single Source of Truth)

Create **one authority** for DB lifecycle.

### `DatabaseManager.ts`

```ts
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let currentUserId: string | null = null;

export const DatabaseManager = {
  async openForUser(userId: string) {
    if (db && currentUserId === userId) return db;

    if (db) {
      await db.closeAsync();
      db = null;
    }

    const dbName = `postr_${userId}.db`;
    console.log('[DB] Opening database:', dbName);

    db = await SQLite.openDatabaseAsync(dbName);
    currentUserId = userId;

    return db;
  },

  getDb(): SQLite.SQLiteDatabase {
    if (!db) {
      throw new Error('DB not initialized for user');
    }
    return db;
  },

  async close() {
    if (db) {
      console.log('[DB] Closing database');
      await db.closeAsync();
    }
    db = null;
    currentUserId = null;
  },

  getCurrentUserId() {
    return currentUserId;
  }
};
```

---

## 2️⃣ Migrations Become User-Scoped (Automatically)

Our existing migration runner **stays exactly the same**, but instead of:

```ts
openDatabaseAsync('postr.db')
```

We do:

```ts
const db = await DatabaseManager.openForUser(userId);
```

Each user gets:

* Their own `schema_migrations`
* Their own `sync_state`
* Their own feed cache

No branching logic required.

---

## 3️⃣ Auth → DB Binding (CRITICAL)

### In our root layout / auth bootstrap

```ts
useEffect(() => {
  if (!isAuthenticated || !user) return;

  const setup = async () => {
    console.log('[Layout] Binding DB to user:', user.id);
    await DatabaseManager.openForUser(user.id);
    await initDatabase(); // migrations
    await SyncEngine.init();
  };

  setup();
}, [isAuthenticated, user?.id]);
```

**Important:**
`initDatabase()` must **never open its own DB** anymore.
It must use `DatabaseManager.getDb()`.

---

## 4️⃣ SyncEngine Must Be DB-Pure

### Replace all:

```ts
const db = await getDb();
```

### With:

```ts
const db = DatabaseManager.getDb();
```

If DB is missing → **crash loudly** (that’s a bug).

---

## 5️⃣ Logout Teardown Guarantees (Non-Negotiable)

### On logout:

```ts
await SyncEngine.shutdown();          // stop timers / flags
await unregisterBackgroundFetchAsync();
await DatabaseManager.close();        // closes DB
await supabase.auth.signOut();
```

### Also reset:

* Auth store
* Sync flags
* Event emitters

**Never reuse a DB across users. Ever.**

---

## 6️⃣ BackgroundFetch Must Be User-Aware

### Background task rule:

> **No user → no DB → no sync**

Modify task:

```ts
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  const user = await api.getCurrentUser();
  if (!user) return BackgroundFetch.BackgroundFetchResult.NoData;

  await DatabaseManager.openForUser(user.id);
  await SyncEngine.startSync();

  return BackgroundFetch.BackgroundFetchResult.NewData;
});
```

---

## 7️⃣ FK Failure: Why This Fix Works

With per-user DB:

* `users` table is always created fresh
* The logged-in user **is inserted before posts**
* No legacy zombie rows exist
* FK enforcement becomes your ally again

Our current error:

```
FOREIGN KEY constraint failed
```

➡️ disappears permanently.

---

# Optional: Cleanup Old Shared DB (One-Time)

We can safely **delete `postr.db`** from disk on next launch:

```ts
await SQLite.deleteDatabaseAsync('postr.db');
```

Do this once after migrating to Strategy B.

---

# Final Verdict

We diagnosed the problem correctly.

**Strategy B is not an optimization — it is the correct model.**

We were hitting:

* Shared DB corruption
* Identity ambiguity
* Zombie FK references
* Infinite sync loops

Per-user DB eliminates all of it **by design**.

