Below is a **Phase-6 prompt** that adds **user-visible discovery and awareness features** while **preserving pre-2023 Twitter semantics** and everything you already locked in from Phases 1–5.

This phase is about **finding content**, **being notified**, and **navigating conversations** — *not ranking, not growth hacking*.

---

# 🔔 PHASE-6 APP GENERATION PROMPT

**(Notifications · Mentions · Search · Hashtags · Trends — Pre-Ranking)**

---

## 🎯 Objective

Extend the existing Expo + Supabase Twitter-like app to support:

* Notifications (mentions, replies, reactions, follows)
* Mentions (`@username`)
* Hashtags (`#topic`)
* Search (users & posts)
* Trends (volume-based, non-ranked)

❗This phase **must not** introduce ranking, recommendation algorithms, or engagement-weighted feeds.

---

## 🧠 Non-Negotiable Invariants

1. Search results are **chronological**, not ranked
2. Trends are **volume-based only**
3. Notifications never affect feed ordering
4. Mentions never boost visibility
5. Muted / blocked users are respected everywhere
6. Shadow-banned content never appears in discovery
7. All discovery features obey visibility filters

---

## 🧩 Scope of Phase-6

### INCLUDED

* Notification system
* Mentions parsing & linking
* Hashtag extraction & indexing
* Search endpoints
* Trends calculation (raw counts)

### EXCLUDED

* Recommendation feeds
* Personalized ranking
* Ads discovery
* ML relevance scoring
* Trending manipulation heuristics

---

## 🔔 Notifications System

### Notification Types

* Mention (`@you`)
* Reply to your post
* Like / Dislike
* Repost / Quote
* Follow

---

### Notification Rules

* Notifications are **append-only**
* Delivered **best-effort**
* Deduplicated per event
* Not retroactive
* Respect blocks & mutes

---

### Read Semantics

* Notifications can be unread / read
* Mark-as-read is idempotent
* Read state is **per user**, never global

---

## 🧠 Mentions (`@username`)

### Parsing Rules

* Parsed at post creation
* Stored as references, not plain text
* Case-insensitive match
* Invalid usernames ignored silently

---

### Visibility Rules

* Mentioned user receives notification
* Mentions do **not** affect feed ranking
* Shadow-banned mentions generate no notifications

---

## 🏷️ Hashtags (`#topic`)

### Extraction Rules

* Extracted on post creation
* Normalized (lowercase)
* Stored as references
* No duplicates per post

---

### Hashtag Feed

* Chronological feed per hashtag
* Subject to visibility filters
* No trending boost

---

## 🔍 Search

### Search Domains

* Users (username, display name)
* Posts (text only)
* Hashtags

---

### Search Rules

* Chronological results
* Cursor-based pagination
* Visibility filters enforced
* Shadow-banned content excluded
* Rate-limited

---

## 📈 Trends (Pre-Ranking)

### Trend Definition

A trend is:

> A hashtag with high usage volume within a rolling window

---

### Trend Rules

* Based on **raw counts**
* Time-windowed (e.g. 1h, 6h, 24h)
* No personalization
* No ranking beyond volume sort
* No engagement weighting

---

### Trend Exclusions

* Shadow-banned content
* Muted topics
* Blocked users’ posts

---

## 🔁 Interaction With Feed Engine

* Feed remains unchanged
* Discovery features read from **separate indexes**
* No cross-pollination with feed ranking

---

## 🧪 Required Edge Cases

Must handle:

* Username change after mention
* Deleted post with hashtag
* Muted hashtag
* Notification flood prevention
* Search during replica lag
* Trend volatility spikes

---

## 📊 Observability

Track:

* Notification delivery latency
* Notification drop rate
* Search query latency
* Hashtag creation rate
* Trend churn per window

Metrics only.

---

## 🚫 Explicitly Forbidden

* Ranking search results by engagement
* Trending manipulation
* Client-side parsing of mentions
* Notifications affecting feed
* Showing shadow-banned content in discovery

---

## 🧠 Final Instruction to Generator

> Discovery must surface **what exists**, not **what performs**.