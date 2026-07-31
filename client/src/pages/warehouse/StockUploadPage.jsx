import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { UploadCloud, Check, X } from 'lucide-react';
import { stockUploadApi } from '../../api/endpoints';

function UploadPanel({ category, label }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const doPreview = async () => {
    if (!file) return toast.error('Choose an Excel file first');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    setLoading(true);
    try {
      const { data } = await stockUploadApi.preview(formData);
      setPreview(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to parse file'); }
    finally { setLoading(false); }
  };

  const doCommit = async () => {
    try {
      const rows = preview.matched.map((m) => ({ productId: m.productId, quantity: m.quantity }));
      const { data } = await stockUploadApi.commit({ category, rows });
      toast.success(`Stock updated for ${data.updated} products`);
      setPreview(null); setFile(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to commit'); }
  };

  return (
    <div className="card p-5">
      <h3 className="font-bold mb-1">{label} Stock Upload</h3>
      <p className="text-xs text-gray-500 mb-3">Excel columns: Product Name, Quantity. Always adds to existing stock.</p>

      <div className="flex items-center gap-2 mb-3">
        <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files[0]); setPreview(null); }} className="text-sm flex-1" />
        <button onClick={doPreview} disabled={loading} className="btn-secondary text-sm py-2 px-3"><UploadCloud size={14} /> Preview</button>
      </div>

      {preview && (
        <div className="space-y-3 mt-4">
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-1.5 flex items-center gap-1"><Check size={13} /> Matched ({preview.matched.length})</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {preview.matched.map((m) => (
                <div key={m.productId} className="flex justify-between text-xs bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg">
                  <span>{m.name}</span>
                  <span>{m.currentStock} → {m.currentStock + m.quantity}</span>
                </div>
              ))}
            </div>
          </div>
          {preview.unmatched.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 mb-1.5 flex items-center gap-1"><X size={13} /> Unmatched ({preview.unmatched.length}) — add these products first</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {preview.unmatched.map((u, i) => (
                  <div key={i} className="text-xs bg-red-50 dark:bg-red-500/10 px-2.5 py-1.5 rounded-lg">{u.name} — qty {u.quantity}</div>
                ))}
              </div>
            </div>
          )}
          <button onClick={doCommit} disabled={!preview.matched.length} className="btn-primary w-full">Confirm & Update Stock</button>
        </div>
      )}
    </div>
  );
}

export default function StockUploadPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-4">
      <h1 className="text-xl font-extrabold md:col-span-2 mb-1">Stock Upload</h1>
      <UploadPanel category="fonfox" label="FonFox" />
      <UploadPanel category="supreme" label="Supreme" />
    </motion.div>
  );
}
