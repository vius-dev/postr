import React, { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import UserListScreen from '@/screens/UserListScreen';

export default function FollowingScreen() {
    const { username } = useLocalSearchParams<{ username: string }>();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        if (username) {
            api.getUser(username).then(user => {
                if (user) setUserId(user.id);
            });
        }
    }, [username]);

    const fetchFollowing = async () => {
        if (!userId) return [];
        return api.getFollowing(userId);
    };

    const handleFollowAction = async (targetId: string) => {
        await api.toggleFollow(targetId);
    };

    return (
        <UserListScreen
            title="Following"
            fetchUsers={fetchFollowing}
            emptyTitle="Not following anyone yet"
            description={username === 'me' ? "You aren't following anyone yet." : `@${username} isn't following anyone yet.`}
            emptyIcon="person-add-outline"
            onUserAction={handleFollowAction}
            actionLabel="View"
        />
    );
}
