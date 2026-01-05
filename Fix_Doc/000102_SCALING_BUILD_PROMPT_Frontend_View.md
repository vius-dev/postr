Below is **Phase-9/b (Frontend View)**: **what screens exist, what states they have, and how they behave**.

---

# **Phase-9 — User Profile (Frontend Architecture & UX)**

## 1. Profile Screen = One Screen, Many States

There is **one** `ProfileScreen`.

Behavior changes by:

* `viewerUserId`
* `profileUserId`
* `relationshipState`

There are **no separate “My Profile” and “User Profile” screens**.

---

## 2. Screen Structure (Top → Bottom)

```
SafeAreaView using (react-native-safe-area-context)
 └─ ScrollView
     ├─ ProfileHeader
     ├─ BioSection
     ├─ StatsRow
     ├─ ActionRow
     ├─ TabBar
     └─ TabContent (FlatList)
```

⚠️ **Invariant**

* The entire profile scrolls as **one surface**
* Tabs do not reset header scroll position

---

## 3. ProfileHeader (Frontend Rules)

### Contains

* Banner image
* Avatar (overlapping banner)
* Display name
* @username

### Frontend Behavior

* Avatar overlaps banner using absolute positioning
* Banner height collapses slightly on scroll
* Avatar does **not** shrink (pre-2023)

### Self vs Other

| Viewer | Interaction                       |
| ------ | --------------------------------- |
| Self   | Avatar/banner are tappable → edit |
| Other  | No interaction                    |

---

## 4. BioSection

### Renders

* Bio text
* Location (if exists)
* Website link (if exists)

### Frontend Rules

* Bio is truncated at ~3 lines
* “Read more” expands inline (no modal)
* Links open system browser

⚠️ No rich text, no inline media.

---

## 5. StatsRow (Tap Behavior Matters)

### Shows

* Posts
* Following
* Followers

### Frontend Semantics

* Numbers are tappable
* Navigates to `UserListScreen`
* Uses same list component for all three

### Loading State

* Skeleton counts (not spinners)

---

## 6. ActionRow (Most Important UI Logic)

This row is **100% state-driven**.

### States

| Relationship  | Primary Button |
| ------------- | -------------- |
| Self          | Edit Profile   |
| Not Following | Follow         |
| Following     | Following      |
| Blocked       | Blocked        |

### Frontend Rules

* Follow button changes state **optimistically**
* “Following” opens action sheet:

  * Unfollow
  * Mute
  * Block

⚠️ **Invariant**

* Muting does not change visible state
* Blocking immediately hides content

---

## 7. TabBar (Sticky, Not Floating)

### Tabs

* Posts
* Posts & Replies
* Media
* Dis/Likes

### Behavior

* TabBar sticks under header
* Swiping changes tab
* Tapping tab scrolls content to top **of tab**, not profile

⚠️ **Invariant**

* Tab switch does NOT refetch profile header
* Each tab preserves its scroll position

---

## 8. TabContent (FlatList Discipline)

Each tab renders:

* One `FlatList`
* Same `PostCard` component
* Different query/filter

### Frontend Rules

* Reverse chronological
* Infinite scroll (cursor-based)
* Pull-to-refresh reloads current tab only

⚠️ **Do NOT**

* Mix tabs into one list
* Reuse HomeFeed list logic

---

## 9. Pinned Post (Frontend Only Concern)

If pinned post exists:

* Render as `ListHeaderComponent`
* Visually marked “Pinned”
* Not included in pagination

---

## 10. Loading & Empty States

### Profile Loading

* Header skeleton
* Tab skeleton
* No global spinner

### Empty States

| Case        | Message        |
| ----------- | -------------- |
| No posts    | “No posts yet” |
| Media empty | “No media”     |
| Likes empty | “No likes yet” |

No CTAs. No prompts.

---

## 11. Error States (Silent by Default)

* Profile fetch error → retry inline
* Tab fetch error → toast
* Follow action error → revert button state

⚠️ Never block profile view on tab failure.

---

## 12. Navigation Semantics

### From Profile

* Tap post → PostDetail
* Tap follower → ProfileScreen
* Back returns to previous scroll position

### Deep Links

* `/username`
* `/username/status/:id`

Profile screen must handle both.

---

## 13. Frontend Invariants (Do Not Break)

1. One Profile screen, multiple states
2. Tabs are filters, not feeds
3. Chronological only
4. No algorithmic ranking
5. Optimistic follow UX
6. Header never re-renders on tab switch

---

## 14. What You Should Implement First (Order)

1. Static profile layout
2. Header + scroll behavior
3. ActionRow state machine
4. Tabs with FlatList
5. Scroll position preservation
6. Optimistic follow UX
