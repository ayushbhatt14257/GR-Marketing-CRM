import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, AlertTriangle, ChevronDown, ChevronUp, Loader2, Trash2, Check, X,
  UploadCloud, Download, Layers, CheckCircle2,
} from 'lucide-react';
import { productApi, modelStockApi } from '../../api/endpoints';

function UploadPanel({ product, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('set');
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  const doPreview = async () => {
    if (!file) return toast.error('Choose an Excel file first');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', product._id);
    setLoading(true);
    try {
      const { data } = await modelStockApi.previewUpload(formData);
      setPreview(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to parse file'); }
    finally { setLoading(false); }
  };

  const doCommit = async () => {
    setCommitting(true);
    try {
      const { data } = await modelStockApi.commitUpload({
        productId: product._id,
        mode,
        toUpdate: preview.toUpdate.map((m) => ({ modelId: m.modelId, quantity: m.quantity })),
        toCreate: preview.toCreate.map((m) => ({ name: m.name, quantity: m.quantity })),
      });
      toast.success(`${data.updated} updated, ${data.created} created`);
      onDone();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to commit'); }
    finally { setCommitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-1">Upload models — {product.name}</h3>
        <p className="text-xs text-gray-400 mb-3">Excel columns: Product name, Quantity.</p>

        <div className="flex items-center gap-2 mb-4">
          <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files[0]); setPreview(null); }} className="text-sm flex-1" />
          <button onClick={doPreview} disabled={loading} className="btn-secondary text-sm py-2 px-3 shrink-0">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} Preview
          </button>
        </div>

        {preview && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setMode('set')} className={`flex-1 text-left px-3 py-2 rounded-xl border text-xs ${mode === 'set' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-200 dark:border-ink-700'}`}>
                <span className="font-semibold block">Set exact quantity</span>
              </button>
              <button onClick={() => setMode('add')} className={`flex-1 text-left px-3 py-2 rounded-xl border text-xs ${mode === 'add' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-200 dark:border-ink-700'}`}>
                <span className="font-semibold block">Add on top</span>
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-emerald-600 mb-1">Update ({preview.toUpdate.length})</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {preview.toUpdate.map((m) => (
                  <div key={m.modelId} className="flex justify-between text-xs bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <span>{m.name}</span><span>{m.currentQty} → {mode === 'set' ? m.quantity : m.currentQty + m.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-600 mb-1">New ({preview.toCreate.length})</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {preview.toCreate.map((m, i) => (
                  <div key={i} className="flex justify-between text-xs bg-brand-50 dark:bg-brand-500/10 px-2 py-1 rounded-lg">
                    <span>{m.name}</span><span>+{m.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={doCommit} disabled={committing} className="btn-primary w-full">
              {committing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModelRow({ model, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(model.quantity);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await modelStockApi.update(model._id, { quantity: Number(value) });
      toast.success('Updated');
      setEditing(false);
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm(`Delete model "${model.name}"?`)) return;
    try { await modelStockApi.remove(model._id); toast.success('Deleted'); onSaved(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <tr className="border-t border-gray-100 dark:border-ink-800">
      <td className="px-4 py-2.5">{model.name}</td>
      <td className="px-4 py-2.5">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input type="number" min={0} autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} className="input-field w-24 py-1 text-sm" />
            <button onClick={save} disabled={saving} className="text-emerald-500">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
            <button onClick={() => { setEditing(false); setValue(model.quantity); }} className="text-gray-400"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="hover:underline">{model.quantity}</button>
        )}
      </td>
      <td className="px-4 py-2.5"><button onClick={remove} className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button></td>
    </tr>
  );
}

function ProductCard({ product, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await modelStockApi.list(product._id);
    setModels(data);
    setLoading(false);
  };

  useEffect(() => { if (expanded) load(); }, [expanded]);


  const addModel = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error('Model name required');
    try {
      await modelStockApi.create({ productId: product._id, name: newName, quantity: Number(newQty) || 0 });
      toast.success('Model added');
      setNewName(''); setNewQty('');
      load();
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const download = () => modelStockApi.download({ productId: product._id }, `${product.name}-models.xlsx`);

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <Layers size={16} className="text-brand-500 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">{product.name}</p>
            <p className="text-xs text-gray-400 capitalize">
              {product.category} · Parent total: {product.totalStock}
              {product.modelManaged && <span className="text-emerald-500 ml-1 font-semibold">· 🔒 Auto-managed from models</span>}
              {!product.modelManaged && models.length === 0 && expanded && !loading && (
                <span className="text-gray-400 ml-1">· No models yet — parent stock is still manually editable</span>
              )}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100 dark:border-ink-800">
            <div className="flex flex-wrap gap-2 p-3">
              <form onSubmit={addModel} className="flex gap-2 flex-1 min-w-[240px]">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Model name" className="input-field flex-1 text-sm" />
                <input type="number" min={0} value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="Qty" className="input-field w-20 text-sm" />
                <button type="submit" className="btn-secondary text-xs py-2 px-3 shrink-0"><Plus size={14} /></button>
              </form>
              <button onClick={() => setShowUpload(true)} className="btn-secondary text-xs py-2 px-3"><UploadCloud size={13} /> Upload</button>
              <button onClick={download} className="btn-secondary text-xs py-2 px-3"><Download size={13} /> Export</button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-8"><Loader2 size={16} className="animate-spin" /> Loading models...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-ink-800 text-left text-xs text-gray-500">
                  <tr><th className="px-4 py-2">Model</th><th className="px-4 py-2">Quantity</th><th className="px-4 py-2"></th></tr>
                </thead>
                <tbody>
                  {models.map((m) => <ModelRow key={m._id} model={m} onSaved={() => { load(); onRefresh(); }} />)}
                  {models.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No models tracked yet.</td></tr>}
                </tbody>
              </table>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showUpload && <UploadPanel product={product} onClose={() => setShowUpload(false)} onDone={() => { load(); onRefresh(); }} />}
    </div>
  );
}

export default function ModelStockPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  const load = async () => {
    setLoading(true);
    const { data } = await productApi.list(category === 'all' ? {} : { category });
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [category]);

  const managedCount = products.filter((p) => p.modelManaged).length;

  const downloadAll = () => modelStockApi.download(category === 'all' ? {} : { category }, `model-stock-${category}.xlsx`);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h1 className="text-xl font-extrabold">Model Stock</h1>
        <button onClick={downloadAll} className="btn-secondary text-xs py-2 px-3"><Download size={13} /> Export {category === 'all' ? 'all' : category}</button>
      </div>
      <p className="text-sm text-gray-500 mb-1">
        Add models under a product to track its breakdown. Once a product has models, its total stock on the Products page becomes locked and auto-calculated as the sum of those models.
      </p>
      {managedCount > 0 && (
        <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mb-3">
          🔒 {managedCount} product{managedCount === 1 ? '' : 's'} auto-managed from model breakdown
        </p>
      )}

      <div className="flex gap-2 mb-4">
        {['all', 'fonfox', 'supreme'].map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? 'chip-active' : 'chip-inactive'} capitalize`}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16"><Loader2 size={18} className="animate-spin" /> Loading products...</div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => <ProductCard key={p._id} product={p} onRefresh={load} />)}
          {products.length === 0 && <p className="text-center text-gray-400 py-12">No products yet.</p>}
        </div>
      )}
    </motion.div>
  );
}
