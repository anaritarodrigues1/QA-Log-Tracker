// Functional tests for the Log Analysis API (FR005–FR010).
//
// Tests cover two input methods (file upload and text paste) and verify that
// the error detection regex correctly counts and categorises error lines.
// File upload tests use supertest's .attach() to send multipart form data.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ES Modules — reconstruct it from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Sample log content used across multiple test cases ───────────────────────

// A realistic log with 5 lines that match the error regex:
//   ERROR, Exception, WARNING, CRITICAL, Failed  →  errorCount = 5
const LOG_WITH_ERRORS = [
  '2024-01-15 10:00:00 INFO Application started',
  '2024-01-15 10:01:00 ERROR Connection failed to database', // matches: "ERROR "
  '2024-01-15 10:02:00 INFO Retrying connection...',
  '2024-01-15 10:03:00 Exception: NullPointerException in module auth', // matches: "Exception:"
  '2024-01-15 10:04:00 WARNING: Low memory detected',                   // matches: "WARNING:"
  '2024-01-15 10:05:00 INFO Connection restored',
  '2024-01-15 10:06:00 CRITICAL: Disk space below threshold',           // matches: "CRITICAL:"
  '2024-01-15 10:07:00 Failed to load configuration file',              // matches: "Failed "
  '2024-01-15 10:08:00 INFO All systems nominal',
].join('\n');

// A clean log with no error keywords — errorCount must be 0
const LOG_NO_ERRORS = [
  '2024-01-15 10:00:00 INFO Application started',
  '2024-01-15 10:01:00 INFO User logged in',
  '2024-01-15 10:02:00 INFO Request processed successfully',
].join('\n');

// ─── FR006 + FR007 + FR008: Paste text log ───────────────────────────────────

describe('POST /api/logs (text paste)', () => {
  it('accepts log text and returns id, errorCount, and success message', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ logText: LOG_WITH_ERRORS });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');          // DB row id
    expect(res.body).toHaveProperty('errorCount');  // number of matched error lines
    expect(res.body.message).toBe('Log analyzed successfully');
  });

  it('counts exactly 5 error lines in LOG_WITH_ERRORS (FR008)', async () => {
    // The regex matches lines containing: error, exception, failed, fail,
    // timeout, critical, or warn(ing) — case-insensitive, followed by space or colon.
    // LOG_WITH_ERRORS has exactly 5 such lines (see comments on the constant above).
    const res = await request(app)
      .post('/api/logs')
      .send({ logText: LOG_WITH_ERRORS });

    expect(res.body.errorCount).toBe(5);
  });

  it('returns 0 errors for a clean log with no error keywords', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ logText: LOG_NO_ERRORS });

    expect(res.status).toBe(200);
    expect(res.body.errorCount).toBe(0);
  });

  it('returns 400 when body is empty — no log content provided', async () => {
    const res = await request(app).post('/api/logs').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('response includes up to 10 matching error lines (FR007)', async () => {
    // The server slices errorLines to the first 10 — verify the cap is respected
    const res = await request(app)
      .post('/api/logs')
      .send({ logText: LOG_WITH_ERRORS });

    expect(res.body).toHaveProperty('errorLines');
    expect(Array.isArray(res.body.errorLines)).toBe(true);
    expect(res.body.errorLines.length).toBeLessThanOrEqual(10);
  });

  it('detects all 7 supported error keyword patterns (FR007)', async () => {
    // One line per supported keyword — every line must be counted
    const lines = [
      'error: something went wrong',   // keyword: error
      'exception: null pointer',        // keyword: exception
      'failed to connect',              // keyword: failed
      'fail on startup',                // keyword: fail
      'timeout after 30s',              // keyword: timeout
      'critical system failure',        // keyword: critical
      'warning: low disk space',        // keyword: warning
    ];
    const res = await request(app)
      .post('/api/logs')
      .send({ logText: lines.join('\n') });

    expect(res.body.errorCount).toBe(lines.length);
  });

  it('stores file_name as "pasted_log" for text submissions', async () => {
    // When no file is uploaded, the server sets a default name — verify it is persisted
    const postRes = await request(app)
      .post('/api/logs')
      .send({ logText: 'error: test entry' });

    const detailRes = await request(app).get(`/api/logs/${postRes.body.id}`);
    expect(detailRes.body.file_name).toBe('pasted_log');
  });
});

