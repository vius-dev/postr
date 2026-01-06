import { getDb } from './db/sqlite';
import { generateId } from '@/utils/id';

export interface Draft {
    id: string;
    content: string;
    media: any[];
    pollJson: any;
    type: string;
    parentId?: string;
    quotedPostId?: string;
    createdAt: number;
    updatedAt: number;
}

export const DraftsService = {
    saveDraft: async (ownerId: string, draft: Partial<Draft>): Promise<string> => {
        const db = await getDb();
        const id = draft.id || generateId();
        const now = Date.now();

        await db.runAsync(`
            INSERT OR REPLACE INTO drafts (
                id, owner_id, content, media_json, poll_json, type, parent_id, quoted_post_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            ownerId,
            draft.content || '',
            JSON.stringify(draft.media || []),
            JSON.stringify(draft.pollJson || null),
            draft.type || 'original',
            draft.parentId || null,
            draft.quotedPostId || null,
            draft.createdAt || now,
            now
        ]);

        return id;
    },

    getDrafts: async (ownerId: string): Promise<Draft[]> => {
        const db = await getDb();
        const rows = await db.getAllAsync(`
            SELECT * FROM drafts WHERE owner_id = ? ORDER BY updated_at DESC
        `, [ownerId]) as any[];

        return rows.map(row => ({
            id: row.id,
            content: row.content,
            media: JSON.parse(row.media_json || '[]'),
            pollJson: JSON.parse(row.poll_json || 'null'),
            type: row.type,
            parentId: row.parent_id,
            quotedPostId: row.quoted_post_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    },

    deleteDraft: async (id: string): Promise<void> => {
        const db = await getDb();
        await db.runAsync('DELETE FROM drafts WHERE id = ?', [id]);
    }
};
