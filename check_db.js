
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/Handi/postr/postr/postr.db');

db.all("SELECT id, owner_id, quoted_post_id, type, sync_status FROM posts WHERE quoted_post_id IS NOT NULL OR type = 'repost';", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    const groups = {};
    rows.forEach(row => {
        const key = `${row.owner_id}_${row.quoted_post_id || ''}_${row.type}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });

    Object.keys(groups).forEach(key => {
        if (groups[key].length > 1) {
            console.log(`Conflict for group ${key}:`);
            console.log(JSON.stringify(groups[key], null, 2));
        }
    });
    db.close();
});
