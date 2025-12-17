Below is a **high-quality, prompt** to generate a **Twitter-like MVP app skeleton** **before** implementing feed logic, reactions, or scaling optimizations.

This prompt is deliberately **opinionated, minimal, and correctness-first**, aligned with everything I’ve designed so far.

---

# 🧩 APP SKELETON GENERATION PROMPT

*(React Native Expo + Supabase · Twitter-like pre-2023)*

*** Do not use Tweet, Tweets, and Retweets, Retweet
*** Tweet, Tweets = Post / Posts and Retweets, Retweet = Reposts / Repost
---

## 🎯 Objective

Generate the **initial application skeleton** for a **mobile-first, Twitter-like app (pre-2023 semantics)** using **Expo (React Native) and Supabase**, focusing on:

* Correct architectural boundaries
* Deterministic state handling
* Offline-safe foundations
* Future scalability

❗ **No business logic, SQL, or feed algorithms yet** — only structure, contracts, and placeholders.

---

## 🧱 Tech Stack Constraints

* Expo (managed workflow)
* React Native + TypeScript
* Supabase (auth, database, storage, realtime)
* No external state library required yet (React state only)
* FlatList for feeds
* Modular folder architecture

---

## 🧠 Design Principles (Non-Negotiable)

* Chronology-first feed model
* One reaction per user per post (LIKE / DISLIKE / NONE)
* Reactions are **state**, not events
* Feed reads are fan-out-on-read
* Offline-first UX assumptions
* No framework lock-in
* Deterministic UI behavior

---

## 📁 Required Project Structure

Generate the following **empty or stubbed structure**:

```
src/
├─ app/
│  ├─ (auth)/
│  │  ├─ login.tsx
│  │  └─ register.tsx
│  ├─ (feed)/
│  │  ├─ index.tsx           # Home feed screen
│  │  └─ post.tsx            # Post detail screen
│  ├─ (compose)/
│  │  └─ compose.tsx         # New post screen
│  ├─ (profile)/
│  │  └─ [username].tsx
│  └─ _layout.tsx
│
├─ components/
│  ├─ PostCard.tsx
│  ├─ ReactionBar.tsx
│  ├─ FeedList.tsx
│  └─ EmptyState.tsx
│
├─ lib/
│  ├─ supabase.ts            # Supabase client
│  ├─ api.ts                 # API abstraction (no logic)
│  └─ network.ts             # Online/offline detection
│
├─ state/
│  ├─ feed.ts                # Feed state contract only
│  ├─ reactions.ts           # Reaction state contract only
│  └─ offlineQueue.ts        # Stub for buffering
│
├─ types/
│  ├─ post.ts
│  ├─ reaction.ts
│  ├─ user.ts
│  └─ feed.ts
│
├─ utils/
│  ├─ time.ts
│  ├─ normalizeText.ts       # for duplicate-post prevention
│  └─ guards.ts
│
└─ constants/
   ├─ limits.ts              # rate limits, page sizes
   └─ flags.ts               # kill switches
```

---

## 🧩 Screen Requirements (Skeleton Only)

### Feed Screen

* FlatList with placeholder posts
* Cursor-based pagination stub
* Loading / empty / error states
* No sorting logic yet

### PostCard Component

* Displays:

  * Author
  * Text
  * Timestamp
* Includes ReactionBar (stub only)
* No real interaction logic yet

### ReactionBar Component

* Like / Dislike buttons
* Disabled/enabled states only
* No backend calls yet

### Compose Screen

* Text input
* Submit button
* Placeholder submit handler
* Hook for **duplicate-text rejection** (not implemented)

---

## 🔌 Supabase Integration (Stubbed)

* Initialize Supabase client
* Auth provider wrapper
* No queries or mutations yet
* All calls go through `lib/api.ts`

---

## 🧠 State Contracts (Important)

Define **types only**, no logic:

### Reaction State

```ts
type UserReaction = 'LIKE' | 'DISLIKE' | null
```

### Feed Item

```ts
type FeedPost = {
  id: string
  author: User
  content: string
  createdAt: string
  likeCount: number
  dislikeCount: number
  userReaction: UserReaction
}
```

---

## 🛑 Explicitly Do NOT Implement

* SQL
* Feed ranking
* Reaction logic
* Caching
* Offline replay
* Kill-switch logic
* Analytics
* Push notifications

Only prepare **hooks and placeholders**.

---

## ✅ Output Expectations

* Fully compilable Expo project
* Type-safe TypeScript
* Clean separation of concerns
* Readable comments explaining future intent
* No magic numbers
* No premature optimizations

---

## 🧠 Final Instruction to the Generator

> Build the **safest possible foundation**, not the smartest logic.
> This code will evolve — correctness comes first.