const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --- Utility data and functions (ported from frontend) ---
const services = ['inventory-service', 'pricing-engine', 'payment-gateway', 'inspection-api', 'user-service'];
const carBrands = ['Toyota', 'Honda', 'Nissan', 'Chevrolet', 'Ford', 'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Mazda'];
const carModels = ['Corolla', 'Civic', 'Sentra', 'Aveo', 'Focus', 'Jetta', 'Serie 3', 'Clase C', 'A4', 'Mazda3'];
const userIds = Array.from({length: 20}, (_, i) => `USR${String(i + 1000).padStart(6, '0')}`);
const vehicleIds = Array.from({length: 30}, (_, i) => `VEH${String(i + 5000).padStart(6, '0')}`);
const inspectionIds = Array.from({length: 15}, (_, i) => `INS${String(i + 2000).padStart(6, '0')}`);

function getTimestamp() { return new Date().toISOString(); }
function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateInventoryLog(level, hasBug) {
  const vehicleId = randomChoice(vehicleIds);
  const brand = randomChoice(carBrands);
  const model = randomChoice(carModels);
  const year = randomInt(2015, 2023);
  const price = randomInt(150000, 450000);
  const logs = [
    { level: 'info', msg: `Vehicle ${vehicleId} added to inventory: ${brand} ${model} ${year}, Price: $${price}` },
    { level: 'info', msg: `Fetching vehicle details for ${vehicleId}` },
    { level: 'warning', msg: `Vehicle ${vehicleId} has low mileage data quality score: 0.${randomInt(40, 69)}` },
    { level: 'error', msg: `Failed to update vehicle ${vehicleId}: Database connection timeout` },
  ];
  if (hasBug) {
    const bugLogs = [
      { level: 'error', msg: `NullPointerException in getVehiclePrice() for ${vehicleId}: price field is null` },
      { level: 'error', msg: `IndexOutOfBoundsException: trying to access image[5] but only 3 images available for ${vehicleId}` },
      { level: 'warning', msg: `Memory leak detected: vehicle cache size exceeded 10GB, ${vehicleId} data not released` },
      { level: 'error', msg: `SQL Injection attempt detected in search query: "' OR 1=1--" for brand=${brand}` },
    ];
    return randomChoice(bugLogs);
  }
  return level === 'all' ? randomChoice(logs) : logs.find(l => l.level === level) || logs[0];
}

function generatePricingLog(level, hasBug) {
  const vehicleId = randomChoice(vehicleIds);
  const basePrice = randomInt(150000, 450000);
  const finalPrice = basePrice + randomInt(-20000, 30000);
  const logs = [
    { level: 'info', msg: `Calculating price for ${vehicleId}: base=$${basePrice}, market_adjustment=${randomInt(-5, 10)}%` },
    { level: 'debug', msg: `ML model prediction for ${vehicleId}: confidence=0.${randomInt(75, 95)}` },
    { level: 'warning', msg: `Price volatility detected: ${vehicleId} price changed by ${randomInt(15, 35)}% in 24h` },
    { level: 'error', msg: `Failed to fetch market data for pricing: API timeout after 30s` },
  ];
  if (hasBug) {
    const bugLogs = [
      { level: 'error', msg: `DivisionByZeroError in calculateDepreciation(): age parameter is 0 for ${vehicleId}` },
      { level: 'error', msg: `Negative price calculated: ${vehicleId} final_price=-$${randomInt(5000, 15000)} (base: $${basePrice})` },
      { level: 'error', msg: `TypeError: cannot multiply 'NoneType' by float in applyDiscount() for ${vehicleId}` },
      { level: 'warning', msg: `Infinite loop detected in priceOptimization(): same price ${finalPrice} returned 1000+ times` },
    ];
    return randomChoice(bugLogs);
  }
  return level === 'all' ? randomChoice(logs) : logs.find(l => l.level === level) || logs[0];
}

function generatePaymentLog(level, hasBug) {
  const userId = randomChoice(userIds);
  const amount = randomInt(10000, 500000);
  const transactionId = `TXN${randomInt(100000, 999999)}`;
  const logs = [
    { level: 'info', msg: `Payment initiated: ${transactionId} for user ${userId}, amount=$${amount}` },
    { level: 'info', msg: `Payment ${transactionId} processed successfully via STRIPE` },
    { level: 'warning', msg: `Payment ${transactionId} flagged for manual review: high-risk transaction` },
    { level: 'error', msg: `Payment ${transactionId} declined: insufficient funds for user ${userId}` },
  ];
  if (hasBug) {
    const bugLogs = [
      { level: 'error', msg: `Double charge detected: ${transactionId} processed twice for user ${userId}, amount=$${amount}` },
      { level: 'error', msg: `JSONDecodeError: malformed webhook response from payment provider for ${transactionId}` },
      { level: 'error', msg: `Race condition: concurrent payment updates for ${transactionId} caused data inconsistency` },
      { level: 'error', msg: `Sensitive data leak: credit card number logged in plaintext for transaction ${transactionId}` },
    ];
    return randomChoice(bugLogs);
  }
  return level === 'all' ? randomChoice(logs) : logs.find(l => l.level === level) || logs[0];
}

