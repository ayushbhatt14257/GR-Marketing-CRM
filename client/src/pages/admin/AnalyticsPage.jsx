import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Percent } from 'lucide-react';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/StatCard';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  useEffect(() => { dashboardApi.analytics().then(({ data }) => setData(data)); }, []);
  if (!data) return null;

  // Merge leads/orders trend by date for the combined chart
  const dateMap = {};
  data.leadsTrend.forEach((d) => { dateMap[d._id] = { date: d._id, leads: d.count, orders: 0 }; });
  data.ordersTrend.forEach((d) => {
    if (!dateMap[d._id]) dateMap[d._id] = { date: d._id, leads: 0, orders: 0 };
    dateMap[d._id].orders = d.count;
  });
  const trendData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  const weekData = [{ name: 'This Week', value: data.thisWeek }, { name: 'Last Week', value: data.lastWeek }];
  const monthData = [{ name: 'This Month', value: data.thisMonth }, { name: 'Last Month', value: data.lastMonth }];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-xl font-extrabold">Advanced Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Total Leads" value={data.totalLeads} />
        <StatCard icon={TrendingUp} label="Total Orders" value={data.totalOrders} color="accent" />
        <StatCard icon={Percent} label="Conversion Rate" value={data.conversionRate} suffix="%" color="amber" />
      </div>

      <div className="card p-4">
        <p className="text-sm font-semibold mb-3">Leads & Orders trend (last 30 days)</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
            <Line type="monotone" dataKey="leads" stroke="#7440ff" strokeWidth={2} dot={false} name="Leads" />
            <Line type="monotone" dataKey="orders" stroke="#20b090" strokeWidth={2} dot={false} name="Orders" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3">This week vs last week (leads)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Bar dataKey="value" fill="#7440ff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <p className="text-sm font-semibold mb-3">This month vs last month (leads)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Bar dataKey="value" fill="#20b090" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
