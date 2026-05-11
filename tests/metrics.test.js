// Functional tests for the Dashboard Metrics API (FR011–FR014).
//
// All tests in this file share the same in-memory DB, seeded once in beforeAll.
// We create a controlled set of bugs and logs so we can make exact assertions
// on totals, distributions, and error aggregations.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

// ─── Seed data ────────────────────────────────────────────────────────────────

// beforeAll runs once before all tests in this file.
// We insert a known dataset so every assertion below is deterministic.
beforeAll(async () => {
  // 3 bugs: 2 High (one Open, one Resolved) + 1 Low (Open)
  await request(app).post('/api/bugs').send({ title: 'High Open Bug', priority: 'High' });
  await request(app)
    .post('/api/bugs')
    .send({ title: 'High Resolved Bug', priority: 'High' })
    .then(r =>
      request(app)
        .put(`/api/bugs/${r.body.id}`)
        .send({ status: 'Resolved', priority: 'High' })
    );
  await request(app).post('/api/bugs').send({ title: 'Low Open Bug', priority: 'Low' });

  // 1 log with 2 Error/Exception lines — used to verify topErrors aggregation
  await request(app)
    .post('/api/logs')
    .send({ logText: 'Error: connection refused\nException: timeout expired' });
});

// ─── FR011: General metrics ───────────────────────────────────────────────────

describe('GET /api/metrics — response shape (FR011)', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
  });

  it('response contains all required top-level fields', async () => {
    const res = await request(app).get('/api/metrics');
    // Every field is required by the frontend dashboard
    expect(res.body).toHaveProperty('totalBugs');
    expect(res.body).toHaveProperty('totalLogs');
    expect(res.body).toHaveProperty('bugsByPriority');
    expect(res.body).toHaveProperty('bugsByStatus');
    expect(res.body).toHaveProperty('bugsTrend');
    expect(res.body).toHaveProperty('topErrors');
  });

  it('totalBugs is a non-negative integer', async () => {
    const res = await request(app).get('/api/metrics');
    expect(typeof res.body.totalBugs).toBe('number');
    expect(res.body.totalBugs).toBeGreaterThanOrEqual(0);
  });

  it('totalLogs is a non-negative integer', async () => {
    const res = await request(app).get('/api/metrics');
    expect(typeof res.body.totalLogs).toBe('number');
    expect(res.body.totalLogs).toBeGreaterThanOrEqual(0);
  });

  it('totalBugs matches the number of bugs seeded', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.body.totalBugs).toBe(3); // exactly 3 seeded in beforeAll
  });

  it('totalLogs matches the number of logs seeded', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.body.totalLogs).toBe(1); // exactly 1 seeded in beforeAll
  });
});

// ─── FR012: Bugs by priority ──────────────────────────────────────────────────

describe('GET /api/metrics — bugsByPriority (FR012)', () => {
  it('is an array of objects with priority and count fields', async () => {
    const res = await request(app).get('/api/metrics');
    expect(Array.isArray(res.body.bugsByPriority)).toBe(true);
    res.body.bugsByPriority.forEach(item => {
      expect(item).toHaveProperty('priority');
      expect(item).toHaveProperty('count');
    });
  });

  it('counts in bugsByPriority add up to totalBugs', async () => {
    // Every bug must appear in exactly one priority group — no orphans, no duplicates
    const res = await request(app).get('/api/metrics');
    const sum = res.body.bugsByPriority.reduce((acc, b) => acc + b.count, 0);
    expect(sum).toBe(res.body.totalBugs);
  });

  it('High priority has count 2, Low has count 1 (matches seed data)', async () => {
    const res = await request(app).get('/api/metrics');
    const byPriority = Object.fromEntries(
      res.body.bugsByPriority.map(b => [b.priority, b.count]) // { High: 2, Low: 1 }
    );
    expect(byPriority['High']).toBe(2);
    expect(byPriority['Low']).toBe(1);
  });
});

// ─── FR013: Bugs by status ────────────────────────────────────────────────────

describe('GET /api/metrics — bugsByStatus (FR013)', () => {
  it('is an array of objects with status and count fields', async () => {
    const res = await request(app).get('/api/metrics');
    expect(Array.isArray(res.body.bugsByStatus)).toBe(true);
    res.body.bugsByStatus.forEach(item => {
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('count');
    });
  });

  it('counts in bugsByStatus add up to totalBugs', async () => {
    // Every bug must appear in exactly one status group
    const res = await request(app).get('/api/metrics');
    const sum = res.body.bugsByStatus.reduce((acc, b) => acc + b.count, 0);
    expect(sum).toBe(res.body.totalBugs);
  });

  it('Open has count 2, Resolved has count 1 (matches seed data)', async () => {
    const res = await request(app).get('/api/metrics');
    const byStatus = Object.fromEntries(
      res.body.bugsByStatus.map(b => [b.status, b.count]) // { Open: 2, Resolved: 1 }
    );
    expect(byStatus['Open']).toBe(2);
    expect(byStatus['Resolved']).toBe(1);
  });
});

// ─── Trend and top errors ─────────────────────────────────────────────────────

describe('GET /api/metrics — bugsTrend and topErrors (FR014)', () => {
  it('bugsTrend is an array of { date, count } objects', async () => {
    const res = await request(app).get('/api/metrics');
    expect(Array.isArray(res.body.bugsTrend)).toBe(true);
    res.body.bugsTrend.forEach(item => {
      expect(item).toHaveProperty('date');  // ISO date string: "YYYY-MM-DD"
      expect(item).toHaveProperty('count');
    });
  });

  it('bugsTrend includes today because bugs were just seeded', async () => {
    const res = await request(app).get('/api/metrics');

    // The trend query covers the last 7 days, so today must be present
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const todayEntry = res.body.bugsTrend.find(b => b.date === today);
    expect(todayEntry).toBeDefined();
    expect(todayEntry.count).toBeGreaterThanOrEqual(3); // the 3 seeded bugs
  });

  it('topErrors is an array of { error, count } objects (FR014)', async () => {
    const res = await request(app).get('/api/metrics');
    expect(Array.isArray(res.body.topErrors)).toBe(true);
    res.body.topErrors.forEach(item => {
      expect(item).toHaveProperty('error');
      expect(item).toHaveProperty('count');
    });
  });

  it('topErrors contains at most 5 entries', async () => {
    // The server caps the list at 5 for the dashboard chart
    const res = await request(app).get('/api/metrics');
    expect(res.body.topErrors.length).toBeLessThanOrEqual(5);
  });

  // Known bug: the regex in /api/metrics uses (Error|Exception): pattern (narrower than
  // the one used in /api/logs), so only "Error: ..." and "Exception: ..." lines are counted.
  // The seeded log has exactly those two patterns, so topErrors should have 2 entries.
  it('topErrors reflects errors from the seeded log', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.body.topErrors.length).toBe(2);
  });
});
