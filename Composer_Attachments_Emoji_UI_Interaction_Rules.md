This is a **composer micro-interaction spec**, and Twitter is very intentional here.
Below is a **frontend-only, pre-2023-accurate** description of **media / emoji / GIF affordances** in the **Post & Reply Composer**, exactly as they sit **on the edge of the text input**.

No backend. No upload logic. Just **layout, behavior, constraints, and invariants**.

---

# **Composer Attachments & Emoji — UI / Interaction Rules**

## 1. Where the Icons Live (Critical)

Icons are **not in a toolbar above or below** the input.

They live in a **persistent edge row** aligned with the **bottom of the TextInput**.

### Canonical Layout

```
┌─────────────────────────────┐
│ TextInput (multiline)       │
│                             │
│                             │
│                             │
├─────────────────────────────┤
│ 🖼  GIF   😊        240     │
└─────────────────────────────┘
```

* Icons are **inside the composer**
* They scroll **with** the input growth
* Character count floats to the right

---

## 2. Icon Set (Pre-2023 Accurate)

From left to right:

1. **Image / Video picker**
2. **GIF picker**
3. **Emoji picker**
4. *(Right-aligned)* Character counter

⚠️ **Strict**

* No poll icon
* No scheduling
* No location pin

---

## 3. Icon Visual Rules

* Icons are:

  * Line icons
  * 20–24px
  * Muted color when inactive
* Hit area ≥ 40×40px (invisible padding)

No labels. Icons only.

---

## 4. Image / Video Picker Interaction

### Tap Behavior

* Opens system media picker
* Dismisses keyboard
* Returns selected media inline

### Constraints

* Max 4 images OR 1 video
* Selecting video disables image picker
* Selecting images disables video

### UI Feedback

* Selected media preview appears **above TextInput**
* Remove (✕) per media item

---

## 5. GIF Picker Interaction

### Tap Behavior

* Opens **full-screen GIF picker**
* Keyboard dismisses
* Search field auto-focused

### Constraints

* GIF counts as **one media**
* Selecting GIF disables image picker

### UI Feedback

* Selected GIF preview above input
* GIF replaces image previews

---

## 6. Emoji Picker Interaction

### Tap Behavior

* Opens **overlay emoji picker**
* Keyboard stays open
* Emoji inserts at cursor

⚠️ **Invariant**

> Emoji picker does **not** replace keyboard.

---

## 7. Character Counter Behavior

* Hidden by default
* Appears when near limit
* Turns red at limit
* Updates live with emoji (emoji = 1 char)

---

## 8. Input Growth & Icon Anchoring

### Behavior

* TextInput grows upward
* Icon row stays pinned to bottom of input
* Media preview pushes input downward, not icons

⚠️ No jumping. No reflow flicker.

---

## 9. Disabled States (Important)

### Icons Disabled When:

* Over character limit
* Media limit reached
* Network unavailable (optional)

Disabled icons:

* Appear faded
* Still visible
* Not removed

---

## 10. Interaction Priority (Tap Conflicts)

* Icons must **never** steal focus from text input
* Tapping icon does not blur input unless picker opens
* Character count is non-interactive

---

## 11. Keyboard & Safe Area Handling

* Icon row sits **above keyboard**
* Respects safe area insets
* No overlap with system UI

---

## 12. Accessibility Rules

* Icons are individually focusable
* Screen reader labels:

  * “Add image”
  * “Add GIF”
  * “Add emoji”

---

## 13. What Twitter Does **Not** Do

No:

* Floating toolbars
* Expandable attachment menus
* Drag-and-drop
* Inline GIF search in keyboard
* Custom emoji sets

---

## 14. Frontend Invariants (Lock These)

1. Icons live on the **input edge**
2. Emoji picker does not dismiss keyboard
3. Media previews appear **above** input
4. One media type at a time
5. Icons never move or collapse

---

## 15. Implementation Hint (Non-Technical)

Mentally model the composer as **three vertical zones**:

1. Media preview (optional)
2. Growing text input
3. Fixed icon row

This mental model prevents 90% of layout bugs.