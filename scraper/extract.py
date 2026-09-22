"""
Fetches the full article page and extracts main body text.
Never raises — failures are logged and skipped gracefully.
"""

import trafilatura
from config import REQUEST_TIMEOUT


def extract_full_text(url):
    try:
        downloaded = trafilatura.fetch_url(url, no_ssl=False)
        if not downloaded:
            return None, "failed"

        text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            favor_precision=True,
        )
        if not text or len(text.strip()) < 50:
            return None, "failed"

        return text.strip(), "ok"
    except Exception as e:
        print(f"  [extract] failed for {url}: {e}")
        return None, "failed"