import express from 'express';
import Database from 'better-sqlite3';
import multer from 'multer';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Setup upload
const upload = multer({ dest: 'uploads/' });

// Database setup
// In tests, DB_PATH is set to ':memory:' via vitest config — keeps the real db untouched.
// In production (npm start / npm run dev), DB_PATH is not set, so it falls back to the file.
const db = new Database(process.env.DB_PATH || 'qa_tracker.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    screenshot_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    content TEXT NOT NULL,
    error_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ===== API ENDPOINTS =====

// 1. POST /api/bugs - Reportar bug
app.post('/api/bugs', (req, res) => {
  const { title, description } = req.body;
  // Apply the default here rather than relying on the SQLite DEFAULT clause,
  // because better-sqlite3 passes undefined as NULL which bypasses column defaults.
  const priority = req.body.priority || 'Medium';

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO bugs (title, description, priority)
    VALUES (?, ?, ?)
  `);

  try {
    const info = stmt.run(title, description, priority);
    res.json({ id: info.lastInsertRowid, message: 'Bug reported successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/bugs - Listar bugs com filtros
app.get('/api/bugs', (req, res) => {
  const { priority, status } = req.query;

  let query = 'SELECT * FROM bugs';
  const params = [];

  if (priority) {
    query += ' WHERE priority = ?';
    params.push(priority);
  }

  if (status) {
    if (params.length > 0) {
      query += ' AND status = ?';
    } else {
      query += ' WHERE status = ?';
    }
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const bugs = stmt.all(...params);
  res.json(bugs);
});

// 3. PUT /api/bugs/:id - Atualizar bug
app.put('/api/bugs/:id', (req, res) => {
  const { id } = req.params;
  const { status, priority, description } = req.body;

  const stmt = db.prepare(`
    UPDATE bugs SET status = ?, priority = ?, description = ? WHERE id = ?
  `);

  try {
    stmt.run(status, priority, description, id);
    res.json({ message: 'Bug updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. DELETE /api/bugs/:id - Remover bug
app.delete('/api/bugs/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM bugs WHERE id = ?');
  try {
    const info = stmt.run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Bug not found' });
    res.json({ message: 'Bug deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/logs - Upload de log (ficheiro ou texto)
app.post('/api/logs', upload.single('file'), (req, res) => {
  let logContent = '';
  let fileName = 'pasted_log';

  if (req.file) {
    // Log file uploaded
    const filePath = req.file.path;
    logContent = fs.readFileSync(filePath, 'utf-8');
    fileName = req.file.originalname;
    fs.unlinkSync(filePath); // Remove temp file
  } else if (req.body.logText) {
    // Log text pasted
    logContent = req.body.logText;
  } else {
    return res.status(400).json({ error: 'No log content provided' });
  }

  // Parse errors from log - using consistent pattern matching
  const errorLines = logContent.split('\n').filter(line => 
    /\b(error|exception|failed|fail|timeout|critical|warn(?:ing)?)\b[\s:]/i.test(line)
  );
  const errorCount = errorLines.length;

  const stmt = db.prepare(`
    INSERT INTO logs (file_name, content, error_count)
    VALUES (?, ?, ?)
  `);

  try {
    const info = stmt.run(fileName, logContent, errorCount);
    res.json({ 
      id: info.lastInsertRowid, 
      message: 'Log analyzed successfully',
      errorCount,
      errorLines: errorLines.slice(0, 10) // Top 10 errors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5b. DELETE /api/logs/:id - Remover log
app.delete('/api/logs/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM logs WHERE id = ?');
  try {
    const info = stmt.run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. GET /api/logs - Listar logs
app.get('/api/logs', (req, res) => {
  const stmt = db.prepare('SELECT id, file_name, error_count, created_at FROM logs ORDER BY created_at DESC');
  const logs = stmt.all();
  res.json(logs);
});

// 6. GET /api/logs/:id - Detalhes de um log
app.get('/api/logs/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('SELECT * FROM logs WHERE id = ?');
  const log = stmt.get(id);

  if (!log) {
    return res.status(404).json({ error: 'Log not found' });
  }

  // Parse error patterns - using consistent pattern matching
  const lines = log.content.split('\n');
  const errorPatterns = {};

  lines.forEach(line => {
    // Match various error formats: "Error:", "[ERROR]", "ERROR -", etc.
    const match = line.match(/\b(error|exception|failed|fail|timeout|critical|warn(?:ing)?)\b[\s:]*(.+?)$/i);
    if (match) {
      const pattern = match[2].trim().substring(0, 100); // First 100 chars
      if (pattern) {
        errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
      }
    }
  });

  res.json({
    ...log,
    errorPatterns: Object.entries(errorPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  });
});

// 7. GET /api/metrics - Métricas para gráficos
app.get('/api/metrics', (req, res) => {
  // Bugs por prioridade
  const bugsByPriority = db.prepare(`
    SELECT priority, COUNT(*) as count FROM bugs GROUP BY priority
  `).all();

  // Bugs por status
  const bugsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM bugs GROUP BY status
  `).all();

  // Total bugs
  const totalBugs = db.prepare('SELECT COUNT(*) as total FROM bugs').get().total;

  // Total logs
  const totalLogs = db.prepare('SELECT COUNT(*) as total FROM logs').get().total;

  // Bugs por dia (última semana)
  const bugsTrend = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count 
    FROM bugs 
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY DATE(created_at)
  `).all();

  // Top errors nos logs
  const allLogs = db.prepare('SELECT content FROM logs ORDER BY created_at DESC LIMIT 5').all();
  const errorPatterns = {};

  allLogs.forEach(log => {
    const lines = log.content.split('\n');
    lines.forEach(line => {
      const match = line.match(/\b(error|exception|failed|fail|timeout|critical|warn(?:ing)?)\b[\s:]*(.+?)$/i);
      if (match) {
        const pattern = match[2].trim().substring(0, 100);
        if (pattern) errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
      }
    });
  });

  const topErrors = Object.entries(errorPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  res.json({
    totalBugs,
    totalLogs,
    bugsByPriority,
    bugsByStatus,
    bugsTrend,
    topErrors: topErrors.map(([error, count]) => ({ error, count }))
  });
});

// Export app so test files can import it and pass it directly to supertest,
// without needing a real server running on a port.
export { app };

// Only start the HTTP server when this file is the main entry point (npm start / npm run dev).
// When imported by tests, this block is skipped — no port conflict, no stray server.
const isMain = path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) {
  app.listen(PORT, () => {
    console.log(`🚀 QA Tracker running at http://localhost:${PORT}`);
  });
}
