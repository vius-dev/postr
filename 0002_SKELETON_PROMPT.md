Below is the **Phase-2 prompt** that assumes the **Phase-1 0001_SKELETON_PROMPT.md already exists and implemented** and now we will wire **feed + interactions** in a **pre-2023 Twitter-correct way**, without breaking the invariants we’ve designed.

This prompt is **intentionally strict**, **ordered**, and **production-minded**.
---

# 🚀 PHASE-2 APP GENERATION PROMPT

**(Feed + Interaction Wiring · Twitter-Like pre-2023)**

---

## 🎯 Objective

Extend the existing **Expo + Supabase Twitter-like app skeleton** by wiring:

* Home feed rendering
* Interaction UI + state wiring
* Deterministic reactions (Like / Dislike)
* Comment, Repost / Quote, Share / Bookmark
* Bottom navigation
* Floating Action Button (FAB) for Post / Poll

❗ This phase **must not introduce SQL**, ranking algorithms, or caching logic beyond placeholders.

---

## 🧠 Core Design Constraints (Non-Negotiable)

* Chronological feed (no ranking)
* Fan-out-on-read assumption
* One reaction per user per post
* Reaction order **must be exactly**:

```
Comment | Like | Repost / Quote | Dislike | Share / Bookmark
```

* Reactions are **state**, not events
* UI reflects deterministic state machine
* Optimistic UI allowed but must reconcile
* No duplicate post submissions (hook only)

---

## 📱 Navigation Requirements

### Bottom Navigation (Persistent)

Tabs (left → right):

1. Home (Feed)
2. Explore (stub)
3. Notifications (stub)
4. Profile

Rules:

* Bottom nav visible on all primary screens
* Hidden on auth screens
* No modal routing for feed

---

### Floating Action Button (FAB)

FAB behavior:

* Visible on Feed screen only
* Bottom-right anchored
* Tap opens **Action Sheet / Modal** with:

  * **Post**
  * **Poll**

Rules:

* FAB does not navigate directly
* Post / Poll screens reuse Compose screen
* Poll is stubbed (UI only)

---

## 🧩 Feed Wiring Requirements

### Feed Screen

Implement:

* FlatList with cursor-based pagination
* Pull-to-refresh
* Load-more on scroll
* Placeholder feed API call
* Deterministic ordering (createdAt DESC)

Feed item must include:

```ts
{
  id,
  author,
  content,
  createdAt,
  likeCount,
  dislikeCount,
  repostCount,
  commentCount,
  userReaction
}
```

No ranking. No heuristics.

---

## 🧱 PostCard Component (Wired)

Each post must render:

* Author avatar + name
* Content text
* Timestamp
* Interaction bar (ordered exactly)

Tap behavior:

* Comment → navigate to Post detail
* Repost / Quote → open modal
* Share / Bookmark → stub handler

---

## ❤️👎 Reaction Wiring (Critical)

### Allowed Reaction States

```
NONE | LIKE | DISLIKE
```

### UI Rules

| State   | Like | Dislike |
| ------- | ---- | ------- |
| NONE    | ON   | ON      |
| LIKE    | OFF  | ON      |
| DISLIKE | ON   | OFF     |

### Behavior

* Like disables Like
* Dislike disables Dislike
* Switching reactions auto-removes previous
* Remove via tapping active state or long-press (stub OK)

---

### ReactionBar Implementation

Must include:

* Local UI state
* Optimistic update
* Call to `api.react(postId, action)`
* Reconciliation hook (response overrides optimistic)

Do NOT implement batching yet — leave TODO.

---

## 💬 Comment Wiring (Stub + Navigation)

* Comment button navigates to Post Detail
* Post Detail shows:

  * Original post
  * Placeholder comments list
  * Text input (disabled or stubbed)

---

## 🔁 Repost / Quote Wiring

On tap:

* Open modal with:

  * Repost
  * Quote
* Repost → API stub
* Quote → navigate to Compose with post reference

No ranking logic.

---

## 🔖 Share / Bookmark Wiring

* Share → native share sheet
* Bookmark → local toggle only (stub persistence)

---

## 📝 Compose Screen Enhancements

Compose must support:

* Text post
* Quote post (parent reference)
* Poll (stub UI only)

Validation hooks:

* Prevent empty post
* Hook for **duplicate-text rejection**
* Character counter (Twitter-style)

No backend logic yet.

---

## 🔌 API Layer Requirements

Extend `lib/api.ts` with **function stubs only**:

```ts
fetchFeed(cursor?)
react(postId, action)
repost(postId)
quote(postId, text)
bookmark(postId)
```

