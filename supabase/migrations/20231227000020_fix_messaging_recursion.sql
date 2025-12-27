
-- Fix Messaging RLS Infinite Recursion
-- Migration: 20231227000020_fix_messaging_recursion.sql

-- 1. Create Helper Function (SECURITY DEFINER to break recursion)
CREATE OR REPLACE FUNCTION public.check_is_participant(p_conversation_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Update Conversations Policies
DROP POLICY IF EXISTS "Conversations viewable by participants" ON public.conversations;
CREATE POLICY "Conversations viewable by participants"
    ON public.conversations FOR SELECT
    USING (public.check_is_participant(id));

-- 3. Update Conversation Participants Policies
DROP POLICY IF EXISTS "Users can see other participants in their chats" ON public.conversation_participants;
CREATE POLICY "Users can see other participants in their chats"
    ON public.conversation_participants FOR SELECT
    USING (public.check_is_participant(conversation_id));

-- 4. Update Messages Policies
DROP POLICY IF EXISTS "Messages viewable by conversation participants" ON public.messages;
CREATE POLICY "Messages viewable by conversation participants"
    ON public.messages FOR SELECT
    USING (public.check_is_participant(conversation_id));

DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON public.messages;
CREATE POLICY "Users can insert messages into their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        public.check_is_participant(conversation_id)
    );

-- 5. Update Message Reactions Policies
DROP POLICY IF EXISTS "Message reactions viewable by conversation participants" ON public.message_reactions;
CREATE POLICY "Message reactions viewable by conversation participants"
    ON public.message_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.messages
            WHERE messages.id = message_reactions.message_id
            AND public.check_is_participant(messages.conversation_id)
        )
    );

DROP POLICY IF EXISTS "Users can react to messages in their conversations" ON public.message_reactions;
CREATE POLICY "Users can react to messages in their conversations"
    ON public.message_reactions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.messages
            WHERE messages.id = message_reactions.message_id
            AND public.check_is_participant(messages.conversation_id)
        )
    );
