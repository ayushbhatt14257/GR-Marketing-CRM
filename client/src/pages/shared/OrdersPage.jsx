import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Zap, Truck, CheckCircle2, XCircle, ChevronDown, ChevronUp, UserCog, List, Users } from 'lucide-react';
import { orderApi, userApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-ink-800',
  reserved: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10',
  partially_dispatched: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
  dispatched: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10',
  delivered: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
  cancelled: 'bg-red-50 text-red-600 dark:bg-red-500/10',
};

function OrderRow({ order, onRefresh, canManage, marketingUsers }) {
  const [expanded, setExpanded] = useState(false);
  const [dispatchQty, setDispatchQty] = useState({});
  const user = useAuthStore((s) => s.user);
  const isOwner = order.ownerId?._id === user?.id || order.ownerId?._id === user?._id;
  const canAct = isOwner || canManage;
  const isAdmin = user?.role === 'admin';

  const reassign = async (e) => {
    const newOwnerId = e.target.value;
    if (!newOwnerId) return;
    try {
      await orderApi.reassign(order._id, newOwnerId);
      toast.success('Order reassigned');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const togglePriority = async () => {
    try {
      await orderApi.setPriority(order._id, order.priority === 'urgent' ? 'normal' : 'urgent');
      toast.success('Priority updated');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const doDispatch = async () => {
    const items = Object.entries(dispatchQty).filter(([, qty]) => qty > 0).map(([productId, qty]) => ({ productId, qty: Number(qty) }));
    if (!items.length) return toast.error('Enter quantity to dispatch');
    try {
      await orderApi.dispatch(order._id, items);
      toast.success('Dispatched!');
      setDispatchQty({});
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to dispatch'); }
  };

  const deliver = async () => {
    try { await orderApi.deliver(order._id); toast.success('Marked delivered'); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const cancel = async () => {
    if (!confirm('Cancel this order? Reserved stock will be released.')) return;
    try { await orderApi.cancel(order._id, 'Cancelled by user'); toast.success('Order cancelled'); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between gap-4 p-4 text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold">{order.customerId?.name}</p>
            <span className={`badge ${STATUS_STYLES[order.status]} capitalize`}>{order.status.replace('_', ' ')}</span>
            {order.priority === 'urgent' && <span className="badge bg-red-50 text-red-600 dark:bg-red-500/10 flex items-center gap-1"><Zap size={11} /> Urgent</span>}
            <span className="text-[10px] uppercase text-gray-400">{order.category}</span>
          </div>
          <p className="text-xs text-gray-500">
            Owner: {order.ownerId?.name} · Entered: {new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {order.items.length} item(s)
          </p>
          {order.remark && <p className="text-xs text-gray-400 mt-0.5 truncate">"{order.remark}"</p>}
        </div>
        {expanded ? <ChevronUp size={18} className="shrink-0 text-gray-400" /> : <ChevronDown size={18} className="shrink-0 text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100 dark:border-ink-800 px-4 pb-4">
            <div className="pt-3 space-y-2">
              {order.items.map((item) => {
                const remaining = item.requestedQty - item.dispatchedQty - item.cancelledQty;
                return (
                  <div key={item.productId?._id || item.productId} className="flex items-center justify-between text-sm">
                    <span>{item.productId?.name || 'Product'} — requested {item.requestedQty}, dispatched {item.dispatchedQty}, remaining {remaining}</span>
                    {canAct && !['cancelled', 'delivered'].includes(order.status) && remaining > 0 && (
                      <input
                        type="number" min={0} max={remaining} placeholder="Qty"
                        value={dispatchQty[item.productId?._id || item.productId] || ''}
                        onChange={(e) => setDispatchQty((prev) => ({ ...prev, [item.productId?._id || item.productId]: e.target.value }))}
                        className="input-field w-20 py-1 text-center text-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {order.dispatchLog?.length > 0 && (
              <div className="mt-3 text-xs text-gray-400 space-y-0.5">
                {order.dispatchLog.map((d, i) => (
                  <p key={i}>Dispatched by <span className="font-medium">{d.dispatchedByName}</span> on {new Date(d.dispatchedAt).toLocaleString()}</p>
                ))}
              </div>
            )}

            {canAct && !['cancelled', 'delivered'].includes(order.status) && (
              <div className="flex flex-wrap gap-2 mt-4 items-center">
                <button onClick={doDispatch} className="btn-primary text-xs py-2 px-3"><Truck size={13} /> Dispatch</button>
                {canManage && (
                  <button onClick={togglePriority} className="btn-secondary text-xs py-2 px-3">
                    <Zap size={13} /> {order.priority === 'urgent' ? 'Remove Priority' : 'Mark Urgent'}
                  </button>
                )}
                <button onClick={deliver} className="btn-secondary text-xs py-2 px-3"><CheckCircle2 size={13} /> Mark Delivered</button>
                <button onClick={cancel} className="btn-secondary text-xs py-2 px-3 text-red-500"><XCircle size={13} /> Cancel</button>
                {isAdmin && marketingUsers?.length > 0 && (
                  <select onChange={reassign} defaultValue="" className="input-field w-auto text-xs py-2">
                    <option value="" disabled><UserCog size={12} /> Reassign to...</option>
                    {marketingUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomerGroupCard({ customerName, orders, onRefresh, canManage, marketingUsers }) {
  const [expanded, setExpanded] = useState(false);
  const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between gap-4 p-4 text-left">
        <div className="min-w-0">
          <p className="font-semibold">{customerName}</p>
          <p className="text-xs text-gray-500 flex flex-wrap gap-x-2">
            {orders.length} order{orders.length === 1 ? '' : 's'}
            {Object.entries(statusCounts).map(([s, c]) => (
              <span key={s} className={`badge ${STATUS_STYLES[s]} capitalize`}>{s.replace('_', ' ')} · {c}</span>
            ))}
          </p>
        </div>
        {expanded ? <ChevronUp size={18} className="shrink-0 text-gray-400" /> : <ChevronDown size={18} className="shrink-0 text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100 dark:border-ink-800 p-3 space-y-2">
            {orders.map((o) => <OrderRow key={o._id} order={o} onRefresh={onRefresh} canManage={canManage} marketingUsers={marketingUsers} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'customer'
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [marketingUsers, setMarketingUsers] = useState([]);
  const canManage = ['admin', 'dispatch'].includes(user?.role);

  // Restricted dispatch users never see the category toggle — their access
  // is already enforced server-side regardless of what's shown here.
  const showCategoryToggle = !(user?.role === 'dispatch' && user?.productAccess !== 'both');

  const load = async () => {
    const params = viewMode === 'customer' ? { limit: 500 } : { page, limit: 20 };
    if (status) params.status = status;
    if (category) params.category = category;
    const { data } = await orderApi.list(params);
    setOrders(data.items);
    setPages(data.pages);
  };

  useEffect(() => { load(); }, [status, category, page, viewMode]);
  useEffect(() => {
    if (user?.role === 'admin') userApi.list({ role: 'marketing' }).then(({ data }) => setMarketingUsers(data));
  }, [user?.role]);

  const groupedByCustomer = useMemo(() => {
    if (viewMode !== 'customer') return [];
    const groups = new Map();
    orders.forEach((o) => {
      const key = o.customerId?._id || 'unknown';
      const name = o.customerId?.name || 'Unknown customer';
      if (!groups.has(key)) groups.set(key, { name, orders: [] });
      groups.get(key).orders.push(o);
    });
    return Array.from(groups.values()).sort((a, b) => b.orders.length - a.orders.length);
  }, [orders, viewMode]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h1 className="text-xl font-extrabold">{user?.role === 'marketing' ? 'My Orders' : 'Orders'}</h1>
        <div className="flex gap-1 bg-gray-100 dark:bg-ink-800 rounded-xl p-1">
          <button
            onClick={() => { setViewMode('list'); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-ink-700 shadow-sm' : 'text-gray-500'}`}
          >
            <List size={13} /> List
          </button>
          <button
            onClick={() => setViewMode('customer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'customer' ? 'bg-white dark:bg-ink-700 shadow-sm' : 'text-gray-500'}`}
          >
            <Users size={13} /> By Customer
          </button>
        </div>
      </div>
      {user?.role === 'dispatch' && user?.productAccess !== 'both' && (
        <p className="text-xs text-gray-400 mb-3 capitalize">Showing {user.productAccess} orders only, based on your assigned access.</p>
      )}

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {['', 'reserved', 'partially_dispatched', 'dispatched', 'delivered', 'cancelled'].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`chip ${status === s ? 'chip-active' : 'chip-inactive'} capitalize`}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {showCategoryToggle && (
        <div className="flex gap-2 mb-4">
          {['', 'fonfox', 'supreme'].map((c) => (
            <button key={c} onClick={() => { setCategory(c); setPage(1); }} className={`chip ${category === c ? 'chip-active' : 'chip-inactive'} capitalize`}>
              {c === '' ? 'All categories' : c}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'list' ? (
        <>
          <div className="space-y-3">
            {orders.map((o) => <OrderRow key={o._id} order={o} onRefresh={load} canManage={canManage} marketingUsers={marketingUsers} />)}
            {orders.length === 0 && <p className="text-center text-gray-400 py-12">No orders found.</p>}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-ink-800'}`}>{p}</button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {groupedByCustomer.map((g) => (
            <CustomerGroupCard key={g.name} customerName={g.name} orders={g.orders} onRefresh={load} canManage={canManage} marketingUsers={marketingUsers} />
          ))}
          {groupedByCustomer.length === 0 && <p className="text-center text-gray-400 py-12">No orders found.</p>}
        </div>
      )}
    </motion.div>
  );
}
