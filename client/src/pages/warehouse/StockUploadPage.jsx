import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { UploadCloud, Check, Plus, X } from 'lucide-react';
import { stockUploadApi, productFamilyApi } from '../../api/endpoints';

export default function StockUploadPage() {
  const [category, setCategory] = useState('fonfox');
  const [families, setFamilies] = useState([]);
  const [familyId, setFamilyId] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('add'); // 'add' = top up, 'set' = overwrite to exact count
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    productFamilyApi.list({ category }).then(({ data }) => setFamilies(data));
    setFamilyId('');
    setPreview(null);
  }, [category]);

  const doPreview = async () => {
    if (!familyId) return toast.error('Select a product family first');
    if (!file) return toast.error('Choose an Excel file first');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('familyId', familyId);
    setLoading(true);
    try {
      const { data } = await stockUploadApi.preview(formData);
      setPreview(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to parse file'); }
    finally { setLoading(false); }
  };

  const removeUpdateRow = (productId) => {
    setPreview((p) => ({ ...p, toUpdate: p.toUpdate.filter((m) => m.productId !== productId) }));
  };

  const removeCreateRow = (index) => {
    setPreview((p) => ({ ...p, toCreate: p.toCreate.filter((_, i) => i !== index) }));
  };

  const doCommit = async () => {
    try {
      const { data } = await stockUploadApi.commit({
        familyId,
        mode,
        toUpdate: preview.toUpdate.map((m) => ({ productId: m.productId, quantity: m.quantity })),
        toCreate: preview.toCreate.map((m) => ({ modelName: m.modelName, quantity: m.quantity })),
      });
      toast.success(`${data.updated} models updated, ${data.created} new models created`);
      setPreview(null); setFile(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to commit'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold mb-1">Stock Upload</h1>
        <p className="text-sm text-gray-500">
          Select the product family this sheet belongs to, then upload an Excel file with two columns:
          <span className="font-semibold"> Item name</span> and <span className="font-semibold">Quantity</span>.
          Existing models get stock added; new model names are created automatically.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setCategory('fonfox')} className={`chip ${category === 'fonfox' ? 'chip-active' : 'chip-inactive'}`}>FonFox</button>
          <button onClick={() => setCategory('supreme')} className={`chip ${category === 'supreme' ? 'chip-active' : 'chip-inactive'}`}>Supreme</button>
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Product family</label>
          <select value={familyId} onChange={(e) => { setFamilyId(e.target.value); setPreview(null); }} className="input-field">
            <option value="">Select a family...</option>
            {families.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
          {families.length === 0 && <p className="text-xs text-gray-400 mt-1">No families in this category yet — add one on the Products page first.</p>}
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Excel file</label>
          <div className="flex items-center gap-2">
            <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files[0]); setPreview(null); }} className="text-sm flex-1" />
            <button onClick={doPreview} disabled={loading} className="btn-secondary text-sm py-2 px-3 shrink-0"><UploadCloud size={14} /> Preview</button>
          </div>
        </div>
      </div>

      {preview && (
        <div className="card p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">How should existing model stock be updated?</p>
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
              <Check size={13} /> Will {mode === 'set' ? 'set exact stock for' : 'top up'} existing models ({preview.toUpdate.length})
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {preview.toUpdate.map((m) => (
                <div key={m.productId} className="flex justify-between items-center text-xs bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg">
                  <span>{m.modelName}</span>
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
            <p className="text-xs font-semibold text-brand-600 mb-1.5 flex items-center gap-1"><Plus size={13} /> Will create as new models ({preview.toCreate.length})</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {preview.toCreate.map((m, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1.5 rounded-lg">
                  <span>{m.modelName}</span>
                  <span className="flex items-center gap-2">
                    +{m.quantity}
                    <button onClick={() => removeCreateRow(i)} className="text-gray-400 hover:text-red-500"><X size={13} /></button>
                  </span>
                </div>
              ))}
              {preview.toCreate.length === 0 && <p className="text-xs text-gray-400">None.</p>}
            </div>
          </div>

          <button onClick={doCommit} disabled={preview.toUpdate.length === 0 && preview.toCreate.length === 0} className="btn-primary w-full">
            Confirm & Update Stock for {preview.familyName}
          </button>
        </div>
      )}
    </motion.div>
  );
}
