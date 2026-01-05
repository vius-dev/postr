We currently have **three screens** with **three data strategies**:

| Screen       | Source            | Reality                             |
| ------------ | ----------------- | ----------------------------------- |
| Home Feed    | SQLite            | Fast, local-first, but raw rows     |
| Profile      | SQLite → Supabase | Hybrid, but still local mapping     |
| Post Details | Supabase          | Canonical mapping via `api.mapPost` |

The **bug vector** is not networking — it is **interpretation drift**:

* SQLite queries return *storage-shaped data*
* Screens then *reinterpret* posts independently
* `api.mapPost` is bypassed in 2/3 of the app

So fixes land in **PostDetails** but silently fail elsewhere.

---

### The Key Architectural Insight

> **Our Single Source of Truth must live ABOVE the transport layer, not inside Supabase.**

In other words:

* ❌ `api.mapPost` should NOT be “Supabase-only”
* ✅ `api.mapPost` must accept a **canonical raw shape**, regardless of origin

---

### Step 1: Define a Canonical *Raw* Post Shape

Right now, we implicitly have:

* Supabase row shape
* SQLite row shape
* Ad-hoc merged shapes

This must stop.

Define **one internal interface** that represents *“a post before interpretation”*.

```ts
type RawPost = {
  id: string
  author_id: string
  content: string
  created_at: string
  edited_at?: string | null

  media?: RawMedia[]
  poll?: RawPoll | null

  counts: {
    likes: number
    comments: number
    reposts: number
  }

  viewer_state: {
    has_liked: boolean
    has_reposted: boolean
  }
}
```

⚠️ This is **not** our DB schema
⚠️ This is **not** our API response
This is our **internal contract**

---

### Step 2: Make SQLite Conform to `RawPost`

Our SQLite queries should **only do retrieval**, not interpretation.

#### ❌ Current (problematic)

```ts
const rows = db.query(`
  SELECT *, CASE WHEN edited_at IS NOT NULL THEN 1 ELSE 0 END as isEdited
`)
```

#### ✅ Correct

```ts
const rows = db.query(`
  SELECT
    id,
    author_id,
    content,
    created_at,
    edited_at,
    like_count,
    comment_count,
    repost_count,
    viewer_has_liked,
    viewer_has_reposted
  FROM feed_items
`)
```

Then **adapt**:

```ts
function sqliteRowToRawPost(row): RawPost {
  return {
    id: row.id,
    author_id: row.author_id,
    content: row.content,
    created_at: row.created_at,
    edited_at: row.edited_at,

    counts: {
      likes: row.like_count,
      comments: row.comment_count,
      reposts: row.repost_count,
    },

    viewer_state: {
      has_liked: !!row.viewer_has_liked,
      has_reposted: !!row.viewer_has_reposted,
    },
  }
}
```

📌 **No business logic allowed here**

---

## Step 3: Make Supabase Also Conform to `RawPost`

Instead of:

```ts
const post = api.mapPost(response.data)
```

We do:

```ts
const raw = supabaseRowToRawPost(response.data)
const post = api.mapPost(raw)
```

Now **SQLite and Supabase converge** before interpretation.

---

## Step 4: `api.mapPost` Becomes the Canonical Guard

This function now owns **ALL interpretation**:

```ts
export function mapPost(raw: RawPost, viewerId: string): PostVM {
  const isSelf = raw.author_id === viewerId
  const isEdited = !!raw.edited_at

  return {
    id: raw.id,
    content: raw.content,
    createdAt: raw.created_at,

    authorId: raw.author_id,
    viewer: {
      isSelf,
      hasLiked: raw.viewer_state.has_liked,
      hasReposted: raw.viewer_state.has_reposted,
    },

    editedLabel: isEdited ? 'Edited' : null,

    stats: raw.counts,

    poll: raw.poll ? mapPoll(raw.poll) : null,
  }
}
```

This guarantees:

* `isSelf` **always evaluated**
* `edited` logic **never duplicated**
* `mapPoll` used **everywhere**

---

## Step 5: Enforce the Rule (This Is Crucial)

We need a **hard rule** in the codebase:

> **Screens may never render a post that did not pass through `api.mapPost`.**

To enforce this:

### Option A (Recommended)

* Screens accept `PostVM` only
* SQLite/Supabase layers return `RawPost[]`

### Option B (Lint / Convention)

* Ban `mapPoll`, `isEdited`, `isOwner` in screens
* Only allowed inside `api.mapPost`

