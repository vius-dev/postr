import * as Network from 'expo-network';
import { getDb } from '../db/sqlite';
import { api } from '../api';
import { Post } from '@/types/post';
import { AppState } from 'react-native';
import { eventEmitter } from '@/lib/EventEmitter';

const SYNC_INTERVAL = 60000; // 1 minute
let isSyncing = false;

export const SyncEngine = {
    toggleReaction: async (postId: string, type: 'LIKE' | 'REPOST') => {
        const db = await getDb();
        const user = await api.getCurrentUser();
        if (!user) throw new Error('Auth required');

        const now = Date.now();

        await db.withTransactionAsync(async () => {
            // Check if exists
            const existing: any = await db.getFirstAsync(
                'SELECT * FROM reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ?',
                [postId, user.id, type]
            );

            if (existing) {
                // Remove (Optimistic)
                await db.runAsync(
                    'DELETE FROM reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ?',
                    [postId, user.id, type]
                );

                // Decrement Count
                const countCol = type === 'LIKE' ? 'like_count' : 'repost_count';
                await db.runAsync(
                    `UPDATE posts SET ${countCol} = MAX(0, ${countCol} - 1), updated_at = ? WHERE id = ?`,
                    [now, postId]
                );
            } else {
                // Add (Optimistic)
                await db.runAsync(
                    `INSERT INTO reactions (id, post_id, user_id, reaction_type, sync_status, created_at)
                      VALUES (?, ?, ?, ?, 'pending', ?)`,
                    [`${type}_${postId}_${user.id}`, postId, user.id, type, now]
                );

                // Increment Count
                const countCol = type === 'LIKE' ? 'like_count' : 'repost_count';
                await db.runAsync(
                    `UPDATE posts SET ${countCol} = ${countCol} + 1, updated_at = ? WHERE id = ?`,
                    [now, postId]
                );
            }
        });

        eventEmitter.emit('feedUpdated');
        SyncEngine.startSync();
    },

    toggleBookmark: async (postId: string) => {
        const db = await getDb();
        const user = await api.getCurrentUser();
        if (!user) throw new Error('Auth required');

        const now = Date.now();

        await db.withTransactionAsync(async () => {
            // Check if exists
            const existing: any = await db.getFirstAsync(
                'SELECT * FROM bookmarks WHERE post_id = ?',
                [postId]
            );

            if (existing) {
                // Remove bookmark (Optimistic)
                await db.runAsync('DELETE FROM bookmarks WHERE post_id = ?', [postId]);
            } else {
                // Add bookmark (Optimistic)
                await db.runAsync(
                    'INSERT INTO bookmarks (post_id, created_at) VALUES (?, ?)',
                    [postId, now]
                );
            }
        });

        eventEmitter.emit('feedUpdated');
        SyncEngine.startSync();
    },

    enqueuePost: async (content: string, media: { type: 'image'; url: string }[], quotedPostId?: string) => {
        const db = await getDb();
        const user = await api.getCurrentUser() as any;
        if (!user) throw new Error('Not authenticated');

        const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();

        await db.withTransactionAsync(async () => {
            // 1. Insert into outbox
            await db.runAsync(`
        INSERT INTO outbox_posts (
          local_id, content, media_json, post_type, parent_post_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [localId, content, JSON.stringify(media), 'original', quotedPostId || null, now]);

            // 2. Insert into posts (Optimistic)
            await db.runAsync(`
        INSERT INTO posts (
          id, author_id, content, media_json, post_type, parent_post_id, 
          like_count, reply_count, repost_count, 
          is_local, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 1, 'pending', ?, ?)
      `, [
                localId, user.id, content, JSON.stringify(media), 'original', quotedPostId || null, now, now
            ]);

            // 3. Insert into users if needed
            await db.runAsync(`
        INSERT OR IGNORE INTO users (id, username, display_name, avatar_url, header_url, verified, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [user.id, user.username, user.name, user.avatar, user.headerImage || null, user.is_verified ? 1 : 0, now]);

            // 4. Insert into feed_items
            await db.runAsync(`
        INSERT INTO feed_items (feed_type, post_id, rank_score, inserted_at)
        VALUES ('home', ?, ?, ?)
      `, [localId, now, now]);
        });

        eventEmitter.emit('feedUpdated');
        SyncEngine.startSync();
    },

    init: async () => {
        // Set up network listener
        // Set up app state listener (foreground/background)
        // Run initial sync
        await SyncEngine.startSync();
    },

    startSync: async () => {
        if (isSyncing) return;
        const { isInternetReachable } = await Network.getNetworkStateAsync();
        if (!isInternetReachable) return;

        try {
            isSyncing = true;
            console.log('Starting Sync...');

            await SyncEngine.processOutbox();
            await SyncEngine.syncFeed();

            console.log('Sync Complete');
        } catch (e) {
            console.error('Sync Failed', e);
        } finally {
            isSyncing = false;
        }
    },

    processOutbox: async () => {
        const db = await getDb();

        // 1. Posts
        const outboxItems = await db.getAllAsync('SELECT * FROM outbox_posts ORDER BY created_at ASC') as any[];

        for (const item of outboxItems) {
            try {
                const media = item.media_json ? JSON.parse(item.media_json) : [];
                const remotePost = await api.createPost({
                    content: item.content,
                    media: media,
                    quotedPostId: item.parent_post_id
                });
                await db.withTransactionAsync(async () => {
                    await db.runAsync('DELETE FROM outbox_posts WHERE local_id = ?', [item.local_id]);
                    await db.runAsync('DELETE FROM posts WHERE id = ?', [item.local_id]);
                    await SyncEngine.upsertPost(db, remotePost);
                });
            } catch (error) {
                console.error('Failed to sync outbox item', item.local_id, error);
            }
        }

        // 2. Reactions
        const pendingReactions = await db.getAllAsync(
            "SELECT * FROM reactions WHERE sync_status = 'pending'"
        ) as any[];

        for (const r of pendingReactions) {
            try {
                if (r.reaction_type === 'LIKE') {
                    await api.toggleLike(r.post_id);
                } else if (r.reaction_type === 'REPOST') {
                    await api.repost(r.post_id);
                }

                // Mark synced
                await db.runAsync(
                    "UPDATE reactions SET sync_status = 'synced' WHERE id = ?",
                    [r.id]
                );
            } catch (error) {
                console.error('Failed to sync reaction', r.id, error);
                // If 404 (post deleted), remove reaction?
                // For now, retry later.
            }
        }

        // 3. Bookmarks
        // Get current bookmarks from local DB
        const localBookmarks = await db.getAllAsync('SELECT post_id FROM bookmarks') as any[];
        const localBookmarkIds = new Set(localBookmarks.map(b => b.post_id));

        // Get remote bookmarks
        try {
            const remoteBookmarks = await api.getBookmarks();
            const remoteBookmarkIds = new Set(remoteBookmarks.map(p => p.id));

            // Sync additions (local has, remote doesn't)
            for (const postId of localBookmarkIds) {
                if (!remoteBookmarkIds.has(postId)) {
                    try {
                        await api.toggleBookmark(postId);
                    } catch (error) {
                        console.error('Failed to add bookmark', postId, error);
                    }
                }
            }

            // Sync removals (remote has, local doesn't)
            for (const postId of remoteBookmarkIds) {
                if (!localBookmarkIds.has(postId)) {
                    try {
                        await api.toggleBookmark(postId);
                    } catch (error) {
                        console.error('Failed to remove bookmark', postId, error);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to sync bookmarks', error);
        }
    },

    syncFeed: async () => {
        const db = await getDb();

        // 1. Get last sync time
        const result: any = await db.getFirstAsync('SELECT value FROM sync_state WHERE key = ?', ['last_feed_sync']);
        const lastSync = result?.value || '1970-01-01T00:00:00.000Z';

        // 2. Fetch Delta
        const deltaPosts = await api.getDeltaFeed(lastSync);

        if (deltaPosts.length === 0) return;

        // 3. Process Config (Max timestamp found)
        let maxCreatedAt = lastSync;

        // 4. Transaction Upsert
        await db.withTransactionAsync(async () => {
            for (const post of deltaPosts) {
                if (post.createdAt > maxCreatedAt) maxCreatedAt = post.createdAt;
                if (post.updatedAt && post.updatedAt > maxCreatedAt) maxCreatedAt = post.updatedAt!;

                await SyncEngine.upsertPost(db, post);

                // Add to feed_items (Home Feed)
                await db.runAsync(`
          INSERT OR IGNORE INTO feed_items (feed_type, post_id, rank_score, inserted_at)
          VALUES ('home', ?, ?, ?)
        `, [post.id, new Date(post.createdAt).getTime(), Date.now()]);
            }

            // Update Sync State
            await db.runAsync(`
        INSERT OR REPLACE INTO sync_state (key, value) VALUES ('last_feed_sync', ?)
      `, [new Date().toISOString()]);

            // Notify UI
            eventEmitter.emit('feedUpdated');
        });
    },

    syncProfile: async (username: string) => {
        const db = await getDb();
        try {
            const user = await api.getUser(username);
            if (!user) return;

            const posts = await api.getProfilePosts(user.id);
            const now = Date.now();

            await db.withTransactionAsync(async () => {
                // Upsert User
                await db.runAsync(`
                    INSERT OR REPLACE INTO users (id, username, display_name, avatar_url, header_url, verified, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [user.id, user.username, user.name, user.avatar, user.headerImage || null, user.is_verified ? 1 : 0, now]);

                // Clear old profile feed items to avoid stale data
                // (Optional: standard caching might keep them, but let's refresh for now)
                await db.runAsync("DELETE FROM feed_items WHERE feed_type = ?", [`profile:${user.id}`]);

                for (const post of posts) {
                    await SyncEngine.upsertPost(db, post);

                    await db.runAsync(`
                        INSERT OR IGNORE INTO feed_items (feed_type, post_id, rank_score, inserted_at)
                        VALUES (?, ?, ?, ?)
                    `, [`profile:${user.id}`, post.id, new Date(post.createdAt).getTime(), now]);
                }
            });

            eventEmitter.emit('profileUpdated', user.id);
        } catch (e) {
            console.error('Failed to sync profile', e);
        }
    },

    upsertPost: async (db: any, post: Post) => {
        // Upsert User first
        // Use COALESCE-like logic in app code or DB?
        // SQLite: INSERT OR REPLACE replaces full row.
        // Better: INSERT INTO ... ON CONFLICT(id) DO UPDATE SET ...
        // But for simplicity, let's just make sure we extract the header correctly.
        // Post.author usually comes from mapPost which passes row.author.
        // If row.author is from profiles join, it has header_image.
        // If it was mapped to User, it has headerImage.
        const header = (post.author as any).headerImage || (post.author as any).header_image || (post.author as any).header_url || null;

        await db.runAsync(`
      INSERT INTO users (id, username, display_name, avatar_url, header_url, verified, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username=excluded.username,
        display_name=excluded.display_name,
        avatar_url=excluded.avatar_url,
        header_url=COALESCE(excluded.header_url, users.header_url),
        verified=excluded.verified,
        updated_at=excluded.updated_at
    `, [
            post.author.id,
            post.author.username,
            post.author.name,
            post.author.avatar,
            header,
            post.author.is_verified ? 1 : 0,
            Date.now()
        ]);

        // Upsert Post
        await db.runAsync(`
      INSERT OR REPLACE INTO posts (
        id, author_id, content, media_json, post_type, parent_post_id, 
        like_count, reply_count, repost_count, 
        is_local, sync_status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'synced', ?, ?)
    `, [
            post.id,
            post.author.id,
            post.content,
            JSON.stringify(post.media || []),
            'original',
            null,
            post.likeCount || 0,
            post.commentCount || 0,
            post.repostCount || 0,
            new Date(post.createdAt).getTime(),
            new Date(post.updatedAt || post.createdAt).getTime()
        ]);
    }
};
