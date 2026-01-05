Below is a **clear, implementation-ready specification**.
It is written intentionally like a **system rule + invariants**, not prose, so it translates cleanly into backend logic, RLS rules, or on-device logic (which fits the project's architecture).

---

## POLL VOTING BEHAVIOR — CANONICAL RULESET

### 1. Core Rule (Non-Negotiable)

**A poll allows exactly ONE immutable vote per user, globally.**

* Once a user votes, that vote is **final**
* Votes **cannot be edited, replaced, or deleted**
* There is **no concept of “re-voting”**

---

### 2. Identity Scope

**Vote uniqueness is scoped to:**

```
(user_id, poll_id)
```

This pair must be **globally unique**.

* A user may vote in many polls
* A poll may have many voters
* A user may vote **only once per poll**

---

### 3. Global Consistency Across Post Variants

A poll may appear in multiple UI contexts:

* Original post
* Repost
* Quote post
* Timeline surfaced via likes, replies, or mutuals

**All appearances reference the SAME canonical poll.**

➡️ Voting state is **NOT scoped to a post instance**
➡️ Voting state is **ONLY scoped to the original poll ID**

---

### 4. Duplicate Vote Prevention

The system must enforce:

* ❌ No duplicate rows for `(user_id, poll_id)`
* ❌ No second vote attempt, regardless of source context
* ❌ No bypass via reposts, quotes, or likes

If a vote already exists:

* The vote UI must render as **locked**
* The previously selected option must be shown
* Vote counts should reflect the existing vote

---

### 5. Immutability Guarantee

Once a vote is recorded:

* It **must never change**
* It **must never be overwritten**
* It **must never be removed**
* There is **no update path**, only insert

The database or local store must treat votes as **append-only**.

---

### 6. Canonical Poll Resolution Logic

When a poll is rendered:

1. Resolve the **original poll ID**

   * Even if accessed via repost, quote, or share
2. Query for an existing vote:

   ```
   WHERE poll_id = X AND user_id = Y
   ```
3. If a record exists:

   * `hasVoted = true`
   * `selectedOption = stored option`
4. If no record exists:

   * `hasVoted = false`
   * Voting is allowed

---

### 7. Required Invariants (Must Always Hold True)

* A poll vote **belongs to the poll**, not the post
* A repost or quote **never creates a new poll**
* A user’s voting status **follows the poll everywhere**
* UI state is **derived**, never authoritative

---

### 8. Failure Handling

If a second vote attempt occurs:

* Backend must reject it deterministically
* Client must fall back to:

  * Fetching existing vote
  * Rendering locked state
* No partial or conflicting state is allowed

---

### 9. Data Model Constraints (Conceptual)

You must enforce at least ONE of:

* Unique constraint on `(user_id, poll_id)`
* Deterministic vote key: `vote_id = hash(user_id + poll_id)`
* Insert-only log with conflict rejection

---

### 10. Summary (One-Line Rule)

> **A user’s first vote on a poll is their only vote, everywhere, forever.**
