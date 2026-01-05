import * as SQLite from 'expo-sqlite';
import { Post } from '@/types/post';

/**
 * Ensures the user exists in the local database.
 * MUST be called before inserting any content (posts, reactions) that references this user.
 */
export const ensureLocalUser = async (db: SQLite.SQLiteDatabase, user: any) => {
    if (!user?.id) throw new Error('Invalid user for ensureLocalUser');
    console.log('[SyncUtils] ensureLocalUser: Upserting', user.id);

    // Normalize fields from different user shapes (Auth user vs Profile user)
    const id = user.id;
    const username = user.username || 'unknown';
    const name = user.name || user.display_name || username;
    const avatar = user.avatar || user.avatar_url || null;
    const header = user.headerImage || user.header_url || null;
    const isVerified = (user.is_verified === true || user.is_verified === 1) ? 1 : 0;

    await db.runAsync(`
        INSERT INTO users (id, username, display_name, avatar_url, header_url, verified, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            username=excluded.username, display_name=excluded.display_name, avatar_url=excluded.avatar_url,
            header_url=COALESCE(excluded.header_url, users.header_url), verified=excluded.verified, updated_at=excluded.updated_at
    `, [id, username, name, avatar, header, isVerified, Date.now()]);
    console.log('[SyncUtils] ensureLocalUser: Done', id);
};

/**
 * Upserts a post and its dependencies (users, quoted posts) into the local database.
 * Designed to be recursive and idempotent.
 */
export const upsertPost = async (db: SQLite.SQLiteDatabase, post: Post, visited: Set<string> = new Set()) => {
    if (!post.id) {
        console.warn('[SyncUtils] upsertPost: Skipping post with missing ID');
        return;
    }
    if (!post.author || !post.author.id) {
        console.warn('[SyncUtils] upsertPost: Skipping post with missing author or author ID:', post.id);
        return;
    }
    if (visited.has(post.id)) return;
    visited.add(post.id);

    // Recursive upsert for dependencies
    if (post.quotedPost) {
        console.log(`[SyncUtils] upsertPost: Recursively upserting quotedPost ${post.quotedPost.id} for post ${post.id}`);
        await upsertPost(db, post.quotedPost, visited);
    }
    if (post.repostedPost) {
        console.log(`[SyncUtils] upsertPost: Recursively upserting repostedPost ${post.repostedPost.id} for post ${post.id}`);
        await upsertPost(db, post.repostedPost, visited);
    }

    // Upsert User (Author)
    await ensureLocalUser(db, post.author);

    // Handle Conflicts (Reposti/Quotes)
    // If we receive a post that is a Quote/Repost, we need to ensure we don't have conflicting specialized posts
    // e.g. if we have a local "repost" stub for this ID, but the server says it's a "quote", we respect server.
    if (post.quotedPostId || post.repostedPostId || post.type === 'repost') {
        const authorId = post.author.id;
        const query = post.type === 'repost'
            ? 'SELECT id FROM posts WHERE owner_id = ? AND reposted_post_id = ? AND type = "repost" AND id != ? AND deleted = 0 LIMIT 1'
            : 'SELECT id FROM posts WHERE owner_id = ? AND quoted_post_id = ? AND id != ? AND deleted = 0 LIMIT 1';
        const params = post.type === 'repost'
            ? [authorId, post.repostedPostId ?? null, post.id]
            : [authorId, post.quotedPostId ?? null, post.id];

        const conflict: any = await db.getFirstAsync(query, params);
        if (conflict) {
            // Remap local interactions to the definitive post
            await db.runAsync('UPDATE OR IGNORE reactions SET post_id = ? WHERE post_id = ?', [post.id, conflict.id]);
            await db.runAsync('UPDATE OR IGNORE bookmarks SET post_id = ? WHERE post_id = ?', [post.id, conflict.id]);
            await db.runAsync('UPDATE OR IGNORE feed_items SET post_id = ? WHERE post_id = ?', [post.id, conflict.id]);
            // Remap references
            await db.runAsync('UPDATE posts SET parent_id = ? WHERE parent_id = ?', [post.id, conflict.id]);
            await db.runAsync('UPDATE posts SET quoted_post_id = ? WHERE quoted_post_id = ?', [post.id, conflict.id]);
            await db.runAsync('UPDATE posts SET reposted_post_id = ? WHERE reposted_post_id = ?', [post.id, conflict.id]);

            // Delete the conflict
            await db.runAsync('DELETE FROM posts WHERE id = ?', [conflict.id]);
        }
    }

    // Upsert Post
    try {
        // POLL METADATA MERGE: If local post has colors but server doesn't, preserve local colors
        let finalPollJson = JSON.stringify(post.poll || null);
        if (post.poll && post.poll.choices) {
            const existingPost: any = await db.getFirstAsync('SELECT poll_json FROM posts WHERE id = ?', [post.id]);
            if (existingPost?.poll_json) {
                try {
                    const localPoll = JSON.parse(existingPost.poll_json);
                    if (localPoll?.choices) {
                        const mergedChoices = post.poll.choices.map((c: any, i: number) => ({
                            ...c,
                            color: c.color || localPoll.choices[i]?.color
                        }));
                        finalPollJson = JSON.stringify({ ...post.poll, choices: mergedChoices });
                    }
                } catch (e) {
                    console.warn('[SyncUtils] Failed to merge poll colors', e);
                }
            }
        }

        await db.runAsync(`
            INSERT INTO posts (id, owner_id, content, media_json, poll_json, type, parent_id, quoted_post_id, reposted_post_id,
                             visibility, like_count, reply_count, repost_count, is_local, sync_status, deleted, created_at, updated_at, content_edited_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                content=excluded.content, media_json=excluded.media_json, poll_json=excluded.poll_json, like_count=excluded.like_count,
                reply_count=excluded.reply_count, repost_count=excluded.repost_count, sync_status='synced', 
                updated_at=excluded.updated_at, content_edited_at=excluded.content_edited_at
        `, [post.id, post.author.id, post.content, JSON.stringify(post.media || []), finalPollJson, post.type, post.parentPostId || null,
        post.quotedPostId || null, post.repostedPostId || null, post.meta.visibility || 'public', post.stats.likes || 0,
        post.stats.replies || 0, post.stats.reposts || 0, 0, 'synced', 0,
        new Date(post.createdAt).getTime(),
        new Date(post.updatedAt || post.createdAt).getTime(),
        post.content_edited_at ? new Date(post.content_edited_at).getTime() : new Date(post.createdAt).getTime()
        ]);

        // Debug: Verify the post was stored correctly
        const stored: any = await db.getFirstAsync('SELECT id, type, quoted_post_id, reposted_post_id FROM posts WHERE id = ?', [post.id]);
        if (stored && (stored.quoted_post_id || stored.reposted_post_id)) {
            console.log(`[SyncUtils] upsertPost: Stored post ${post.id} with references:`, {
                type: stored.type,
                quoted_post_id: stored.quoted_post_id,
                reposted_post_id: stored.reposted_post_id
            });
        }
    } catch (error) {
        console.error('[SyncUtils] upsertPost FK/DB Failure:', error);
        console.error('[SyncUtils] Diagnostic Data:', {
            id: post.id,
            ownerId: post.author.id,
            type: post.type,
            parentId: post.parentPostId,
            quotedId: post.quotedPostId,
            repostedId: post.repostedPostId
        });
        throw error;
    }
};
