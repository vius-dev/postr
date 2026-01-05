Below is a **pre-2023 Twitter-accurate** breakdown of **User Profile semantics**, strictly limited to *what exists*, *who sees what*, and *what invariants must hold*.

---

# **Phase-9 — User Profile Semantics**

## 1. Profile as a **Projection**, not a Feature

A profile is **not** an editable dashboard or CMS.

It is a **deterministic projection** of:

* Public user metadata
* Public posting history
* Public social graph edges
* Viewer → profile relationship

There is **no separate “profile state.”**

---

## 2. Core Profile Sections (Canonical)

Every profile renders the same structural sections:

1. Header (identity)
2. Bio block
3. Stats row
4. Action row
5. Content tabs

The **difference** between *self* vs *others* is **permissions**, not layout.

---

## 3. Header & Identity

### Visible to **Everyone**

* Display name
* @username (immutable after creation, except via admin)
* Avatar
* Header image (banner)
* Account age (implicit, not a badge)

### Editable by **Self Only**

* Display name
* Avatar
* Header image
* Bio
* Location
* Website

⚠️ **Invariant**

* Username change, if allowed at all, must be rare, explicit, and cascade safely
* Followers are bound to **user_id**, never username

---

## 4. Bio Block

### Always Public

* Bio text (plain text only)
* Location
* Website link

### Hard Constraints

* Bio has a character limit
* Links are rendered, not embedded
* No rich formatting
* No hashtags as navigation

---

## 5. Stats Row (Follower Graph)

Visible to **Everyone**:

* Post count
* Following count
* Follower count

### Behavioral Invariants

* Counts are eventually consistent
* Clicking counts navigates to lists
* Lists respect blocks and privacy

---

## 6. Action Row (Viewer-Dependent)

### When Viewing **Own Profile**

* “Edit profile”
* Settings shortcut
* No follow button (ever)

### When Viewing **Another User**

One of:

| Relationship  | Button                       |
| ------------- | ---------------------------- |
| Not following | Follow                       |
| Following     | Following (→ Unfollow)       |
| Blocked       | Blocked                      |
| Muted         | Following (muted internally) |

⚠️ **Invariant**

* Muting does **not** affect follower state
* Blocking is symmetric and hard

---

## 7. Content Tabs (Critical)

Tabs are **filters over the same post corpus**.

### Canonical Tabs

1. **Posts**

   * Original posts by user
   * Replies included
   * Reposts excluded

2. **Replies**

   * Replies
   * Quote posts

3. **Media**

   * Posts containing media
   * Order preserved

4. **Dis/Likes**

   * Posts liked by user
   * Posts disliked by user
   * Public by default (pre-2023)

⚠️ **Invariant**

* Deleting a post removes it from *all* tabs
* Dis/Likes tab is a projection of reaction edges, not a feed

---

## 8. Timeline Ordering Rules

Profile timelines are:

* Reverse chronological
* Cursor-paginated
* No algorithmic reshuffling
* No engagement weighting

⚠️ **Critical**

* Profile views **never** use HomeFeed ranking logic

---

## 9. Replies Visibility Rules

Replies behave subtly:

* Replies to public posts are public
* Replies to protected/blocked users are hidden
* Reply visibility depends on:

  * Block relationships
  * Parent post visibility

This applies identically to self and others.

---

## 10. Pinned Post (Optional but Canonical)

If implemented:

* User may pin **one** post
* Appears at top of profile
* Does not affect timeline order below
* Visible to everyone who can see the post

---

## 11. Privacy & Protection (Pre-2023 Accurate)

### Public Accounts

* Profile visible to all
* Posts visible to all
* Likes visible to all

### Protected Accounts (Optional)

* Profile metadata visible
* Posts hidden unless approved follower
* Follow requires approval
* Likes tab hidden from non-followers

---

## 12. What Profiles **Do NOT Have** (Strict)

No:

* View counts
* Engagement analytics
* Profile visitors
* Monetization
* Subscription tiers
* Badges (other than verified, if you ever add it)
* Highlighted posts beyond pin
* Custom tab ordering

---

## 13. Profile Invariants (Never Break)

1. Profiles are **read models**, not sources of truth
2. All data is derivable from core tables
3. Viewer context changes behavior, not structure
4. Profile timelines are chronological only
5. Self ≠ special user (only edit permissions differ)

---

## 14. Supabase Implication (No Code)

* Profile is composed from:

  * users
  * posts
  * follows
  * reactions
  * blocks
* RLS must enforce:

  * Blocked visibility
  * Protected accounts
  * Self-only edits