// ─── FR005: Upload a log file ─────────────────────────────────────────────────

describe('POST /api/logs (file upload)', () => {
  // The fixture file lives next to this test file for easy access
  const fixturePath = path.join(__dirname, 'fixtures', 'sample.log');

  it('uploads a .log file and returns error count', async () => {
    // .attach() sends the file as multipart/form-data under the field name "file"
    const res = await request(app)
      .post('/api/logs')
      .attach('file', fixturePath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('errorCount');
    expect(typeof res.body.errorCount).toBe('number');
  });

  it('stores the original filename from the uploaded file', async () => {
    const res = await request(app)
      .post('/api/logs')
      .attach('file', fixturePath);

    const detailRes = await request(app).get(`/api/logs/${res.body.id}`);
    expect(detailRes.body.file_name).toBe('sample.log');
  });
});

// ─── FR009: List logs ─────────────────────────────────────────────────────────

describe('GET /api/logs', () => {
  // Seed two logs before running list tests so the array is never empty
  beforeAll(async () => {
    await request(app).post('/api/logs').send({ logText: LOG_WITH_ERRORS });
    await request(app).post('/api/logs').send({ logText: LOG_NO_ERRORS });
  });

  it('returns an array with at least one log', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('each log entry exposes required fields', async () => {
    const res = await request(app).get('/api/logs');
    res.body.forEach(log => {
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('file_name');
      expect(log).toHaveProperty('error_count');
      expect(log).toHaveProperty('created_at');
    });
  });

  it('list endpoint does NOT expose raw log content (performance guard)', async () => {
    // The server intentionally omits "content" from the list query to avoid
    // sending large blobs on every list call — only the detail endpoint returns it
    const res = await request(app).get('/api/logs');
    res.body.forEach(log => {
      expect(log).not.toHaveProperty('content');
    });
  });

  it('returns logs ordered by created_at DESC (newest first)', async () => {
    const res = await request(app).get('/api/logs');
    const dates = res.body.map(l => new Date(l.created_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});

// ─── FR010: Log details with error patterns ───────────────────────────────────

describe('GET /api/logs/:id', () => {
  // Create one log upfront and reuse its id across all detail tests
  let logId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ logText: LOG_WITH_ERRORS });
    logId = res.body.id;
  });

  it('returns full log including raw content', async () => {
    const res = await request(app).get(`/api/logs/${logId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('content');   // full text, only exposed here
    expect(res.body).toHaveProperty('error_count');
    expect(res.body).toHaveProperty('errorPatterns');
  });

  it('errorPatterns is an array of [pattern, count] pairs', async () => {
    // Each element is a two-item array: [string, number]
    // e.g. ["Connection failed to database", 1]
    const res = await request(app).get(`/api/logs/${logId}`);
    expect(Array.isArray(res.body.errorPatterns)).toBe(true);
    res.body.errorPatterns.forEach(([pattern, count]) => {
      expect(typeof pattern).toBe('string');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  it('errorPatterns are sorted by count DESC (most frequent first)', async () => {
    const res = await request(app).get(`/api/logs/${logId}`);
    const counts = res.body.errorPatterns.map(([, count]) => count); // destructure, skip pattern
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1]).toBeGreaterThanOrEqual(counts[i]);
    }
  });

  it('returns at most 10 error patterns (top-10 cap)', async () => {
    const res = await request(app).get(`/api/logs/${logId}`);
    expect(res.body.errorPatterns.length).toBeLessThanOrEqual(10);
  });

  it('returns 404 for a non-existent log id', async () => {
    const res = await request(app).get('/api/logs/99999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
