import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync('postr.db');
    }
    return db;
};

export const initDatabase = async () => {
    const database = await getDb();

    // Enable Write-Ahead Logging for better concurrency
    await database.execAsync('PRAGMA journal_mode = WAL;');
    await database.execAsync('PRAGMA foreign_keys = ON;');

    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            display_name TEXT,
            avatar_url TEXT,
            header_url TEXT,
            verified INTEGER DEFAULT 0,
            updated_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            author_id TEXT NOT NULL,
            content TEXT,
            media_json TEXT,
            post_type TEXT NOT NULL,
            parent_post_id TEXT,
            visibility TEXT DEFAULT 'public',
            like_count INTEGER DEFAULT 0,
            reply_count INTEGER DEFAULT 0,
            repost_count INTEGER DEFAULT 0,
            is_local INTEGER DEFAULT 0,
            sync_status TEXT DEFAULT 'synced',
            deleted INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER,
            FOREIGN KEY (author_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS feed_items (
            feed_type TEXT NOT NULL,
            post_id TEXT NOT NULL,
            rank_score REAL DEFAULT 0,
            inserted_at INTEGER NOT NULL,
            PRIMARY KEY (feed_type, post_id),
            FOREIGN KEY (post_id) REFERENCES posts(id)
        );

        CREATE TABLE IF NOT EXISTS reactions (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            reaction_type TEXT NOT NULL,
            emoji TEXT,
            sync_status TEXT DEFAULT 'synced',
            created_at INTEGER,
            UNIQUE (post_id, user_id, reaction_type),
            FOREIGN KEY (post_id) REFERENCES posts(id)
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
            post_id TEXT PRIMARY KEY,
            created_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS outbox_posts (
            local_id TEXT PRIMARY KEY,
            content TEXT,
            media_json TEXT,
            post_type TEXT,
            parent_post_id TEXT,
            created_at INTEGER,
            retry_count INTEGER DEFAULT 0,
            last_error TEXT
        );

        CREATE TABLE IF NOT EXISTS sync_state (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
        CREATE INDEX IF NOT EXISTS idx_feed_rank ON feed_items(feed_type, rank_score DESC);
        CREATE INDEX IF NOT EXISTS idx_feed_time ON feed_items(feed_type, inserted_at DESC);
        CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
    `);

    // Migration: Add header_url if it doesn't exist
    try {
        const result = await database.getFirstAsync<{ name: string }>(
            "PRAGMA table_info(users)"
        );
        // Better check: query specific column
        // But PRAGMA table_info returns rows for each column.
        // Let's just try adding it and ignore error, or check properly.

        const columns = await database.getAllAsync("PRAGMA table_info(users)") as any[];
        const hasHeaderUrl = columns.some(c => c.name === 'header_url');

        if (!hasHeaderUrl) {
            console.log('Migrating: Adding header_url to users table');
            await database.execAsync('ALTER TABLE users ADD COLUMN header_url TEXT');
        }
    } catch (e) {
        console.error('Migration check failed', e);
    }

    console.log('Database initialized successfully');
};
