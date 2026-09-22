"""
News Pulse scraper pipeline. Run: python main.py
"""

import sys
import argparse
import time
from datetime import datetime, timezone

import feedparser

from config import FEEDS, REQUEST_TIMEOUT, USER_AGENT
from normalize import normalize_entry
from extract import extract_full_text
from cluster import cluster_articles
from db import get_connection, init_db


def fetch_feed(feed_url, source_name):
    try:
        parsed = feedparser.parse(feed_url, agent=USER_AGENT)
        if parsed.bozo and not parsed.entries:
            print(f"  [feed] {source_name}: could not parse feed ({parsed.bozo_exception})")
            return []

        normalized = []
        for entry in parsed.entries:
            n = normalize_entry(entry, source_name)
            if n:
                normalized.append(n)
        return normalized
    except Exception as e:
        print(f"  [feed] {source_name}: failed to fetch/parse - {e}")
        return []


def ingest():
    conn = get_connection()
    cur = conn.cursor()
    new_count = 0
    skipped_count = 0
    failed_extractions = 0

    for feed in FEEDS:
        print(f"Fetching {feed['source']} ...")
        entries = fetch_feed(feed["url"], feed["source"])
        print(f"  -> {len(entries)} entries found")

        for entry in entries:
            cur.execute("SELECT id FROM articles WHERE link = ?", (entry["link"],))
            if cur.fetchone():
                skipped_count += 1
                continue

            full_text, status = extract_full_text(entry["link"])
            if status == "failed":
                failed_extractions += 1

            cur.execute(
                """INSERT INTO articles
                   (source, title, summary, full_text, link, published_at, fetched_at, extraction_status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    entry["source"],
                    entry["title"],
                    entry["summary"],
                    full_text,
                    entry["link"],
                    entry["published_at"],
                    datetime.now(timezone.utc).isoformat(),
                    status,
                ),
            )
            new_count += 1

        conn.commit()

    print(f"\nIngest done: {new_count} new articles, {skipped_count} duplicates skipped, "
          f"{failed_extractions} full-text extractions failed (summary still kept).")

    conn.close()
    return {"new": new_count, "skipped": skipped_count, "extraction_failures": failed_extractions}


def rebuild_clusters():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, title, summary FROM articles")
    articles = [dict(row) for row in cur.fetchall()]

    if not articles:
        print("No articles to cluster.")
        conn.close()
        return 0

    clusters = cluster_articles(articles)

    cur.execute("DELETE FROM cluster_articles")
    cur.execute("DELETE FROM clusters")

    for c in clusters:
        cur.execute(
            "INSERT INTO clusters (label, created_at) VALUES (?, ?)",
            (c["label"], datetime.now(timezone.utc).isoformat()),
        )
        cluster_id = cur.lastrowid
        for aid in c["article_ids"]:
            cur.execute(
                "INSERT INTO cluster_articles (cluster_id, article_id) VALUES (?, ?)",
                (cluster_id, aid),
            )

    conn.commit()
    conn.close()
    print(f"Clustering done: {len(clusters)} clusters formed from {len(articles)} articles.")
    return len(clusters)


def update_job_status(job_id, status, message=""):
    if not job_id:
        return
    conn = get_connection()
    cur = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cur.execute("SELECT id FROM ingest_jobs WHERE id = ?", (job_id,))
    if cur.fetchone():
        if status in ("done", "error"):
            cur.execute(
                "UPDATE ingest_jobs SET status=?, message=?, finished_at=? WHERE id=?",
                (status, message, now, job_id),
            )
        else:
            cur.execute(
                "UPDATE ingest_jobs SET status=?, message=? WHERE id=?",
                (status, message, job_id),
            )
    else:
        cur.execute(
            "INSERT INTO ingest_jobs (id, status, message, started_at) VALUES (?, ?, ?, ?)",
            (job_id, status, message, now),
        )
    conn.commit()
    conn.close()


def run(job_id=None):
    init_db()
    update_job_status(job_id, "running", "Fetching feeds...")
    try:
        stats = ingest()
        update_job_status(job_id, "running", "Clustering articles...")
        n_clusters = rebuild_clusters()
        msg = f"{stats['new']} new articles, {n_clusters} clusters"
        update_job_status(job_id, "done", msg)
        return True
    except Exception as e:
        update_job_status(job_id, "error", str(e))
        print(f"Pipeline failed: {e}")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-id", default=None)
    args = parser.parse_args()

    start = time.time()
    ok = run(job_id=args.job_id)
    print(f"\nTotal time: {time.time() - start:.1f}s")
    sys.exit(0 if ok else 1)