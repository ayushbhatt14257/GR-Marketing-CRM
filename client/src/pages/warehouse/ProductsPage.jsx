import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, PackagePlus, AlertTriangle } from 'lucide-react';
import { productApi } from '../../api/endpoints';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('all');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [newCategory, setNewCategory] = useState('fonfox');
  const [stockModal, setStockModal] = useState(null);
  const [stockQty, setStockQty] = useState('');

  const load = async () => {
    const { data } = await productApi.list(category === 'all' ? {} : { category });
    setProducts(data);
  };

  useEffect(() => { load(); }, [category]);

  const addProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Product name required');
    try {
      await productApi.create({ name, sku, category: newCategory });
      toast.success('Product added');
      setName(''); setSku('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggleActive = async (p) => {
    await productApi.update(p._id, { isActive: !p.isActive });
    load();
  };

  const submitStockIn = async () => {
    if (!stockQty || stockQty <= 0) return toast.error('Enter valid quantity');
    try {
      await productApi.stockIn(stockModal._id, { quantity: Number(stockQty), note: 'Manual stock-in' });
      toast.success('Stock updated');
      setStockModal(null); setStockQty('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-xl font-extrabold mb-4">Products</h1>

      <form onSubmit={addProduct} className="card p-4 flex flex-wrap gap-2 items-end mb-6">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Product name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="New product name" />
        </div>
        <div className="w-40">
          <label className="text-xs font-medium text-gray-500 mb-1 block">SKU (optional)</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} className="input-field" placeholder="SKU" />
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setNewCategory('fonfox')} className={`chip ${newCategory === 'fonfox' ? 'chip-active' : 'chip-inactive'}`}>FonFox</button>
          <button type="button" onClick={() => setNewCategory('supreme')} className={`chip ${newCategory === 'supreme' ? 'chip-active' : 'chip-inactive'}`}>Supreme</button>
        </div>
        <button type="submit" className="btn-primary py-2.5"><Plus size={16} /> Add</button>
      </form>

      <div className="flex gap-2 mb-4">
        {['all', 'fonfox', 'supreme'].map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? 'chip-active' : 'chip-inactive'} capitalize`}>{c}</button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-ink-800 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated by</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="border-t border-gray-100 dark:border-ink-800">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{p.category}</td>
                <td className="px-4 py-3">
                  <span className={p.stock?.lowStock ? 'text-red-500 font-semibold flex items-center gap-1' : ''}>
                    {p.stock?.lowStock && <AlertTriangle size={12} />} {p.stock?.available ?? p.totalStock} avail / {p.totalStock} total
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(p)} className={`badge ${p.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-gray-100 text-gray-500 dark:bg-ink-800'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{p.lastUpdatedBy?.name || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setStockModal(p)} className="btn-secondary text-xs py-1.5 px-2.5"><PackagePlus size={13} /> Stock in</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setStockModal(null)}>
          <div className="card p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">Add stock — {stockModal.name}</h3>
            <input type="number" min={1} value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="input-field mb-3" placeholder="Quantity to add" />
            <div className="flex gap-2">
              <button onClick={submitStockIn} className="btn-primary flex-1">Confirm</button>
              <button onClick={() => setStockModal(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
