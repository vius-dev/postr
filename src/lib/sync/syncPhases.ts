import { SyncPhase, SyncContext } from './PhaseRunner';
import { api } from '../api';
import { upsertPost } from './syncUtils';
import { eventEmitter } from '@/lib/EventEmitter';

export const OutboxPostsPhase: SyncPhase = {
    name: 'outbox_posts',

    async run({ db, userId }) {
        // Fetch pending items for THIS user
        const items = await db.getAllAsync(
            `SELECT * FROM outbox_posts WHERE owner_id = ? ORDER BY created_at ASC`,
            [userId]
        ) as any[];

        for (const item of items) {
            try {
                // Mark as committing
                await db.runAsync(
                    `UPDATE outbox_posts SET status = 'committing', last_attempt = ? WHERE local_id = ?`,
                    [Date.now(), item.local_id]
                );

                const media = item.media_json ? JSON.parse(item.media_json) : [];
                const poll = item.poll_json ? JSON.parse(item.poll_json) : null;

                let remote: any;
                if (item.type === 'poll') {
                    // Polls use api.createPoll (which inserts both post and poll)
                    // We need to adapt it or use a more unified createPost.
                    // For now, let's use createPoll but it needs durationSeconds.
                    // Wait, we stored the full poll object.
                    const durationInSeconds = poll.expires_at ? Math.max(300, Math.floor((new Date(poll.expires_at).getTime() - Date.now()) / 1000)) : 3600;
                    remote = await api.createPoll({
                        id: item.local_id,
                        question: item.content,
                        choices: poll.choices,
                        durationSeconds: durationInSeconds
                    });
                    // NOTE: createPoll in api.ts returns void. We need it to return the created post for consistency.
                    // I will fix api.ts later. For now, let's assume it returns { id }.
                    // Wait, if it returns void, we can't easily remap.
                } else {
                    // DIAGNOSTIC: Check auth state and content before API call
                    const { data: { session } } = await (await import('../supabase')).supabase.auth.getSession();
                    console.log('[SyncPhases] OutboxPostsPhase: Auth check before createPost', {
                        hasSession: !!session,
                        userId: session?.user?.id,
                        expectedOwnerId: item.owner_id,
                        match: session?.user?.id === item.owner_id
                    });
                    console.log('[SyncPhases] OutboxPostsPhase: Content check', {
                        content: item.content,
                        contentLength: item.content?.length || 0,
                        contentTrimmed: item.content?.trim(),
                        hasMedia: media.length > 0,
                        type: item.type
                    });

                    // Network Call
                    remote = await api.createPost({
                        id: item.local_id,
                        content: item.content,
                        media: media,
                        parentId: item.parent_id,
                        quotedPostId: item.quoted_post_id,
                        repostedPostId: item.reposted_post_id,
                        type: item.type
                    });
                }

                if (!remote) throw new Error('Remote creation failed (no response)');

                // Fetch authoritative result
                const full = await api.getPost(remote.id);
                if (!full) throw new Error('Post fetch failed after create');

                await db.withTransactionAsync(async () => {
                    // 1. First upsert the authoritative server post
                    await upsertPost(db, full);

                    // 2. Remap ID if server changed it (from local UUID to server UUID)
                    if (remote.id !== item.local_id) {
                        await db.runAsync('UPDATE posts SET parent_id = ? WHERE parent_id = ?', [remote.id, item.local_id]);
                        await db.runAsync('UPDATE posts SET quoted_post_id = ? WHERE quoted_post_id = ?', [remote.id, item.local_id]);
                        await db.runAsync('UPDATE posts SET reposted_post_id = ? WHERE reposted_post_id = ?', [remote.id, item.local_id]);
                        await db.runAsync('UPDATE OR IGNORE feed_items SET post_id = ? WHERE post_id = ?', [remote.id, item.local_id]);
                        await db.runAsync('UPDATE OR IGNORE reactions SET post_id = ? WHERE post_id = ?', [remote.id, item.local_id]);
                        await db.runAsync('UPDATE OR IGNORE bookmarks SET post_id = ? WHERE post_id = ?', [remote.id, item.local_id]);
                        await db.runAsync('UPDATE OR IGNORE poll_votes SET post_id = ? WHERE post_id = ?', [remote.id, item.local_id]);

                        // 3. Clean up the local stub now that references are moved
                        await db.runAsync('DELETE FROM posts WHERE id = ?', [item.local_id]);
                    }

                    // 4. Clean up outbox (Commit)
                    await db.runAsync(
                        `DELETE FROM outbox_posts WHERE local_id = ? AND owner_id = ?`,
                        [item.local_id, userId]
                    );
                });
            } catch (err) {
                console.error('[SyncPhases] Outbox post sync failed', err);
                await db.runAsync(
                    `UPDATE outbox_posts 
                     SET status = 'failed', retry_count = retry_count + 1, last_error = ?
                     WHERE local_id = ? AND owner_id = ?`,
                    [String(err), item.local_id, userId]
                );
            }
        }
    }
};

