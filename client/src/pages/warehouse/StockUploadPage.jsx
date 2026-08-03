import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { UploadCloud, Check, Plus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { stockUploadApi } from '../../api/endpoints';

export default function StockUploadPage() {
  const [category, setCategory] = useState('fonfox');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('add'); // 'add' = top up, 'set' = overwrite to exact count
  const [previewLoading, setPreviewLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const doPreview = async () => {
    if (!file) return toast.error('Choose an Excel file first');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    setPreviewLoading(true);
    setLastResult(null);
    try {
      const { data } = await stockUploadApi.preview(formData);
      setPreview(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to parse file'); }
    finally { setPreviewLoading(false); }
  };

  const removeUpdateRow = (productId) => {
    setPreview((p) => ({ ...p, toUpdate: p.toUpdate.filter((m) => m.productId !== productId) }));
  };

  const removeCreateRow = (index) => {
    setPreview((p) => ({ ...p, toCreate: p.toCreate.filter((_, i) => i !== index) }));
  };

  const doCommit = async () => {
    setCommitting(true);
    try {
      const { data } = await stockUploadApi.commit({
        category,
        mode,
        toUpdate: preview.toUpdate.map((m) => ({ productId: m.productId, quantity: m.quantity })),
        toCreate: preview.toCreate.map((m) => ({ name: m.name, quantity: m.quantity })),
      });
      toast.success(`${data.updated} products updated, ${data.created} new products created`);
      setLastResult(data);
      setPreview(null); setFile(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to commit'); }
    finally { setCommitting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold mb-1">Stock Upload</h1>
        <p className="text-sm text-gray-500">
          Upload an Excel file with two columns: <span className="font-semibold">Product name</span> and{' '}
          <span className="font-semibold">Quantity</span>. Existing products get stock updated; new names are created automatically.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => { setCategory('fonfox'); setPreview(null); }} className={`chip ${category === 'fonfox' ? 'chip-active' : 'chip-inactive'}`}>FonFox</button>
          <button onClick={() => { setCategory('supreme'); setPreview(null); }} className={`chip ${category === 'supreme' ? 'chip-active' : 'chip-inactive'}`}>Supreme</button>
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Excel file</label>
          <div className="flex items-center gap-2">
            <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files[0]); setPreview(null); }} className="text-sm flex-1" />
            <button onClick={doPreview} disabled={previewLoading} className="btn-secondary text-sm py-2 px-3 shrink-0">
              {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              {previewLoading ? 'Parsing...' : 'Preview'}
            </button>
          </div>
        </div>
      </div>

      {lastResult && (
        <div className="card p-4 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30">
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            <span className="font-semibold">Success!</span> {lastResult.updated} product{lastResult.updated === 1 ? '' : 's'} updated, {lastResult.created} new product{lastResult.created === 1 ? '' : 's'} created.
          </p>
        </div>
      )}

      {preview && (
        <div className="card p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">How should existing product stock be updated?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('add')}
                className={`flex-1 text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  mode === 'add' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'border-gray-200 dark:border-ink-700 text-gray-500'
                }`}
              >
                <span className="font-semibold block">Add to existing stock</span>
                <span className="text-xs opacity-75">Sheet quantities are added on top (replenishment)</span>
              </button>
              <button
                onClick={() => setMode('set')}
                className={`flex-1 text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  mode === 'set' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'border-gray-200 dark:border-ink-700 text-gray-500'
                }`}
              >
                <span className="font-semibold block">Set as exact stock</span>
                <span className="text-xs opacity-75">Sheet quantity replaces current total (physical count)</span>
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-1.5 flex items-center gap-1">
              <Check size={13} /> Will {mode === 'set' ? 'set exact stock for' : 'top up'} existing products ({preview.toUpdate.length})
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {preview.toUpdate.map((m) => (
                <div key={m.productId} className="flex justify-between items-center text-xs bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg">
                  <span>{m.name}</span>
                  <span className="flex items-center gap-2">
                    {mode === 'set' ? `${m.currentStock} → ${m.quantity}` : `${m.currentStock} → ${m.currentStock + m.quantity}`}
                    <button onClick={() => removeUpdateRow(m.productId)} className="text-gray-400 hover:text-red-500"><X size={13} /></button>
                  </span>
                </div>
              ))}
              {preview.toUpdate.length === 0 && <p className="text-xs text-gray-400">None.</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-brand-600 mb-1.5 flex items-center gap-1"><Plus size={13} /> Will create as new products ({preview.toCreate.length})</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {preview.toCreate.map((m, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1.5 rounded-lg">
                  <span>{m.name}</span>
                  <span className="flex items-center gap-2">
                    +{m.quantity}
                    <button onClick={() => removeCreateRow(i)} className="text-gray-400 hover:text-red-500"><X size={13} /></button>
                  </span>
                </div>
              ))}
              {preview.toCreate.length === 0 && <p className="text-xs text-gray-400">None.</p>}
            </div>
          </div>

          <button
            onClick={doCommit}
            disabled={committing || (preview.toUpdate.length === 0 && preview.toCreate.length === 0)}
            className="btn-primary w-full"
          >
            {committing ? <Loader2 size={16} className="animate-spin" /> : null}
            {committing ? 'Updating stock...' : 'Confirm & Update Stock'}
          </button>
        </div>
      )}
    </motion.div>
  );
}
