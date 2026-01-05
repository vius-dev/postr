-- Lists System Migration
-- Implements Twitter-style Lists for curating custom timelines

-- Create lists table
CREATE TABLE IF NOT EXISTS lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    description TEXT CHECK (char_length(description) <= 500),
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(owner_id, name)
);

-- Create list_members table (users in a list)
CREATE TABLE IF NOT EXISTS list_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Constraints
    UNIQUE(list_id, user_id)
);

-- Create list_subscriptions table (users following a list)
CREATE TABLE IF NOT EXISTS list_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(list_id, subscriber_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lists_owner_id ON lists(owner_id);
CREATE INDEX IF NOT EXISTS idx_lists_created_at ON lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_list_members_list_id ON list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_list_members_user_id ON list_members(user_id);
CREATE INDEX IF NOT EXISTS idx_list_subscriptions_list_id ON list_subscriptions(list_id);
CREATE INDEX IF NOT EXISTS idx_list_subscriptions_subscriber_id ON list_subscriptions(subscriber_id);

-- RLS Policies
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_subscriptions ENABLE ROW LEVEL SECURITY;

-- Lists: Anyone can view public lists, owners can view their private lists
CREATE POLICY "Public lists are viewable by everyone"
    ON lists FOR SELECT
    USING (is_private = false OR owner_id = auth.uid());

-- Lists: Only owners can create lists
CREATE POLICY "Users can create their own lists"
    ON lists FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Lists: Only owners can update their lists
CREATE POLICY "Users can update their own lists"
    ON lists FOR UPDATE
    USING (owner_id = auth.uid());

-- Lists: Only owners can delete their lists
CREATE POLICY "Users can delete their own lists"
    ON lists FOR DELETE
    USING (owner_id = auth.uid());

-- List Members: Viewable if list is public or user owns the list
CREATE POLICY "List members are viewable for accessible lists"
    ON list_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_members.list_id
            AND (lists.is_private = false OR lists.owner_id = auth.uid())
        )
    );

-- List Members: Only list owners can add members
CREATE POLICY "List owners can add members"
    ON list_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_members.list_id
            AND lists.owner_id = auth.uid()
        )
        AND added_by = auth.uid()
    );

-- List Members: Only list owners can remove members
CREATE POLICY "List owners can remove members"
    ON list_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_members.list_id
            AND lists.owner_id = auth.uid()
        )
    );

-- List Subscriptions: Viewable if list is public or user owns/subscribes to the list
CREATE POLICY "List subscriptions are viewable for accessible lists"
    ON list_subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_subscriptions.list_id
            AND (lists.is_private = false OR lists.owner_id = auth.uid())
        )
        OR subscriber_id = auth.uid()
    );

-- List Subscriptions: Users can subscribe to public lists
CREATE POLICY "Users can subscribe to accessible lists"
    ON list_subscriptions FOR INSERT
    WITH CHECK (
        subscriber_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_subscriptions.list_id
            AND (lists.is_private = false OR lists.owner_id = auth.uid())
        )
    );

-- List Subscriptions: Users can unsubscribe from lists
CREATE POLICY "Users can unsubscribe from lists"
    ON list_subscriptions FOR DELETE
    USING (subscriber_id = auth.uid());

-- Auto-update timestamp trigger
CREATE TRIGGER update_lists_updated_at
    BEFORE UPDATE ON lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
