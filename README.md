# News Pulse — Topic-Clustered News Timeline

A small system that pulls live articles from multiple news RSS feeds, automatically
groups related articles into topic clusters using keyword-overlap matching, and
displays those clusters as an interactive visual timeline.

**Live demo:** https://https://news-pulse-gules-pi.vercel.app/
**Backend API:** https://https://news-pulse-backend-qk20.onrender.com

---

## Architecture

news-pulse/
├── scraper/ Python — RSS ingestion, full-article extraction, topic clustering
├── backend/ Node.js/Express — REST API serving clusters, articles, timeline
├── frontend/ Next.js + Tailwind CSS — timeline UI, cluster explorer
└── Dockerfile Deployment image (Node + Python together, for Render)


**Data flow:** The Python scraper pulls RSS feeds → extracts full article text →
stores everything in SQLite → clusters articles by topic → the Node backend reads
that same SQLite database and serves it over a REST API → the Next.js frontend
fetches from the API and renders the timeline. The frontend's "Refresh data"
button calls `POST /ingest/trigger`, which spawns the Python pipeline as a
subprocess and returns a job ID the frontend polls until the run finishes.

### Why this stack split
- **SQLite** was chosen over Postgres/MongoDB for simplicity — both the Python
  scraper and the Node backend can read/write it directly with no separate
  database server to provision. The Node backend uses Node's built-in
  `node:sqlite` module (no native compilation step, which avoids the
  Windows/Visual Studio build-tools problem that a native driver like
  `better-sqlite3` would introduce).
- **Docker** is used for the Render deployment specifically because the backend
  needs both a Node runtime (to serve the API) and a Python runtime (to run the
  scraper as a subprocess when "Refresh data" is triggered) in the same
  container — Render's plain Node runtime doesn't include Python.

---

## Sources used
- BBC News — `http://feeds.bbci.co.uk/news/rss.xml`
- NPR — `https://feeds.npr.org/1001/rss.xml`
- Al Jazeera — `https://www.aljazeera.com/xml/rss/all.xml`

---

## Topic clustering approach

Used **keyword/word-overlap grouping (Option A)**, not TF-IDF, because the
article volume per run is small (tens to low hundreds of articles) and a
simple, explainable approach was preferred over a heavier one for that scale.

**How it works:**
1. For each article, extract the "significant words" from its title + summary
   (lowercase, punctuation stripped, common stopwords removed).
2. Compare every pair of articles by the size of the overlap between their
   significant-word sets.
3. If two articles share **3 or more** significant words, they're linked into
   the same cluster (via a union-find/disjoint-set structure, so the linking is
   transitive — if A matches B and B matches C, all three end up in one cluster).
4. Each cluster is labeled with its 3 most frequent shared words.

**Threshold choice:** 3 shared significant words was chosen empirically — 2
words produced clusters with occasional coincidental overlaps ("news died
report" type collisions across unrelated stories), while 4+ words was too
strict and missed genuinely related articles that used different word choices
for the same story. 3 struck the best balance on a test run of ~70 articles.

**Known limitations:**
- Clustering recomputes over *all* stored articles on every pipeline run
  (O(n²) pairwise comparison), which is fine at this scale (tens to low
  hundreds of articles) but would need to move to an incremental approach
  at real scale.
- Some RSS feeds embed image/media metadata (alt text, filenames) inside the
  `<description>`/summary field. Because clustering reads directly from the
  summary, this occasionally pollutes a cluster label with fragments like
  `media / alt / png`. A more thorough HTML/metadata-stripping pass on the
  summary field before clustering would fix this — noted here rather than
  fixed, in the interest of time.
- Cross-source story merging (recognizing the same real-world event reported
  by two different outlets as one logical story) is not implemented — this
  was a listed stretch goal and is a genuinely hard problem (would need
  semantic/entity matching, not just keyword overlap).

---

## Setup (local development)

**1. Scraper**
```bash
cd scraper
pip install -r requirements.txt
python main.py
```
Populates `data/news_pulse.db` with articles and clusters.

**2. Backend**
```bash
cd backend
npm install
cp .env.example .env   # then edit values if needed
npm start
```
Runs on `http://localhost:4000`.

**3. Frontend**
```bash
cd frontend
npm install
cp .env.local.example .env.local   # then edit NEXT_PUBLIC_API_URL if needed
npm run dev
```
Runs on `http://localhost:3000`.

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/clusters` | List of clusters — label, article count, time range, sources |
| GET | `/clusters/:id` | Full cluster detail with all articles, chronologically sorted |
| GET | `/timeline` | Clusters shaped for charting — start/end time, count, intensity |
| POST | `/ingest/trigger` | Triggers the Python pipeline as a subprocess, returns a job ID |
| GET | `/ingest/status/:jobId` | Poll a pipeline run's status (pending/running/done/error) |
| GET | `/health` | Basic liveness check |

---

## Deployment

| Component | Platform | Why |
|---|---|---|
| Frontend | Vercel | Native Next.js support, zero-config, generous free tier |
| Backend | Render (Docker) | Needs both Node + Python in one container to run the scraper subprocess |
| Scraper | Triggered on-demand via `POST /ingest/trigger` | Simpler than a separate cron service for an assessment-scale project |
| Database | SQLite, on Render's filesystem | No separate DB server to provision; see limitation below |

**Known deployment limitation:** Render's free-tier filesystem is ephemeral —
the SQLite database resets whenever the service redeploys or restarts after
being idle. Click "Refresh data" once after any redeploy to repopulate it. In
a production setting this would move to a hosted Postgres instance (Supabase/
Neon/Render Postgres) so data survives restarts.

Render's free tier also spins the service down after ~15 minutes of
inactivity; the first request after idling can take 30-60 seconds to wake up
("cold start"). This is expected and acceptable per the assessment brief.

---

## Environment Variables

**Backend** (`backend/.env`):

PORT=4000
DB_PATH=../data/news_pulse.db
PYTHON_CMD=python3
SCRAPER_ENTRYPOINT=../scraper/main.py
CORS_ORIGIN=<frontend URL>