---

## Step 6: How This Preserves Your Strategies

| Screen       | Strategy     | Result                           |
| ------------ | ------------ | -------------------------------- |
| Home Feed    | Local-first  | Still instant — mapping is cheap |
| Profile      | Hybrid       | Same mapper used twice           |
| Post Details | Online-first | Already compliant                |

We **do not lose performance**, because:

* Mapping is pure + synchronous
* SQLite still gives instant rows
* Interpretation cost is trivial vs rendering

---

## The Canonical Guard (Our Own Words, Formalized)

> “Every post, no matter where it comes from, must pass through `api.mapPost` before it touches UI.”

That is the invariant we were circling.

---

## Final Takeaway (Very Important)

This is **not** about DRY.
This is about **semantic authority**.

* SQLite stores facts
* Supabase transports facts
* `api.mapPost` decides **meaning**

Once we enforce that boundary, the class of bugs we hit **cannot reoccur**.
-----------------------------------------------------------------------------------------------

### Option A (This is what we will do)

* Screens accept `PostVM` only
* SQLite/Supabase layers return `RawPost[]`
----------------------------------------------------------------------------------------------

This is the **right end-goal**.
We’re not asking for a fix, we’re asking for a **system invariant** so that *when* something breaks, we already know **where truth lives** and **where to look**.

Below is how we make this **system-wide, enforceable, and boring** (boring is good).

---

## The Principle (Write This Down)

> **Data is fetched anywhere, but it is interpreted in exactly one layer.**

Everything else flows from this.

---

## The 3-Layer Contract (System-Wide)

We want **every entity** (Post, Comment, User, Poll, Listing, Rating, etc.) to obey the same pipeline:

```
[ Storage / Transport ]
        ↓
[ Canonical Normalization ]
        ↓
[ View Models / UI ]
```

No shortcuts. No exceptions.

---

## Layer 1 — Storage / Transport (Dumb by Design)

**Responsibilities**

* Fetch rows
* Cache rows
* Sync rows
* Persist rows

**Forbidden**

* Ownership checks
* Flags like `isEdited`
* Poll coloring
* Relationship logic
* Viewer-specific interpretation

### Examples

* SQLite
* Supabase
* Realtime payloads
* SyncEngine

These layers output **Raw Entities ONLY**.

---

## Layer 2 — Canonical Normalization (THE SINGLE SOURCE OF TRUTH)

This is what we’re actually asking for.

Create a **dedicated module**:

```
/domain
  /post
    post.raw.ts
    post.mapper.ts
    post.types.ts
  /comment
  /poll
  /user
```

### Every domain has:

1. `RawX` – canonical pre-interpreted shape
2. `mapX(raw, viewerCtx)` – the only place meaning is assigned
3. `XVM` – what UI is allowed to see

---

## Example: Posts (System Pattern)

### `post.raw.ts`

```ts
export type RawPost = {
  id: string
  author_id: string
  content: string
  created_at: string
  edited_at?: string | null
  poll?: RawPoll | null
  counts: Counts
  viewer_state: ViewerState
}
```

---

### `post.mapper.ts`

```ts
export function mapPost(
  raw: RawPost,
  ctx: ViewerContext
): PostVM {
  return {
    id: raw.id,
    content: raw.content,
    authorId: raw.author_id,

    viewer: {
      isSelf: raw.author_id === ctx.viewerId,
      hasLiked: raw.viewer_state.has_liked,
    },

    meta: {
      isEdited: !!raw.edited_at,
      editedLabel: raw.edited_at ? 'Edited' : null,
    },

    poll: raw.poll ? mapPoll(raw.poll, ctx) : null,
  }
}
```

**If it’s not here, it doesn’t exist.**

---

## Layer 3 — UI (Strictly Read-Only)

**Responsibilities**

* Render
* Navigate
* Animate
* Trigger actions

**Forbidden**

* Deriving meaning
* Checking ownership
* Deciding labels
* Mapping polls
* Guessing state

UI consumes **VMs only**.

---

## The Global Rule (Enforcement)

> **UI components are never allowed to accept Raw entities.**

This gives us the “We know where to peek” property.

---

## How We Enforce This System-Wide

### 1️⃣ Folder Boundaries (Psychological + Practical)

```
/storage      → SQLite / Supabase adapters
/domain       → canonical truth
/ui           → dumb renderers
```

If logic appears in `/ui`, it’s wrong.

---

