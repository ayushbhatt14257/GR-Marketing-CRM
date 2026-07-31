import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { customerApi } from '../../api/endpoints';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    customerApi.list({ q, page, limit: 25 }).then(({ data }) => { setCustomers(data.items); setPages(data.pages); });
  }, [q, page]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-xl font-extrabold mb-4">All Customers</h1>
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search customers..." className="input-field mb-4 max-w-sm" />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-ink-800 text-left text-xs text-gray-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Created via</th><th className="px-4 py-3">Added on</th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c._id} className="border-t border-gray-100 dark:border-ink-800">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.ownerId?.name}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{c.createdVia}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
