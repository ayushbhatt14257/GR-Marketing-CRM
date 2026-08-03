import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock3, ListChecks, AlarmClock, TrendingUp } from 'lucide-react';
import { leadApi, userApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import StatCard from '../../components/StatCard';

const TALK_LABELS = { payment: 'Payment', order_talk: 'Order Talks', follow_up: 'Follow-up', call_later: 'Call Later' };
const TALK_COLORS = {
  payment: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
  order_talk: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10',
  follow_up: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
  call_later: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10',
};

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MyLeadsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('all');
  const [month, setMonth] = useState(currentMonthValue());
  const [ownerFilter, setOwnerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [marketingUsers, setMarketingUsers] = useState([]);

  const buildParams = (extra = {}) => {
    const params = { month, ...extra };
    if (filter !== 'all') params.status = filter;
    if (isAdmin && ownerFilter) params.ownerId = ownerFilter;
    return params;
  };

  const load = async () => {
    setLoading(true);
    const [{ data }, summaryRes] = await Promise.all([
      leadApi.list(buildParams({ page, limit: 20 })),
      leadApi.summary(buildParams()),
    ]);
    setLeads(data.items);
    setPages(data.pages);
    setSummary(summaryRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, page, month, ownerFilter]);
  useEffect(() => {
    if (isAdmin) userApi.list({ role: 'marketing' }).then(({ data }) => setMarketingUsers(data));
  }, [isAdmin]);

  const close = async (id) => {
    try {
      await leadApi.close(id);
      toast.success('Follow-up closed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close');
    }
  };

  const reassign = async (id, e) => {
    const ownerId = e.target.value;
    if (!ownerId) return;
    try {
      await leadApi.reassign(id, ownerId);
      toast.success('Lead reassigned');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-xl font-extrabold mb-4">{isAdmin ? 'All Leads' : 'My Leads'}</h1>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <StatCard icon={ListChecks} label="Total Leads" value={summary.total} />
          <StatCard icon={Clock3} label="Pending Follow-up" value={summary.pending} color="amber" />
          <StatCard icon={CheckCircle2} label="Completed Follow-up" value={summary.closed} color="accent" />
          <StatCard icon={AlarmClock} label="Due Now" value={summary.due} color="red" />
          <StatCard icon={TrendingUp} label="Upcoming" value={summary.upcoming} />
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {['all', 'pending', 'closed'].map((f) => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`chip ${filter === f ? 'chip-active' : 'chip-inactive'} capitalize`}>{f}</button>
        ))}
        <input
          type="month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          className="input-field w-auto py-1.5 text-sm ml-auto"
        />
        {isAdmin && (
          <select value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setPage(1); }} className="input-field w-auto py-1.5 text-sm">
            <option value="">All users</option>
            {marketingUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        )}
      </div>

      <div className="space-y-2">
        {leads.map((lead) => (
          <div key={lead._id} className="card p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-semibold truncate">{lead.customerId?.name}</p>
                <span className={`badge ${TALK_COLORS[lead.talkRegarding]}`}>{TALK_LABELS[lead.talkRegarding]}</span>
                <span className="text-[10px] uppercase text-gray-400">{lead.category}</span>
                {isAdmin && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 font-medium">
                    {lead.ownerId?.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 truncate">{lead.remark}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {new Date(lead.createdAt).toLocaleString()}
                {lead.nextFollowUpDate && !lead.isFollowUpClosed && (
                  <span className={`ml-2 font-semibold ${new Date(lead.nextFollowUpDate) <= new Date() ? 'text-red-500' : 'text-amber-500'}`}>
                    · Next follow-up: {new Date(lead.nextFollowUpDate).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {lead.isFollowUpClosed ? (
                <span className="flex items-center gap-1 text-emerald-500 text-xs font-semibold"><CheckCircle2 size={14} /> Closed</span>
              ) : (
                <button onClick={() => close(lead._id)} className="btn-secondary text-xs py-1.5 px-3">
                  <Clock3 size={13} /> Close
                </button>
              )}
              {isAdmin && marketingUsers.length > 0 && (
                <select onChange={(e) => reassign(lead._id, e)} defaultValue="" className="input-field w-auto text-xs py-1.5">
                  <option value="" disabled>Reassign...</option>
                  {marketingUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              )}
            </div>
          </div>
        ))}
        {!loading && leads.length === 0 && <p className="text-center text-gray-400 py-12">No leads found for this filter.</p>}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-ink-800'}`}>{p}</button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