### 2️⃣ Type System as a Gatekeeper (Very Effective)

* SQLite returns `RawPost`
* Supabase returns `RawPost`
* UI expects `PostVM`

If someone tries to bypass mapping, TypeScript **refuses to compile**.

---

### 3️⃣ “One Mapper per Domain” Rule

| Entity  | Mapper       |
| ------- | ------------ |
| Post    | `mapPost`    |
| Comment | `mapComment` |
| Poll    | `mapPoll`    |
| User    | `mapUser`    |
| Rating  | `mapRating`  |

No second mapper allowed. Ever.

---

### 4️⃣ Debugging Becomes Trivial

When something breaks:

| Symptom            | Where to Look |
| ------------------ | ------------- |
| Ownership wrong    | `mapPost`     |
| Edited label wrong | `mapPost`     |
| Poll colors wrong  | `mapPoll`     |
| Counts off         | storage/sync  |
| Missing item       | storage/sync  |
| UI glitch          | UI only       |

We never search the whole app again.

---

## The “Peek Point” We Want

We said this before:

> *“…so that when something breaks we know where to peek and find it.”*

That place is:

```
/domain/<entity>/<entity>.mapper.ts
```

That is the **semantic authority**.

---

## Why This Scales (Very Important)

This pattern works when we add:

* offline mode
* realtime patches
* admin overrides
* A/B experiments
* feature flags
* role-based views

Because **meaning stays centralized**.

---

## Final Mental Model (Keep This)

> Storage answers **what happened**
> Domain answers **what it means**
> UI answers **how it looks**

If we enforce that globally, the class of issues we’re fighting simply stops existing.
-------------------------------------------------------------------------------------------------

Now this is the right moment to **lock the system in**.

What we want is not “a pattern”, but a **formal, reusable primitive** that *every domain must pass through*, so violations are obvious and painful.

Below is a **DomainPipeline base** that is:

* system-wide
* transport-agnostic
* local-first friendly
* debuggable
* enforceable by types + convention

No fluff.

---

## The DomainPipeline Contract

Every domain entity flows through **exactly the same stages**:

```
SOURCE → ADAPTER → RAW → MAP → VM → UI
```

We will formalize this as a **base pipeline** that domains plug into.

---

## 1️⃣ Core Types (Global)

Create a shared foundation:

```
/domain/_core
  domain.types.ts
  domain.pipeline.ts
  domain.context.ts
```

---

### `domain.context.ts`

Viewer / environment context that mapping may depend on.

```ts
export type DomainContext = {
  viewerId: string
  now: string
  locale: string
  featureFlags?: Record<string, boolean>
}
```

Passed everywhere, never imported from auth inside mappers.

---

### `domain.types.ts`

```ts
export type RawEntity = {
  id: string
}

export type ViewModel = {
  id: string
}
```

Minimal by design.

---

## 2️⃣ DomainPipeline Base (The Heart)

### `domain.pipeline.ts`

```ts
export interface DomainPipeline<Source, Raw extends RawEntity, VM extends ViewModel> {
  // Transport → Canonical raw
  adapt(source: Source): Raw

  // Canonical raw → View model (semantic authority)
  map(raw: Raw, ctx: DomainContext): VM
}
```

This interface is the **law**.

No domain gets to skip a step.

---

## 3️⃣ Base Factory (Optional but Powerful)

To standardize behavior, create a helper:

```ts
export function createDomainPipeline<
  Source,
  Raw extends RawEntity,
  VM extends ViewModel
>(pipeline: DomainPipeline<Source, Raw, VM>) {
  return pipeline
}
```

This seems trivial, but it gives you:

* one import path
* one recognizable pattern
* future extension point (logging, assertions)

---

## 4️⃣ Example: Post Domain Implementation

```
/domain/post
  post.raw.ts
  post.vm.ts
  post.pipeline.ts
```

---

### `post.raw.ts`

```ts
export type RawPost = {
  id: string
  author_id: string
  content: string
  created_at: string
  edited_at?: string | null
  poll?: RawPoll | null
  counts: {
    likes: number
    comments: number
  }
  viewer_state: {
    has_liked: boolean
  }
}
```

---

### `post.vm.ts`

```ts
export type PostVM = {
  id: string
  authorId: string
  content: string

  viewer: {
    isSelf: boolean
    hasLiked: boolean
  }

  meta: {
    isEdited: boolean
    editedLabel: string | null
  }

  poll?: PollVM | null
}
```

---

### `post.pipeline.ts`

