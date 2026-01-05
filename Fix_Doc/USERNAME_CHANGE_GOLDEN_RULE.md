Twitter treats **usernames as mutable identifiers** and **user IDs as the true source of identity**. That single architectural decision is what allows username changes without ownership or data conflicts.

Below is a **clean, system-level breakdown**—this maps well to the kind of modular, Supabase-style architecture we’ve been designing on api.ts.

---

## 1. The Golden Rule: User ID ≠ Username

Twitter assigns every account an **immutable numeric user_id** at creation.

| Field      | Property                          |
| ---------- | --------------------------------- |
| `user_id`  | Permanent, never changes          |
| `username` | Mutable, unique at any given time |

All internal relationships use **user_id**, not username.

**Examples**

* Tweets
* Likes
* Followers
* DMs
* Blocks
* Reports

```text
tweets.author_id → users.user_id
follows.follower_id → users.user_id
```

So when a username changes:

* **No data is moved**
* **No references are updated**
* Only one row changes: `users.username`

---

## 2. Username Change Flow (Step-by-Step)

### Step 1: Lock the username namespace

Twitter enforces:

* Case-insensitive uniqueness
* Global namespace (no per-region usernames)

Before update:

```sql
SELECT 1 FROM users WHERE username = 'newname';
```

If found → reject.

---

### Step 2: Atomic update

The change is done in a **single transaction**:

```text
BEGIN
  verify availability
  update users set username = 'newname'
COMMIT
```

This prevents race conditions.

---

### Step 3: Old username is released

Once the transaction commits:

* The **old username becomes available**
* No automatic redirect is guaranteed

This is why:

* Someone else can take your old username later
* Old profile links may break or point to a different user

---

## 3. Why This Doesn’t Break Ownership

### Tweets don’t “belong” to usernames

They belong to **user IDs**.

Example:

```text
Tweet ID: 12345
Author ID: 67890
Username at time of posting: irrelevant
```

When rendering:

```text
JOIN tweets.author_id → users.user_id
```

So:

* Past tweets show the **new username**
* Mentions update dynamically in UI

---

## 4. How Mentions Still Work (`@username`)

Mentions are **resolved at write-time**, not read-time.

When someone types:

```
@jack hello
```

Twitter:

1. Resolves `@jack` → `user_id = 12`
2. Stores:

```json
{
  "mention_user_id": 12,
  "text_range": [0, 5]
}
```

Even if `@jack` later becomes `@notjack`:

* Mentions still point to user_id `12`
* Display name updates dynamically

---

## 5. Preventing Impersonation & Abuse

Twitter applies **soft governance**, not hard locking:

### No permanent username ownership

* Usernames are not NFTs
* No historical claim unless trademarked

### Delayed reuse (sometimes)

High-risk or high-profile usernames may have:

* Cooldown periods
* Manual review before reassignment

### Verified / protected accounts

* Blue check / legacy verification reduces impersonation risk
* Internal trust scores may block immediate reuse

---

## 6. URL Handling (`twitter.com/username`)

URLs are **not canonical identifiers**.

Internally:

```
twitter.com/{username}
→ lookup users.username
→ resolve to user_id
```

If username changes:

* Old URL may 404
* Or resolve to someone else later

Twitter intentionally does **not** guarantee permalink stability for usernames.

---

## 7. Why Twitter Doesn’t Use Redirects Forever

Permanent redirects would:

* Prevent username reuse
* Lock namespace indefinitely
* Create ownership ambiguity

So Twitter chooses:

> **Data integrity over link stability**

---

## 8. Key Design Principles (Reusable for Your Apps)

If you’re implementing this in *Pulse* or a political rating system, follow these rules:

### ✅ Use immutable IDs everywhere

```text
user_id (UUID / bigint)
```

### ❌ Never use username as a foreign key

Even in:

* Ratings
* Votes
* Marketplace listings
* Polls

### ✅ Resolve mentions at write-time

Store:

* `mentioned_user_id`
* Not raw username references

### ✅ Allow username reuse with policy controls

Optional:

* Cooldown table
* Abuse review flags
* Verified protection

---

## 9. Minimal Schema Example (Twitter-style)

```sql
users (
  user_id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP
)

posts (
  post_id UUID PRIMARY KEY,
  author_id UUID REFERENCES users(user_id),
  content TEXT
)

mentions (
  post_id UUID,
  mentioned_user_id UUID,
  start INT,
  end INT
)
```

---

## 10. One-Sentence Summary

> **Twitter avoids username conflicts by treating usernames as mutable labels and user IDs as permanent ownership anchors—everything points to the ID, never the name.**
