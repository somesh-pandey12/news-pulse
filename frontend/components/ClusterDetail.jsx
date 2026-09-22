function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function ClusterDetail({ cluster, loading, error, onClose }) {
  return (
    <div className="fixed inset-0 bg-ink/45 flex justify-end z-40" onClick={onClose}>
      <div className="bg-paper w-full max-w-[480px] h-full overflow-y-auto px-6 pt-7 pb-16 border-l-[3px] border-ink" onClick={(e) => e.stopPropagation()}>
        <button className="border-none bg-transparent text-base cursor-pointer text-ink-soft py-1 mb-4 hover:text-ink" onClick={onClose}>
          Back to timeline
        </button>

        {loading && <p>Loading cluster...</p>}
        {error && <p className="text-wire-red">{error}</p>}

        {cluster && (
          <>
            <h2 className="font-serif text-2xl font-semibold leading-tight mb-1.5 capitalize">{cluster.label}</h2>
            <p className="text-ink-soft text-[0.85rem] mb-5">
              {cluster.articles.length} article{cluster.articles.length === 1 ? '' : 's'}
            </p>

            {cluster.articles.map((a, i) => (
              <article key={a.id} className={i === 0 ? 'py-4' : 'py-4 border-t border-rule'}>
                <div className="text-xs font-semibold text-wire-teal mb-1">{a.source}</div>
                <h3 className="font-serif text-[1.05rem] font-semibold leading-snug mb-1.5">
                  <a href={a.link} target="_blank" rel="noopener noreferrer" className="no-underline hover:underline">{a.title}</a>
                </h3>
                {a.summary && (
                  <p className="text-[0.88rem] text-ink-soft leading-relaxed mb-1.5">
                    {a.summary.replace(/<[^>]+>/g, '').slice(0, 220)}
                    {a.summary.length > 220 ? '...' : ''}
                  </p>
                )}
                <div className="text-[0.76rem] text-ink-soft">{formatTime(a.published_at)}</div>
              </article>
            ))}
          </>
        )}
      </div>
    </div>
  );
}