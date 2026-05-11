// Functional tests for the Bug Management API (FR001–FR004).
//
// supertest wraps the Express app and lets us make real HTTP calls without
// starting a server on a port — it opens a temporary connection per request.
// Each test file runs in its own Vitest worker with a fresh in-memory DB,
// so tests here never read or write to the real qa_tracker.db file.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest'; // HTTP test client — calls our Express app directly
import { app } from '../server.js'; // the Express app (no server.listen called in test mode)

// ─── FR001: Report a bug ──────────────────────────────────────────────────────

describe('POST /api/bugs', () => {
  it('creates a bug with valid data', async () => {
    const res = await request(app)
      .post('/api/bugs')
      .send({ title: 'Login button broken', description: 'Cannot click', priority: 'High' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');       // DB auto-generated id must be returned
    expect(res.body.message).toBe('Bug reported successfully');
  });

  it('returns 400 when title is missing', async () => {
    // title is the only required field — server should reject without it
    const res = await request(app)
      .post('/api/bugs')
      .send({ description: 'No title provided' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error'); // response must include an error message
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/bugs').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('defaults status to Open when not provided', async () => {
    // Create a bug without explicitly setting status,
    // then fetch it back and confirm the DB default was applied.
    await request(app).post('/api/bugs').send({ title: 'Status default bug' });

    const getRes = await request(app).get('/api/bugs');
    const bug = getRes.body.find(b => b.title === 'Status default bug');
    expect(bug.status).toBe('Open');
  });

  it('defaults priority to Medium when not provided', async () => {
    // Same pattern: create without priority → verify DB default
    await request(app).post('/api/bugs').send({ title: 'Priority default bug' });

    const getRes = await request(app).get('/api/bugs');
    const bug = getRes.body.find(b => b.title === 'Priority default bug');
    expect(bug.priority).toBe('Medium');
  });

  it('accepts all valid priority values', async () => {
    // Loop over every accepted value to confirm none are rejected at the API level
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    for (const priority of priorities) {
      const res = await request(app)
        .post('/api/bugs')
        .send({ title: `${priority} priority bug`, priority });
      expect(res.status).toBe(200);
    }
  });
});

// ─── FR002: List bugs with filters ───────────────────────────────────────────

describe('GET /api/bugs', () => {
  // beforeAll runs once before any test in this describe block.
  // We seed known bugs so the filter tests have predictable data to work with.
  beforeAll(async () => {
    await request(app).post('/api/bugs').send({ title: 'High open bug', priority: 'High' });
    await request(app).post('/api/bugs').send({ title: 'Low open bug', priority: 'Low' });

    // Create a High bug and immediately resolve it, so we have a High+Resolved entry
    // that should NOT appear when filtering for High+Open.
    await request(app)
      .post('/api/bugs')
      .send({ title: 'High resolved bug', priority: 'High' })
      .then(r =>
        request(app)
          .put(`/api/bugs/${r.body.id}`)
          .send({ status: 'Resolved', priority: 'High' })
      );
  });

  it('returns an array of bugs', async () => {
    const res = await request(app).get('/api/bugs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('each bug has all required fields (FR004: created_at included)', async () => {
    // FR004 states the system must store creation date — verify it is exposed in the response
    const res = await request(app).get('/api/bugs');
    res.body.forEach(bug => {
      expect(bug).toHaveProperty('id');
      expect(bug).toHaveProperty('title');
      expect(bug).toHaveProperty('priority');
      expect(bug).toHaveProperty('status');
      expect(bug).toHaveProperty('created_at');
    });
  });

  it('returns bugs ordered by created_at DESC (newest first)', async () => {
    const res = await request(app).get('/api/bugs');

    // Convert ISO date strings to timestamps and confirm each is >= the next
    const dates = res.body.map(b => new Date(b.created_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('filters by priority — only matching bugs returned', async () => {
    const res = await request(app).get('/api/bugs?priority=High');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0); // seed data guarantees at least one High bug
    res.body.forEach(bug => expect(bug.priority).toBe('High'));
  });

  it('filters by status — only matching bugs returned', async () => {
    const res = await request(app).get('/api/bugs?status=Open');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach(bug => expect(bug.status).toBe('Open'));
  });

  it('filters by both priority and status simultaneously', async () => {
    // The resolved High bug seeded in beforeAll must NOT appear here
    const res = await request(app).get('/api/bugs?priority=High&status=Open');
    expect(res.status).toBe(200);
    res.body.forEach(bug => {
      expect(bug.priority).toBe('High');
      expect(bug.status).toBe('Open');
    });
  });

  it('returns empty array when filter matches nothing', async () => {
    // No Critical+Resolved bugs were seeded — should return [] not an error
    const res = await request(app).get('/api/bugs?priority=Critical&status=Resolved');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── FR003: Update bug status and priority ────────────────────────────────────

describe('PUT /api/bugs/:id', () => {
  // bugId is shared across all tests in this block.
  // beforeAll creates the bug once and stores its id.
  let bugId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/bugs')
      .send({ title: 'Bug to be edited', priority: 'Low' });
    bugId = res.body.id;
  });

  it('updates bug status successfully', async () => {
    const res = await request(app)
      .put(`/api/bugs/${bugId}`)
      .send({ status: 'In Progress', priority: 'Low' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Bug updated successfully');

    // Confirm the change was actually persisted by reading it back
    const getRes = await request(app).get('/api/bugs');
    const bug = getRes.body.find(b => b.id === bugId);
    expect(bug.status).toBe('In Progress');
  });

  it('updates bug priority successfully', async () => {
    await request(app)
      .put(`/api/bugs/${bugId}`)
      .send({ status: 'In Progress', priority: 'Critical' });

    const getRes = await request(app).get('/api/bugs');
    const bug = getRes.body.find(b => b.id === bugId);
    expect(bug.priority).toBe('Critical');
  });

  it('can transition status through the full workflow', async () => {
    // Walk Open → In Progress → Resolved and confirm each step persists correctly
    const transitions = ['Open', 'In Progress', 'Resolved'];
    for (const status of transitions) {
      await request(app)
        .put(`/api/bugs/${bugId}`)
        .send({ status, priority: 'Medium' });

      const getRes = await request(app).get('/api/bugs');
      const bug = getRes.body.find(b => b.id === bugId);
      expect(bug.status).toBe(status);
    }
  });
});