```ts
import { createDomainPipeline } from '../_core/domain.pipeline'
import { DomainContext } from '../_core/domain.context'

export const PostPipeline = createDomainPipeline({
  adapt(source: any): RawPost {
    // SQLite row OR Supabase row → RawPost
    return {
      id: source.id,
      author_id: source.author_id,
      content: source.content,
      created_at: source.created_at,
      edited_at: source.edited_at,

      counts: {
        likes: source.like_count,
        comments: source.comment_count,
      },

      viewer_state: {
        has_liked: !!source.viewer_has_liked,
      },

      poll: source.poll ?? null,
    }
  },

  map(raw, ctx: DomainContext) {
    const isSelf = raw.author_id === ctx.viewerId

    return {
      id: raw.id,
      authorId: raw.author_id,
      content: raw.content,

      viewer: {
        isSelf,
        hasLiked: raw.viewer_state.has_liked,
      },

      meta: {
        isEdited: !!raw.edited_at,
        editedLabel: raw.edited_at ? 'Edited' : null,
      },

      poll: raw.poll ? mapPoll(raw.poll, ctx) : null,
    }
  },
})
```

📌 **This file is the semantic authority for Posts.**

---

## 5️⃣ How Screens Consume the Pipeline

### Home Feed (SQLite)

```ts
const rows = sqlite.getFeedItems()

const posts = rows.map(row =>
  PostPipeline.map(
    PostPipeline.adapt(row),
    domainCtx
  )
)
```

---

### Post Details (Supabase)

```ts
const row = await api.fetchPost(id)

const post = PostPipeline.map(
  PostPipeline.adapt(row),
  domainCtx
)
```

Same pipeline. No exceptions.

---

## 6️⃣ Hard System Rules (Write These as Comments)

Add this to `/domain/README.md`:

> 1. UI must never import `Raw*` types
> 2. Storage must never import `*VM` types
> 3. All interpretation lives in `*.pipeline.ts`
> 4. If behavior differs between screens, the pipeline is wrong

This becomes cultural + technical enforcement.

---

## 7️⃣ Why This Gives us the “Peek Point”

When something breaks:

| Bug                | Peek Here                  |
| ------------------ | -------------------------- |
| Ownership wrong    | `post.pipeline.ts → map()` |
| Edited label wrong | `post.pipeline.ts → map()` |
| Poll wrong         | `poll.pipeline.ts`         |
| Missing item       | storage / sync             |
| UI glitch          | UI only                    |

We **never search the whole repo again**.

---

## 8️⃣ Extending System-Wide (Future-Proof)

This pipeline supports:

* offline reconciliation
* realtime patches (re-run `map`)
* admin overrides
* feature flags
* experiments
* role-based semantics

Because **context is explicit**.

---

## Final Takeaway

We’ve now created:

* a **semantic choke point**
* a **debugging anchor**
* a **system invariant**

> **If it’s wrong in the UI, it’s wrong in the pipeline.**

That’s the level of discipline we were aiming for.

-------------------------------------------------------------------------------------------------

This is the **last locking piece**:
once we add a **DomainRegistry + dev-mode invariants**, our system stops being “convention-driven” and becomes **self-policing**.

I’ll break it down into **two clean layers**:

1. **DomainRegistry** — discoverability + authority
2. **Invariant Checks (Dev-only)** — early failure + precise blame

No fluff, no overengineering.

---

# 1️⃣ DomainRegistry — The System Index of Truth

## Purpose

The DomainRegistry answers **one question system-wide**:

> *“For entity X, where is the semantic authority?”*

This gives us:

* a single peek-point
* a single import path
* a place to enforce rules
* a way to detect bypasses

---

## Registry Contract

Create:

```
/domain/_core/domain.registry.ts
```

```ts
import { DomainPipeline } from './domain.pipeline'

export type DomainName =
  | 'post'
  | 'comment'
  | 'poll'
  | 'user'
  | 'rating'
  | 'listing' etc.

type Registry = Record<DomainName, DomainPipeline<any, any, any>>

const registry: Partial<Registry> = {}

export function registerDomain<T extends DomainName>(
  name: T,
  pipeline: Registry[T]
) {
  if (__DEV__ && registry[name]) {
    throw new Error(
      `[DomainRegistry] Domain "${name}" registered more than once`
    )
  }

  registry[name] = pipeline
}

export function getDomain<T extends DomainName>(name: T): Registry[T] {
  const domain = registry[name]

  if (__DEV__ && !domain) {
    throw new Error(
      `[DomainRegistry] Domain "${name}" was requested but never registered`
    )
  }

  return domain as Registry[T]
}
```

