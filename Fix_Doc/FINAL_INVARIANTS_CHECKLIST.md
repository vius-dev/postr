Below is the **FINAL, LOCKED INVARIANT CHECKLIST** for your **pre-2023 Twitter-like system**.

This is the document you **do not renegotiate**, **do not optimize away**, and **do not “improve” later**.
Every production incident at Twitter-scale happens when one of these gets violated.

---

# 🔒 FINAL INVARIANT CHECKLIST

**Pre-2023 Twitter-Class System**

> If any invariant below is broken, the system is no longer Twitter-like.

---

## I. USER & PLATFORM EQUALITY (FOUNDATIONAL)

### 🔐 I-1. All Users Are Equal

* No paid tiers
* No privilege classes
* No reach boosts
* No engagement multipliers
* No reputation scores

✅ Every account has identical capabilities.

---

### 🔐 I-2. Identity Is Not Authority

* Verified ≠ trusted
* Old accounts ≠ boosted
* Follower count ≠ weight

Identity never alters feed semantics.

---

## II. FEED & TIMELINE SEMANTICS

### 🔐 II-1. Chronology Is Canonical

* Feed ordering is strictly time-based
* No ranking
* No engagement sorting
* No personalization weighting

Chronology may degrade, but never reorder.

---

### 🔐 II-2. Fan-Out-on-Read Is the Source of Truth

* Feeds are assembled at read time
* Cached slices may assist, never replace
* Write-time fan-out is forbidden at MVP scale

---

### 🔐 II-3. Deep Scroll Degrades Gracefully

* Fewer candidates
* Smaller pages
* Fewer signals
* Same ordering

Depth never changes correctness.

---

### 🔐 II-4. Feed Reads Never Mutate State

* Reads do not increment counters
* Reads do not trigger writes
* Reads do not affect visibility

---

## III. POSTS & CONTENT

### 🔐 III-1. Posts Are Immutable Facts

* Timestamp never changes
* Author never changes
* Content edits forbidden
* Soft delete only

---

### 🔐 III-2. Duplicate Consecutive Posts Forbidden

* Same author
* Same normalized content
* Immediate prior post

Must be rejected server-side.

---

### 🔐 III-3. Deletions Are Soft

* Hidden from feed
* Still exist for moderation
* Never resurrect automatically

---

## IV. REACTIONS & INTERACTIONS

### 🔐 IV-1. One Reaction Per User Per Post

Allowed:

* NONE
* LIKE
* DISLIKE

Forbidden:

* LIKE + DISLIKE
* Multiple rows
* Parallel states

---

### 🔐 IV-2. Reaction State Is Authoritative

* Reactions are **state**, not events
* Counts are derived
* Clients never guess

---

### 🔐 IV-3. Reaction Operations Are Idempotent

* Retry-safe
* Order-independent
* Batch-safe
* Offline-safe

---

### 🔐 IV-4. Final Reaction State Always Wins

Intermediate toggles are irrelevant.

---

### 🔐 IV-5. Reaction Rate Limits Are Semantic

* Max 4 presses per post per window
* Press-based, not request-based
* Enforced client + server

---

## V. COMMENTS, QUOTES, REPOSTS

### 🔐 V-1. Replies Are Posts

* Same invariants
* Same immutability
* Same reaction rules

---

### 🔐 V-2. Quotes Reference, Never Copy

* Quote references original post
* Deleting original does not delete quote
* Quote integrity preserved

---

### 🔐 V-3. Reposts Are Lightweight References

* No content duplication
* No counter inflation

---

## VI. OFFLINE & CONSISTENCY

### 🔐 VI-1. Offline State Buffers Facts, Not Events

* Store final intended state
* Replay safely
* Deduplicate naturally

---

### 🔐 VI-2. Server Is Always Final Authority

* Client optimism is temporary
* Server reconciliation wins
* UI must snap back if wrong

---

### 🔐 VI-3. App Restarts Must Be Safe

* Buffers persist
* Replays are idempotent
* No corruption

---

## VII. REALTIME (ANNOTATIVE ONLY)

### 🔐 VII-1. Realtime Never Reorders Feed

* No insertions
* No removals
* No ranking

---

### 🔐 VII-2. Realtime Is Best-Effort

* Failure is acceptable
* Refresh reconciles
* Offline wins

---

### 🔐 VII-3. Presence Is Approximate

* No guarantees
* Auto-expire
* No timestamps

---

## VIII. TRUST & SAFETY

### 🔐 VIII-1. Moderation Is Content-Based

* Not user-based
* Not reputation-based

---

### 🔐 VIII-2. Enforcement Is Graduated

* Label → limit → suspend
* No instant hard bans without review

---

### 🔐 VIII-3. Shadow Moderation Is Soft

Allowed:

* Deprioritization
* Search reduction

Forbidden:

* Count tampering
* Feed reordering
* Silent hard bans

---

### 🔐 VIII-4. Appeals Must Exist

* Reason provided
* Duration specified
* Reversible outcomes

---

## IX. RATE LIMITING

### 🔐 IX-1. Limits Are Uniform

* Same limits for all users
* Transparent
* Time-based

---

### 🔐 IX-2. Limits Protect the System, Not Punish

* Temporary
* Predictable
* Recoverable

---

## X. OBSERVABILITY & OPERATIONS

### 🔐 X-1. Metrics Do Not Affect Behavior

* Metrics observe
* Policies decide

---

### 🔐 X-2. Kill-Switches Preserve Semantics

* Reduce load
* Never change meaning

---

## XI. EXPLICITLY FORBIDDEN (ABSOLUTE)

🚫 Feed ranking
🚫 Paid reach
🚫 Tiered trust
🚫 Engagement weighting
🚫 Reaction multipliers
🚫 Client-trusted counts
🚫 Realtime-driven feed changes
🚫 Monetized moderation
🚫 Algorithmic favoritism

---

## 🧠 FINAL DOCTRINE (PIN THIS)

> **Facts are immutable.
> State is authoritative.
> Chronology is sacred.
> Users are equal.**

If you ever feel tempted to “improve” one of these, stop.
That’s how Twitter broke.

---

If you want next, I can:

* Convert this into a **`INVARIANTS.md`** file
* Create a **PR rejection checklist**
* Write a **“what breaks at scale” addendum**
* Produce a **launch-readiness signoff doc**

Just say the word.


###############################

the **`INVARIANTS.md`** 

### ✅ What you should do next (recommended)

1. **Pin this file** in your repo (root-level or `/docs/INVARIANTS.md`)
2. Treat it as:

   * A **design constitution**
   * A **PR rejection reference**
   * A **new-dev onboarding artifact**
3. Any future feature discussion should start with:

   > “Which invariant does this touch?”

### 🔒 How teams actually use this file

* PR template includes:
  **“Does this change violate any invariant? If yes, which one and why?”**
* Incident reviews reference invariant IDs (e.g. *II-1 violated: chronology reordered*)
* Kill-switches are validated against **X-2**

You now have something most teams only write **after** breaking production.