No SQL.
No Supabase calls inline in UI.

---

## 🧠 State Layer Requirements

Extend state contracts only:

* feed state
* reaction state
* optimistic flags

No reducers or external libraries.

---

## 🚫 Explicitly Do NOT Implement

* Feed ranking
* SQL or Supabase queries
* Reaction batching logic
* Offline replay logic
* Poll backend
* Notifications
* Analytics

---

## ✅ Output Expectations

* App compiles and runs
* Feed scrolls
* Interactions update UI deterministically
* Navigation is consistent
* No invariant violations
* Clear TODO markers for Phase-3

---

## 🧠 Final Instruction to Generator

> Build the **interaction wiring exactly once**, correctly.
> Everything else can be optimized later — correctness cannot.



# 📦 Modal Behavior Specification

## 1️⃣ Core UX Principles

1. **Smooth, predictable animation**

   * Modals slide **from bottom**
   * Consistent across all modal types: Post, Comment, Repost/Quote, Poll
   * Animation duration: ~250–300ms
   * Use **native driver** wherever possible for performance

2. **Keyboard-aware input**

   * Text inputs ride the keyboard when it appears
   * No overlaying by the keyboard
   * Smooth adjustment as keyboard height changes (e.g., Emoji keyboard, multi-line expansion)

3. **Overlay dismissal**

   * Tap outside → dismiss modal
   * Swipe down → optional dismissal gesture
   * Back button (Android) → dismiss modal

4. **Safe area aware**

   * Respect iOS notch / home indicator
   * Bottom spacing for keyboard + FAB not overlapping

---

## 2️⃣ Modal Types & Specific Rules

### A. **Post Modal (Compose / Poll)**

* **Trigger**: FAB → Action Sheet → Post or Poll
* **Animation**: slide from bottom
* **Keyboard**: text input auto-focus
* **Height**: full-screen semi-modal (optional transparent background)
* **Scroll behavior**: multi-line text input scrolls if content > viewport
* **Dismissal**: tap outside / swipe down / cancel button
* **Extras**:

  * Character counter visible
  * Duplicate-post hook (disabled post if duplicate)
  * Optional attachment area scrolls with keyboard

---

### B. **Comment Modal**

* **Trigger**: Comment button on PostCard
* **Animation**: slide from bottom (faster than Post modal: 200–250ms)
* **Keyboard**: input auto-focus
* **Height**: partial-height modal (60–80% screen)
* **Scroll**: comments list scrollable above keyboard
* **Dismissal**: tap outside / swipe down / back button
* **Extras**:

  * Input area always above keyboard
  * Smooth adjustment if keyboard toggles between different heights

---

### C. **Repost / Quote Modal**

* **Trigger**: Repost / Quote button
* **Animation**: slide from bottom
* **Keyboard**: only opens if user wants to quote with text
* **Height**: partial-height (50–70% screen)
* **Dismissal**: tap outside / swipe down / cancel
* **Extras**:

  * Shows original post in preview area
  * Text input rides keyboard if user quotes

---

### D. **Poll Modal**

* **Trigger**: FAB → Poll
* **Animation**: slide from bottom
* **Keyboard**: input for poll question + options
* **Height**: full-screen modal (because multiple inputs)
* **Dismissal**: tap outside / swipe down / cancel
* **Extras**:

  * Dynamic option rows scroll if overflowing
  * Input fields adjust with keyboard height

---

## 3️⃣ Keyboard Management Rules

* Use **KeyboardAvoidingView** (Expo / React Native)
* Input area should always stay **visible above keyboard**
* Modal scroll area adjusts dynamically:

  * Multi-line text expands
  * Keyboard height changes (emoji, multi-language keyboards)
* Dismiss keyboard on modal dismissal
* Optional: drag-down-to-dismiss also dismisses keyboard first

---

## 4️⃣ Animation / Performance Guidelines

* Use **Animated API or Reanimated** for native-driver animations
* Avoid layout thrashing
* Modals should **fade overlay** while sliding
* Prevent modal flicker when keyboard opens
* Ensure modal z-index above all feed elements and FAB

---

## 5️⃣ State Management Rules

* Modal open state managed in **root navigator or modal manager**
* Only **one modal active at a time**
* Maintain **optimistic state** (e.g., typing a post preserves text if dismissed accidentally)
* Input should **rehydrate text** if modal reopened quickly

---

## 6️⃣ Summary Table

