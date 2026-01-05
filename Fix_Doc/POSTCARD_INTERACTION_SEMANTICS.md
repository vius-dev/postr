This is a **pure interaction-level frontend concern**, and Twitter is very strict about it.
Below is the **exact pre-2023 Twitter tap-target behavior**, translated cleanly into **React Native / Expo UI rules**.

No backend. No routing theory. Just **what is tappable, what happens, and what must never happen**.

---

# **Post Card Interaction Semantics (Frontend-Only)**

## 1. Post Card Is **Not** One Big Button

A post is **multiple independent tap zones**.

⚠️ **Invariant**

> Tapping the card background must **never** navigate.

Only **explicit zones** navigate.

---

## 2. Canonical Tap Targets

### A. Avatar (Profile Picture)

**Tap → User Profile**

* Navigates to `ProfileScreen(profileUserId)`
* Always works (unless blocked)
* Same behavior everywhere (feed, profile, thread)

**Tap Area**

* Circular hit area
* Slight padding for accessibility

---

### B. Display Name & @username

**Tap → User Profile**

* Display name and username are one tap group
* Username tap ≠ link to search or anything else

⚠️ **Invariant**

* Username is *not* styled as a web link
* No underline, no hover concept

---

### C. Post Body (Text Area)

**Tap → Post Detail (Thread View)**

* Includes:

  * Text
  * Inline media (image/video)
  * Quoted post preview
* Excludes:

  * Avatar
  * Name
  * Action buttons

**Result**

* Navigates to `PostDetailScreen(postId)`
* Opens full thread context

---

### D. Timestamp

**Tap → Post Detail**

* Same behavior as post body
* Small tap target but consistent

---

### E. Action Buttons (Reply / Repost / Like)

**Tap → Action only**

* Must **not** trigger navigation
* Must stop propagation

⚠️ **Critical**

* Like tap must NOT open post detail
* Long-press behavior is separate (if any)

---

## 3. Event Propagation Rules (Very Important)

Your hierarchy must look like this:

```
PostCard (View, NOT Pressable)
 ├─ Avatar (Pressable → Profile)
 ├─ HeaderRow
 │   ├─ NameGroup (Pressable → Profile)
 │   └─ Timestamp (Pressable → PostDetail)
 ├─ Body (Pressable → PostDetail)
 └─ ActionRow
     ├─ Reply (Pressable)
     ├─ Repost (Pressable)
     └─ Like (Pressable)
```

⚠️ **Invariant**

* Never wrap the entire card in a Pressable
* Each Pressable is explicit

---

## 4. Press Feedback (Pre-2023 Accurate)

### Body / Header Press

* Subtle opacity change
* No ripple animation
* No scale transform

### Avatar Press

* Opacity only
* No bounce

### Action Buttons

* Icon fill change
* Count updates independently

---

## 5. Navigation Stack Behavior

### Feed → Post Detail

* Push screen
* Preserve feed scroll position
* Back returns exactly to same spot

### Feed → Profile

* Push screen
* Back returns to same feed position

⚠️ **Invariant**

* No modal for post detail
* No bottom sheet

---

## 6. Quoted Post Interaction

Quoted post inside another post:

* Tap quoted body → **Quoted post detail**
* Tap quoted avatar/name → **Quoted author profile**

Quoted posts behave as **nested PostCards**, not previews.

---

## 7. Disabled States (Blocking / Protection)

If viewer is blocked:

* Avatar tap disabled
* Name tap disabled
* Body tap disabled
* Card renders as “This post is unavailable”

⚠️ No partial navigation allowed.

---

## 8. Accessibility (Often Missed)

* Avatar, name, body are **separate accessibility elements**
* Screen readers announce:

  * “View profile”
  * “View post”

---

## 9. What Twitter Does **Not** Do

No:

* Double-tap to open post
* Long-press on body to navigate
* Tap anywhere to navigate
* Gesture-based navigation on cards

Everything is **explicit**.

---

## 10. Frontend Invariants (Lock These)

1. Post card is not a single press target
2. Avatar/name → profile, always
3. Body/timestamp → post detail, always
4. Action buttons never navigate
5. Event bubbling is explicitly controlled
6. Navigation preserves scroll position


