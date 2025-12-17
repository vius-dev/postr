Below are **five separate, locked frontend specs**, each isolated exactly as requested.
All are **pre-2023 Twitter–accurate**, Expo / React Native–friendly, and interaction-focused only.

---

# **1. Composer Keyboard Avoidance & Animation Timing**

## Core Principle

The composer **moves with the keyboard**, not against it.

---

## Keyboard Behavior Rules

* Keyboard appearance **pushes composer upward**
* No manual scroll jumps
* No re-centering of cursor
* No reflow of header/footer

---

## Animation Timing (Critical)

* Composer animation duration ≈ **keyboard animation**
* Easing: **linear / ease-out**
* No spring or bounce

⚠️ **Invariant**

> Composer must reach final position **at the same time** as keyboard.

---

## Focus Rules

* Keyboard opens immediately on entry
* Input retains focus after:

  * Emoji insertion
  * Media selection return

---

## What NOT to Do

No:

* Delayed keyboard opening
* Extra padding hacks
* Independent animations

---

# **2. Media Preview Grid Behavior**

## Placement

* Media previews appear **above the TextInput**
* Push input downward
* Never overlap icons

---

## Grid Rules

### Images

* Max **4**
* 1 → full width
* 2 → side-by-side
* 3 → 1 large + 2 stacked
* 4 → 2×2 grid

### Video / GIF

* Single preview only
* Aspect ratio preserved

---

## Interaction

* Tap preview → full-screen viewer
* ✕ button removes item
* Removing last media restores icon availability

---

## Invariants

* Media grid never scrolls independently
* Grid height is deterministic
* No reordering via drag

---

# **3. Reply Composer vs Post Composer Differences**

They share **90% UI**, but behavior differs.

---

## Post Composer

* No context row
* Title/action: “Post”
* Entry from FAB or tab

---

## Reply Composer

* Shows “Replying to @username”
* Avatar shown smaller
* Action label: “Reply”
* Context row is **not tappable**

---

## Shared Rules

* Same icons
* Same limits
* Same keyboard behavior

⚠️ **Invariant**

> Reply composer never shows full parent post.

---

# **4. Draft Discard Confirmation**

## When Triggered

* Tap “Cancel”
* Swipe back gesture
* System back button (Android)

---

## Conditions

* If input is empty → exit immediately
* If content exists → confirm discard

---

## Confirmation UI

* Native alert
* Text:

  * “Discard post?”
  * “Your post will be lost.”

Buttons:

* Discard (destructive)
* Keep editing

---

## What Twitter Does NOT Do

No:

* Auto-saving drafts
* Draft lists
* Silent discard

---

# **5. Landscape Orientation Behavior**

## General Rule

Composer **still works**, but does not optimize for comfort.

---

## Layout Adjustments

* Media previews stack vertically
* TextInput grows less
* Icons remain visible

---

## Keyboard Handling

* Keyboard may cover more screen
* No special resizing logic
* No forced portrait lock

---

## UX Constraints

* No split-pane
* No side toolbars
* No compact mode

⚠️ **Invariant**

> Landscape is supported, not enhanced.

---

# **Global Composer Invariants (All 5 Sections)**

1. Keyboard + composer move together
2. Media always above input
3. Reply context is minimal
4. Drafts require explicit discard
5. Landscape does not change logic