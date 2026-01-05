Treat each as a **separate, self-contained frontend spec**, exactly like Twitter does internally.
No cross-bleeding, no backend assumptions, no modern UX drift.

---

# **A. Reply Composer — UX & Constraints**

## Entry Points

* Reply icon on **focal post**
* Reply icon on **any reply**

Both lead to the **same ComposerScreen**.

---

## Composer Layout (Pre-2023 Accurate)

```
Header
 ├─ Cancel
 └─ Reply

Context Row
 ├─ Small avatar
 └─ “Replying to @username”

TextInput
 └─ Multiline, auto-grow

Footer
 ├─ Media icon
 └─ Character count
```

---

## UX Rules

* Opens as a **full screen**, not modal
* Keyboard opens immediately
* Cursor focused by default
* No draft autosave
* No polls, no scheduling

---

## Constraints

* Character limit enforced live
* Count turns red near limit
* Reply button disabled if:

  * Empty
  * Over limit
  * Network unavailable (optional)

---

## Submit Behavior

* Tap “Reply”
* Immediate navigation **back to Post Detail**
* Reply appears optimistically (see section C)

⚠️ **Invariant**

> Composer never shows the thread inline.

---

# **B. Thread Indentation & Layout Math**

This is visual only — **no logic leakage**.

---

## Indentation Model

* Each reply has a `depth`
* Indentation = `depth × INDENT_UNIT`

Typical:

```
INDENT_UNIT = 12–16px
MAX_INDENT = 3–4 levels
```

---

## Clamping Rule (Critical)

If `depth > MAX_INDENT`:

* Clamp indentation
* Do NOT keep increasing padding

⚠️ Twitter does this to avoid horizontal collapse.

---

## Visual Aids (Optional)

* Vertical thread line
* Fades after certain depth
* Never interactive

---

## Avatar & Content Alignment

* Avatar always aligns to indentation
* Body text aligns with avatar
* Action row aligns with body

---

## What NOT to Do

No:

* Recursive margins
* Tree views
* Collapsible threads

---

# **C. Optimistic Reply Insertion**

This is **perceived speed**, not correctness.

---

## Immediate Insert Rules

On submit:

* Insert reply directly under focal post
* Or under parent reply (if replying to reply)

---

## Temporary State

Optimistic reply:

* Has temp ID
* Shows normally
* No spinner row
* Actions disabled briefly

---

## Resolution

* On success → replace temp ID
* On failure → remove reply + toast

⚠️ **Invariant**

> Timeline order must not change during resolution.

---

# **D. Handling Very Deep Threads**

Deep threads are **flattened**, not visualized as trees.

---

## Rendering Strategy

* Render as flat list
* Use indentation only
* No expand/collapse

---

## Performance Rules

* Use `getItemLayout` if possible
* Memoize PostCard
* Avoid re-rendering parent chain

---

## UX Constraints

* No “show more replies”
* No inline thread grouping
* No jumping between branches

---

## Visual Cutoff

At extreme depth:

* Indentation stops increasing
* Thread lines fade
* UI remains readable

---

# **E. Preventing Tap Conflicts in Threads**

This is where most clones fail.

---

## Tap Target Priority

1. Action buttons
2. Avatar
3. Name
4. Body
5. Timestamp

Higher priority **must stop propagation**.

---

## Implementation Rules

* PostCard is a `View`, not Pressable
* Every tap zone is explicit
* Never wrap indentation container in Pressable

---

## Common Failure Cases (Avoid)

❌ Tapping reply icon opens post
❌ Tapping nested body triggers parent
❌ Thread line intercepts touches
❌ Whole row is tappable

---

## Accessibility

* Each tap zone has its own role
* Screen reader focus order follows visual hierarchy

---

# **Locked Frontend Invariants (All 5 Sections)**

1. Composer is full-screen
2. Indentation is visual-only
3. Replies appear instantly
4. Threads are flat, not trees
5. Tap zones are explicit and isolated

