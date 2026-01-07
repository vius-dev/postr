# Error Branding Implementation Plan

Complete transformation of technical error messages into friendly, user-facing content.

## User Review Required

> [!IMPORTANT]
> **Tone & Voice**: All error messages should be friendly, reassuring, and action-oriented. We avoid technical jargon and never blame the user.

> [!WARNING]
> **Breaking Changes**: This will replace all existing `alert()` and `Alert.alert()` calls with a centralized error handler.

## Proposed Changes

### Core Infrastructure

#### [NEW] `src/utils/errors.ts`
Centralized error mapping utility with:
- Supabase error code mapping (23505, PGRST116, etc.)
- Network error detection
- Validation error formatting
- Fallback for unknown errors

#### [NEW] `src/utils/toast.ts`
Branded toast/alert wrapper:
- `showError(message)` - Red toast with error icon
- `showSuccess(message)` - Green toast with checkmark
- `showInfo(message)` - Blue toast with info icon

---

### Error Categories & Messages

#### 🔐 Authentication Errors

| Error Code/Pattern | Friendly Message | Action Hint |
|---|---|---|
| `Invalid login credentials` | "Hmm, we couldn't find that account. Double-check your email and password?" | Retry |
| `Email not confirmed` | "Almost there! Please check your inbox and confirm your email first." | Check email |
| `User already registered` | "Looks like you already have an account! Try logging in instead." | Navigate to login |
| `Weak password` | "Let's make your password stronger—try adding more characters or symbols." | Retry |
| `Rate limit exceeded` | "Whoa, slow down! Please wait a moment before trying again." | Wait |

#### 👤 Profile & Identity

| Error Code/Pattern | Friendly Message | Action Hint |
|---|---|---|
| `23505` (username unique) | "That username is already taken. How about trying something else?" | Retry |
| `Username too short` | "Your username needs to be at least 3 characters long." | Retry |
| `Username invalid chars` | "Usernames can only use letters, numbers, and underscores." | Retry |
| `Name too long` | "Your display name is a bit too long—keep it under 50 characters." | Retry |
| `Bio too long` | "Your bio is looking great, but it needs to be under 160 characters." | Retry |

#### 📝 Content Creation

| Error Code/Pattern | Friendly Message | Action Hint |
|---|---|---|
| `Content empty` | "Your post needs some content! What's on your mind?" | Retry |
| `Content too long` | "Whoa, that's a lot! Try keeping it under 5000 characters." | Edit |
| `Too many media` | "You can attach up to 4 images or videos per post." | Remove media |
| `Poll needs choices` | "Polls need at least 2 options to get started." | Add choices |
| `Upload failed` | "We couldn't upload that file. Check your connection and try again?" | Retry |

#### 🌐 Network & System

| Situation | Friendly Message | Action Hint |
|---|---|---|
| Network offline | "You're offline right now. We'll sync everything once you're back online!" | Wait |
| Timeout | "This is taking longer than usual. Want to try again?" | Retry |
| 500 Server Error | "Our servers are having a moment. Please try again in a few seconds." | Retry |
| Unknown error | "Something unexpected happened, but we're on it!" | Contact support |

#### 💬 Messaging & Social

| Error Code/Pattern | Friendly Message | Action Hint |
|---|---|---|
| `Conversation not found` | "We couldn't find that conversation. It may have been deleted." | Go back |
| `Cannot message blocked user` | "You can't send messages to users you've blocked." | Unblock first |
| `Message too long` | "That message is a bit long—try breaking it into smaller parts?" | Edit |

---

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Create `src/utils/errors.ts` with error mapper
2. Create `src/utils/toast.ts` with branded UI components
3. Add error code constants and type definitions

### Phase 2: API Layer Integration
1. Update `src/lib/api.ts` to use error mapper for all thrown errors
2. Wrap Supabase calls with try-catch that maps errors
3. Add network detection and offline handling

### Phase 3: UI Component Updates
1. Replace all `alert()` calls with `showError()` or `showSuccess()`
2. Update form validation to use friendly messages
3. Add loading states and error boundaries

### Phase 4: Testing & Refinement
1. Trigger each error scenario manually
2. Verify message tone and clarity
3. Test offline behavior
4. Ensure no raw errors leak through

---

## File Modifications

### New Files
- `src/utils/errors.ts` - Error mapper
- `src/utils/toast.ts` - Toast UI wrapper

### Modified Files (API Layer)
- `src/lib/api.ts` - All error throws

### Modified Files (UI Screens)
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(settings)/username.tsx`
- `app/(settings)/password.tsx`
- `app/(settings)/phone.tsx`
- `app/(profile)/edit.tsx`
- `app/(compose)/compose.tsx`
- `app/(compose)/reply.tsx`
- `app/(modals)/create-list.tsx`
- `app/(modals)/create-channel.tsx`
- `app/conversation/[id]/edit.tsx`
- `app/conversation/[id]/info.tsx`
- `app/conversation/[id]/manage-admins.tsx`

---

## Verification Plan

### Automated Tests
- Unit tests for error mapper with all known error codes
- Integration tests for API error handling

### Manual Verification
1. **Auth Flow**: Test login/register with invalid credentials, weak passwords, duplicate emails
2. **Profile**: Test username changes with duplicates, invalid characters, length violations
3. **Content**: Test post creation with empty content, too many media, invalid poll data
4. **Network**: Test offline mode, slow connections, server errors
5. **Edge Cases**: Test rapid-fire requests (rate limiting), concurrent edits, session expiry

### Success Criteria
- ✅ Zero raw error messages visible to users
- ✅ All errors provide clear next steps
- ✅ Offline state is gracefully communicated
- ✅ Error tone is friendly and non-technical
