const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const clusters = db.prepare(`
      SELECT
        c.id, c.label,
        COUNT(ca.article_id) AS article_count,
        MIN(a.published_at) AS start_time,
        MAX(a.published_at) AS end_time
      FROM clusters c
      JOIN cluster_articles ca ON ca.cluster_id = c.id
      JOIN articles a ON a.id = ca.article_id
      GROUP BY c.id
      ORDER BY end_time DESC
    `).all();

    const sourceStmt = db.prepare(`
      SELECT DISTINCT a.source
      FROM cluster_articles ca
      JOIN articles a ON a.id = ca.article_id
      WHERE ca.cluster_id = ?
    `);

    const withSources = clusters.map((c) => ({
      ...c,
      sources: sourceStmt.all(c.id).map((r) => r.source),
    }));

    res.json({ clusters: withSources });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load clusters' });
  }
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid cluster id' });
  }

  try {
    const cluster = db.prepare('SELECT id, label, created_at FROM clusters WHERE id = ?').get(id);
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }

    const articles = db.prepare(`
      SELECT a.id, a.source, a.title, a.summary, a.link, a.published_at, a.extraction_status
      FROM cluster_articles ca
      JOIN articles a ON a.id = ca.article_id
      WHERE ca.cluster_id = ?
      ORDER BY a.published_at ASC
    `).all(id);

    res.json({ ...cluster, articles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load cluster detail' });
  }
});

module.exports = router;