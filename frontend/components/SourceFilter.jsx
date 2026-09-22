export default function SourceFilter({ sources, activeSources, onToggle }) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="border border-rule bg-paper-raised p-4 rounded md:sticky md:top-6">
      <p className="text-[0.78rem] font-semibold text-ink-soft mb-3">Filter by source</p>
      {sources.map(({ name, count }) => (
        <label
          key={name}
          className="flex items-center gap-2 py-1.5 cursor-pointer text-[0.92rem]"
        >
          <input
            type="checkbox"
            checked={activeSources.has(name)}
            onChange={() => onToggle(name)}
            className="w-4 h-4 cursor-pointer accent-wire-red"
          />
          <span>{name}</span>
          <span className="text-ink-soft text-xs ml-auto">{count}</span>
        </label>
      ))}
    </div>
  );
}