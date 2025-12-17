Below are **strict, pre-2023 Twitter Post Detail (Thread View) interaction rules**, translated directly into **Expo / React Native UI behavior**.

No backend. No data modeling. Just **what the screen is, how it behaves, and what taps do**.

---

# **Post Detail Screen — Interaction Rules**

## 1. What This Screen Is (Definition)

The **Post Detail Screen** is:

* A **thread context viewer**
* Centered on **one focal post**
* With **parent context above** and **replies below**

It is **not**:

* A feed
* A modal
* A single-post page

---

## 2. Screen Layout (Top → Bottom)

```
SafeAreaView
 └─ FlatList (single)
     ├─ ParentChain (0..n)
     ├─ FocalPost (highlighted)
     └─ Replies (0..n)
```

⚠️ **Invariant**

* Everything scrolls as **one list**
* No nested scroll views

---

## 3. Parent Chain Behavior (Above Focal Post)

### Rendering Rules

* Show **direct lineage only**
* No sibling replies
* Indented visually

### Interaction

* Avatar → profile
* Name → profile
* Body → post detail (that post becomes focal)

⚠️ **Critical**

> Tapping a parent post **replaces** the current focal post
> (pushes a new Post Detail screen)

---

## 4. Focal Post (Centerpiece)

### Visual Difference

* Slight highlight (background tint)
* No “Pinned” label
* Full metadata visible

### Interaction

* Avatar → profile
* Name → profile
* Body → **no navigation** (already here)
* Timestamp → no navigation

⚠️ **Invariant**

* Focal post body is **not tappable**

---

## 5. Replies (Below Focal Post)

### Rendering Rules

* Reverse chronological
* Indented by reply depth
* Thread lines optional (visual only)

### Interaction

* Avatar → profile
* Name → profile
* Body → post detail (that reply becomes focal)

⚠️ **Invariant**

* Replies behave like feed posts **except** indentation

---

## 6. Quoted Posts Inside Thread

Quoted posts behave **independently**:

* Tap quoted body → quoted post detail
* Tap quoted avatar/name → quoted author profile

No special casing.

---

## 7. Action Buttons (All Posts)

### Behavior

* Reply
* Repost
* Like

All work inline.

⚠️ **Invariant**

* Action buttons never navigate
* No action opens modals here (except repost options)

---

## 8. Reply Composer Entry

### How to Enter

* Tap reply icon on focal post
* Tap reply icon on any reply

### UX

* Navigates to composer screen
* Shows context (replying to @user)
* On submit:

  * Return to thread
  * New reply appears inline (optimistic)

---

## 9. Scroll & Navigation Semantics

### Entering Post Detail

* Scroll position starts at top of parent chain
* Focal post is visible without scrolling

### Back Navigation

* Back returns to previous screen
* Previous scroll position preserved

⚠️ No partial back (no collapsing).

---

## 10. Loading States

### Initial Load

* Skeleton parent chain
* Skeleton focal post
* Skeleton replies

### Pagination

* Spinner only at bottom
* Parent chain never paginates

---

## 11. Empty & Error States

### No Replies

* Show “No replies yet”
* No CTA

### Deleted / Unavailable Post

* Show placeholder card
* Disable all interactions

---

## 12. Blocking & Protection (Frontend Behavior)

If post is unavailable:

* Entire thread replaced with:

  * “This post is unavailable”
* No partial rendering

If some replies are blocked:

* Those replies are omitted silently

---

## 13. Accessibility Rules

* Each post is its own accessibility group
* Screen reader announces:

  * “Replying to…”
  * “Post by…”

---

## 14. What Twitter Does **Not** Do Here

No:

* Swipe gestures between posts
* Inline expand/collapse threads
* Floating reply buttons
* Auto-scroll to newest reply
* Highlighting OP replies

---

## 15. Frontend Invariants (Lock These)

1. One FlatList, no nesting
2. Parent chain is static
3. Focal post body not tappable
4. Replies behave like feed posts
5. Avatar/name always go to profile
6. Navigation pushes, never replaces
7. Scroll position preserved