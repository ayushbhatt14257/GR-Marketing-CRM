import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { productApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import QuantityInput from './QuantityInput';

// mode: 'lead' (select products, no quantity) | 'order' (select + quantity, live stock)
// Category toggle is hidden for marketing users locked to a single category
// via their productAccess setting; admin/dispatch/warehouse always see both.
export default function ProductPicker({ category, onCategoryChange, selected, onChange, mode = 'lead' }) {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const restrictedCategory = ['marketing', 'dispatch'].includes(user?.role) && user?.productAccess !== 'both' ? user.productAccess : null;
  const showToggle = !restrictedCategory;

  // If the user is locked to one category, force it and never show the other.
  useEffect(() => {
    if (restrictedCategory && category !== restrictedCategory) {
      onCategoryChange(restrictedCategory);
    }
  }, [restrictedCategory]);

  useEffect(() => {
    setLoading(true);
    productApi.list({ category, active: true }).then(({ data }) => {
      setProducts(data);
      setLoading(false);
    });
  }, [category]);

  const toggle = (product) => {
    const exists = selected.some((s) => s.productId === product._id);
    if (mode === 'lead') {
      onChange(exists ? selected.filter((s) => s.productId !== product._id) : [...selected, { productId: product._id, name: product.name }]);
    } else {
      if (exists) {
        onChange(selected.filter((s) => s.productId !== product._id));
      } else {
        onChange([...selected, { productId: product._id, name: product.name, quantity: 1, available: product.stock?.available }]);
      }
    }
  };

  const setQty = (productId, qty) => {
    onChange(selected.map((s) => (s.productId === productId ? { ...s, quantity: qty } : s)));
  };

  return (
    <div>
      {showToggle && (
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => onCategoryChange('fonfox')} className={`chip ${category === 'fonfox' ? 'chip-active' : 'chip-inactive'}`}>FonFox</button>
          <button type="button" onClick={() => onCategoryChange('supreme')} className={`chip ${category === 'supreme' ? 'chip-active' : 'chip-inactive'}`}>Supreme</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
          <Loader2 size={16} className="animate-spin" /> Loading products...
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {products.map((p) => {
            const isSelected = selected.some((s) => s.productId === p._id);
            const lowStock = mode === 'order' && p.stock?.lowStock;
            return (
              <button
                key={p._id}
                type="button"
                onClick={() => toggle(p)}
                className={`chip ${isSelected ? 'chip-active' : 'chip-inactive'}`}
              >
                {p.name}
                {mode === 'order' && (
                  <span className={`ml-1.5 text-[10px] ${isSelected ? 'text-white/80' : lowStock ? 'text-red-500' : 'text-gray-400'}`}>
                    ({p.stock?.available ?? 0} avail)
                  </span>
                )}
              </button>
            );
          })}
          {products.length === 0 && <p className="text-sm text-gray-400">No products in this category yet — ask admin/warehouse to add some.</p>}
        </div>
      )}

      {mode === 'order' && selected.length > 0 && (
        <div className="space-y-2 mb-4">
          {selected.map((s) => (
            <div key={s.productId} className="flex items-center justify-between card px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                {s.available !== undefined && <p className="text-[11px] text-gray-400">{s.available} available now</p>}
              </div>
              <div className="w-20 shrink-0">
                <QuantityInput value={s.quantity} onChange={(qty) => setQty(s.productId, qty)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