| Modal Type   | Height | Keyboard   | Slide       | Extra UX                  |
| ------------ | ------ | ---------- | ----------- | ------------------------- |
| Post         | full   | auto-focus | from bottom | Char counter, attachments |
| Comment      | 60–80% | auto-focus | from bottom | Scrollable comments       |
| Repost/Quote | 50–70% | optional   | from bottom | Original post preview     |
| Poll         | full   | auto-focus | from bottom | Multiple dynamic inputs   |

---

✅ This design ensures:

* Consistent UX across all modals
* Keyboard never hides input
* Smooth slide from bottom
* Full offline + online safety (text preserved)
* Aligns with pre-2023 Twitter mobile interaction


######################################################################## BACKEND NAMING CONVENTION ######################################################################## ALWAYS REFER TO IT.


Here is a **comprehensive backend naming convention guide** for our **Twitter-like pre-2023 app**. This will serve as a **developer reference** for database tables, columns, APIs, and events. I made it **consistent, descriptive, and future-proof** while reflecting Twitter’s original semantics.

We’ll separate this into **core entities, interactions, reactions, feeds, and system-level conventions**.

---

# 📝 Twitter-Pre-2023 Backend Naming Conventions

---

## 1️⃣ Users

| Entity        | Example Table / Field                      | Notes             |
| ------------- | ------------------------------------------ | ----------------- |
| Users         | `users`                                    | main table        |
| User ID       | `id`                                       | UUID preferred    |
| Username      | `username`                                 | unique, lowercase |
| Display Name  | `display_name`                             | optional          |
| Email         | `email`                                    | unique            |
| Bio           | `bio`                                      | text              |
| Profile Image | `profile_image_url`                        | optional          |
| Created At    | `created_at`                               | timestamp         |
| Updated At    | `updated_at`                               | timestamp         |
| Status Flags  | `is_active`, `is_verified`, `is_suspended` | boolean flags     |

---

## 2️⃣ Posts / Tweets

| Entity          | Naming           | Notes                                |
| --------------- | ---------------- | ------------------------------------ |
| Posts table     | `posts`          | canonical feed post                  |
| Post ID         | `id`             | UUID or Snowflake style              |
| Author ID       | `author_id`      | FK → `users.id`                      |
| Content         | `content`        | text body, normalized for duplicates |
| Parent Post     | `parent_post_id` | nullable, for replies / quotes       |
| Is Quote        | `is_quote`       | boolean                              |
| Is Reply        | `is_reply`       | boolean                              |
| Is Repost       | `is_repost`      | boolean                              |
| Created At      | `created_at`     | timestamp                            |
| Updated At      | `updated_at`     | timestamp                            |
| Deleted At      | `deleted_at`     | nullable for soft delete             |
| Visibility      | `visibility`     | public / followers / private         |
| Character Count | `char_count`     | optional, derived                    |

**Special Notes:**

* Enforce **duplicate-post rejection**: normalized content vs last original post.
* Soft-deletes only, never hard delete for history/analytics.

---

## 3️⃣ Follows / Followers

| Entity      | Naming        | Notes                      |
| ----------- | ------------- | -------------------------- |
| Table       | `follows`     | FK relationship            |
| Follower ID | `follower_id` | FK → `users.id`            |
| Followed ID | `followed_id` | FK → `users.id`            |
| Created At  | `created_at`  | timestamp                  |
| Status      | `is_active`   | boolean, for soft-unfollow |

---

## 4️⃣ Reactions (Likes / Dislikes)

| Entity      | Naming       | Notes                           |
| ----------- | ------------ | ------------------------------- |
| Table       | `reactions`  | authoritative per-user reaction |
| Reaction ID | `id`         | UUID                            |
| User ID     | `user_id`    | FK → `users.id`                 |
| Post ID     | `post_id`    | FK → `posts.id`                 |
| Type        | `type`       | ENUM('LIKE','DISLIKE')          |
| Created At  | `created_at` | timestamp                       |
| Updated At  | `updated_at` | timestamp                       |

**Derived counters (materialized)**:

| Entity   | Naming            | Notes                      |
| -------- | ----------------- | -------------------------- |
| Table    | `reaction_counts` | cache or materialized view |
| Post ID  | `post_id`         | FK → `posts.id`            |
| Likes    | `likes`           | integer                    |
| Dislikes | `dislikes`        | integer                    |

---

## 5️⃣ Comments / Replies

