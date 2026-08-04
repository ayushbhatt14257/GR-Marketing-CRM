import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, AlertTriangle, Loader2, Trash2, Check, X, Pencil, Lock } from 'lucide-react';
import { productApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

function StockCell({ product, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(product.totalStock);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const qty = Number(value);
    if (Number.isNaN(qty) || qty < 0) return toast.error('Enter a valid quantity');
    setSaving(true);
    try {
      await productApi.update(product._id, { totalStock: qty });
      toast.success('Stock updated');
      setEditing(false);
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (product.modelManaged) {
    return (
      <Link to="/model-stock" className="flex items-center gap-1.5 text-gray-500 hover:text-brand-500" title="Stock is auto-calculated from Model Stock — click to manage models">
        <Lock size={12} />
        <span>{product.totalStock} <span className="text-[10px] text-gray-400">(from models)</span></span>
      </Link>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number" min={0} autoFocus value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="input-field w-24 py-1 text-sm"
        />
        <button onClick={save} disabled={saving} className="text-emerald-500 hover:text-emerald-600">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        </button>
        <button onClick={() => { setEditing(false); setValue(product.totalStock); }} className="text-gray-400 hover:text-red-500"><X size={15} /></button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 group">
      <span className={product.stock?.lowStock ? 'text-red-500 font-semibold flex items-center gap-1' : ''}>
        {product.stock?.lowStock && <AlertTriangle size={12} />} {product.stock?.available ?? product.totalStock} avail / {product.totalStock} total
      </span>
      <Pencil size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [name, setName] = useState('');
  const [newCategory, setNewCategory] = useState('fonfox');

  const load = async () => {
    setLoading(true);
    const { data } = await productApi.list(category === 'all' ? {} : { category });
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [category]);

  const addProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Product name required');
    try {
      await productApi.create({ name, category: newCategory });
      toast.success('Product added');
      setName('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggleActive = async (p) => {
    await productApi.update(p._id, { isActive: !p.isActive });
    load();
  };

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"? Its order history stays intact, but it won't be selectable for new orders.`)) return;
    try {
      await productApi.remove(p._id);
      toast.success('Product deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-xl font-extrabold mb-1">Products</h1>
      <p className="text-sm text-gray-500 mb-4">Add products and manage their stock quantity directly — click any stock value to edit it.</p>

      <form onSubmit={addProduct} className="card p-4 flex flex-wrap gap-2 items-end mb-6">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 mb-1 block">New product name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. B90" />
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setNewCategory('fonfox')} className={`chip ${newCategory === 'fonfox' ? 'chip-active' : 'chip-inactive'}`}>FonFox</button>
          <button type="button" onClick={() => setNewCategory('supreme')} className={`chip ${newCategory === 'supreme' ? 'chip-active' : 'chip-inactive'}`}>Supreme</button>
        </div>
        <button type="submit" className="btn-primary py-2.5"><Plus size={16} /> Add Product</button>
      </form>

      <div className="flex gap-2 mb-4">
        {['all', 'fonfox', 'supreme'].map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? 'chip-active' : 'chip-inactive'} capitalize`}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
          <Loader2 size={18} className="animate-spin" /> Loading products...
        </div>
      ) : (
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
                    <StockCell product={p} onSaved={load} />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(p)} className={`badge ${p.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-gray-100 text-gray-500 dark:bg-ink-800'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{p.lastUpdatedBy?.name || '—'}</td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <button onClick={() => remove(p)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No products yet — add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
