import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, Zap } from 'lucide-react';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/StatCard';

export default function DispatchDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { dashboardApi.dispatch().then(({ data }) => setData(data)); }, []);
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-xl font-extrabold">Dispatch Dashboard</h1>

      <StatCard icon={Truck} label="Orders in queue" value={data.queue.length} />

      <div className="card p-4">
        <p className="text-sm font-semibold mb-3">Dispatch queue (priority + FIFO order)</p>
        <div className="space-y-2">
          {data.queue.slice(0, 15).map((o) => (
            <div key={o._id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-ink-800">
              <span className="flex items-center gap-2">
                {o.priority === 'urgent' && <Zap size={13} className="text-red-500" />}
                {o.customerId?.name} <span className="text-xs text-gray-400">({o.ownerId?.name})</span>
              </span>
              <span className="text-xs text-gray-400">{new Date(o.deliveryDate).toLocaleDateString()}</span>
            </div>
          ))}
          {data.queue.length === 0 && <p className="text-sm text-gray-400">Queue is empty.</p>}
        </div>
      </div>
    </motion.div>
  );
}
