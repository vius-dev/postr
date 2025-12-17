Below is the **Phase-3 prompt** that builds *directly* on 0001_SKELETON_PROMPT.md Phase-1 (skeleton) and 0002_SKELETON_PROMPT.md Phase-2 (feed + interactions wiring) work.

This phase is where the app becomes **production-grade**: offline-safe, abuse-resistant, scalable, and deterministic — exactly how **pre-2023 Twitter** matured internally.

This prompt is written so we can implement it **without re-deciding architecture**.

---

# 🚦 PHASE-3 APP GENERATION PROMPT

**(Offline-First Reactions · Batching · Rate Limits · Correctness Locks)**

---

## 🎯 Objective

Upgrade the existing Twitter-like Expo + Supabase app to support:

* Offline-first **reaction buffering**
* Deterministic **reaction batching**
* Input-based **rate limiting**
* Server reconciliation & idempotency
* Correctness locks that **cannot be bypassed by UI or network**

❗This phase **does not** add new features.
It hardens what already exists.

---

## 🧠 Non-Negotiable Invariants

These **must never break**:

1. One reaction per user per post
2. Allowed states: `NONE | LIKE | DISLIKE`
3. LIKE and DISLIKE are mutually exclusive
4. Final state always wins
5. Reaction operations are idempotent
6. Counts are derived, never guessed
7. Offline behavior converges to online truth
8. Rate limits apply offline *and* online

If any of these are violated, the implementation is incorrect.

---

## 🧩 Scope of Phase-3

### INCLUDED

* Reaction batching
* Offline buffering
* Rate limiting (press-based)
* Reconciliation on reconnect
* UI lock/unlock rules
* Observability hooks

### EXCLUDED

* Feed ranking
* SQL/schema changes
* Poll logic
* Notifications
* Push
* Ads
* Analytics dashboards

---

## 📦 Reaction Batching (Core)

### Mental Model

> **Reactions are state, not events**

Intermediate toggles are irrelevant.

Only the **final intended reaction** matters.

---

### Client-Side Reaction Queue

Implement a **persistent queue**:

```ts
type PendingReaction = {
  postId: string
  finalState: 'LIKE' | 'DISLIKE' | 'NONE'
  pressCount: number
  lastUpdatedAt: number
}
```

Rules:

* Keyed by `postId`
* Overwrites previous entry
* Stored in persistent storage (MMKV / AsyncStorage)
* Rehydrated on app launch

---

### UI → Queue Flow

On every reaction press:

1. Update UI optimistically
2. Update queue entry (overwrite finalState)
3. Increment pressCount
4. Apply rate-limit guard
5. Schedule batch flush (debounced)

⚠️ **10 taps → 1 backend write**

---

## ⏱️ Batch Flush Triggers

Flush reaction batch when:

* User scrolls idle (1–2s)
* App goes background
* Feed refresh
* Queue size ≥ threshold (e.g. 20)
* App exit / hard close

---

### Batched Payload (Conceptual)

```ts
POST /reactions/batch
{
  reactions: [
    { postId, finalState, pressCount }
  ]
}
```

No per-tap network calls.

---

## 🛑 Rate Limiting (Press-Based)

### Definition

A **reaction press** is:

* Like
* Dislike
* Remove
* Switch

### Rule

```
Max 4 presses per user per post per rolling window
```

Applies:

* Offline
* Online
* Batched

---

### Client-Side Enforcement

* Track pressCount per post
* Disable reaction buttons after limit
* Show cooldown indicator or toast
* Do NOT enqueue further changes

---

### Server-Side Enforcement

* Validate pressCount per batch item
* Reject overflow
* Return authoritative reaction state

Client must **snap to server truth**.

---

## 🔄 Offline-First Reconciliation

### While Offline

* UI updates optimistically
* Reactions stored as finalState
* pressCount increments
* Rate limit enforced locally
* No network calls

---

### On Reconnect

1. Load queued reactions
2. Batch send to backend
3. Receive authoritative response
4. Replace optimistic state
5. Clear successful entries
6. Retry failed ones safely

---

### Conflict Resolution (Multi-Device)

Rule:

> **Server timestamp wins**

If offline reaction conflicts:

* Client discards buffered entry
* UI updates to server truth
* User may react again

---

## 🔒 Correctness Locks (Critical)

### UI Locks

* Disable active reaction button
* Lock reactions after rate limit hit
* Prevent duplicate submissions

### Network Locks

* Idempotent endpoints
* Deduplication by `(userId, postId)`
* Safe to retry, reorder, replay

---

## 🔁 State Reconciliation

Server response must include:

```ts
{
  postId,
  userReaction,
  likeCount,
  dislikeCount
}
```

Client:

* Replaces optimistic counts
* Clears queue entry
* Re-enables UI if allowed

---

## 📊 Observability Hooks

Add instrumentation for:

* Reaction batch size
* Flush frequency
* Rate-limit hits
* Offline → online reconciliations
* Rejected reactions
* Queue persistence failures

Metrics only — no dashboards yet.

---

## 🧪 Required Edge Cases

Must pass:

* Rapid toggle spam
* Offline → crash → relaunch → reconnect
* Duplicate batch replay
* Partial batch failure
* Deep scroll reaction
* Refresh during optimistic state

---

## 🚫 Explicitly Forbidden

* Event-based reaction logs
* Blind counter increments
* Per-tap network calls
* Time-based rate limits only
* Client-authoritative counts
* Silent failures

---

## 🧠 Final Instruction to Generator

> Harden correctness, not features.
>
> A slow, correct system beats a fast, broken one.

If behavior differs offline vs online — it’s wrong.

---

## 📌 Next Phase (Phase-4)

* Author timeline cache
* Read replicas
* Kill-switch hierarchy
* Deep-scroll degradation