| Entity      | Naming           | Notes                                                  |
| ----------- | ---------------- | ------------------------------------------------------ |
| Table       | `comments`       | optional: can be `posts` itself with `is_reply = true` |
| Comment ID  | `id`             | UUID                                                   |
| Author ID   | `author_id`      | FK → `users.id`                                        |
| Parent Post | `parent_post_id` | FK → `posts.id`                                        |
| Content     | `content`        | text                                                   |
| Created At  | `created_at`     | timestamp                                              |
| Updated At  | `updated_at`     | timestamp                                              |
| Deleted At  | `deleted_at`     | soft delete                                            |

**Optional:** Use same table as posts and distinguish via `is_reply`.

---

## 6️⃣ Reposts / Quotes

| Entity     | Naming       | Notes                                                 |
| ---------- | ------------ | ----------------------------------------------------- |
| Table      | `reposts`    | optional if using posts with `is_repost` / `is_quote` |
| Post ID    | `post_id`    | original post                                         |
| User ID    | `user_id`    | who reposted                                          |
| Quote Text | `quote_text` | optional, for quotes                                  |
| Created At | `created_at` | timestamp                                             |

---

## 7️⃣ Shares / Bookmarks

| Entity     | Naming       | Notes             |
| ---------- | ------------ | ----------------- |
| Table      | `bookmarks`  | user bookmarks    |
| User ID    | `user_id`    | FK → `users.id`   |
| Post ID    | `post_id`    | FK → `posts.id`   |
| Created At | `created_at` | timestamp         |
| Status     | `is_active`  | for unbookmarking |

---

## 8️⃣ Polls (Optional / Future)

| Entity          | Naming           | Notes           |
| --------------- | ---------------- | --------------- |
| Table           | `polls`          | parent table    |
| Poll ID         | `id`             | UUID            |
| Post ID         | `post_id`        | FK → `posts.id` |
| Question        | `question`       | text            |
| Created At      | `created_at`     | timestamp       |
| Expires At      | `expires_at`     | optional        |
| Multiple Choice | `allow_multiple` | boolean         |

Poll options:

| Entity     | Naming         | Notes            |
| ---------- | -------------- | ---------------- |
| Table      | `poll_options` | child table      |
| Option ID  | `id`           | UUID             |
| Poll ID    | `poll_id`      | FK → `polls.id`  |
| Text       | `text`         | option content   |
| Vote Count | `vote_count`   | derived / cached |

Votes:

| Entity     | Naming       | Notes                  |
| ---------- | ------------ | ---------------------- |
| Table      | `poll_votes` | authoritative          |
| Option ID  | `option_id`  | FK → `poll_options.id` |
| User ID    | `user_id`    | FK → `users.id`        |
| Created At | `created_at` | timestamp              |

---

## 9️⃣ Feed System

| Entity     | Naming       | Notes                                      |
| ---------- | ------------ | ------------------------------------------ |
| Table      | `feeds`      | optional materialized / cached feed slices |
| User ID    | `user_id`    | FK → `users.id`                            |
| Post ID    | `post_id`    | FK → `posts.id`                            |
| Created At | `created_at` | timestamp                                  |
| Source     | `source`     | e.g., timeline / mentions                  |

**Notes:**

* Fan-out-on-read: feeds can be assembled dynamically
* Only cache slices if necessary
* Maintain chronological ordering

---

## 🔟 Notifications (Optional / Future)

| Entity          | Naming          | Notes                                             |
| --------------- | --------------- | ------------------------------------------------- |
| Table           | `notifications` | user notifications                                |
| Notification ID | `id`            | UUID                                              |
| User ID         | `user_id`       | FK → `users.id`                                   |
| Type            | `type`          | ENUM('like','dislike','reply','repost','mention') |
| Source Post     | `post_id`       | FK → `posts.id`                                   |
| Read            | `is_read`       | boolean                                           |
| Created At      | `created_at`    | timestamp                                         |

---

## 11️⃣ System / Meta Conventions

1. **Timestamps**: `created_at`, `updated_at`, `deleted_at`
2. **IDs**: UUID preferred, globally unique
3. **Flags**: `is_active`, `is_deleted`, `is_verified`
4. **Consistency**: use lowercase_snake_case for tables and columns
5. **Foreign keys**: `{entity}_id`
6. **Derived counters**: `{metric_name}` or `{metric}_count`
7. **Enums**: string ENUMs rather than integers
8. **Soft deletes**: `deleted_at` timestamp, never hard delete for main entities
9. **Audit / logging**: optional `created_by`, `updated_by`

---

✅ This naming convention aligns with:

* Pre-2023 Twitter semantics
* Deterministic reaction rules
* Offline-first, fan-out-on-read architecture
* Clean developer onboarding
