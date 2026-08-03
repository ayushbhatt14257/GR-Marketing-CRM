import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, PackagePlus, AlertTriangle, ChevronDown, ChevronUp, Layers, Loader2, Trash2 } from 'lucide-react';
import { productFamilyApi, productApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

function FamilyCard({ family, onRefresh, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelName, setModelName] = useState('');
  const [stockModal, setStockModal] = useState(null);
  const [stockQty, setStockQty] = useState('');

  const loadModels = async () => {
    setModelsLoading(true);
    const { data } = await productApi.list({ familyId: family._id });
    setModels(data);
    setModelsLoading(false);
  };

  useEffect(() => { if (expanded) loadModels(); }, [expanded]);

  const addModel = async (e) => {
    e.preventDefault();
    if (!modelName.trim()) return toast.error('Model name required');
    try {
      await productApi.create({ familyId: family._id, modelName });
      toast.success('Model added');
      setModelName('');
      loadModels();
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggleActive = async (m) => {
    await productApi.update(m._id, { isActive: !m.isActive });
    loadModels();
  };

  const deleteModel = async (m) => {
    if (!confirm(`Delete model "${m.modelName}"? Its order history stays intact, but it won't be selectable for new orders.`)) return;
    try {
      await productApi.remove(m._id);
      toast.success('Model deleted');
      loadModels();
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteFamily = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete family "${family.name}" and all ${family.variantCount} of its models? This cannot be undone from the UI.`)) return;
    try {
      await productFamilyApi.remove(family._id);
      toast.success('Product family deleted');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const submitStockIn = async () => {
    if (!stockQty || stockQty <= 0) return toast.error('Enter valid quantity');
    try {
      await productApi.stockIn(stockModal._id, { quantity: Number(stockQty), note: 'Manual stock-in' });
      toast.success('Stock updated');
      setStockModal(null); setStockQty('');
      loadModels();
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="card overflow-hidden">
      <div className="w-full flex items-center justify-between p-4">
        <button onClick={() => setExpanded((e) => !e)} className="flex items-center gap-2 flex-1 text-left min-w-0">
          <Layers size={16} className="text-brand-500 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">{family.name}</p>
            <p className="text-xs text-gray-400 capitalize">{family.category} · {family.variantCount} model{family.variantCount === 1 ? '' : 's'} · {family.totalAvailable} total available</p>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button onClick={deleteFamily} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>
          )}
          <button onClick={() => setExpanded((e) => !e)}>
            {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100 dark:border-ink-800">
            <form onSubmit={addModel} className="flex gap-2 p-3">
              <input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="New model name (e.g. 1+Nord 4 (5G))" className="input-field flex-1 text-sm" />
              <button type="submit" className="btn-secondary text-xs py-2 px-3"><Plus size={14} /> Add</button>
            </form>

            {modelsLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-8">
                <Loader2 size={16} className="animate-spin" /> Loading models...
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-ink-800 text-left text-xs text-gray-500">
                  <tr><th className="px-4 py-2">Model</th><th className="px-4 py-2">Stock</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th></tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m._id} className="border-t border-gray-100 dark:border-ink-800">
                      <td className="px-4 py-2.5 font-medium">{m.modelName}</td>
                      <td className="px-4 py-2.5">
                        <span className={m.stock?.lowStock ? 'text-red-500 font-semibold flex items-center gap-1' : ''}>
                          {m.stock?.lowStock && <AlertTriangle size={11} />} {m.stock?.available ?? m.totalStock} avail / {m.totalStock} total
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => toggleActive(m)} className={`badge ${m.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-gray-100 text-gray-500 dark:bg-ink-800'}`}>
                          {m.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setStockModal(m)} className="btn-secondary text-xs py-1 px-2"><PackagePlus size={12} /> Stock in</button>
                          {isAdmin && (
                            <button onClick={() => deleteModel(m)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {models.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No models yet — add one above.</td></tr>}
                </tbody>
              </table>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {stockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setStockModal(null)}>
          <div className="card p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">Add stock — {stockModal.modelName}</h3>
            <input type="number" min={1} value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="input-field mb-3" placeholder="Quantity to add" />
            <div className="flex gap-2">
              <button onClick={submitStockIn} className="btn-primary flex-1">Confirm</button>
              <button onClick={() => setStockModal(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [name, setName] = useState('');
  const [newCategory, setNewCategory] = useState('fonfox');

  const load = async () => {
    setLoading(true);
    const { data } = await productFamilyApi.list(category === 'all' ? {} : { category });
    setFamilies(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [category]);

  const addFamily = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Family name required');
    try {
      await productFamilyApi.create({ name, category: newCategory });
      toast.success('Product family added');
      setName('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-xl font-extrabold mb-1">Products</h1>
      <p className="text-sm text-gray-500 mb-4">Manage product families (e.g. "B90 Magsafe Silicon") and their models (e.g. "1+Nord 4 (5G)").</p>

      <form onSubmit={addFamily} className="card p-4 flex flex-wrap gap-2 items-end mb-6">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500 mb-1 block">New product family name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. B90 Magsafe Silicon" />
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setNewCategory('fonfox')} className={`chip ${newCategory === 'fonfox' ? 'chip-active' : 'chip-inactive'}`}>FonFox</button>
          <button type="button" onClick={() => setNewCategory('supreme')} className={`chip ${newCategory === 'supreme' ? 'chip-active' : 'chip-inactive'}`}>Supreme</button>
        </div>
        <button type="submit" className="btn-primary py-2.5"><Plus size={16} /> Add Family</button>
      </form>

      <div className="flex gap-2 mb-4">
        {['all', 'fonfox', 'supreme'].map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? 'chip-active' : 'chip-inactive'} capitalize`}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
          <Loader2 size={18} className="animate-spin" /> Loading product families...
        </div>
      ) : (
        <div className="space-y-3">
          {families.map((f) => <FamilyCard key={f._id} family={f} onRefresh={load} isAdmin={isAdmin} />)}
          {families.length === 0 && <p className="text-center text-gray-400 py-12">No product families yet — add one above.</p>}
        </div>
      )}
    </motion.div>
  );
}