function generateInspectionLog(level, hasBug) {
  const vehicleId = randomChoice(vehicleIds);
  const inspectionId = randomChoice(inspectionIds);
  const score = randomInt(65, 98);
  const logs = [
    { level: 'info', msg: `Inspection ${inspectionId} started for vehicle ${vehicleId}` },
    { level: 'info', msg: `Inspection ${inspectionId} completed: overall_score=${score}/100, status=APPROVED` },
    { level: 'warning', msg: `Inspection ${inspectionId}: minor issues detected - tire_wear=moderate, paint_scratch=3` },
    { level: 'error', msg: `Inspection ${inspectionId} failed to upload images: S3 bucket access denied` },
  ];
  if (hasBug) {
    const bugLogs = [
      { level: 'error', msg: `ArrayIndexError: inspection checklist item[25] does not exist for ${inspectionId}` },
      { level: 'error', msg: `Score calculation error: ${inspectionId} total=${score + 15} exceeds maximum of 100` },
      { level: 'warning', msg: `Memory leak: inspection images for ${inspectionId} not freed, 500MB consumed` },
      { level: 'error', msg: `Deadlock detected: inspection ${inspectionId} waiting for vehicle ${vehicleId} lock (timeout 300s)` },
    ];
    return randomChoice(bugLogs);
  }
  return level === 'all' ? randomChoice(logs) : logs.find(l => l.level === level) || logs[0];
}

function generateUserLog(level, hasBug) {
  const userId = randomChoice(userIds);
  const email = `user${randomInt(1000, 9999)}@kavak.com`;
  const logs = [
    { level: 'info', msg: `User ${userId} logged in from IP 187.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}` },
    { level: 'info', msg: `User profile updated: ${userId}, email=${email}` },
    { level: 'warning', msg: `Suspicious activity: user ${userId} attempted 5 logins in 2 minutes` },
    { level: 'error', msg: `Failed to authenticate user ${userId}: invalid token` },
  ];
  if (hasBug) {
    const bugLogs = [
      { level: 'error', msg: `SQL error: duplicate key violation when creating user ${userId} (user already exists)` },
      { level: 'error', msg: `AttributeError: 'NoneType' object has no attribute 'email' for user ${userId}` },
      { level: 'warning', msg: `Session leak: user ${userId} has 47 active sessions, max limit is 5` },
      { level: 'error', msg: `Authentication bypass: user ${userId} accessed admin panel without proper permissions` },
    ];
    return randomChoice(bugLogs);
  }
  return level === 'all' ? randomChoice(logs) : logs.find(l => l.level === level) || logs[0];
}

function generateSingleLog(options) {
  const { serviceType = 'all', logLevel = 'all', bugFrequency = 15 } = options || {};
  const hasBug = Math.random() * 100 < parseInt(bugFrequency || 0, 10);
  let service = serviceType === 'all' ? randomChoice(services) : serviceType;
  let logData;
  if (service.includes('inventory')) logData = generateInventoryLog(logLevel, hasBug);
  else if (service.includes('pricing')) logData = generatePricingLog(logLevel, hasBug);
  else if (service.includes('payment')) logData = generatePaymentLog(logLevel, hasBug);
  else if (service.includes('inspection')) logData = generateInspectionLog(logLevel, hasBug);
  else logData = generateUserLog(logLevel, hasBug);
  const timestamp = getTimestamp();
  const level = logData.level.toUpperCase();
  return { timestamp, level, service, message: logData.msg, raw: `[${timestamp}] ${level.padEnd(7)} [${service}] ${logData.msg}` };
}

// Health check
app.get('/', (req, res) => {
  res.send({ status: 'Log generator backend running', endpoints: ['/api/logs/generate', '/api/logs/download'] });
});

