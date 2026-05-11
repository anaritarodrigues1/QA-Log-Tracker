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

## 📁 Project Structure

```text
qa-log-tracker/
├── server.js              # Express server (API)
├── package.json           # Dependencies and scripts
├── qa_tracker.db          # SQLite database
├── public/
│   ├── index.html         # Main interface (3 tabs)
│   ├── app.js             # Frontend logic
│   └── style.css          # Responsive styles
└── uploads/               # Temporary files
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
   # or for development:
   npm run dev
   ```

4. **Access the application:**
   - Open `http://localhost:3000` in your browser

## 📊 Features

### 🐛 Bug Management
- Report new bugs with title, description, and priority
- Filter by priority (Low/Medium/High/Critical) and status
- Edit bug status and priority
- View creation date

### 📝 Log Analysis
- Upload log files
- Direct paste of log content
- Automatic error detection (197+ supported patterns)
- Error pattern analysis with counters
- Top 10 most frequent errors

### 📈 Dashboard
- Real-time metrics (total bugs, logs, open bugs)
- Charts by priority and status
- Bugs reported in the last week
- Top 5 log errors

## 🔌 API Endpoints

### Bugs
- `POST /api/bugs` - Report bug
- `GET /api/bugs` - List bugs (with filters)
- `PUT /api/bugs/:id` - Update bug

### Logs
- `POST /api/logs` - Upload/paste log
- `GET /api/logs` - List logs
- `GET /api/logs/:id` - Log details

### Metrics
- `GET /api/metrics` - Chart data

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
/\b(error|exception|failed|fail|timeout|critical|warn(?:ing)?)\b[\s:]*(.+?)$/i
```

**Supported examples:**
- `[ERROR] Connection failed`
- `Exception: NullPointerException`
- `Failed to load configuration`
- `Timeout after 30 seconds`
- `WARNING: Low memory`

## 📱 Interface

### Main Tabs
1. **Dashboard** - Overview with metrics and charts
2. **Bugs** - Reporting form and bug table
3. **Logs** - Log upload/analysis

### Responsive Design
- Adaptive layout for desktop and mobile
- Intuitive interface with colors by priority/status
- Modal dialogs for bug editing

## 🔧 Development

### Available Scripts
```bash
npm start      # Starts server in production
npm run dev    # Starts with watch mode (--watch)
```

### Architecture
- **Backend:** Simple REST API with Express
- **Frontend:** Client-side rendering (without frameworks)
- **Database:** SQLite for simplicity (no external server)
- **Upload:** Multer for file processing

## 📈 Future Improvements

- [ ] User authentication
- [ ] Report export (PDF/Excel)
- [ ] Email notifications
- [ ] Integration with external tools (Jira, Slack)
- [ ] API integration with CI/CD
- [ ] Automatic database backup

## 🤝 Contribution

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

---

**Developed with ❤️ to make QA work easier**