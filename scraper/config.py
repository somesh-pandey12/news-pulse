import os

# --- News sources (RSS feeds) ---
FEEDS = [
    {"source": "BBC News", "url": "http://feeds.bbci.co.uk/news/rss.xml"},
    {"source": "NPR", "url": "https://feeds.npr.org/1001/rss.xml"},
    {"source": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml"},
]

# --- Database ---
DB_PATH = os.environ.get("NEWS_PULSE_DB_PATH", os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data", "news_pulse.db"
))

# --- Clustering ---
CLUSTER_OVERLAP_THRESHOLD = int(os.environ.get("CLUSTER_OVERLAP_THRESHOLD", 3))
CLUSTER_LABEL_WORD_COUNT = 3

# --- Networking ---
REQUEST_TIMEOUT = 10
USER_AGENT = "NewsPulseBot/1.0 (+internship-assessment)"