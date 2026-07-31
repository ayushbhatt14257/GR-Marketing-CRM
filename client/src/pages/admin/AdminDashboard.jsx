import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, UserSquare2, ListChecks, Package, Trophy, AlarmClock, CalendarClock, BarChart3, FileSpreadsheet } from 'lucide-react';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/StatCard';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { dashboardApi.admin().then(({ data }) => setData(data)); }, []);
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-extrabold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/analytics" className="btn-secondary text-xs py-2 px-3"><BarChart3 size={14} /> Advanced Analytics</Link>
          <Link to="/book-match" className="btn-secondary text-xs py-2 px-3"><FileSpreadsheet size={14} /> Book Match</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Users" value={data.totalUsers} />
        <StatCard icon={UserSquare2} label="Total Customers" value={data.totalCustomers} />
        <StatCard icon={ListChecks} label="Total Leads" value={data.totalLeads} />
        <StatCard icon={Package} label="Total Orders" value={data.totalOrders} />
        <StatCard icon={AlarmClock} label="Due Follow-ups" value={data.dueFollowUpsCount} color="red" />
        <StatCard icon={CalendarClock} label="Upcoming Follow-ups" value={data.upcomingFollowUpsCount} color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3">Orders by status</p>
          <div className="space-y-2">
            {data.ordersByStatus.map((o) => (
              <div key={o._id} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-500">{o._id.replace('_', ' ')}</span>
                <span className="font-bold">{o.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm font-semibold mb-3">Lead funnel (talk regarding)</p>
          <div className="space-y-2">
            {data.funnel.map((f) => (
              <div key={f._id} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-500">{f._id.replace('_', ' ')}</span>
                <span className="font-bold">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Trophy size={14} className="text-amber-500" /> Leaderboard (this month)</p>
        <div className="space-y-2">
          {data.leaderboard.map((u, i) => (
            <Link to={`/users/${u._id}`} key={u._id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-ink-800 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 flex items-center justify-center text-[11px] font-bold">{i + 1}</span>
                {u.name}
              </span>
              <span className="font-bold">{u.monthlyPoints} pts · 🔥{u.currentStreak}</span>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
