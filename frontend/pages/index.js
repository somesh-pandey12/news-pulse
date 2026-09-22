import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { api } from '../lib/api';
import Timeline from '../components/Timeline';
import SourceFilter from '../components/SourceFilter';
import ClusterDetail from '../components/ClusterDetail';
import RefreshButton from '../components/RefreshButton';

export default function Home() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeSources, setActiveSources] = useState(new Set());

  const [selectedId, setSelectedId] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadClusters = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { clusters } = await api.getClusters();
      setClusters(clusters);
      setActiveSources((prev) => {
        const allSources = new Set(clusters.flatMap((c) => c.sources));
        if (prev.size === 0) return allSources;
        return new Set([...prev, ...allSources].filter((s) => allSources.has(s)));
      });
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClusters();
  }, [loadClusters]);

  const sourceCounts = useMemo(() => {
    const counts = new Map();
    clusters.forEach((c) => {
      c.sources.forEach((s) => counts.set(s, (counts.get(s) || 0) + 1));
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clusters]);

  const visibleClusters = useMemo(() => {
    if (activeSources.size === 0) return clusters;
    return clusters.filter((c) => c.sources.some((s) => activeSources.has(s)));
  }, [clusters, activeSources]);

  const toggleSource = (name) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const openCluster = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetailError('');
    setSelectedCluster(null);
    try {
      const cluster = await api.getCluster(id);
      setSelectedCluster(cluster);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setSelectedCluster(null);
    setDetailError('');
  };

  return (
    <>
      <Head>
        <title>News Pulse — Topic-Clustered News Timeline</title>
        <meta name="description" content="Live news, grouped by topic, plotted over time." />
      </Head>

      <div className="max-w-[1180px] mx-auto px-6 font-sans text-ink">
        <header className="border-b-[3px] border-ink pt-7 pb-4">
          <div className="flex justify-between items-end gap-6 flex-wrap">
            <div>
              <h1 className="font-serif font-bold text-[clamp(2.2rem,5vw,3.2rem)] leading-none tracking-tight m-0">
                News Pulse
              </h1>
              <p className="text-ink-soft text-[0.95rem] mt-2 max-w-[520px] leading-relaxed">
                Live articles pulled from multiple outlets, grouped into topic clusters,
                and plotted on a timeline so you can see what&rsquo;s been active and when.
              </p>
            </div>
            <RefreshButton onComplete={loadClusters} />
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 pt-7 pb-16 items-start">
          <SourceFilter
            sources={sourceCounts}
            activeSources={activeSources}
            onToggle={toggleSource}
          />

          <section>
            {loading && <p>Loading timeline…</p>}
            {loadError && <p className="text-wire-red">{loadError}</p>}
            {!loading && !loadError && (
              <Timeline clusters={visibleClusters} onSelectCluster={openCluster} />
            )}
          </section>
        </main>
      </div>

      {selectedId && (
        <ClusterDetail
          cluster={selectedCluster}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetail}
        />
      )}
    </>
  );
}   