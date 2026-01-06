import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export const getDb = async () => {
    // STRICT MODE: No lazy initialization
    if (!initPromise) {
        throw new Error('[Database] Critical: getDb() called before initSystem()');
    }

    await initPromise;

    if (!db) {
        throw new Error('[Database] Critical: Database initialization failed');
    }
    return db;
};

/**
 * PRODUCTION-GRADE MIGRATION RUNNER
 * DDL ONLY - No user data manipulation in migrations
 */

interface Migration {
    version: number;
    up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
    {
        version: 1,
        up: async (db) => {
            // Initial Schema
            await db.runAsync(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    display_name TEXT,
                    avatar_url TEXT,
                    header_url TEXT,
                    verified INTEGER DEFAULT 0,
                    updated_at INTEGER
                )
            `)
            await db.runAsync(`
                CREATE TABLE IF NOT EXISTS posts (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    content TEXT,
                    media_json TEXT,
                    type TEXT NOT NULL DEFAULT 'original',
                    parent_id TEXT,
                    quoted_post_id TEXT,
                    reposted_post_id TEXT,
                    visibility TEXT DEFAULT 'public',
                    like_count INTEGER DEFAULT 0,
                    reply_count INTEGER DEFAULT 0,
                    repost_count INTEGER DEFAULT 0,
                    is_local INTEGER DEFAULT 0,
                    sync_status TEXT DEFAULT 'synced',
                    deleted INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER,
                    content_edited_at INTEGER,
                    dislike_count INTEGER DEFAULT 0,
                    laugh_count INTEGER DEFAULT 0,
                    is_reposted INTEGER DEFAULT 0,
                    FOREIGN KEY (owner_id) REFERENCES users(id)
                )
            `)
            await db.runAsync(`
                CREATE TABLE IF NOT EXISTS feed_items (
                    feed_type TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    post_id TEXT NOT NULL,
                    rank_score REAL DEFAULT 0,
                    inserted_at INTEGER NOT NULL,
                    PRIMARY KEY (feed_type, user_id, post_id),
                    FOREIGN KEY (post_id) REFERENCES posts(id)
                )
            `)
            await db.runAsync(`
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
                )
            `)
            await db.runAsync(`
                CREATE TABLE IF NOT EXISTS bookmarks (
                    post_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    created_at INTEGER,
                    PRIMARY KEY (post_id, user_id)
                )
            `)
            await db.runAsync(`
                CREATE TABLE IF NOT EXISTS outbox_posts (
                    local_id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    content TEXT,
                    media_json TEXT,
                    type TEXT DEFAULT 'original',
                    parent_id TEXT,
                    quoted_post_id TEXT,
                    reposted_post_id TEXT,
                    created_at INTEGER,
                    retry_count INTEGER DEFAULT 0,
                    last_error TEXT
                )
            `)
            await db.runAsync(`
                CREATE TABLE IF NOT EXISTS sync_state (
                    key TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    value TEXT,
                    PRIMARY KEY (key, user_id)
                )
            `)
        }
    },
    {
        version: 2,
        up: async (db) => {
            // Version 2: Structural Integrity & Performance Fixes
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)')
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_posts_owner ON posts(owner_id)')
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_feed_rank ON feed_items(feed_type, user_id, rank_score DESC)')
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_feed_time ON feed_items(feed_type, user_id, inserted_at DESC)')
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id)')
        }
    },
    {
        version: 3,
        up: async (db) => {
            // Version 3: Structural Integrity & Schema Repair (DDL ONLY)
            const ensureColumn = async (table: string, column: string, definition: string) => {
                const info = await db.getAllAsync(`PRAGMA table_info(${table})`) as any[];
                if (!info.find(c => c.name === column)) {
                    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
                }
            };

            await ensureColumn('posts', 'reposted_post_id', 'TEXT')
            await ensureColumn('posts', 'deleted', "INTEGER DEFAULT 0")
            await ensureColumn('posts', 'visibility', "TEXT DEFAULT 'public'")
            await ensureColumn('posts', 'quoted_post_id', "TEXT")
            await ensureColumn('posts', 'owner_id', "TEXT NOT NULL DEFAULT 'unknown'")
            await ensureColumn('outbox_posts', 'reposted_post_id', 'TEXT')
            await ensureColumn('outbox_posts', 'owner_id', "TEXT NOT NULL DEFAULT 'unknown'")

            // Ensure other tables have user_id
            await ensureColumn('feed_items', 'user_id', "TEXT NOT NULL DEFAULT 'unknown'")
            await ensureColumn('reactions', 'user_id', "TEXT NOT NULL DEFAULT 'unknown'")
            await ensureColumn('bookmarks', 'user_id', "TEXT NOT NULL DEFAULT 'unknown'")
            await ensureColumn('sync_state', 'user_id', "TEXT NOT NULL DEFAULT 'unknown'")

            await db.runAsync(`
                CREATE UNIQUE INDEX IF NOT EXISTS uniq_quote_forever
                ON posts(owner_id, quoted_post_id)
                WHERE quoted_post_id IS NOT NULL AND deleted = 0
            `)

            await db.runAsync(`
                CREATE UNIQUE INDEX IF NOT EXISTS uniq_repost_forever
                ON posts(owner_id, reposted_post_id)
                WHERE type = 'repost' AND deleted = 0
            `)
        }
    },
    {
        version: 4,
        up: async (db) => {
            // Version 4: Force Schema Repair for 'user_id'
            console.log('[Database] Applying schema repair (v4)...');
            const ensureColumnRun = async (table: string, column: string, definition: string) => {
                const info = await db.getAllAsync(`PRAGMA table_info(${table})`) as any[];
                if (!info.find(c => c.name === column)) {
                    await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
                }
            };

            await ensureColumnRun('feed_items', 'user_id', "TEXT NOT NULL DEFAULT 'unknown'")
            await ensureColumnRun('reactions', 'user_id', "TEXT NOT NULL DEFAULT 'unknown'")
            await ensureColumnRun('bookmarks', 'user_id', "TEXT NOT NULL DEFAULT 'unknown'")
            await ensureColumnRun('sync_state', 'user_id', "TEXT NOT NULL DEFAULT 'unknown'")
        }
    },
    {
        version: 5,
        up: async (db) => {
            // Version 5: Sync Engine State & Outbox Hardening
            await db.runAsync(`
                CREATE TABLE IF NOT EXISTS sync_engine_state (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            `)

            const info = await db.getAllAsync(`PRAGMA table_info(outbox_posts)`) as any[];
            if (!info.find(c => c.name === 'status')) {
                await db.runAsync(`ALTER TABLE outbox_posts ADD COLUMN status TEXT DEFAULT 'pending'`)
            }
            if (!info.find(c => c.name === 'last_attempt')) {
                await db.runAsync(`ALTER TABLE outbox_posts ADD COLUMN last_attempt INTEGER`)
            }
        }
    },
    {
        version: 6,
        up: async (db) => {
            // Version 6: Poll Support
            const ensureColumn = async (table: string, column: string, definition: string) => {
                const info = await db.getAllAsync(`PRAGMA table_info(${table})`) as any[];
                if (!info.find(c => c.name === column)) {
                    await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
                }
            };
            await ensureColumn('posts', 'poll_json', 'TEXT');
            await ensureColumn('outbox_posts', 'poll_json', 'TEXT');
        }
    },
    {
        version: 7,
        up: async (db) => {
            // Version 7: Schema Repair for Primary Keys (feed_items, bookmarks)
            // SQLite doesn't support ALTER TABLE for Primary Keys, so we must recreate.
            const repairTable = async (table: string, createSql: string) => {
                const info = await db.getAllAsync(`PRAGMA table_info(${table})`) as any[];
                const pkCount = info.filter(c => c.pk > 0).length;

                // feed_items should have 3 PK cols, bookmarks 2.
                const expectedPk = table === 'feed_items' ? 3 : 2;
                if (pkCount < expectedPk) {
                    console.log(`[Database] Repairing ${table} primary key...`);
                    // Use individual statements to avoid lock conflicts from nested transactions
                    await db.runAsync(`ALTER TABLE ${table} RENAME TO ${table}_old`);
                    await db.runAsync(createSql);
                    await db.runAsync(`INSERT OR IGNORE INTO ${table} SELECT * FROM ${table}_old`);
                    await db.runAsync(`DROP TABLE ${table}_old`);
                }
            };

            await repairTable('feed_items', `
                CREATE TABLE IF NOT EXISTS feed_items (
                    feed_type TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    post_id TEXT NOT NULL,
                    rank_score REAL DEFAULT 0,
                    inserted_at INTEGER NOT NULL,
                    PRIMARY KEY (feed_type, user_id, post_id),
                    FOREIGN KEY (post_id) REFERENCES posts(id)
                )
            `);

            await repairTable('bookmarks', `
                CREATE TABLE IF NOT EXISTS bookmarks (
                    post_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    created_at INTEGER,
                    PRIMARY KEY (post_id, user_id)
                )
            `);
        }
    },
    {
        version: 8,
        up: async (db) => {
            // Version 8: Final Schema Hardening - Remove problematic DEFAULT 'unknown' from FK columns
            const forceRecreate = async (table: string, createSql: string) => {
                console.log(`[Database] Hardening ${table} schema...`);
                // Check if table exists
                const tableExists = await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [table]);
                if (!tableExists) return;

                // Use individual statements to avoid lock conflicts from nested transactions
                await db.runAsync(`ALTER TABLE ${table} RENAME TO ${table}_old`);
                await db.runAsync(createSql);
                await db.runAsync(`INSERT OR IGNORE INTO ${table} SELECT * FROM ${table}_old`);
                await db.runAsync(`DROP TABLE ${table}_old`);
            };

            await forceRecreate('posts', `
                CREATE TABLE posts (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    content TEXT,
                    media_json TEXT,
                    poll_json TEXT,
                    type TEXT NOT NULL DEFAULT 'original',
                    parent_id TEXT,
                    quoted_post_id TEXT,
                    reposted_post_id TEXT,
                    visibility TEXT DEFAULT 'public',
                    like_count INTEGER DEFAULT 0,
                    reply_count INTEGER DEFAULT 0,
                    repost_count INTEGER DEFAULT 0,
                    is_local INTEGER DEFAULT 0,
                    sync_status TEXT DEFAULT 'synced',
                    deleted INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER,
                    content_edited_at INTEGER,
                    dislike_count INTEGER DEFAULT 0,
                    laugh_count INTEGER DEFAULT 0,
                    is_reposted INTEGER DEFAULT 0,
                    FOREIGN KEY (owner_id) REFERENCES users(id)
                )
            `);

            await forceRecreate('outbox_posts', `
                CREATE TABLE outbox_posts (
                    local_id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    content TEXT,
                    media_json TEXT,
                    poll_json TEXT,
                    type TEXT DEFAULT 'original',
                    parent_id TEXT,
                    quoted_post_id TEXT,
                    reposted_post_id TEXT,
                    created_at INTEGER,
                    retry_count INTEGER DEFAULT 0,
                    last_error TEXT,
                    status TEXT DEFAULT 'pending',
                    last_attempt INTEGER
                )
            `);

            await forceRecreate('reactions', `
                CREATE TABLE reactions (
                    id TEXT PRIMARY KEY,
                    post_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    reaction_type TEXT NOT NULL,
                    emoji TEXT,
                    sync_status TEXT DEFAULT 'synced',
                    created_at INTEGER,
                    UNIQUE (post_id, user_id, reaction_type),
                    FOREIGN KEY (post_id) REFERENCES posts(id)
                )
            `);

            await forceRecreate('sync_state', `
                CREATE TABLE sync_state (
                    key TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    value TEXT,
                    PRIMARY KEY (key, user_id)
                )
            `);

            // Restore lost indices
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)');
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_posts_owner ON posts(owner_id)');
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id)');
        }
    },
    {
        version: 9,
        up: async (db) => {
            // Version 9: Cleanup orphaned tables from incomplete migrations + NUKE ZOMBIE POSTS
            console.log('[Database] Cleaning up orphaned tables...');

            // Drop any orphaned _old tables that might exist
            const tables = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_old'") as { name: string }[];
            for (const { name } of tables) {
                console.log(`[Database] Dropping orphaned table: ${name}`);
                await db.runAsync(`DROP TABLE IF EXISTS ${name}`);
            }

            // 🔥 NUKE ZOMBIE POSTS (posts whose owner_id doesn't exist in users table)
            console.log('[Database] Nuking zombie posts...');
            const zombieCount = await db.getFirstAsync(
                'SELECT COUNT(*) as count FROM posts WHERE owner_id NOT IN (SELECT id FROM users)'
            ) as { count: number };

            if (zombieCount && zombieCount.count > 0) {
                console.log(`[Database] Found ${zombieCount.count} zombie posts. Deleting...`);
                await db.runAsync('DELETE FROM posts WHERE owner_id NOT IN (SELECT id FROM users)');
                console.log('[Database] Zombie posts deleted.');
            } else {
                console.log('[Database] No zombie posts found.');
            }

            // Rebuild feed_items to fix foreign key reference
            const feedItemsExists = await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='feed_items'");
            if (feedItemsExists) {
                console.log('[Database] Rebuilding feed_items table...');
                await db.runAsync('DROP TABLE IF EXISTS feed_items');
            }

            await db.runAsync(`
                CREATE TABLE feed_items (
                    feed_type TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    post_id TEXT NOT NULL,
                    rank_score REAL DEFAULT 0,
                    inserted_at INTEGER NOT NULL,
                    PRIMARY KEY (feed_type, user_id, post_id),
                    FOREIGN KEY (post_id) REFERENCES posts(id)
                )
            `);

            // Restore feed indices
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_feed_rank ON feed_items(feed_type, user_id, rank_score DESC)');
            await db.runAsync('CREATE INDEX IF NOT EXISTS idx_feed_time ON feed_items(feed_type, user_id, inserted_at DESC)');

            console.log('[Database] Cleanup complete.');
        }
    },
    {
        version: 10,
        up: async (db) => {
            console.log('[Database] Applying migration version 10...');
            await db.runAsync(`
                CREATE TABLE IF NOT EXISTS poll_votes (
                    post_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    choice_index INTEGER NOT NULL,
                    sync_status TEXT DEFAULT 'pending',
                    created_at INTEGER,
                    PRIMARY KEY (post_id, user_id)
                )
            `);
            console.log('[Database] Migration version 10 applied successfully.');
        }
    },
    {
        version: 11,
        up: async (db) => {
            console.log('[Database] Applying migration version 11 (Cleanup)...');

            // 1. Nuke Zombie Posts (again, to be safe)
            await db.runAsync('DELETE FROM posts WHERE owner_id NOT IN (SELECT id FROM users)');

            // 2. Nuke Orphaned Poll Votes (where post doesn't exist)
            await db.runAsync('DELETE FROM poll_votes WHERE post_id NOT IN (SELECT id FROM posts)');

            // 3. Nuke Orphaned Feed Items
            await db.runAsync('DELETE FROM feed_items WHERE post_id NOT IN (SELECT id FROM posts)');

            console.log('[Database] Migration version 11: Cleanup complete.');
        }
    },
    {
        version: 12,
        up: async (db) => {
            console.log('[Database] Applying Migration version 12 (Post Content Edit Timestamp)...');
            const info = await db.getAllAsync(`PRAGMA table_info(posts)`) as any[];
            if (!info.find(c => c.name === 'content_edited_at')) {
                await db.runAsync(`ALTER TABLE posts ADD COLUMN content_edited_at INTEGER`);
                // Initialize existing posts' content_edited_at to their created_at
                await db.runAsync(`UPDATE posts SET content_edited_at = created_at WHERE content_edited_at IS NULL`);
            }
            console.log('[Database] Migration version 12 applied successfully.');
        }
    },
    {
        version: 13,
        up: async (db) => {
            console.log('[Database] Applying Migration version 13 (Reaction Counts & Repost Status)...');
            const info = await db.getAllAsync(`PRAGMA table_info(posts)`) as any[];

            if (!info.find(c => c.name === 'dislike_count')) {
                await db.runAsync(`ALTER TABLE posts ADD COLUMN dislike_count INTEGER DEFAULT 0`);
            }
            if (!info.find(c => c.name === 'laugh_count')) {
                await db.runAsync(`ALTER TABLE posts ADD COLUMN laugh_count INTEGER DEFAULT 0`);
            }
            if (!info.find(c => c.name === 'is_reposted')) {
                await db.runAsync(`ALTER TABLE posts ADD COLUMN is_reposted INTEGER DEFAULT 0`);
            }

            console.log('[Database] Migration version 13 applied successfully.');
        }
    },
    {
        version: 14,
        up: async (db) => {
            console.log('[Database] Applying Migration version 14 (Drafts Table)...');
            await db.runAsync(`
                CREATE TABLE IF NOT EXISTS drafts (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    content TEXT,
                    media_json TEXT,
                    poll_json TEXT,
                    type TEXT DEFAULT 'original',
                    parent_id TEXT,
                    quoted_post_id TEXT,
                    reposted_post_id TEXT,
                    created_at INTEGER,
                    updated_at INTEGER
                )
            `);
            console.log('[Database] Migration version 14 applied successfully.');
        }
    }
];

export const initSystem = async () => {
    if (initPromise) {
        return initPromise;
    }

    initPromise = (async () => {
        console.log('[Database] Starting System Initialization...');

        try {
            const database = await SQLite.openDatabaseAsync('postr.db');
            db = database;

            // 1. Pre-migration settings
            await database.runAsync('PRAGMA foreign_keys = OFF');

            // 2. Initialize migration tracker
            await database.runAsync(`
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at INTEGER NOT NULL
                )
            `);

            // 3. Fetch applied migrations
            const appliedRows = await database.getAllAsync('SELECT version FROM schema_migrations') as { version: number }[];
            const appliedSet = new Set(appliedRows.map(r => r.version));

            // 4. Run pending migrations
            for (const migration of MIGRATIONS) {
                if (appliedSet.has(migration.version)) continue;

                console.log(`[Database] Applying migration version ${migration.version}...`);
                await migration.up(database);

                await database.runAsync(
                    'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
                    [migration.version, Date.now()]
                );
                console.log(`[Database] Migration version ${migration.version} applied successfully.`);
            }

            console.log('[Database] System Initialization complete.');
        } catch (error) {
            console.error('[Database] System Initialization failed:', error);
            initPromise = null; // Clear promise on failure to allow retry
            throw error;
        } finally {
            if (db) {
                try {
                    await db.runAsync('PRAGMA foreign_keys = ON');
                } catch (e) {
                    console.warn('[Database] Failed to restore foreign keys', e);
                }
            }
        }
    })();

    return initPromise;
};

export const bindUserDatabase = async (userId: string) => {
    // Phase 2: User Binding
    console.log('[Database] Phase 2: Binding user', userId);
    const db = await getDb();

    await db.withTransactionAsync(async () => {
        // Enforce isolation: Wipe data belonging to other users
        // This handles:
        // 1. Account switching
        // 2. Shared device scenarios
        // 3. Artifact cleanup

        await db.runAsync('DELETE FROM feed_items WHERE user_id != ?', [userId]);
        await db.runAsync('DELETE FROM reactions WHERE user_id != ?', [userId]);
        await db.runAsync('DELETE FROM bookmarks WHERE user_id != ?', [userId]);
        await db.runAsync('DELETE FROM outbox_posts WHERE owner_id != ?', [userId]);
        await db.runAsync('DELETE FROM drafts WHERE owner_id != ?', [userId]);
        await db.runAsync('DELETE FROM sync_state WHERE user_id != ?', [userId]);

        // STRICT PURGE: Remove posts not belonging to this user or orphaned
        // This prevents "zombie" posts from causing FK failures during writes.
        await db.runAsync('DELETE FROM posts WHERE owner_id != ?', [userId]);
        await db.runAsync('DELETE FROM posts WHERE owner_id NOT IN (SELECT id FROM users)');
    });
};

export const wipeUserData = async (userId: string) => {
    // Logout / Full Teardown
    console.log('[Database] Wiping data for user', userId);
    const db = await getDb();

    await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM feed_items WHERE user_id = ?', [userId]);
        await db.runAsync('DELETE FROM reactions WHERE user_id = ?', [userId]);
        await db.runAsync('DELETE FROM bookmarks WHERE user_id = ?', [userId]);
        await db.runAsync('DELETE FROM outbox_posts WHERE owner_id = ?', [userId]);
        await db.runAsync('DELETE FROM drafts WHERE owner_id = ?', [userId]);
        await db.runAsync('DELETE FROM sync_state WHERE user_id = ?', [userId]);
        await db.runAsync('DELETE FROM posts WHERE owner_id = ?', [userId]);
    });
};
