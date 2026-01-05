We now have **multiple REACTION entry points** (Home feed, Post Details).
Right now, each screen is behaving like it owns reaction state → that’s why users can react twice.

Let’s fix this **cleanly, deterministically, and future-proof**, without breaking our invariants.

---

# 🧠 ROOT CAUSE (WHY THE BUG EXISTS)

The current setup likely has:

* Home screen keeps **local reaction state**
* Post details screen keeps **its own local reaction state**
* Reactions update counts, but **reaction ownership is not centralized**
* UI disable rules are screen-local, not global

So the system does this:

```
Home Screen: userReaction = NONE → LIKE
Post Screen: userReaction = NONE → LIKE (again)
```

Both screens think the user hasn’t reacted yet.

---

# 🎯 DESIGN GOAL (WHAT WE MUST GUARANTEE)

For every `(userId, postId)`:

1. **Exactly one authoritative reaction state**
2. All screens **read from the same source**
3. Any reaction:

   * Updates that source
   * Immediately reflects everywhere
4. UI disable/enable logic is **derived**, never guessed

---

# 🔒 CORE INVARIANT (UPDATED FOR 3 REACTIONS)

For each `(user, post)`:

```
Allowed states: NONE | LIKE | DISLIKE | LAUGH
Exactly ONE at a time
All are mutually exclusive
```

This invariant must live **above screens**.

---

# 🧩 THE CORRECT ARCHITECTURE

## 1️⃣ Single Reaction Authority (GLOBAL STORE)

You need **one reaction store**, not per-screen state.

Conceptually:

```ts
ReactionState {
  postId: string
  userReaction: 'LIKE' | 'DISLIKE' | 'LAUGH' | null
  counts: {
    likes: number
    dislikes: number
    laughs: number
  }
}
```

And globally:

```ts
reactionStore: Map<postId, ReactionState>
```

📌 **Both Home and Post Details read from this same store**

---

## 2️⃣ Screens Become PURE VIEWS

### Home Screen

* Reads reaction state from `reactionStore[postId]`
* Never owns reaction truth
* Buttons disable based on `userReaction`

### Post Details Screen

* Same thing
* No separate reaction state
* No duplicated logic

> If both screens render the same `ReactionState`, the bug disappears.

---

## 3️⃣ Centralized Reaction Action (VERY IMPORTANT)

You must have **one function** that handles reactions — not per screen.

### Single entry point

```ts
react(postId, action: 'LIKE' | 'DISLIKE' | 'LAUGH' | 'REMOVE')
```

Both screens call **this exact function**.

No screen-specific logic allowed.

---

## 4️⃣ Deterministic Reaction State Machine (3 Reactions)

This is the **tight logic** you asked for.

```
NONE
 ├─ LIKE     → LIKE
 ├─ DISLIKE  → DISLIKE
 └─ LAUGH    → LAUGH

LIKE
 ├─ LIKE     → NOOP
 ├─ REMOVE   → NONE
 ├─ DISLIKE  → DISLIKE (remove LIKE)
 └─ LAUGH    → LAUGH (remove LIKE)

DISLIKE
 ├─ DISLIKE  → NOOP
 ├─ REMOVE   → NONE
 ├─ LIKE     → LIKE (remove DISLIKE)
 └─ LAUGH    → LAUGH (remove DISLIKE)

LAUGH
 ├─ LAUGH    → NOOP
 ├─ REMOVE   → NONE
 ├─ LIKE     → LIKE (remove LAUGH)
 └─ DISLIKE  → DISLIKE (remove LAUGH)
```

💡 **Only one state ever exists. Switching is atomic.**

---

## 5️⃣ Central Reaction Reducer (Conceptual)

All UI actions funnel into this logic:

```ts
function applyReaction(prevState, action) {
  if (action === prevState.userReaction) {
    return prevState // NOOP
  }

  // Remove previous reaction count
  if (prevState.userReaction) {
    decrementCount(prevState.userReaction)
  }

  if (action !== 'REMOVE') {
    incrementCount(action)
    return { userReaction: action }
  }

  return { userReaction: null }
}
```

This runs:

* For Home screen
* For Post screen
* For offline replay
* For server reconciliation

---

## 6️⃣ Button Disable Logic (GLOBAL, NOT LOCAL)

Derived purely from `userReaction`:

| userReaction | Like | Dislike | Laugh |
| ------------ | ---- | ------- | ----- |
| NONE         | ✅    | ✅       | ✅     |
| LIKE         | 🚫   | ✅       | ✅     |
| DISLIKE      | ✅    | 🚫      | ✅     |
| LAUGH        | ✅    | ✅       | 🚫    |

If one screen disables it, **all screens disable it**.

---

## 7️⃣ Why This Fixes Your Exact Bug

Your anomaly:

> “User reacts on Home, still can react on Post Details”

After this design:

* Home reacts → updates `reactionStore`
* Post Details re-renders → sees `userReaction`
* Button disabled automatically
* Duplicate reaction impossible

No special syncing logic needed.

---

## 8️⃣ Realtime + Offline Still Works

Because:

* Store is authoritative
* Reactions are state, not events
* Screens are subscribers, not owners

Realtime updates:

* Update store → all screens update

Offline:

* Buffer final state → replay → reconcile → store updates

---

## 9️⃣ One Non-Negotiable Rule (Write This Down)

> **Screens never own reaction state.
> Screens only render reaction state.**

If you violate this rule even once, the bug comes back.

---

## ✅ FINAL VERDICT

You **fully understand the problem**, and your instinct is correct.
The fix is **not** more guards — it’s **central authority**.
