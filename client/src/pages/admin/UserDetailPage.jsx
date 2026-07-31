import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, ListChecks, AlarmClock, Package, Flame, Trophy } from 'lucide-react';
import { userApi } from '../../api/endpoints';
import StatCard from '../../components/StatCard';
import ActivityHeatmap from '../../components/ActivityHeatmap';

export default function UserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => { userApi.detail(id).then(({ data }) => setData(data)); }, [id]);
  if (!data) return null;

  const { user, totalCustomers, totalLeads, pendingFollowUps, dueFollowUps, totalOrders, ordersByStatus, recentPoints } = data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Link to="/users" className="text-sm text-gray-400 hover:text-brand-500 flex items-center gap-1 w-fit"><ArrowLeft size={14} /> Back to Users</Link>

      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: user.avatarColor }}>
          {user.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-extrabold">{user.name}</h1>
          <p className="text-sm text-gray-500">{user.email} · <span className="capitalize">{user.role}</span></p>
        </div>
        <div className="ml-auto flex gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 text-sm font-bold"><Flame size={15} /> {user.currentStreak} day streak</div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 text-sm font-bold"><Trophy size={15} /> {user.totalPoints} pts</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Customers" value={totalCustomers} />
        <StatCard icon={ListChecks} label="Total Leads" value={totalLeads} />
        <StatCard icon={AlarmClock} label="Due Follow-ups" value={dueFollowUps} color="red" />
        <StatCard icon={AlarmClock} label="Pending Follow-ups" value={pendingFollowUps} color="amber" />
        <StatCard icon={Package} label="Total Orders" value={totalOrders} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3">Orders by status</p>
          <div className="space-y-2">
            {ordersByStatus.map((o) => (
              <div key={o._id} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-500">{o._id.replace('_', ' ')}</span>
                <span className="font-bold">{o.count}</span>
              </div>
            ))}
            {ordersByStatus.length === 0 && <p className="text-sm text-gray-400">No orders yet.</p>}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm font-semibold mb-3">Recent points activity</p>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {recentPoints.map((p) => (
              <div key={p._id} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 capitalize">{p.reason.replace('_', ' ')}{p.note ? ` — ${p.note}` : ''}</span>
                <span className="font-bold text-emerald-500">+{p.points}</span>
              </div>
            ))}
            {recentPoints.length === 0 && <p className="text-sm text-gray-400">No points activity yet.</p>}
          </div>
        </div>
      </div>

      <ActivityHeatmap userId={id} />
    </motion.div>
  );
}
