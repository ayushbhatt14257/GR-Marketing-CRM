import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock3, CheckCircle2, Package, Zap, AlarmClock, CalendarClock } from 'lucide-react';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/StatCard';
import ActivityHeatmap from '../../components/ActivityHeatmap';

export default function MarketingDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { dashboardApi.marketing().then(({ data }) => setData(data)); }, []);
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-xl font-extrabold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Customers" value={data.totalCustomers} />
        <StatCard icon={AlarmClock} label="Due Follow-ups" value={data.dueFollowUpsCount} color="red" />
        <StatCard icon={CheckCircle2} label="Closed Follow-ups" value={data.closedFollowUps} color="accent" />
        <StatCard icon={Package} label="Total Orders" value={data.totalOrders} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-red-500"><AlarmClock size={14} /> Due follow-ups</p>
          <div className="space-y-2">
            {data.dueFollowUps.map((l) => (
              <div key={l._id} className="flex items-center justify-between text-sm">
                <span>{l.customerId?.name}</span>
                <span className="text-red-500 text-xs font-semibold">{new Date(l.nextFollowUpDate).toLocaleDateString()}</span>
              </div>
            ))}
            {data.dueFollowUps.length === 0 && <p className="text-sm text-gray-400">Nothing due right now 🎉</p>}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-amber-500"><CalendarClock size={14} /> Upcoming follow-ups</p>
          <div className="space-y-2">
            {data.upcomingFollowUps.map((l) => (
              <div key={l._id} className="flex items-center justify-between text-sm">
                <span>{l.customerId?.name}</span>
                <span className="text-gray-400 text-xs">{new Date(l.nextFollowUpDate).toLocaleDateString()}</span>
              </div>
            ))}
            {data.upcomingFollowUps.length === 0 && <p className="text-sm text-gray-400">Nothing scheduled.</p>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3">Orders by status</p>
          <div className="space-y-2">
            {Object.entries(data.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-500">{status.replace('_', ' ')}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
            {Object.keys(data.ordersByStatus).length === 0 && <p className="text-sm text-gray-400">No orders yet.</p>}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Zap size={14} className="text-amber-500" /> Upcoming deliveries</p>
          <div className="space-y-2">
            {data.upcomingDeliveries.map((o) => (
              <div key={o._id} className="flex items-center justify-between text-sm">
                <span>{o.customerId?.name}</span>
                <span className="text-gray-400 text-xs">{new Date(o.deliveryDate).toLocaleDateString()}</span>
              </div>
            ))}
            {data.upcomingDeliveries.length === 0 && <p className="text-sm text-gray-400">Nothing upcoming.</p>}
          </div>
        </div>
      </div>

      {data.frequentProductsStock.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3">Stock availability — your frequent products</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {data.frequentProductsStock.map((p) => (
              <div key={p._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-ink-800 text-sm">
                <span>{p.familyName} — {p.modelName}</span>
                <span className={p.stock?.lowStock ? 'text-red-500 font-semibold' : 'text-gray-500'}>{p.stock?.available} avail</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ActivityHeatmap />
    </motion.div>
  );
}