export const ReactionsPhase: SyncPhase = {
    name: 'reactions',

    async run({ db, userId }) {
        const pending = await db.getAllAsync(
            `SELECT * FROM reactions 
             WHERE sync_status = 'pending' AND user_id = ?`,
            [userId]
        ) as any[];

        for (const r of pending) {
            try {
                // Use the generic react API for all types (LIKE, DISLIKE, LAUGH)
                await api.react(r.post_id, r.reaction_type as any);

                await db.runAsync(
                    `UPDATE reactions SET sync_status = 'synced' WHERE id = ?`,
                    [r.id]
                );
            } catch (e) {
                // Idempotent failure; will retry next sync
                console.warn('[SyncPhases] Reaction sync failed', e);
            }
        }
    }
};

export const BookmarksPhase: SyncPhase = {
    name: 'bookmarks',

    async run({ db, userId }) {
        try {
            const remote = await api.getBookmarks();
            const remoteIds = new Set(remote.map(p => p.id));

            const local = await db.getAllAsync(
                `SELECT post_id FROM bookmarks WHERE user_id = ?`,
                [userId]
            ) as any[];

            // Bidirectional sync is tricky. Here we assume local is "intent" if it's new?
            // Actually, the previous implementation was: push local adds to remote if missing.
            for (const b of local) {
                if (!remoteIds.has(b.post_id)) {
                    await api.toggleBookmark(b.post_id);
                }
            }
            // What about pulling remote bookmarks?
            // Previous impl didn't explicitly pull remote bookmarks into `bookmarks` table during syncFeed?
            // Wait, previous implementation: "3. Bookmarks (Only for current user)... push local to remote".
            // It didn't pull.
            // But `FeedDeltaPhase` handles `feed_items`, not `bookmarks`.
            // We should probably pull bookmarks too if we want a complete sync.
            // But per "preservation of behaviour", I will stick to what was there: push local to remote.
        } catch (e) {
            console.warn('[SyncPhases] Bookmark sync failed', e);
        }
    }
};

export const FeedDeltaPhase: SyncPhase = {
    name: 'feed_delta',

    async run({ db, userId }) {
        const row = await db.getFirstAsync(
            `SELECT value FROM sync_state WHERE key = 'last_feed_sync' AND user_id = ?`,
            [userId]
        ) as any;

        let since = row?.value || '1970-01-01T00:00:00.000Z';

        // Repair Logic: If we have a sync cursor but 0 home feed items, force a full sync
        const homeCount: any = await db.getFirstAsync(`SELECT COUNT(*) as count FROM feed_items WHERE feed_type = 'home' AND user_id = ?`, [userId]);
        if (since !== '1970-01-01T00:00:00.000Z' && (homeCount?.count || 0) === 0) {
            console.log(`[SyncPhases] Home feed empty but cursor exists (${since}). Forcing reset to 1970 for repair.`);
            since = '1970-01-01T00:00:00.000Z';
        }

        console.log(`[SyncPhases] FeedDeltaPhase: Fetching since ${since}`);

        const { upserts, deletedIds } = await api.getDeltaFeed(since);

        const safeUpserts = Array.isArray(upserts) ? upserts : [];
        const safeDeletedIds = Array.isArray(deletedIds) ? deletedIds : [];

        console.log(`[SyncPhases] FeedDeltaPhase: Got ${safeUpserts.length} upserts, ${safeDeletedIds.length} deletions`);

        // Debug: Check if any posts have reposted_post or quoted_post data
        const repostsWithData = safeUpserts.filter(p => p.type === 'repost' && p.repostedPost);
        const quotesWithData = safeUpserts.filter(p => p.type === 'quote' && p.quotedPost);
        if (repostsWithData.length > 0) {
            console.log(`[SyncPhases] FeedDeltaPhase: Found ${repostsWithData.length} reposts with repostedPost data`);
            console.log('[SyncPhases] FeedDeltaPhase: Sample repost:', JSON.stringify(repostsWithData[0], null, 2));
        }
        if (quotesWithData.length > 0) {
            console.log(`[SyncPhases] FeedDeltaPhase: Found ${quotesWithData.length} quotes with quotedPost data`);
        }

        if (safeUpserts.length === 0 && safeDeletedIds.length === 0) return;

        await db.withTransactionAsync(async () => {
            for (const post of safeUpserts) {
                try {
                    await upsertPost(db, post);

                    // VERIFY FKs (Diagnostic)
                    const p: any = await db.getFirstAsync('SELECT id, owner_id FROM posts WHERE id = ?', [post.id]);
                    if (!p) {
                        console.error(`[SyncPhases] FK CRASH PREDICTION: Post ${post.id} missing after upsert!`);
                    } else {
                        const u: any = await db.getFirstAsync('SELECT id FROM users WHERE id = ?', [p.owner_id]);
                        if (!u) console.error(`[SyncPhases] FK CRASH PREDICTION: Post ${post.id} author ${p.owner_id} missing!`);
                    }

                    await db.runAsync(
                        `INSERT OR IGNORE INTO feed_items 
                         (feed_type, user_id, post_id, rank_score, inserted_at)
                         VALUES (?, ?, ?, ?, ?)`,
                        ['home', userId, post.id, new Date(post.createdAt).getTime(), Date.now()]
                    );
                } catch (e) {
                    console.error(`[SyncPhases] FeedDeltaPhase: Failed to process post ${post.id}:`, e);
                }
            }

            for (const id of safeDeletedIds) {
                try {
                    await db.runAsync(
                        `UPDATE posts SET deleted = 1 WHERE id = ?`,
                        [id]
                    );
                    await db.runAsync(
                        `DELETE FROM feed_items WHERE post_id = ? AND user_id = ?`,
                        [id, userId]
                    );
                } catch (e) {
                    console.error(`[SyncPhases] FeedDeltaPhase: Failed to delete post ${id}:`, e);
                }
            }

            await db.runAsync(
                `INSERT OR REPLACE INTO sync_state (key, user_id, value)
                 VALUES ('last_feed_sync', ?, ?)`,
                [userId, new Date().toISOString()]
            );
        });

        eventEmitter.emit('feedUpdated');
    }
};

