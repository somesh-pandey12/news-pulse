"""
Handles the messy part: different RSS feeds use different field names
and date formats. This module normalizes every entry into one consistent
internal shape:

{
    "source": str,
    "title": str,
    "summary": str,
    "link": str,
    "published_at": str (ISO 8601),
}
"""

import time
from datetime import datetime, timezone, timedelta
from dateutil import parser as dateparser

# If a parsed date lands more than this far in the past or future, treat
# it as a parsing artifact (bad format, wrong locale, feed bug) rather
# than a real timestamp. Otherwise a single bad date can stretch the
# whole timeline and squeeze every genuine cluster into an unreadable
# sliver at one edge.
MAX_PAST_DAYS = 180
MAX_FUTURE_DAYS = 1


def _is_plausible(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    return (now - timedelta(days=MAX_PAST_DAYS)) <= dt <= (now + timedelta(days=MAX_FUTURE_DAYS))


def _first_present(entry, keys):
    for k in keys:
        val = entry.get(k)
        if val:
            return val
    return None


def normalize_published_date(entry):
    for key in ("published_parsed", "updated_parsed"):
        val = entry.get(key)
        if val:
            try:
                dt = datetime.fromtimestamp(time.mktime(val), tz=timezone.utc)
                if _is_plausible(dt):
                    return dt.isoformat()
            except Exception:
                pass

    for key in ("published", "updated", "pubDate", "date"):
        val = entry.get(key)
        if val:
            try:
                dt = dateparser.parse(val)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if _is_plausible(dt):
                    return dt.isoformat()
            except Exception:
                continue

    return datetime.now(timezone.utc).isoformat()


def normalize_summary(entry):
    if entry.get("content"):
        try:
            val = entry["content"][0].get("value")
            if val:
                return val
        except (IndexError, AttributeError, TypeError):
            pass

    return _first_present(entry, ["summary", "description"]) or ""


def normalize_entry(entry, source_name):
    title = _first_present(entry, ["title"]) or "(untitled)"
    link = _first_present(entry, ["link", "id"])
    if not link:
        return None

    return {
        "source": source_name,
        "title": title.strip(),
        "summary": normalize_summary(entry).strip(),
        "link": link.strip(),
        "published_at": normalize_published_date(entry),
    }