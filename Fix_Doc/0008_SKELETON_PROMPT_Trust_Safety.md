❌ **No Plus / Pro tiers**
❌ **No paid feature gating**
❌ **No subscription-based privileges**
❌ **No paid analytics**
❌ **No paid content moderation**
❌ **No reach manipulation via payment**

✅ Every user = equal capabilities
✅ Monetization existed **outside** the core app
✅ Growth & safety > revenue
✅ Ads were *external to feed logic*
✅ Feature flags were **engineering-only**

We’re designing a **public square**, not a SaaS.

> **Trust, Safety, and Platform Integrity**

This is the **last required phase** before scale.

---

# 🛡️ PHASE-8 APP GENERATION PROMPT

**(Trust · Safety · Moderation · Abuse Resistance)**

---

## 🎯 Objective

Introduce **platform governance systems** that:

* Protect users
* Preserve speech
* Prevent abuse
* Scale safely

Without changing:

* Feed order
* Reaction semantics
* User equality
* UI fairness

---

## 🧠 Core Invariants (Non-Negotiable)

1. **All users are equal**
2. No hidden penalties or boosts
3. Moderation is **content-based**, not user-based
4. Enforcement is **graduated**, not binary
5. Feed semantics remain untouched
6. Shadow moderation is **soft and reversible**

---

## 🧩 Scope of Phase-8

### INCLUDED

* Reporting system
* Moderation queues
* Content labeling
* Visibility filtering
* Rate-limit enforcement
* Abuse heuristics
* Soft enforcement mechanisms

### EXCLUDED

* Monetization
* Paid features
* User ranking
* Feed manipulation
* Reputation scores

---

## 🚨 Reporting System

### Reportable Entities

* Post
* Reply
* Quote
* User
* Media

### Report Types

* Spam
* Harassment
* Hate
* Misinformation
* Violence
* Self-harm
* Other

Reports are **append-only** facts.

---

## 🧠 Moderation Pipeline (Conceptual)

```
User Report
   ↓
Triage Queue
   ↓
Human Review OR Auto-Action
   ↓
Enforcement Decision
```

---

## 🧱 Enforcement Ladder (Graduated)

| Level | Action                       |
| ----- | ---------------------------- |
| 0     | No action                    |
| 1     | Label content                |
| 2     | Reduce distribution (soft)   |
| 3     | Temporary interaction limits |
| 4     | Temporary suspension         |
| 5     | Permanent suspension         |

❗ No instant bans without review.

---

## 👻 Shadow Moderation (Soft)

Allowed behaviors:

* Content visible to author
* Content de-prioritized (NOT removed)
* Search visibility reduced
* Reply reach limited

Forbidden:

* Hiding reactions
* Altering counts
* Secret feed reordering
* Silent hard bans

---

## 🧪 Abuse Detection (Heuristic Only)

Signals (non-ML, deterministic):

* Rapid posting
* Duplicate content
* Reaction spam
* Mention floods
* Report velocity

Used only to:

* Trigger review
* Apply temporary limits

Never auto-ban.

---

## 🔒 Rate Limits (Enforced Globally)

* Post creation
* Reactions
* Follows
* Mentions
* Reports

Limits are:

* Uniform
* Transparent
* Time-based

---

## 🧩 Visibility Labels (Pre-2023 Accurate)

Examples:

* “This Tweet may contain sensitive content”
* “This Tweet is under review”
* “This account is temporarily limited”

Labels **do not alter feed ordering**.

---

## 🔁 Appeal System

Required:

* Every enforcement has:

  * Reason
  * Duration
  * Appeal path

Appeals are:

* Logged
* Reviewable
* Reversible

---

## 📊 Moderation Observability

Track:

* Reports per entity
* False positive rate
* Appeal success rate
* Time-to-decision
* Enforcement distribution

---

## 🚫 Explicitly Forbidden

* Monetized moderation
* Paid appeals
* Reputation scores
* Tiered trust
* “Pay to be heard”
* Engagement-based penalties

---

## 🧠 Final Instruction to Generator

> **Trust is infrastructure, not a product.**

Build moderation as **rails**, not **levers**.

---

## 🏁 You Are Now Architecturally Complete

At this point you have:

1. Feed correctness (Phase-1–4)
2. Reactions & interactions (Phase-5)
3. Offline & batching (Phase-6)
4. Realtime awareness (Phase-7)
5. Trust & safety (Phase-8)

This is a **true pre-2023 Twitter-class system**.

---

