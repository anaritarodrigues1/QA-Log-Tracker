# QA Log & Bug Tracker

🐛 **Web application to centralize bugs, logs, and QA metrics**

## 📋 About

QA Log & Bug Tracker is a complete software quality management tool that allows you to:
- Report and track bugs
- Automatically analyze logs
- Visualize real-time metrics
- Manage priorities and statuses

## 🚀 Technologies

- **Backend:** Node.js + Express
- **Frontend:** HTML5 + CSS3 + JavaScript (Vanilla)
- **Database:** SQLite3
- **Charts:** Chart.js
- **Upload:** Multer
- **Tests:** Vitest + supertest

## 📁 Project Structure

```text
qa-log-tracker/
├── server.js              # Express server (API)
├── vitest.config.js       # Test runner configuration
├── package.json           # Dependencies and scripts
├── qa_tracker.db          # SQLite database (not versioned)
├── public/
│   ├── index.html         # Main interface (3 tabs)
│   ├── app.js             # Frontend logic
│   └── style.css          # Responsive styles
├── tests/
│   ├── bugs.test.js       # API tests — Bug Management (FR001–FR004)
│   ├── logs.test.js       # API tests — Log Analysis (FR005–FR010)
│   ├── metrics.test.js    # API tests — Dashboard Metrics (FR011–FR014)
│   └── fixtures/
│       └── sample.log     # Log file used by file upload tests
└── uploads/               # Temporary upload files (auto-cleaned)
```

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd qa-log-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development (auto-reloads on save):
   npm run dev
   ```

4. **Access the application:**
   - Open `http://localhost:3000` in your browser

## 🧪 Testing

The project has **51 automated functional API tests** that run against an isolated in-memory SQLite database — the production `qa_tracker.db` is never touched.

```bash
npm test              # run all tests once
npm run test:watch    # re-run on file save (development mode)
```

```text
 ✓ tests/bugs.test.js     (16 tests) — Bug Management
 ✓ tests/logs.test.js     (18 tests) — Log Analysis
 ✓ tests/metrics.test.js  (17 tests) — Dashboard Metrics

 Test Files  3 passed
      Tests  51 passed
   Duration  ~1.3s
```

Each test file runs in its own Vitest worker with a fresh in-memory DB, so tests are fully isolated from each other and from production data.

## 📊 Features

### 🐛 Bug Management
- Report new bugs with title, description, and priority
- Filter by priority (Low/Medium/High/Critical) and status
- Edit bug status and priority
- View creation date

### 📝 Log Analysis
- Upload log files (`.log`, `.txt`)
- Direct paste of log content
- Automatic error detection via regex
- Error pattern analysis with counters
- Top 10 most frequent errors per log

### 📈 Dashboard
- Real-time metrics (total bugs, logs, open bugs)
- Charts by priority and status
- Bugs reported in the last week
- Top 5 errors across recent logs

## 🔌 API Endpoints

### Bugs
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/bugs` | Report a new bug |
| `GET` | `/api/bugs` | List bugs (supports `?priority=` and `?status=` filters) |
| `PUT` | `/api/bugs/:id` | Update bug status and priority |

### Logs
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/logs` | Upload a log file or paste log text |
| `GET` | `/api/logs` | List all analyzed logs |
| `GET` | `/api/logs/:id` | Full log details with error patterns |

### Metrics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/metrics` | Aggregated data for all dashboard charts |

## 🗄️ Database

### `bugs` Table
```sql
CREATE TABLE bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    screenshot_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `logs` Table
```sql
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    content TEXT NOT NULL,
    error_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🎯 Error Detection Patterns

The system automatically detects errors using regex:
```javascript
/\b(error|exception|failed|fail|timeout|critical|warn(?:ing)?)\b[\s:]/i
```

**Supported examples:**
- `[ERROR] Connection failed`
- `Exception: NullPointerException`
- `Failed to load configuration`
- `Timeout after 30 seconds`
- `WARNING: Low memory`
- `CRITICAL: Disk space below threshold`

## 📱 Interface

### Main Tabs
1. **Dashboard** - Overview with metrics and charts
2. **Bugs** - Reporting form and bug table
3. **Logs** - Log upload/analysis

### Responsive Design
- Adaptive layout for desktop and mobile
- Intuitive interface with colors by priority/status
- Modal dialogs for bug editing and log details

## 🔧 Development

### Available Scripts
```bash
npm start            # Start server in production
npm run dev          # Start with watch mode (auto-reloads on save)
npm test             # Run all 51 tests once
npm run test:watch   # Run tests in watch mode
```

### Architecture
- **Backend:** Simple REST API with Express
- **Frontend:** Client-side rendering (no frameworks)
- **Database:** SQLite for simplicity (no external server)
- **Upload:** Multer for file processing
- **Tests:** Vitest + supertest — API-level functional tests with in-memory DB isolation

## 📈 Future Improvements

- [ ] MIME type validation on file upload (server-side)
- [ ] Server-side file size limit enforcement (10MB cap per NFR003)
- [ ] HTML escaping in bug/log table rendering (XSS prevention)
- [ ] Unified error-parsing regex across all endpoints
- [ ] User authentication
- [ ] Report export (PDF/Excel)
- [ ] Email notifications for critical bugs
- [ ] Integration with external tools (Jira, Slack)
- [ ] CI/CD integration via API
- [ ] Automatic database backup

## 🤝 Contribution

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/new-feature`)
3. Add or update tests in `tests/` to cover your changes
4. Run `npm test` and confirm all tests pass
5. Commit your changes (`git commit -am 'Add new feature'`)
6. Push to the branch (`git push origin feature/new-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

---

**Developed with ❤️ to make QA work easier**
