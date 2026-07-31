import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { UploadCloud, CheckCircle2, XCircle } from 'lucide-react';
import { bookMatchApi, userApi } from '../../api/endpoints';

export default function BookMatchPage() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { userApi.list({ role: 'marketing' }).then(({ data }) => setUsers(data)); }, []);

  const run = async () => {
    if (!userId) return toast.error('Select whose book this is first');
    if (!file) return toast.error('Choose an Excel file');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    setLoading(true);
    try {
      const { data } = await bookMatchApi.preview(formData);
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process sheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold mb-1">Book Match</h1>
        <p className="text-sm text-gray-500">
          Upload a party ledger sheet and see which customers already have leads in the CRM for the
          selected user, and which don't. Nothing from the sheet is ever saved to the database.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="text-sm font-semibold mb-1.5 block">Whose book is this?</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input-field">
            <option value="">Select a user...</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Customer list (Excel — single column of names)</label>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files[0]); setResult(null); }} className="text-sm" />
        </div>

        <button onClick={run} disabled={loading} className="btn-primary">
          <UploadCloud size={16} /> {loading ? 'Matching...' : 'Run Book Match'}
        </button>
      </div>

      {result && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 size={15} /> Already in CRM ({result.matchedCount})
            </p>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {result.matched.map((m, i) => (
                <div key={i} className="text-sm bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-lg">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-[11px] text-gray-400">Added {new Date(m.addedOn).toLocaleDateString()} via {m.via}</p>
                </div>
              ))}
              {result.matched.length === 0 && <p className="text-sm text-gray-400">None matched.</p>}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-red-500">
              <XCircle size={15} /> Not in CRM yet ({result.unmatchedCount})
            </p>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {result.unmatched.map((u, i) => (
                <div key={i} className="text-sm bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{u.name}</div>
              ))}
              {result.unmatched.length === 0 && <p className="text-sm text-gray-400">Everyone matched!</p>}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
