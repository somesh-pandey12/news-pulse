# News Pulse — Topic-Clustered News Timeline

## Architecture
- `/scraper` — Python: RSS ingestion from BBC News, NPR, and Al Jazeera; full-article
  extraction via trafilatura; keyword-overlap topic clustering; SQLite storage.
- `/backend` — Node.js/Express REST API serving clusters, articles, and timeline data.
  Uses Node's built-in `node:sqlite` module (no native build tools required).
- `/frontend` — Next.js + Tailwind CSS custom timeline UI, cluster detail view,
  source filtering, and a "Refresh data" button that triggers the scraper on-demand.

## Sources used
BBC News, NPR, Al Jazeera

## Clustering approach
Keyword-overlap grouping (Option A). Two articles join the same cluster if they
share 3+ significant words (stopwords removed) from their title + summary.
Cluster labels are the 3 most common shared words.

**Limitation**: clustering recomputes over all stored articles on every run
(O(n²)), which is fine at this scale but wouldn't scale to a very large archive.
Also, some feeds embed image/media metadata in the summary field which can
occasionally pollute cluster labels — a more thorough HTML-stripping pass on
the summary field would improve this.

## Setup
1. Scraper: `cd scraper && pip install -r requirements.txt && python main.py`
2. Backend: `cd backend && npm install && npm start` (needs a `.env` file — see `.env.example`)
3. Frontend: `cd frontend && npm install && npm run dev` (needs a `.env.local` file — see `.env.local.example`)

## Deployment
- Frontend: Vercel
- Backend: Render
- Scraper: triggered on-demand via the backend's `/ingest/trigger` endpoint