const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        c.id, c.label,
        COUNT(ca.article_id) AS article_count,
        MIN(a.published_at) AS start_time,
        MAX(a.published_at) AS end_time
      FROM clusters c
      JOIN cluster_articles ca ON ca.cluster_id = c.id
      JOIN articles a ON a.id = ca.article_id
      GROUP BY c.id
      ORDER BY start_time ASC
    `).all();

    const maxCount = Math.max(1, ...rows.map((r) => r.article_count));

    const timeline = rows.map((r) => ({
      id: r.id,
      label: r.label,
      start: r.start_time,
      end: r.end_time,
      article_count: r.article_count,
      intensity: Number((r.article_count / maxCount).toFixed(2)),
    }));

    res.json({ timeline });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build timeline' });
  }
});

module.exports = router;