import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/endpoints';

function colorForScore(score) {
  if (!score) return 'bg-gray-100 dark:bg-ink-800';
  if (score <= 2) return 'bg-brand-200 dark:bg-brand-900';
  if (score <= 5) return 'bg-brand-400 dark:bg-brand-700';
  if (score <= 9) return 'bg-brand-500 dark:bg-brand-500';
  return 'bg-brand-700 dark:bg-brand-400';
}

export default function ActivityHeatmap({ userId }) {
  const [logs, setLogs] = useState({});

  useEffect(() => {
    dashboardApi.heatmap(userId).then(({ data }) => {
      const map = {};
      data.forEach((l) => { map[l.dateKey] = l; });
      setLogs(map);
    });
  }, [userId]);

  const days = [];
  const today = new Date();
  for (let i = 119; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(key);
  }

  return (
    <div className="card p-4">
      <p className="text-sm font-semibold mb-3">Activity — last 120 days</p>
      <div className="grid grid-cols-[repeat(20,1fr)] gap-1">
        {days.map((key) => {
          const log = logs[key];
          return (
            <div
              key={key}
              title={`${key}: ${log?.score || 0} activity points${log?.loggedIn ? ' · logged in' : ''}`}
              className={`w-3.5 h-3.5 rounded-sm ${colorForScore(log?.score)}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-400">
        Less
        {[0, 2, 5, 9, 12].map((s) => <div key={s} className={`w-3 h-3 rounded-sm ${colorForScore(s)}`} />)}
        More
      </div>
    </div>
  );
}