// GET or POST to generate logs
app.all('/api/logs/generate', (req, res) => {
  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const count = Math.min(Math.max(parseInt(params.count || 50, 10), 1), 1000);
    const bugFrequency = params.bugFrequency || 15;
    const serviceType = params.serviceType || 'all';
    const logLevel = params.logLevel || 'all';

    const logs = [];
    const stats = { total: 0, errors: 0, warnings: 0, bugs: 0 };
    for (let i = 0; i < count; i++) {
      const l = generateSingleLog({ serviceType, logLevel, bugFrequency });
      logs.push(l);
      stats.total++;
      if (l.level === 'ERROR') stats.errors++;
      if (l.level === 'WARNING') stats.warnings++;
      if (/NullPointerException|SQL Injection|memory leak|Double charge|Sensitive data leak|Deadlock|ArrayIndexError|DivisionByZero|Negative price/i.test(l.message)) stats.bugs++;
    }
    // If caller requests append=true, persist logs to data/logs.json (append)
    if ((params.append === 'true' || params.append === true || params.append === '1')) {
      try {
        const existing = readJson(LOGS_FILE);
        let base = Array.isArray(existing) ? existing : (existing && existing.logs) ? existing.logs : [];
        base = base.concat(logs.map(l => l));
        writeJson(LOGS_FILE, base);
      } catch (e) {
        console.error('Failed to append logs to file', e);
      }
    }

    res.json({ logs, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// Download logs as plain text
app.get('/api/logs/download', (req, res) => {
  try {
    const params = req.query;
    const count = Math.min(Math.max(parseInt(params.count || 50, 10), 1), 1000);
    const bugFrequency = params.bugFrequency || 15;
    const serviceType = params.serviceType || 'all';
    const logLevel = params.logLevel || 'all';
    const lines = [];
    for (let i = 0; i < count; i++) lines.push(generateSingleLog({ serviceType, logLevel, bugFrequency }).raw);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kavak_logs_${Date.now()}.log"`);
    res.send(lines.join('\n'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Log generator backend listening on http://localhost:${port}`));

// --- Multi-agent scaffolding (simple, file-backed) ---
const fs = require('fs');
const AGENTS_FILE = path.join(__dirname, 'data', 'agents.json');
const LOGS_FILE = path.join(__dirname, 'data', 'logs.json');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); } catch (e) { return []; }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

// ===== sqlite-backed logs storage (optional server-side ingestion) =====
const sqlite3 = require('sqlite3').verbose();
const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'logs.db');
const db = new sqlite3.Database(DB_PATH, (err) => { if (err) console.error('Failed to open SQLite DB', err); });

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    level TEXT,
    service TEXT,
    userId TEXT,
    sessionId TEXT,
    message TEXT,
    metadata TEXT,
    raw TEXT UNIQUE,
    page TEXT,
    source TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
});

function insertLogToDb(log) {
  return new Promise((resolve, reject) => {
    const metadata = log.metadata ? JSON.stringify(log.metadata) : '{}';
    const stmt = db.prepare(`INSERT OR IGNORE INTO logs (timestamp, level, service, userId, sessionId, message, metadata, raw, page, source) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    stmt.run(
      log.timestamp || new Date().toISOString(),
      (log.level || 'INFO').toUpperCase(),
      log.service || null,
      log.userId || null,
      log.sessionId || null,
      log.message || null,
      metadata,
      log.raw || null,
      log.page || null,
      log.source || 'client',
      function (err) {
        stmt.finalize();
        if (err) return reject(err);
        resolve(this.changes || 0);
      }
    );
  });
}

// Ingest logs: accepts single object or array
app.post('/api/logs', async (req, res) => {
  const payload = req.body;
  if (!payload) return res.status(400).json({ error: 'empty body' });
  try {
    if (Array.isArray(payload)) {
      let inserted = 0;
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const promises = payload.map(p => insertLogToDb(p).then(n => { inserted += n }).catch(() => {}));
        Promise.all(promises).then(() => {
          db.run('COMMIT', () => res.json({ inserted }));
        }).catch(err => {
          db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));
        });
      });
    } else if (typeof payload === 'object') {
      const n = await insertLogToDb(payload);
      res.json({ inserted: n });
    } else {
      res.status(400).json({ error: 'invalid payload' });
    }
  } catch (err) {
    console.error('Error inserting logs', err);
    res.status(500).json({ error: err.message });
  }
});

// Query logs from sqlite DB with simple filters
app.get('/api/logs', (req, res) => {
  const { level, page, search, since, limit = 200, offset = 0 } = req.query;
  const params = [];
  const where = [];
  if (level) { where.push('level = ?'); params.push(level.toUpperCase()); }
  if (page) { where.push('page = ?'); params.push(page); }
  if (since) { where.push('timestamp > ?'); params.push(since); }
  if (search) { where.push('(message LIKE ? OR service LIKE ? OR userId LIKE ? OR raw LIKE ?)'); const s = `%${search}%`; params.push(s,s,s,s); }
  const whereSQL = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  const sql = `SELECT id, timestamp, level, service, userId, sessionId, message, metadata, raw, page FROM logs ${whereSQL} ORDER BY datetime(timestamp) DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows.forEach(r => { try { r.metadata = r.metadata ? JSON.parse(r.metadata) : {}; } catch(e){ r.metadata = {}; } });
    res.json(rows);
  });
});

// Export logs as NDJSON or CSV (streaming) — useful for sharing with analysts via curl
app.get('/api/logs/export', (req, res) => {
  const format = (req.query.format || 'ndjson').toLowerCase();
  const since = req.query.since;
  const level = req.query.level;
  const page = req.query.page;
  const where = [];
  const params = [];
  if (since) { where.push('timestamp > ?'); params.push(since); }
  if (level) { where.push('level = ?'); params.push(level.toUpperCase()); }
  if (page) { where.push('page = ?'); params.push(page); }
  const whereSQL = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  const sql = `SELECT id, timestamp, level, service, userId, sessionId, message, metadata, raw, page FROM logs ${whereSQL} ORDER BY datetime(timestamp) DESC`;

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kavak_logs_${Date.now()}.csv"`);
    // write header
    res.write('id,timestamp,level,service,userId,sessionId,page,message\n');
    db.each(sql, params, (err, row) => {
      if (err) return console.error('export err', err);
      // simple CSV escaping
      const safe = (v) => '"' + String((v === null || v === undefined) ? '' : String(v)).replace(/"/g, '""') + '"';
      res.write([row.id, row.timestamp, row.level, row.service, row.userId, row.sessionId, row.page, safe(row.message)].join(',') + '\n');
    }, (err, n) => {
      if (err) console.error('export finish err', err);
      res.end();
    });
  } else {
    // NDJSON
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kavak_logs_${Date.now()}.ndjson"`);
    db.each(sql, params, (err, row) => {
      if (err) return console.error('export err', err);
      try { row.metadata = row.metadata ? JSON.parse(row.metadata) : {}; } catch(e){ row.metadata = {}; }
      res.write(JSON.stringify(row) + '\n');
    }, (err, n) => {
      if (err) console.error('export finish err', err);
      res.end();
    });
  }
});


// List agents
app.get('/api/agents', (req, res) => {
  const agents = readJson(AGENTS_FILE);
  res.json(agents);
});

// Create an agent { id, name, role, memory: [] }
app.post('/api/agents', (req, res) => {
  const { name, role } = req.body || {};
  if (!name || !role) return res.status(400).json({ error: 'name and role required' });
  const agents = readJson(AGENTS_FILE);
  const id = `agent-${Date.now()}`;
  const agent = { id, name, role, memory: [] };
  agents.push(agent);
  writeJson(AGENTS_FILE, agents);
  res.json(agent);
});

// Run a simple 'think' step for an agent: agent examines recent logs, makes an observation
app.post('/api/agents/:id/run', (req, res) => {
  const id = req.params.id;
  const agents = readJson(AGENTS_FILE);
  const agent = agents.find(a => a.id === id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  // Read recent logs to act upon
  const logs = readJson(LOGS_FILE).slice(-200); // last 200 entries

  // Simple deterministic 'thinking' step: summarize counts by service and level
  const summary = logs.reduce((acc, l) => {
    acc.total = (acc.total || 0) + 1;
    acc.levels = acc.levels || {};
    acc.levels[l.level] = (acc.levels[l.level] || 0) + 1;
    acc.services = acc.services || {};
    acc.services[l.service] = (acc.services[l.service] || 0) + 1;
    return acc;
  }, {});

  const thought = {
    timestamp: getTimestamp(),
    agentId: agent.id,
    observation: `Observed ${summary.total || 0} recent logs. Levels=${JSON.stringify(summary.levels)}. Top services=${Object.keys(summary.services||{}).slice(0,3).join(',')}`,
    suggestion: 'Increase monitoring on services with the highest ERROR counts.'
  };

  // persist to agent memory and global logs
  agent.memory.push(thought);
  writeJson(AGENTS_FILE, agents);

  const globalLogs = readJson(LOGS_FILE);
  globalLogs.push({ type: 'agent_thought', ...thought });
  writeJson(LOGS_FILE, globalLogs);

  res.json(thought);
});

// Fetch agent memory
app.get('/api/agents/:id/memory', (req, res) => {
  const id = req.params.id;
  const agents = readJson(AGENTS_FILE);
  const agent = agents.find(a => a.id === id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });
  res.json(agent.memory || []);
});

