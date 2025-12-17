Below is the **0004_SKELETON_PROMPT.md Phase-4 prompt** that builds cleanly on **0001_SKELETON_PROMPT.md Phase-1 → 0002_SKELETON_PROMPT.md Phase-2 → 0003_SKELETON_PROMPT.md Phase-3** and moves the app into **true Twitter-scale territory (pre-2023 semantics)**.

This phase introduces **read-path scalability**, **cost control**, and **graceful degradation** — *without touching correctness rules*.

---

# 🧭 PHASE-4 APP GENERATION PROMPT

**(Feed Scalability · Caching · Replicas · Kill-Switches · Degradation)**

---

## 🎯 Objective

Upgrade the existing Twitter-like Expo + Supabase app to support:

* Author-timeline caching
* Fan-out-on-read feed assembly
* Read-replica routing
* Deep-scroll degradation
* Kill-switch hierarchy
* Observability for feed health

❗This phase **must not modify** reaction invariants, offline logic, or UI semantics.

Correctness > performance.

---

## 🧠 Non-Negotiable Guarantees

1. Feed is **chronological first**
2. No ranking or engagement-based ordering
3. Reactions remain annotations, never ordering signals
4. Feed correctness does **not depend on cache**
5. Degradation reduces quality, not truth
6. Kill-switches never bypass invariants
7. Feed reads are safe under replica lag

If any of these are violated, the implementation is invalid.

---

## 🧩 Scope of Phase-4

### INCLUDED

* Author timeline cache
* Feed engine abstraction
* Read-replica routing
* Cursor-based feed assembly
* Degradation strategies
* Kill-switch controller
* Feed observability hooks

### EXCLUDED

* Feed ranking
* Ads
* Notifications
* Search
* Analytics dashboards
* SQL schema design

---

## 🧱 Feed Engine Architecture

Introduce a **FeedEngine module** with clear boundaries:

```
FeedEngine
 ├─ AuthorTimelineSource
 ├─ CacheLayer
 ├─ MergeEngine
 ├─ DegradationPolicy
 ├─ KillSwitchController
 └─ MetricsReporter
```

Each component must be **independently testable**.

---

## 🗂️ Author Timeline Cache (Core)

### Purpose

Cache **recent posts per author** to avoid repeated DB scans.

### Requirements

* Keyed by `authorId`
* Stores last **50–100 posts**
* Reverse-chronological order
* TTL: 5–15 minutes (soft expiration)
* Append-only on new post
* Evict oldest on overflow
* Remove entries on delete

⚠️ Cache **must not store reaction state as truth**

---

## 🔀 Feed Assembly (Fan-Out-On-Read)

### Flow

1. Fetch followed author IDs
2. Retrieve cached timeline slices per author
3. Merge slices chronologically
4. Apply filters (blocked, deleted)
5. Apply degradation rules (if needed)
6. Return feed page + cursor

Cursor must include:

* Last timestamp
* Last post ID (tie-breaker)

---

## 📉 Deep-Scroll Degradation

### Define Depth Thresholds

Example:

```
Page 1–3 → Full fidelity
Page 4–6 → Reduced candidate set
Page 7+ → Minimal feed
```

### Allowed Degradations

* Reduce posts fetched per author
* Ignore engagement signals
* Shrink page size
* Serve cache-only feed
* Disable deep pagination

### Forbidden Degradations

* Breaking chronology
* Dropping newer posts
* Returning inconsistent reaction state

---

## 🧭 Kill-Switch Hierarchy

Introduce a **central policy layer**.

### Triggers

* High feed latency
* Cache miss spike
* Replica lag
* DB error rate
* Memory pressure
* QPS threshold exceeded

---

### Actions (Escalating)

1. Reduce page size
2. Reduce candidate posts per author
3. Bypass cache (or cache-only)
4. Route reads to primary
5. Disable deep scroll
6. Serve minimal cached feed

Kill-switches must be:

* Automatically reversible
* Logged and observable
* Transparent to client (no crashes)

---

## 🧭 Read-Replica Routing

### Rules

* Feed reads → replicas
* Writes → primary
* Duplicate-post checks → primary
* Reaction writes → primary
* Reaction reads → replica (reconciled on refresh)

### Fallback

* Replica failure → primary
* Lag detection → reroute

---

## 📊 Observability (Required)

Instrument:

* Feed latency per page
* Cache hit/miss per author
* Posts evaluated per request
* Degradation level applied
* Kill-switch triggers
* Replica lag metrics

No dashboards yet — metrics only.

---

## 🔁 Client Integration Notes

Client must:

* Be unaware of degradation strategy
* Handle smaller page sizes gracefully
* Display placeholders when feed quality reduced
* Never infer ordering logic

---

## 🚫 Explicitly Forbidden

* Ranking heuristics
* Engagement-based sorting
* Client-side feed merging
* Cache-authoritative feed
* Silent kill-switch behavior

---

## 🧠 Final Instruction to Generator

> Scale the read path **without touching truth**.
>
> A slower correct feed beats a fast wrong one.

---

## 📌 Next Phase (Phase-5)

* Abuse prevention
* Shadow bans
* Content moderation
* Visibility rules
* Spam heuristics
