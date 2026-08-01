import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, PackagePlus, AlertTriangle, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { productFamilyApi, productApi } from '../../api/endpoints';

function FamilyCard({ family, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [models, setModels] = useState([]);
  const [modelName, setModelName] = useState('');
  const [stockModal, setStockModal] = useState(null);
  const [stockQty, setStockQty] = useState('');

  const loadModels = async () => {
    const { data } = await productApi.list({ familyId: family._id });
    setModels(data);
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
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-brand-500" />
          <div>
            <p className="font-semibold">{family.name}</p>
            <p className="text-xs text-gray-400 capitalize">{family.category} · {family.variantCount} model{family.variantCount === 1 ? '' : 's'} · {family.totalAvailable} total available</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100 dark:border-ink-800">
            <form onSubmit={addModel} className="flex gap-2 p-3">
              <input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="New model name (e.g. 1+Nord 4 (5G))" className="input-field flex-1 text-sm" />
              <button type="submit" className="btn-secondary text-xs py-2 px-3"><Plus size={14} /> Add</button>
            </form>

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
                      <button onClick={() => setStockModal(m)} className="btn-secondary text-xs py-1 px-2"><PackagePlus size={12} /> Stock in</button>
                    </td>
                  </tr>
                ))}
                {models.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No models yet — add one above.</td></tr>}
              </tbody>
            </table>
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
  const [families, setFamilies] = useState([]);
  const [category, setCategory] = useState('all');
  const [name, setName] = useState('');
  const [newCategory, setNewCategory] = useState('fonfox');

  const load = async () => {
    const { data } = await productFamilyApi.list(category === 'all' ? {} : { category });
    setFamilies(data);
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

      <div className="space-y-3">
        {families.map((f) => <FamilyCard key={f._id} family={f} onRefresh={load} />)}
        {families.length === 0 && <p className="text-center text-gray-400 py-12">No product families yet — add one above.</p>}
      </div>
    </motion.div>
  );
}
