import * as Network from 'expo-network';
import { getDb } from '../db/sqlite';
import { api } from '../api';
import { eventEmitter } from '@/lib/EventEmitter';
import { generateId } from '@/utils/id';
import { PhaseRunner } from './PhaseRunner';
import { OutboxPostsPhase, ReactionsPhase, BookmarksPhase, FeedDeltaPhase, DiagnosticPhase, PollVotesPhase } from './syncPhases';
import { upsertPost, ensureLocalUser } from './syncUtils';

const runner = new PhaseRunner();

export const SyncEngine = {
    init: async () => {
        // Just trigger an initial sync if online
        await SyncEngine.startSync();
    },

    cancel: () => {
        runner.abort();
    },

    startSync: async () => {
        // 1. Connectivity Check
        const state = await Network.getNetworkStateAsync();
        if (!state.isInternetReachable) return;

        // 2. Auth Check
        const user = await api.getCurrentUser();
        if (!user) return; // Should be impossible if called after auth gate, but safe

        // 3. DB Check
        try {
            const db = await getDb();

            // 4. Run Phases
            await runner.run(
                [
                    OutboxPostsPhase,
                    ReactionsPhase,
                    BookmarksPhase,
                    PollVotesPhase,
                    FeedDeltaPhase,
                    DiagnosticPhase
                ],
                {
                    db,
                    userId: user.id,
                    now: Date.now()
                }
            );
            console.log('[SyncEngine] Sync Cycle Complete');
        } catch (e) {
            console.error('[SyncEngine] Sync Cycle Failed/Aborted', e);
        }
    },

    // UI ACTIONS - PURE LOCAL WRITES (Phase 1)

    toggleReaction: async (postId: string, type: 'LIKE' | 'DISLIKE' | 'LAUGH' | 'REPOST') => {
        if (type === 'REPOST') {
            return SyncEngine.toggleRepost(postId);
        }

        const db = await getDb();
        const user = await api.getCurrentUser();
        if (!user) {
            console.error('[SyncEngine] toggleReaction: No user found');
            return;
        }

        // Ensure user exists locally for FK integrity
        await ensureLocalUser(db, user);

        const now = Date.now();
        const countCol = type === 'LIKE' ? 'like_count' : type === 'DISLIKE' ? 'dislike_count' : 'laugh_count';

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
                await db.runAsync(
                    `UPDATE posts SET ${countCol} = MAX(0, ${countCol} - 1) WHERE id = ?`,
                    [postId]
                );
            } else {
                // Add (Optimistic)
                await db.runAsync(
                    `INSERT INTO reactions (id, post_id, user_id, reaction_type, sync_status, created_at)
                      VALUES (?, ?, ?, ?, 'pending', ?)`,
                    [`${type}_${postId}_${user.id}`, postId, user.id, type, now]
                );

                // Increment Count
                await db.runAsync(
                    `UPDATE posts SET ${countCol} = ${countCol} + 1 WHERE id = ?`,
                    [postId]
                );
            }
        });

        await SyncEngine.emitEngagementUpdate(postId);
        eventEmitter.emit('feedUpdated');
    },

    votePoll: async (postId: string, choiceIndex: number) => {
        const db = await getDb();
        const user = await api.getCurrentUser();
        if (!user) {
            console.error('[SyncEngine] votePoll: No user found');
            return;
        }

        await ensureLocalUser(db, user);

        const now = Date.now();

        await db.withTransactionAsync(async () => {
            // 1. Store vote in local table for sync
            await db.runAsync(`
                INSERT OR REPLACE INTO poll_votes (post_id, user_id, choice_index, sync_status, created_at)
                VALUES (?, ?, ?, 'pending', ?)
            `, [postId, user.id, choiceIndex, now]);

            // 2. Optimistically update the post's poll JSON in the DB so feed reloads see it
            const post: any = await db.getFirstAsync('SELECT poll_json FROM posts WHERE id = ?', [postId]);
            if (post && post.poll_json && post.poll_json !== 'null') {
                try {
                    const poll = JSON.parse(post.poll_json);
                    if (poll.choices && poll.choices[choiceIndex]) {
                        // Mark user vote
                        poll.userVoteIndex = choiceIndex;
                        // Increment counts
                        poll.choices[choiceIndex].vote_count = (Number(poll.choices[choiceIndex].vote_count) || 0) + 1;
                        poll.totalVotes = (Number(poll.totalVotes) || 0) + 1;

                        await db.runAsync(
                            'UPDATE posts SET poll_json = ?, updated_at = ? WHERE id = ?',
                            [JSON.stringify(poll), now, postId]
                        );
                    }
                } catch (e) {
                    console.error('[SyncEngine] Failed to update local poll_json', e);
                }
            }
        });

        eventEmitter.emit('feedUpdated');
        // Trigger sync to push vote immediately
        SyncEngine.startSync();
    },

    emitEngagementUpdate: async (postId: string) => {
        try {
            const db = await getDb();
            const user = await api.getCurrentUser();
            if (!user) return;

            const row: any = await db.getFirstAsync(`
                SELECT 
                    p.id, p.like_count, p.dislike_count, p.laugh_count, p.repost_count, p.reply_count, p.is_reposted,
                    r.reaction_type as my_reaction
                FROM posts p
                LEFT JOIN reactions r ON p.id = r.post_id AND r.user_id = ?
                WHERE p.id = ?
            `, [user.id, postId]);

            if (row) {
                eventEmitter.emit('post-engagement-updated', {
                    postId: row.id,
                    counts: {
                        likes: row.like_count,
                        dislikes: row.dislike_count,
                        laughs: row.laugh_count,
                        reposts: row.repost_count,
                        replies: row.reply_count || 0,
                    },
                    myReaction: row.my_reaction || 'NONE',
                    isReposted: !!row.is_reposted
                });
            }
        } catch (e) {
            console.warn('[SyncEngine] Failed to emit engagement update', e);
        }
    },

    toggleRepost: async (postId: string) => {
        const db = await getDb();
        const user = await api.getCurrentUser();
        if (!user) {
            console.error('[SyncEngine] toggleRepost: No user found');
            return;
        }

        // Ensure user exists locally for FK integrity
        await ensureLocalUser(db, user);

        const now = Date.now();
        const localId = generateId();

        try {
            await db.withTransactionAsync(async () => {
                // Check if exists
                const existing: any = await db.getFirstAsync(
                    'SELECT id FROM posts WHERE owner_id = ? AND reposted_post_id = ? AND type = "repost" AND deleted = 0',
                    [user.id, postId]
                );

                if (existing) {
                    // Unrepost (soft delete)
                    await db.runAsync('UPDATE posts SET deleted = 1, updated_at = ? WHERE id = ?', [now, existing.id]);
                    await db.runAsync('UPDATE posts SET repost_count = MAX(0, repost_count - 1), is_reposted = 0 WHERE id = ?', [postId]);
                    // Clear outbox if it hasn't synced yet
                    await db.runAsync('DELETE FROM outbox_posts WHERE (local_id = ? OR (reposted_post_id = ? AND type = "repost")) AND owner_id = ?', [existing.id, postId, user.id]);
                } else {
                    // Repost - Intent
                    await db.runAsync(`
                        INSERT INTO outbox_posts (local_id, owner_id, content, type, reposted_post_id, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [localId, user.id, '', 'repost', postId, now]);

                    // Repost - Local Stub
                    await db.runAsync(`
                        INSERT INTO posts (id, owner_id, content, type, reposted_post_id, is_local, sync_status, created_at, updated_at, content_edited_at)
                        VALUES (?, ?, ?, ?, ?, 1, 'pending', ?, ?, ?)
                    `, [localId, user.id, '', 'repost', postId, now, now, now]);

                    await db.runAsync('UPDATE posts SET repost_count = repost_count + 1, is_reposted = 1 WHERE id = ?', [postId]);

                    // Add to profile feed locally
                    await db.runAsync(`
                        INSERT INTO feed_items (feed_type, user_id, post_id, rank_score, inserted_at)
                        VALUES (?, ?, ?, ?, ?)
                    `, [`profile:${user.id}`, user.id, localId, now, now]);
                }
            });
        } catch (err) {
            console.error('[SyncEngine] toggleRepost failed', err);
            throw err;
        }

        await SyncEngine.emitEngagementUpdate(postId);
        eventEmitter.emit('feedUpdated');
    },

    toggleBookmark: async (postId: string) => {
        const db = await getDb();
        const user = await api.getCurrentUser();
        if (!user) {
            console.error('[SyncEngine] toggleBookmark: No user found');
            return;
        }

        const now = Date.now();

        await db.withTransactionAsync(async () => {
            // Ensure user exists locally for FK integrity
            await ensureLocalUser(db, user);

            const existing: any = await db.getFirstAsync('SELECT * FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, user.id]);

            if (existing) {
                await db.runAsync('DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, user.id]);
            } else {
                await db.runAsync('INSERT INTO bookmarks (post_id, user_id, created_at) VALUES (?, ?, ?)', [postId, user.id, now]);
            }
        });

        eventEmitter.emit('feedUpdated');
    },

    async enqueuePoll(question: string, choices: any[], durationSeconds: number) {
        const db = await getDb();
        const user = await api.getCurrentUser() as any;
        if (!user) throw new Error('Not authenticated');

        const localId = generateId();
        const now = Date.now();
        const poll = {
            question,
            choices,
            expires_at: new Date(now + durationSeconds * 1000).toISOString()
        };

        try {
            await db.withTransactionAsync(async () => {
                console.log('[SyncEngine] enqueuePoll: Ensuring local user', user.id);
                // Ensure owner exists for FK integrity
                await ensureLocalUser(db, user);
                console.log('[SyncEngine] enqueuePoll: User ensured');

                console.log('[SyncEngine] enqueuePoll: Inserting into outbox_posts');
                await db.runAsync(`
                    INSERT INTO outbox_posts (local_id, owner_id, content, type, poll_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [localId, user.id, question, 'poll', JSON.stringify(poll), now]);
                console.log('[SyncEngine] enqueuePoll: Outbox inserted');

                console.log('[SyncEngine] enqueuePoll: Inserting into posts', localId);
                await db.runAsync(`
                    INSERT INTO posts (id, owner_id, content, type, poll_json, like_count, reply_count, repost_count, is_local, sync_status, created_at, updated_at, content_edited_at)
                    VALUES (?, ?, ?, ?, ?, 0, 0, 0, 1, 'pending', ?, ?, ?)
                `, [localId, user.id, question, 'poll', JSON.stringify(poll), now, now, now]);
                console.log('[SyncEngine] enqueuePoll: Post inserted');

                // VERIFY (Diagnostic)
                const checkPost: any = await db.getFirstAsync('SELECT id FROM posts WHERE id = ?', [localId]);
                if (!checkPost) console.error('[SyncEngine] enqueuePoll CRITICAL: Post missing after insert!');
                const checkUser: any = await db.getFirstAsync('SELECT id FROM users WHERE id = ?', [user.id]);
                if (!checkUser) {
                    console.error('[SyncEngine] enqueuePoll CRITICAL: User missing after insert!');
                    throw new Error('Invariant violation: User not bound to DB');
                }

                console.log('[SyncEngine] enqueuePoll: Inserting into feed_items');
                await db.runAsync(`INSERT OR IGNORE INTO feed_items (feed_type, user_id, post_id, rank_score, inserted_at) VALUES (?, ?, ?, ?, ?)`, ['home', user.id, localId, now, now]);
                console.log('[SyncEngine] enqueuePoll: Feed item inserted');
            });
        } catch (error) {
            console.error('[SyncEngine] enqueuePoll FK/DB Failure:', error);
            console.error('[SyncEngine] Diagnostic Data:', { localId, ownerId: user.id, type: 'poll', parentId: null });
            throw error;
        }

        eventEmitter.emit('feedUpdated');
        return localId;
    },

    enqueuePost: async (content: string, media: { type: 'image' | 'video'; url: string }[], quotedPostId?: string, parentId?: string, repostedPostId?: string, poll?: any) => {
        const db = await getDb();
        const user = await api.getCurrentUser() as any;
        if (!user) throw new Error('Not authenticated');

        const localId = generateId();
        const now = Date.now();

        if (quotedPostId || repostedPostId) {
            const conflictQuery = repostedPostId
                ? 'SELECT id FROM posts WHERE owner_id = ? AND reposted_post_id = ? AND type = "repost" AND deleted = 0 LIMIT 1'
                : 'SELECT id FROM posts WHERE owner_id = ? AND quoted_post_id = ? AND deleted = 0 LIMIT 1';

            const conflictParams = [user.id, (repostedPostId || quotedPostId) ?? null];
            const existing: any = await db.getFirstAsync(conflictQuery, conflictParams);
            if (existing) return existing.id;
        }

        const type = poll ? 'poll' : (parentId ? 'reply' : (repostedPostId ? 'repost' : (quotedPostId ? 'quote' : 'original')));

        try {
            await db.withTransactionAsync(async () => {
                console.log('[SyncEngine] enqueuePost: Ensuring local user', user.id);
                // Ensure owner exists for FK integrity
                await ensureLocalUser(db, user);
                console.log('[SyncEngine] enqueuePost: User ensured');

                console.log('[SyncEngine] enqueuePost: Inserting into outbox_posts');
                await db.runAsync(`
                    INSERT INTO outbox_posts (local_id, owner_id, content, media_json, poll_json, type, parent_id, quoted_post_id, reposted_post_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [localId, user.id, content, JSON.stringify(media), JSON.stringify(poll || null), type, parentId || null, quotedPostId || null, repostedPostId || null, now]);
                console.log('[SyncEngine] enqueuePost: Outbox inserted');

                console.log('[SyncEngine] enqueuePost: Inserting into posts', localId);
                await db.runAsync(`
                    INSERT INTO posts (id, owner_id, content, media_json, poll_json, type, parent_id, quoted_post_id, reposted_post_id, 
                                     like_count, reply_count, repost_count, is_local, sync_status, created_at, updated_at, content_edited_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, 'pending', ?, ?, ?)
                `, [localId, user.id, content, JSON.stringify(media), JSON.stringify(poll || null), type, parentId || null, quotedPostId || null, repostedPostId || null, now, now, now]);
                console.log('[SyncEngine] enqueuePost: Post inserted');

                // VERIFY (Diagnostic)
                const checkPost: any = await db.getFirstAsync('SELECT id FROM posts WHERE id = ?', [localId]);
                if (!checkPost) console.error('[SyncEngine] enqueuePost CRITICAL: Post missing after insert!');
                const checkUser: any = await db.getFirstAsync('SELECT id FROM users WHERE id = ?', [user.id]);
                if (!checkUser) {
                    console.error('[SyncEngine] enqueuePost CRITICAL: User missing after insert!');
                    throw new Error('Invariant violation: User not bound to DB');
                }

                // Add to feed (Optimistic)
                console.log('[SyncEngine] enqueuePost: Inserting into feed_items');
                await db.runAsync(`INSERT OR IGNORE INTO feed_items (feed_type, user_id, post_id, rank_score, inserted_at) VALUES (?, ?, ?, ?, ?)`, ['home', user.id, localId, now, now]);
                console.log('[SyncEngine] enqueuePost: Feed item inserted');
            });
        } catch (error) {
            console.error('[SyncEngine] enqueuePost FK/DB Failure:', error);
            console.error('[SyncEngine] Diagnostic Data:', { localId, ownerId: user.id, type, parentId, quotedPostId, repostedPostId });
            throw error;
        }

        eventEmitter.emit('feedUpdated');
        return localId;
    },

    syncProfile: async (username: string) => {
        // On-demand fetch, separate from the main sync loop but uses shared utilities
        const db = await getDb();
        try {
            const currentUser = await api.getCurrentUser();
            if (!currentUser) return;

            const user = await api.getUser(username);
            if (!user) return;

            // FIX: Persist the latest user profile to local DB immediately
            await db.withTransactionAsync(async () => {
                await ensureLocalUser(db, user);

                const posts = await api.getProfilePosts(user.id);
                await db.runAsync("DELETE FROM feed_items WHERE feed_type = ? AND user_id = ?", [`profile:${user.id}`, currentUser.id]);
                for (const post of posts) {
                    await upsertPost(db, post);
                    await db.runAsync(`INSERT OR IGNORE INTO feed_items (feed_type, user_id, post_id, rank_score, inserted_at) VALUES (?, ?, ?, ?, ?)`,
                        [`profile:${user.id}`, currentUser.id, post.id, new Date(post.createdAt).getTime(), Date.now()]);
                }
            });
            eventEmitter.emit('profileUpdated', user.id);
        } catch (e) { console.error('[SyncEngine] syncProfile failed', e); }
    }
};
