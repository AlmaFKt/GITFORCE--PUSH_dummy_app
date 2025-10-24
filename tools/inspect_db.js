#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'logs.db');

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB at', DB_PATH);
    console.error(err.message);
    process.exit(1);
  }
});

const limit = parseInt(process.argv[2], 10) || 20;

function run() {
  db.get('SELECT COUNT(*) as cnt FROM logs', (err, row) => {
    if (err) {
      console.error('Error querying count:', err.message);
      process.exit(1);
    }
    console.log(`Total logs: ${row.cnt}`);

    db.all('SELECT id, timestamp, level, service, userId, sessionId, message, metadata, raw, page FROM logs ORDER BY datetime(timestamp) DESC LIMIT ?', [limit], (err, rows) => {
      if (err) {
        console.error('Error selecting rows:', err.message);
        process.exit(1);
      }
      console.log(`\nShowing latest ${rows.length} rows:\n`);
      rows.forEach(r => {
        try { r.metadata = r.metadata ? JSON.parse(r.metadata) : {}; } catch(e) { r.metadata = {}; }
        console.log(JSON.stringify(r, null, 2));
      });
      db.close();
    });
  });
}

run();
