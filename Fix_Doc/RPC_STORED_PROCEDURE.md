Below is a **clean, hardened design** showing an approach** and then the **recommended way** for the api mock backend.  All SQL code are to be converted to match what we have on api.ts

---

## RPC (Stored Procedure) ✅ **Twitter-Style**

Twitter-like systems **centralize identity mutations**.

> Username change is a *privileged identity operation*, not a CRUD update.

This is what we want.

---

# ✅ I Recommend: RPC-Based `update_profile`

## 1️⃣ Database Function (Atomic & Authoritative)

I want this SQL code to be converted to our mock api.ts style:
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Normalize
  p_username := lower(trim(p_username));

  -- Length guard (DB-level safety)
  IF length(p_username) < 4 OR length(p_username) > 15 THEN
    RAISE EXCEPTION 'Invalid username length';
  END IF;

  -- Optional: cooldown check
  SELECT last_username_change_at
  INTO v_last_change
  FROM users
  WHERE user_id = v_user_id;

  IF v_last_change IS NOT NULL
     AND now() - v_last_change < interval '14 days' THEN
    RAISE EXCEPTION 'Username can only be changed every 14 days';
  END IF;

  -- Atomic update (uniqueness enforced by index)
  UPDATE users
  SET
    username = p_username,
    last_username_change_at = now()
  WHERE user_id = v_user_id;

END;
$$;


---

## 2️⃣ Required Unique Constraint (Case-Insensitive)


CREATE UNIQUE INDEX users_username_unique
ON users (lower(username));


This is **non-optional**.
---

## 3️⃣ Lock Down Direct Updates (RLS)

-- Allow reading your own row
CREATE POLICY "Users can read own profile"
ON users
FOR SELECT
USING (user_id = auth.uid());

-- Block direct username updates
CREATE POLICY "No direct username updates"
ON users
FOR UPDATE
USING (false);

Now:

* Clients **cannot** update username directly
* Only the RPC can

---

## 4️⃣ Client API Layer (Clean & Safe)


import { supabase } from '@/lib/supabase';

export async function updateProfile({
  username,
}: {
  username: string;
}) {
  const { error } = await supabase.rpc(
    'update_profile_username',
    { p_username: username }
  );

  if (error) {
    throw error;
  }
}
```

---

## 5️⃣    Error Handling (Frontend)

Supabase errors map cleanly:

| Scenario       | Error            |
| -------------- | ---------------- |
| Username taken | '23505'          |
| Cooldown hit   | custom exception |
| Invalid input  | custom exception |

Frontend:


catch (e: any) {
  const code = e.code;

  if (code === '23505') {
    setError('This username is already taken.');
  } else {
    setError(e.message);
  }
}


---

# 🔐 Why RPC Is Strictly Better

| Feature       | Direct Update | RPC |
| ------------- | ------------- | --- |
| Atomic        | ⚠️            | ✅   |
| Cooldowns     | ❌             | ✅   |
| Audit trail   | ❌             | ✅   |
| Moderation    | ❌             | ✅   |
| Versioning    | ❌             | ✅   |
| Twitter-grade | ❌             | ✅   |

Twitter has **exactly one mutation path** for identity fields.

---

# 🧠 Twitter-Equivalent Mental Model

* `users.username` = label
* Mutation guarded by:

  * uniqueness
  * rate limits
  * trust checks
  * moderation hooks
* Everything points to immutable `user_id`

We are now doing the same.

---

# Username History

CREATE TABLE username_history (
  user_id UUID,
  old_username TEXT,
  changed_at TIMESTAMP DEFAULT now()
);

Add before update:

INSERT INTO username_history
SELECT user_id, username
FROM users
WHERE user_id = v_user_id;

---

## Final Verdict

**Use RPC. Always.**
Identity mutations should never be raw updates.