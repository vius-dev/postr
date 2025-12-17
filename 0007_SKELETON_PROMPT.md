Below is the **Phase-7 generation prompt**, completing the **real-time layer** of the pre-2023 Twitter-like app while respecting **every invariant** from Phases 1–6.

This phase adds **liveness**, not intelligence.

---

# ⚡ PHASE-7 APP GENERATION PROMPT

**(Realtime · Push Notifications · Live Updates · Presence)**

---

## 🎯 Objective

Extend the existing Expo + Supabase Twitter-like app to support:

* Realtime feed annotations
* Push notification delivery
* Live conversation updates
* Presence signals (lightweight)
* Typing indicators (scoped)

❗This phase **must not** introduce ranking, feed mutation, or client-trusted state.

---

## 🧠 Non-Negotiable Realtime Invariants

1. Realtime updates **annotate**, never reorder
2. Push notifications are **best-effort**
3. Missed realtime events reconcile on refresh
4. Presence is **approximate**, never authoritative
5. Realtime failure never breaks core UX
6. Offline behavior always wins over stale realtime

If realtime changes feed order or truth, the implementation is invalid.

---

## 🧩 Scope of Phase-7

### INCLUDED

* Supabase Realtime subscriptions
* Push notification delivery
* Live reaction count updates
* Live comment thread updates
* Typing indicators (replies only)
* Presence signals (online / recently active)

### EXCLUDED

* Live feed reordering
* Typing indicators for main feed
* Read receipts
* Active viewer counts
* Ephemeral content

---

## 🔄 Realtime Architecture

Introduce a **RealtimeCoordinator** abstraction.

```
RealtimeCoordinator
 ├─ FeedAnnotations
 ├─ ConversationChannel
 ├─ ReactionChannel
 ├─ PresenceChannel
 ├─ PushDispatcher
 └─ ReconciliationManager
```

Each channel is **optional**, **isolated**, and **fail-safe**.

---

## 📰 Realtime Feed Annotations

### What Updates Live

* Reaction counts (like / dislike)
* Reply count
* Repost / quote count

### Rules

* No post insertion
* No post removal
* No ordering changes
* Updates must be idempotent

If realtime fails → rely on refresh.

---

## 💬 Live Conversations

### Supported

* New replies appended
* Reaction count updates on replies
* Typing indicator (reply composer only)

### Typing Rules

* Visible only to participants
* Auto-expires (e.g. 3–5s)
* Never persisted
* Never replayed

---

## 👍 Live Reactions

* Reaction counts update in realtime
* Reaction state still reconciled from backend
* Offline reactions override realtime snapshots

---

## 🔔 Push Notifications

### Push-Eligible Events

* Mentions
* Replies
* Follows
* Quotes
* Reposts

---

### Push Rules

* Delivered best-effort
* Deduplicated
* Respect mutes & blocks
* No push for shadow-banned content
* Payload minimal (IDs only)

---

## 👤 Presence

### Presence States

* Online
* Recently active
* Offline

### Rules

* Approximate only
* No timestamps shown
* Auto-expire
* Not visible to blocked users

Presence must **never imply availability**.

---

## 🔁 Reconciliation

Client must:

* Reconcile realtime data with canonical backend state
* Resolve conflicts in favor of backend
* Ignore out-of-order events
* Refresh on reconnect

---

## 🧪 Required Edge Cases

Must handle:

* Realtime disconnect during posting
* Push received for deleted content
* Duplicate realtime events
* Offline → online transition
* Presence flapping
* Reaction updates during scroll

---

## 📊 Observability

Track:

* Realtime subscription drop rate
* Push delivery success
* Reconciliation conflicts
* Event lag
* Channel error rates

Metrics only.

---

## 🚫 Explicitly Forbidden

* Realtime feed mutation
* Client-authoritative reactions
* Persistent typing state
* Push-driven feed changes
* Presence as truth

---

## 🧠 Final Instruction to Generator

> Realtime adds **awareness**, not **authority**.