This immediately gives us:

* duplicate detection
* missing domain detection
* one authoritative lookup path

---

## Registering Domains (Mandatory)

Each domain **must self-register**.

### `/domain/post/index.ts`

```ts
import { registerDomain } from '../_core/domain.registry'
import { PostPipeline } from './post.pipeline'

registerDomain('post', PostPipeline)

export { PostPipeline }
```

Same for:

* comment
* poll
* user
* etc.

---

## Application Bootstrapping

At app startup (or first import):

```ts
import '@/domain/post'
import '@/domain/comment'
import '@/domain/poll'
```

This ensures:

* all domains are registered
* missing imports explode early in dev

---

## How the App Uses It (Canonical Access)

### ❌ Forbidden

```ts
import { PostPipeline } from '@/domain/post/post.pipeline'
```

### ✅ Required

```ts
import { getDomain } from '@/domain/_core/domain.registry'

const Post = getDomain('post')
```

Now:

* pipelines cannot be silently bypassed
* all access is centralized

---

# 2️⃣ Dev-Mode Invariant Checks (This Is the Kill Switch)

Now we make violations **loud and precise**.

---

## Invariant 1 — Raw Never Reaches UI

### Marker Types (Lightweight but Effective)

```ts
export type RawMarker = { __raw: true }
export type VMMarker = { __vm: true }
```

Apply them:

```ts
export type RawPost = {
  __raw: true
  id: string
  ...
}

export type PostVM = {
  __vm: true
  id: string
  ...
}
```

---

### Invariant Check (Dev Only)

In our UI base components:

```ts
function assertVM(entity: any, domain: string) {
  if (__DEV__ && entity?.__raw) {
    throw new Error(
      `[Invariant Violation] Raw ${domain} reached UI. ` +
      `All entities must pass through ${domain}.pipeline.map()`
    )
  }
}
```

Usage:

```ts
assertVM(post, 'post')
```

When this trips, we know **exactly what bypassed the pipeline**.

---

## Invariant 2 — Mapping Must Be Pure

In `createDomainPipeline`:

```ts
export function createDomainPipeline(pipeline) {
  if (__DEV__) {
    const originalMap = pipeline.map

    pipeline.map = (raw, ctx) => {
      const snapshot = JSON.stringify(raw)
      const vm = originalMap(raw, ctx)

      if (snapshot !== JSON.stringify(raw)) {
        throw new Error(
          `[Invariant Violation] map() mutated raw entity`
        )
      }

      return vm
    }
  }

  return pipeline
}
```

Guarantees:

* no mutation
* deterministic behavior
* safe re-mapping after sync/realtime

---

## Invariant 3 — All Mapping Goes Through Registry

Wrap registry access:

```ts
export function mapEntity(
  domain: DomainName,
  source: any,
  ctx: DomainContext
) {
  const pipeline = getDomain(domain)

  const raw = pipeline.adapt(source)
  const vm = pipeline.map(raw, ctx)

  if (__DEV__ && !vm?.__vm) {
    throw new Error(
      `[Invariant Violation] ${domain}.map() did not return a VM`
    )
  }

  return vm
}
```

### Usage Everywhere

```ts
const post = mapEntity('post', row, domainCtx)
```

This becomes the **blessed path**.

---

## Invariant 4 — Screens Cannot Import Domain Internals

This is cultural + structural:

```
/domain/** → forbidden import from /ui/**
```

If we want to be strict:

* add an ESLint rule
* or path alias boundaries

---

# 3️⃣ What Breaks When Something Breaks (By Design)

| Failure          | Error Message           | Where to Look    |
| ---------------- | ----------------------- | ---------------- |
| Raw in UI        | Invariant Violation     | offending screen |
| Missing domain   | Domain not registered   | domain index     |
| Duplicate domain | Domain registered twice | boot order       |
| Wrong semantics  | UI looks wrong          | `*.pipeline.ts`  |
| Data wrong       | Counts off              | storage / sync   |

We no longer “hunt” bugs — they **present themselves**.

---

# 4️⃣ The Mental Model (Final Lock)

> **DomainRegistry answers “where is truth?”**
> **DomainPipeline answers “what does it mean?”**
> **Invariants answer “who violated the contract?”**

This is exactly the system-wide peek-point we asked for.