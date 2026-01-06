import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import UserListScreen from '@/screens/UserListScreen';
import { User } from '@/types/user';

export default function FollowersScreen() {
    const { username } = useLocalSearchParams<{ username: string }>();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        if (username) {
            api.getUser(username).then(user => {
                if (user) setUserId(user.id);
            });
        }
    }, [username]);

    const fetchFollowers = async () => {
        if (!userId) return [];
        return api.getFollowers(userId);
    };

    const handleFollowAction = async (targetId: string) => {
        await api.toggleFollow(targetId);
        // Relationship is handled inside UserRow/api sync
    };

    return (
        <UserListScreen
            title="Followers"
            fetchUsers={fetchFollowers}
            emptyTitle="No followers yet"
            description={username === 'me' ? "You don't have any followers yet." : `@${username} doesn't have any followers yet.`}
            emptyIcon="person-add-outline"
            onUserAction={handleFollowAction}
            actionLabel="View"
        />
    );
}
