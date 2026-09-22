"""
Keyword-overlap topic clustering (Option A).
Two articles join the same cluster if they share >= threshold
"significant" words. Union-find groups transitive matches together.
"""

import re
from collections import Counter, defaultdict
from config import CLUSTER_OVERLAP_THRESHOLD, CLUSTER_LABEL_WORD_COUNT
from stopwords import STOPWORDS

WORD_RE = re.compile(r"[a-zA-Z']+")


def significant_words(text):
    words = WORD_RE.findall(text.lower())
    return {w for w in words if len(w) > 2 and w not in STOPWORDS}


class UnionFind:
    def __init__(self, ids):
        self.parent = {i: i for i in ids}

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


def cluster_articles(articles):
    word_sets = {}
    for a in articles:
        text = f"{a['title']} {a.get('summary') or ''}"
        word_sets[a["id"]] = significant_words(text)

    ids = list(word_sets.keys())
    uf = UnionFind(ids)

    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            id_a, id_b = ids[i], ids[j]
            overlap = word_sets[id_a] & word_sets[id_b]
            if len(overlap) >= CLUSTER_OVERLAP_THRESHOLD:
                uf.union(id_a, id_b)

    groups = defaultdict(list)
    for aid in ids:
        groups[uf.find(aid)].append(aid)

    clusters = []
    for root, member_ids in groups.items():
        if len(member_ids) < 2:
            continue

        word_counter = Counter()
        for aid in member_ids:
            word_counter.update(word_sets[aid])
        top_words = [w for w, _ in word_counter.most_common(CLUSTER_LABEL_WORD_COUNT)]
        label = " / ".join(top_words) if top_words else "Untitled topic"

        clusters.append({"label": label, "article_ids": member_ids})

    return clusters