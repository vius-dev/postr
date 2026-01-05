# 🛡️ PHASE-5 APP GENERATION PROMPT

**(Abuse Prevention · Moderation · Visibility Controls · Safety)**

---

## 🎯 Objective

Extend the existing Expo + Supabase Twitter-like app to support:

* Abuse prevention primitives
* Content moderation workflows
* User-level visibility controls
* Shadow bans and soft enforcement
* Reporting and safety tooling
* Rate limiting beyond reactions

❗This phase **must not** modify:

* Feed ordering semantics
* Reaction invariants
* Offline batching logic
* Cache or replica strategies

Correctness and safety must coexist.

---

## 🧠 Non-Negotiable Safety Invariants

1. Moderation actions **must not break feed chronology**
2. Bans and blocks **must not leak visibility**
3. Shadow bans must be **indistinguishable to the offender**
4. Reports must never alter content immediately
5. Safety enforcement must be **server-authoritative**
6. No moderation action is client-trusted

If any of these fail, the implementation is unsafe.

---

## 🧩 Scope of Phase-5

### INCLUDED

* User blocks & mutes
* Content reporting
* Rate limits (posting, following)
* Shadow bans & soft locks
* Visibility filters
* Moderation queues (internal)

### EXCLUDED

* ML content detection
* Ads moderation
* Appeals system
* Public transparency reports
* Automated takedowns

---

## 🚫 Abuse Prevention (Foundational)

### Posting Rate Limits

Define **intent-based limits**:

* Posts per minute
* Replies per minute
* Quotes per minute
* Follows per minute

Rules:

* Enforced server-side
* Soft client hints allowed
* Limits apply offline → online reconciliation

---

### Duplicate & Near-Duplicate Detection

* Enforce **exact duplicate rejection**
* Detect rapid near-duplicate posts (normalized text)
* Apply cooldowns silently

---

## 👤 User-Level Controls

### Blocks

Blocked user effects:

* Their posts excluded from feed
* Their reactions ignored
* They cannot reply or interact
* Block is bidirectional in feed visibility

Block table semantics:

* Soft-block allowed
* No client-side enforcement

---

### Mutes

Muted user effects:

* Their posts hidden from feed
* No notification suppression needed
* Muted users can still interact (unless blocked)

---

## 🧱 Visibility States (Critical)

Define user visibility flags:

* `is_active`
* `is_limited`
* `is_shadow_banned`
* `is_suspended`

### Shadow Ban Rules

Shadow-banned users:

* Can post, react, follow
* See their own content normally
* Their content is excluded from others’ feeds
* No error or warning shown

This must be **invisible to the user**.

---

## 🚨 Reporting System

### Report Types

Users can report:

* Post
* Reply
* User profile

Report reasons:

* Spam
* Harassment
* Hate
* Misinformation
* Other

---

### Report Handling Rules

* Reporting never removes content immediately
* Reports enter moderation queue
* Rate-limit report submissions
* Duplicate reports are deduplicated

---

## 🧑‍⚖️ Moderation Queue (Internal)

Moderators can:

* View reported content
* View reporter history
* Apply actions:

  * No action
  * Warn
  * Limit
  * Shadow ban
  * Suspend
  * Delete content

Moderation actions:

* Logged
* Auditable
* Timestamped

---

## 🔍 Feed-Time Enforcement

Feed engine must:

* Filter blocked users
* Filter muted users
* Filter shadow-banned users
* Filter suspended users
* Filter deleted content

⚠️ This happens **after feed assembly**, before delivery.

---

## 🧪 Required Edge Cases

Must handle:

* Mutual blocks
* Block + mute overlaps
* Shadow ban during offline posting
* Report spam abuse
* Moderator action during active session
* Cached feed with newly banned user

---

## 📊 Observability & Safety Metrics

Track:

* Posts rejected (rate limit / duplicate)
* Shadow ban applications
* Reports per user
* False report attempts
* Moderation action frequency
* Safety filter latency

Metrics only — no UI yet.

---

## 🚫 Explicitly Forbidden

* Client-side moderation
* Immediate takedown on report
* User-visible shadow ban indicators
* Feed reordering for moderation
* Silent hard deletes without logs

---

## 🧠 Final Instruction to Generator

> Make abuse expensive.
>
> Make enforcement invisible.
>
> Never break user trust or feed truth.