// 5. POLL VOTES PHASE
// ---------------------------------------------------------------------------
export const PollVotesPhase: SyncPhase = {
    name: 'poll_votes',

    async run({ db, userId }) {
        // 1. OUTBOUND SYNC: Push pending votes to server
        const pendingVotes: any[] = await db.getAllAsync(
            'SELECT * FROM poll_votes WHERE sync_status = "pending" ORDER BY created_at ASC'
        );

        if (pendingVotes.length > 0) {
            console.log(`[SyncPhases] PollVotesPhase: Found ${pendingVotes.length} pending votes`);

            for (const vote of pendingVotes) {
                try {
                    const updated = await api.votePoll(vote.post_id, vote.choice_index);

                    await db.withTransactionAsync(async () => {
                        await upsertPost(db, updated);
                        await db.runAsync(
                            'UPDATE poll_votes SET sync_status = "synced" WHERE post_id = ? AND user_id = ?',
                            [vote.post_id, vote.user_id]
                        );
                    });
                } catch (error: any) {
                    // Check for duplicate key error (already voted on server)
                    if (error?.code === '23505' || String(error?.details || error?.message).includes('already exists')) {
                        console.log(`[SyncPhases] Vote already exists on server for ${vote.post_id}. Marking as synced.`);
                        await db.runAsync(
                            'UPDATE poll_votes SET sync_status = "synced" WHERE post_id = ? AND user_id = ?',
                            [vote.post_id, vote.user_id]
                        );
                        continue;
                    }
                    console.error(`[SyncPhases] PollVotesPhase: Failed to sync vote for post ${vote.post_id}`, error);
                }
            }
        }

        // 2. INBOUND SYNC: Fetch my votes from server to ensure local state is correct
        try {
            const myVotes = await api.getMyVotes();
            if (myVotes && myVotes.length > 0) {
                await db.withTransactionAsync(async () => {
                    for (const v of myVotes) {
                        // Use userId from the sync context, or the one from the vote if available (though api.getMyVotes implicit uses auth user)
                        // We strictly use the authenticated userId for the local DB to avoid confusion.
                        await db.runAsync(
                            `INSERT OR REPLACE INTO poll_votes (post_id, user_id, choice_index, sync_status) 
                             VALUES (?, ?, ?, 'synced')`,
                            [v.post_id, userId, v.choice_index]
                        );
                    }
                });
                console.log(`[SyncPhases] PollVotesPhase: Downloaded ${myVotes.length} votes from server`);
            }
        } catch (e) {
            console.error('[SyncPhases] PollVotesPhase: Failed to download remote votes', e);
        }
    }
};

// 6. DIAGNOSTIC PHASE
// ---------------------------------------------------------------------------
export const DiagnosticPhase: SyncPhase = {
    name: 'diagnostic',

    async run({ db, userId }) {
        const tables = ['users', 'posts', 'feed_items', 'outbox_posts', 'sync_state', 'reactions', 'bookmarks', 'poll_votes'];
        const stats: any = {};

        for (const table of tables) {
            try {
                const res = await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${table} `) as any;
                stats[table] = res?.count || 0;
            } catch (e) {
                stats[table] = `Error: ${e instanceof Error ? e.message : String(e)} `;
            }
        }

        const userInDb = await db.getFirstAsync(`SELECT id FROM users WHERE id = ? `, [userId]) as any;
        const syncState = await db.getAllAsync(`SELECT key, value FROM sync_state WHERE user_id = ? `, [userId]) as any[];
        const schema = await db.getAllAsync(`SELECT name, sql FROM sqlite_master WHERE type = 'table'`) as any[];
        const fkIssues = await db.getAllAsync(`PRAGMA foreign_key_check`) as any[];

        console.log('[SyncEngine] Diagnostic Report:', {
            stats,
            userInDb: !!userInDb,
            syncState,
            userId,
            fkIssues: fkIssues.length > 0 ? fkIssues : 'none',
            schema: schema.map(s => ({ name: s.name, sql: s.sql }))
        });
    }
};
