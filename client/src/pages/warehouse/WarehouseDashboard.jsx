import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, TriangleAlert } from 'lucide-react';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/StatCard';

export default function WarehouseDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { dashboardApi.warehouse().then(({ data }) => setData(data)); }, []);
  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-xl font-extrabold">Warehouse Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Package} label="Total Products" value={data.totalProducts} />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={data.lowStock.length} color="amber" />
        <StatCard icon={TriangleAlert} label="Stock Mismatches" value={data.mismatch.length} color="red" />
      </div>

      <div className="card p-4">
        <p className="text-sm font-semibold mb-3">Low stock alerts</p>
        <div className="space-y-2">
          {data.lowStock.map((p) => (
            <div key={p._id} className="flex items-center justify-between text-sm bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-lg">
              <span>{p.name} <span className="text-xs text-gray-400 capitalize">({p.category})</span></span>
              <span className="text-amber-600 font-semibold">{p.stock.available} left</span>
            </div>
          ))}
          {data.lowStock.length === 0 && <p className="text-sm text-gray-400">All products well stocked.</p>}
        </div>
      </div>

      {data.mismatch.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3 text-red-500">Stock vs order mismatches (oversold)</p>
          <div className="space-y-2">
            {data.mismatch.map((p) => (
              <div key={p._id} className="flex items-center justify-between text-sm bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                <span>{p.name}</span>
                <span className="text-red-600 font-semibold">{p.stock.available} (short by {Math.abs(p.stock.available)})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
