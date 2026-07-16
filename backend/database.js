const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'safework.db');

let db = null;
let SQL = null;

async function initDatabase() {
  // Load sql.js (WA-enabled)
  SQL = await initSqlJs();

  // Try to load existing database file
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('Loaded existing database from:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('Created new database at:', DB_PATH);
  }

  // Enable WAL mode and foreign keys
  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA foreign_keys=ON;');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      case_id TEXT UNIQUE NOT NULL,
      incident TEXT NOT NULL,
      description TEXT DEFAULT '',
      file_path TEXT DEFAULT '',
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sos_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      status TEXT DEFAULT 'active',
      is_false_alarm INTEGER DEFAULT 0,
      audio_path TEXT DEFAULT '',
      video_path TEXT DEFAULT '',
      image_path TEXT DEFAULT '',
      evidence_path TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cancelled_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS live_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sos_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sos_id) REFERENCES sos_alerts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS evidence_audio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sos_id INTEGER NOT NULL,
      audio_path TEXT DEFAULT '',
      mime_type TEXT DEFAULT 'audio/webm',
      duration_seconds INTEGER DEFAULT 30,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sos_id) REFERENCES sos_alerts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS evidence_video (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sos_id INTEGER NOT NULL,
      video_path TEXT DEFAULT '',
      mime_type TEXT DEFAULT 'video/webm',
      duration_seconds INTEGER DEFAULT 15,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sos_id) REFERENCES sos_alerts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS evidence_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sos_id INTEGER NOT NULL,
      image_path TEXT DEFAULT '',
      mime_type TEXT DEFAULT 'image/jpeg',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sos_id) REFERENCES sos_alerts(id)
    )
  `);

  // Save the database
  saveDatabase();

  console.log('SQLite Database initialized successfully');
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    // Ensure directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return {
    // Run a query and return all rows as objects
    queryAll: (sql, params = []) => {
      const stmt = db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
           }
      stmt.free();
      return results;
    },
    // Run a query and return first row as object
    queryOne: (sql, params = []) => {
      const stmt = db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      let result = null;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();
      return result;
    },
    // Execute a write query (INSERT/UPDATE/DELETE) and return last insert ID
    execute: (sql, params = []) => {
      // Use exec for INSERT to get proper last_insert_rowid
      db.run(sql, params);
      // Get last insert rowid BEFORE saving
      const result = db.exec("SELECT last_insert_rowid() as id");
      saveDatabase();
      if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
        return result[0].values[0][0];
      }
      return null;
    },
    // Get the last inserted row ID
    getLastInsertId: () => {
      const result = db.exec("SELECT last_insert_rowid() as id");
      if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
        return result[0].values[0][0];
      }
      return null;
    },
    // Direct raw db access for compatibility
    raw: db
  };
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Helper to convert sql.js result to array of objects
function rowsToArray(result) {
  if (!result || result.length === 0) return [];
  const r = result[0];
  const columns = r.columns;
  return r.values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

module.exports = { initDatabase, getDatabase, closeDatabase, saveDatabase };