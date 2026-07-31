import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock3, UserCog } from 'lucide-react';
import { leadApi, userApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

const TALK_LABELS = { payment: 'Payment', order_talk: 'Order Talks', follow_up: 'Follow-up', call_later: 'Call Later' };
const TALK_COLORS = {
  payment: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
  order_talk: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10',
  follow_up: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
  call_later: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10',
};

export default function MyLeadsPage() {
  const user = useAuthStore((s) => s.user);
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [marketingUsers, setMarketingUsers] = useState([]);

  const load = async () => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (filter !== 'all') params.status = filter;
    const { data } = await leadApi.list(params);
    setLeads(data.items);
    setPages(data.pages);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, page]);
  useEffect(() => {
    if (user?.role === 'admin') userApi.list({ role: 'marketing' }).then(({ data }) => setMarketingUsers(data));
  }, [user?.role]);

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
      <h1 className="text-xl font-extrabold mb-4">My Leads</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'pending', 'closed'].map((f) => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`chip ${filter === f ? 'chip-active' : 'chip-inactive'} capitalize`}>{f}</button>
        ))}
      </div>

      <div className="space-y-2">
        {leads.map((lead) => (
          <div key={lead._id} className="card p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold truncate">{lead.customerId?.name}</p>
                <span className={`badge ${TALK_COLORS[lead.talkRegarding]}`}>{TALK_LABELS[lead.talkRegarding]}</span>
                <span className="text-[10px] uppercase text-gray-400">{lead.category}</span>
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
              {user?.role === 'admin' && marketingUsers.length > 0 && (
                <select onChange={(e) => reassign(lead._id, e)} defaultValue="" className="input-field w-auto text-xs py-1.5">
                  <option value="" disabled>Reassign...</option>
                  {marketingUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              )}
            </div>
          </div>
        ))}
        {!loading && leads.length === 0 && <p className="text-center text-gray-400 py-12">No leads found.</p>}
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
