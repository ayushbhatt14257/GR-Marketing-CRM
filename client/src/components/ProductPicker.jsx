import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Package, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { productFamilyApi, productApi } from '../api/endpoints';
import IconInput from './IconInput';
import QuantityInput from './QuantityInput';

// mode: 'lead' (select families only — no model/quantity needed) |
//       'order' (family chip opens a modal to pick model + quantity, live stock)
export default function ProductPicker({ category, onCategoryChange, selected, onChange, mode = 'lead' }) {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFamily, setActiveFamily] = useState(null); // family object whose modal is open (order mode only)

  useEffect(() => {
    setLoading(true);
    productFamilyApi.list({ category, active: true }).then(({ data }) => {
      setFamilies(data);
      setLoading(false);
    });
  }, [category]);

  const countForFamily = (familyId) => selected.filter((s) => s.familyId === familyId).length;

  const toggleFamilyForLead = (f) => {
    const exists = selected.some((s) => s.familyId === f._id);
    onChange(exists ? selected.filter((s) => s.familyId !== f._id) : [...selected, { familyId: f._id, familyName: f.name }]);
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => onCategoryChange('fonfox')} className={`chip ${category === 'fonfox' ? 'chip-active' : 'chip-inactive'}`}>FonFox</button>
        <button type="button" onClick={() => onCategoryChange('supreme')} className={`chip ${category === 'supreme' ? 'chip-active' : 'chip-inactive'}`}>Supreme</button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
          <Loader2 size={16} className="animate-spin" /> Loading product families...
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {families.map((f) => {
            const count = countForFamily(f._id);
            const lowStock = mode === 'order' && f.totalAvailable <= 0;
            const isLeadSelected = mode === 'lead' && selected.some((s) => s.familyId === f._id);
            return (
              <button
                key={f._id}
                type="button"
                onClick={() => (mode === 'lead' ? toggleFamilyForLead(f) : setActiveFamily(f))}
                className={`chip relative ${count > 0 || isLeadSelected ? 'chip-active' : 'chip-inactive'}`}
              >
                {f.name}
                {mode === 'order' && (
                  <span className={`ml-1.5 text-[10px] ${count > 0 ? 'text-white/80' : lowStock ? 'text-red-500' : 'text-gray-400'}`}>
                    ({f.totalAvailable} avail)
                  </span>
                )}
                {mode === 'order' && count > 0 && <span className="ml-1.5 text-[10px] font-bold">· {count} selected</span>}
              </button>
            );
          })}
          {families.length === 0 && <p className="text-sm text-gray-400">No product families in this category yet — ask admin/warehouse to add some.</p>}
        </div>
      )}

      {mode === 'order' && selected.length > 0 && (
        <div className="space-y-2 mb-4">
          {selected.map((s) => (
            <div key={s.productId} className="flex items-center justify-between card px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.familyName} — {s.modelName}</p>
                {s.available !== undefined && <p className="text-[11px] text-gray-400">{s.available} available now</p>}
              </div>
              <div className="w-20 shrink-0">
                <QuantityInput value={s.quantity} onChange={(qty) => onChange(selected.map((x) => (x.productId === s.productId ? { ...x, quantity: qty } : x)))} />
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeFamily && (
          <ModelPickerModal
            family={activeFamily}
            mode={mode}
            selected={selected}
            onChange={onChange}
            onClose={() => setActiveFamily(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ModelPickerModal({ family, mode, selected, onChange, onClose }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    productApi.list({ familyId: family._id, active: true }).then(({ data }) => {
      setModels(data);
      setLoading(false);
    });
  }, [family._id]);

  const filtered = models.filter((m) => m.modelName.toLowerCase().includes(query.toLowerCase()));

  const isSelected = (id) => selected.some((s) => s.productId === id);

  const toggle = (model) => {
    if (mode === 'lead') {
      onChange(
        isSelected(model._id)
          ? selected.filter((s) => s.productId !== model._id)
          : [...selected, { productId: model._id, familyId: family._id, familyName: family.name, modelName: model.modelName }]
      );
    } else {
      if (isSelected(model._id)) {
        onChange(selected.filter((s) => s.productId !== model._id));
      } else {
        onChange([
          ...selected,
          {
            productId: model._id,
            familyId: family._id,
            familyName: family.name,
            modelName: model.modelName,
            quantity: 1,
            available: model.stock?.available,
          },
        ]);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="card w-full sm:max-w-md max-h-[85vh] rounded-b-none sm:rounded-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-ink-800">
          <div>
            <p className="font-bold flex items-center gap-1.5"><Package size={16} className="text-brand-500" /> {family.name}</p>
            <p className="text-xs text-gray-400">Select model{mode === 'order' ? ' & quantity' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={18} /></button>
        </div>

        <div className="p-3 border-b border-gray-100 dark:border-ink-800">
          <IconInput icon={Search} placeholder="Search model..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-10">
              <Loader2 size={16} className="animate-spin" /> Loading models...
            </div>
          ) : (
            <>
              {filtered.map((m) => {
                const selectedItem = selected.find((s) => s.productId === m._id);
                const lowStock = m.stock?.lowStock;
                return (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => toggle(m)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      selectedItem ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-ink-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.modelName}</p>
                      {mode === 'order' && (
                        <p className={`text-[11px] ${lowStock ? 'text-red-500 flex items-center gap-1' : 'text-gray-400'}`}>
                          {lowStock && <AlertTriangle size={10} />} {m.stock?.available ?? 0} available
                        </p>
                      )}
                    </div>
                    {selectedItem ? <Check size={16} className="text-brand-500 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-ink-600 shrink-0" />}
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No models found.</p>}
            </>
          )}
        </div>

        <div className="p-3 border-t border-gray-100 dark:border-ink-800">
          <button onClick={onClose} className="btn-primary w-full">Done</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
