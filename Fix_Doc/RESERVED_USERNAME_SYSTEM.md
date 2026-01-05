Below is a **Twitter-grade, abuse-resistant reserved-username system** designed specifically for our use case (politicians, parties, system words), and it **plugs directly into the RPC we already hardened**. Convert all SQL code to 

This is **not cosmetic** — this is how we prevent impersonation at scale.

---

# 🎯 Goals of a Reserved Username System

1. **Prevent impersonation**

   * Politicians
   * Political parties
   * Government roles
2. **Protect system namespace**

   * `admin`, `support`, `vius`, `official`, etc.
3. **Allow future verified exceptions**
4. **Remain fast and simple (index-backed, no app logic)**

Twitter/X, Instagram, and TikTok all do this at the **database layer**, not the client.

---

# 1️⃣ Reserved Username Table (Canonical)

```sql
CREATE TABLE reserved_usernames (
  username TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- system | politician | party | role
  reason TEXT,
  is_active BOOLEAN DEFAULT true
);
```

### Why lowercase?

You will **always normalize usernames to lowercase**, so storage must match.

---

# 2️⃣ Seed Reserved Usernames (Examples)

### 🔒 System Words (Hard block)

```sql
INSERT INTO reserved_usernames (username, category, reason) VALUES
('admin', 'system', 'System account'),
('support', 'system', 'Support account'),
('pulse', 'system', 'Platform name'),
('official', 'system', 'Misleading authority'),
('moderator', 'system', 'Staff impersonation'),
('verified', 'system', 'Trust badge misuse');
```

---

### 🏛️ Political Roles (Hard block)

```sql
INSERT INTO reserved_usernames (username, category, reason) VALUES
('president', 'role', 'Political office'),
('governor', 'role', 'Political office'),
('senator', 'role', 'Political office'),
('minister', 'role', 'Political office'),
('mayor', 'role', 'Political office');
```

---

### 🗳️ Political Parties (Hard block unless verified)

```sql
INSERT INTO reserved_usernames (username, category, reason) VALUES
('apc', 'party', 'Political party'),
('pdp', 'party', 'Political party'),
('labourparty', 'party', 'Political party'),
('lp', 'party', 'Political party');
```

---

### 👤 Politician Names (Soft block / claimable later)

```sql
INSERT INTO reserved_usernames (username, category, reason) VALUES
('tinubu', 'politician', 'Public figure'),
('obi', 'politician', 'Public figure'),
('atiku', 'politician', 'Public figure');
```

> These are **blocked by default**, but **can be unlocked via verification** later.

---

# 3️⃣ Index for Speed (Important)

```sql
CREATE INDEX reserved_usernames_active_idx
ON reserved_usernames (username)
WHERE is_active = true;
```

This keeps the lookup **O(1)**.

---

# 4️⃣ Update RPC: Enforce Reserved Names

Now we **extend your existing RPC**.

```sql
CREATE OR REPLACE FUNCTION update_profile_username(
  p_username TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_change TIMESTAMP;
  v_reserved RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Normalize
  p_username := lower(trim(p_username));

  -- Length guard
  IF length(p_username) < 4 OR length(p_username) > 15 THEN
    RAISE EXCEPTION 'Invalid username length';
  END IF;

  -- 🔒 Reserved username check
  SELECT *
  INTO v_reserved
  FROM reserved_usernames
  WHERE username = p_username
    AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'This username is reserved (%).',
      v_reserved.category;
  END IF;

  -- Cooldown check
  SELECT last_username_change_at
  INTO v_last_change
  FROM users
  WHERE user_id = v_user_id;

  IF v_last_change IS NOT NULL
     AND now() - v_last_change < interval '14 days' THEN
    RAISE EXCEPTION
      'Username can only be changed every 14 days';
  END IF;

  -- Atomic update
  UPDATE users
  SET
    username = p_username,
    last_username_change_at = now()
  WHERE user_id = v_user_id;

END;
$$;
```

---

# 5️⃣ Required Unique Constraint (Still Mandatory)

```sql
CREATE UNIQUE INDEX users_username_unique
ON users (lower(username));
```

This prevents **race conditions** even after reservation checks.

---

# 6️⃣ Frontend Error Mapping (UX-Clean)

```ts
catch (e: any) {
  if (e.code === '23505') {
    setError('This username is already taken.');
  } else if (
    e.message?.includes('reserved')
  ) {
    setError('This username is reserved and cannot be used.');
  } else {
    setError(e.message || 'Unexpected error.');
  }
}
```

---

# 7️⃣ Future-Proof: Verified Overrides (Twitter-Style)

Later, you can allow **verified users** to claim reserved names.

### Add to `users`

```sql
is_verified BOOLEAN DEFAULT false;
```

### Modify check

```sql
IF FOUND AND NOT EXISTS (
  SELECT 1 FROM users
  WHERE user_id = v_user_id
    AND is_verified = true
) THEN
  RAISE EXCEPTION 'This username is reserved.';
END IF;
```

That’s **exactly** how verified handles work on Twitter/X.

---

# 8️⃣ Why This Design Works

| Threat                      | Blocked |
| --------------------------- | ------- |
| Politician impersonation    | ✅       |
| Party impersonation         | ✅       |
| System spoofing             | ✅       |
| Race conditions             | ✅       |
| Case-based bypass (`Admin`) | ✅       |
| Client manipulation         | ✅       |

All enforcement is **server-side, atomic, indexed, and auditable**.

---

# 🧠 One-Sentence Summary

> **Reserved usernames must be enforced inside the same RPC that mutates identity, using a normalized lookup table and a unique index — anything else is cosmetic.**


