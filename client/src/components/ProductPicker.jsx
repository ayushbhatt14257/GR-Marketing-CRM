import { useEffect, useState } from 'react';
import { productApi } from '../api/endpoints';

// mode: 'lead' (just select products) | 'order' (select + quantity)
export default function ProductPicker({ category, onCategoryChange, selected, onChange, mode = 'lead' }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productApi.list({ category, active: true }).then(({ data }) => setProducts(data));
  }, [category]);

  const toggle = (product) => {
    if (mode === 'lead') {
      const exists = selected.find((s) => s.productId === product._id);
      onChange(exists ? selected.filter((s) => s.productId !== product._id) : [...selected, { productId: product._id, name: product.name }]);
    } else {
      const exists = selected.find((s) => s.productId === product._id);
      if (exists) onChange(selected.filter((s) => s.productId !== product._id));
      else onChange([...selected, { productId: product._id, name: product.name, quantity: 1, available: product.stock?.available }]);
    }
  };

  const setQty = (productId, qty) => {
    onChange(selected.map((s) => (s.productId === productId ? { ...s, quantity: Math.max(1, qty) } : s)));
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => onCategoryChange('fonfox')} className={`chip ${category === 'fonfox' ? 'chip-active' : 'chip-inactive'}`}>FonFox</button>
        <button type="button" onClick={() => onCategoryChange('supreme')} className={`chip ${category === 'supreme' ? 'chip-active' : 'chip-inactive'}`}>Supreme</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {products.map((p) => {
          const isSelected = selected.some((s) => s.productId === p._id);
          const low = p.stock?.lowStock;
          return (
            <button
              key={p._id}
              type="button"
              onClick={() => toggle(p)}
              className={`chip ${isSelected ? 'chip-active' : 'chip-inactive'} relative`}
            >
              {p.name}
              {mode === 'order' && (
                <span className={`ml-1.5 text-[10px] ${isSelected ? 'text-white/80' : low ? 'text-red-500' : 'text-gray-400'}`}>
                  ({p.stock?.available ?? 0} avail)
                </span>
              )}
            </button>
          );
        })}
        {products.length === 0 && <p className="text-sm text-gray-400">No active products in this category.</p>}
      </div>

      {mode === 'order' && selected.length > 0 && (
        <div className="space-y-2 mb-4">
          {selected.map((s) => (
            <div key={s.productId} className="flex items-center justify-between card px-3 py-2">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                {s.available !== undefined && (
                  <p className="text-[11px] text-gray-400">{s.available} available now</p>
                )}
              </div>
              <input
                type="number" min={1} value={s.quantity}
                onChange={(e) => setQty(s.productId, parseInt(e.target.value) || 1)}
                className="input-field w-20 text-center py-1.5"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
