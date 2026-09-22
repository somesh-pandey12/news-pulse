const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const PYTHON_CMD = process.env.PYTHON_CMD || 'python3';
const SCRAPER_ENTRYPOINT = path.resolve(
  __dirname, '..',
  process.env.SCRAPER_ENTRYPOINT || '../scraper/main.py'
);

router.post('/trigger', (req, res) => {
  const jobId = uuidv4();
  const now = new Date().toISOString();

  try {
    db.prepare(
      `INSERT INTO ingest_jobs (id, status, message, started_at) VALUES (?, 'pending', 'Queued', ?)`
    ).run(jobId, now);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create ingest job' });
  }

  const child = spawn(PYTHON_CMD, [SCRAPER_ENTRYPOINT, '--job-id', jobId], {
    cwd: path.dirname(SCRAPER_ENTRYPOINT),
    env: process.env,
  });

  child.stdout.on('data', (data) => process.stdout.write(`[scraper:${jobId.slice(0, 8)}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[scraper:${jobId.slice(0, 8)}] ${data}`));

  child.on('error', (err) => {
    console.error('Failed to start scraper subprocess:', err);
    db.prepare(`UPDATE ingest_jobs SET status='error', message=?, finished_at=? WHERE id=?`)
      .run(`Failed to start process: ${err.message}`, new Date().toISOString(), jobId);
  });

  res.status(202).json({ jobId, status: 'pending' });
});

router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  if (!jobId) {
    return res.status(400).json({ error: 'Missing jobId' });
  }

  const job = db.prepare('SELECT * FROM ingest_jobs WHERE id = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

module.exports = router;