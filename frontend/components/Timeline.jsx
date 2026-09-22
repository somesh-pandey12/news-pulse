import { useMemo } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;
const PX_PER_DAY = 70;      // horizontal scale of the timeline
const MIN_BAR_WIDTH = 150;  // px - every cluster stays readable, however short its span
const ROW_HEIGHT = 54;

function daysBetween(a, b) {
  return (b - a) / DAY_MS;
}

export default function Timeline({ clusters, onSelectCluster }) {
  const { ticks, rows, totalWidth } = useMemo(() => {
    if (clusters.length === 0) {
      return { ticks: [], rows: [], totalWidth: 0 };
    }

    const starts = clusters.map((c) => new Date(c.start_time).getTime());
    const ends = clusters.map((c) => new Date(c.end_time).getTime());
    let min = Math.min(...starts);
    let max = Math.max(...ends);

    const pad = Math.max(DAY_MS, (max - min) * 0.05);
    min -= pad;
    max += pad;

    const dayCount = Math.max(1, daysBetween(min, max));
    const totalWidth = Math.max(900, dayCount * PX_PER_DAY);
    const pxPerMs = totalWidth / (max - min);
    const toPx = (t) => (t - min) * pxPerMs;

    const sorted = [...clusters].sort(
      (a, b) => new Date(a.start_time) - new Date(b.start_time)
    );

    const rowEnds = [];
    const rows = sorted.map((c) => {
      const startPx = toPx(new Date(c.start_time).getTime());
      const rawEndPx = toPx(new Date(c.end_time).getTime());
      const width = Math.max(rawEndPx - startPx, MIN_BAR_WIDTH);

      let rowIndex = rowEnds.findIndex((end) => end + 16 < startPx);
      if (rowIndex === -1) {
        rowIndex = rowEnds.length;
        rowEnds.push(startPx + width);
      } else {
        rowEnds[rowIndex] = startPx + width;
      }

      return { ...c, left: startPx, width, rowIndex };
    });

    const dayTickEvery = Math.max(1, Math.ceil(dayCount / 14));
    const ticks = [];
    for (let d = 0; d <= dayCount; d += dayTickEvery) {
      const t = min + d * DAY_MS;
      ticks.push({
        left: toPx(t),
        label: new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }

    return { ticks, rows, totalWidth };
  }, [clusters]);

  if (clusters.length === 0) {
    return (
      <div className="border border-rule bg-paper-raised rounded px-6 pt-6 pb-2">
        <div className="py-16 px-5 text-center text-ink-soft">
          <p className="font-serif text-xl text-ink mb-2">No clusters yet</p>
          <p>Hit &ldquo;Refresh data&rdquo; to pull the latest articles and build the timeline.</p>
        </div>
      </div>
    );
  }

  const rowCount = Math.max(1, ...rows.map((r) => r.rowIndex + 1));

  return (
    <div className="border border-rule bg-paper-raised rounded px-6 pt-6 pb-4 overflow-x-auto">
      <div className="relative" style={{ width: totalWidth }}>
        <div className="relative h-[30px] border-b-[1.5px] border-ink mb-4">
          {ticks.map((t, i) => (
            <span
              key={i}
              className="absolute bottom-0 text-[0.72rem] text-ink-soft pb-1 border-l border-rule pl-[6px] h-3"
              style={{ left: t.left }}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div className="relative" style={{ height: rowCount * ROW_HEIGHT }}>
          {rows.map((c) => (
            <button
              key={c.id}
              className={`absolute h-[34px] rounded-full text-white flex items-center px-4 text-[0.8rem] font-medium whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer border-none text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg ${
                c.intensity >= 0.66 ? 'bg-wire-red' : 'bg-wire-teal'
              }`}
              style={{
                left: c.left,
                width: c.width,
                top: c.rowIndex * ROW_HEIGHT + 6,
              }}
              onClick={() => onSelectCluster(c.id)}
              title={`${c.label} — ${c.article_count} articles`}
            >
              {c.label} · {c.article_count}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}