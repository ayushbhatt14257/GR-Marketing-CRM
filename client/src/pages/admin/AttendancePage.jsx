import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Flame, Trophy, CalendarCheck } from 'lucide-react';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/StatCard';

const ROLES = ['all', 'marketing', 'warehouse', 'dispatch', 'admin'];

function formatDayLabel(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

export default function AttendancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('all');

  const load = () => {
    setLoading(true);
    dashboardApi.attendance(role === 'all' ? {} : { role }).then(({ data }) => {
      setData(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [role]);

  const loggedInTodayCount = data?.users.filter((u) => u.loggedInToday).length ?? 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-xl font-extrabold mb-1">Attendance Tracker</h1>
      <p className="text-sm text-gray-500 mb-4">Who's logged in today, their streak, and points — across the whole team.</p>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <StatCard icon={CalendarCheck} label="Logged In Today" value={`${loggedInTodayCount} / ${data.users.length}`} color="accent" />
          <StatCard icon={Flame} label="Longest Active Streak" value={Math.max(0, ...data.users.map((u) => u.currentStreak))} color="amber" />
          <StatCard icon={Trophy} label="Top Points (This Month)" value={Math.max(0, ...data.users.map((u) => u.monthlyPoints))} />
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {ROLES.map((r) => (
          <button key={r} onClick={() => setRole(r)} className={`chip ${role === r ? 'chip-active' : 'chip-inactive'} capitalize`}>{r}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
          <Loader2 size={18} className="animate-spin" /> Loading attendance...
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-ink-800 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Today</th>
                {data?.dayKeys.map((dk) => (
                  <th key={dk} className="px-2 py-3 text-center">
                    <div>{formatDayLabel(dk)}</div>
                    <div className="text-[10px] text-gray-400">{dk.slice(5)}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center">Active (7d)</th>
                <th className="px-4 py-3 text-center">Streak</th>
                <th className="px-4 py-3 text-center">Points (Month)</th>
                <th className="px-4 py-3 text-center">Points (Total)</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u._id} className="border-t border-gray-100 dark:border-ink-800">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{u.role}</p>
                  </td>
                  <td className="px-4 py-3">
                    {u.loggedInToday ? (
                      <span className="flex items-center gap-1 text-emerald-500 text-xs font-semibold"><CheckCircle2 size={14} /> Yes</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-semibold"><XCircle size={14} /> No</span>
                    )}
                  </td>
                  {u.week.map((d) => (
                    <td key={d.dateKey} className="px-2 py-3 text-center">
                      {d.loggedIn ? (
                        <span className="inline-flex w-6 h-6 rounded-full bg-emerald-500 text-white items-center justify-center text-[11px]">✓</span>
                      ) : (
                        <span className="inline-flex w-6 h-6 rounded-full bg-gray-100 dark:bg-ink-800 text-gray-400 items-center justify-center text-[11px]">–</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-semibold">{u.activeDays}/7</td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-orange-500 font-semibold"><Flame size={13} /> {u.currentStreak}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{u.monthlyPoints}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{u.totalPoints}</td>
                </tr>
              ))}
              {data?.users.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
