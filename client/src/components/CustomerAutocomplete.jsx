import { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerApi } from '../api/endpoints';

// Props:
// - ownerId: required when creator is not the owning marketing user (dispatch/admin flows)
// - value: selected customer object { _id, name } or null
// - onChange: (customer) => void
export default function CustomerAutocomplete({ ownerId, value, onChange, createdVia = 'lead' }) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [nearMatches, setNearMatches] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  const search = (q) => {
    setQuery(q);
    onChange(null);
    setNearMatches(null);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const { data } = await customerApi.search(q, ownerId);
      setResults(data);
      setOpen(true);
    }, 250);
  };

  const selectExisting = (c) => {
    onChange(c);
    setQuery(c.name);
    setOpen(false);
    setNearMatches(null);
  };

  const createNew = async (confirmNew = false) => {
    try {
      const { data } = await customerApi.resolve({ name: query, ownerId, confirmNew, createdVia });
      selectExisting(data.customer);
      if (!confirmNew) toast.success(data.existing ? 'Matched existing customer' : 'New customer created');
    } catch (err) {
      if (err.response?.status === 409 && err.response.data.requiresConfirmation) {
        setNearMatches(err.response.data.nearMatches);
        setOpen(true);
      } else {
        toast.error(err.response?.data?.message || 'Could not resolve customer');
      }
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input-field pl-10"
          placeholder="Type to search or add customer..."
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => query && setOpen(true)}
        />
        {value && <Check size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-accent-500" />}
      </div>

      {open && query.trim() && (
        <div className="absolute z-30 mt-1.5 w-full card p-1.5 max-h-64 overflow-y-auto shadow-xl">
          {results.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => selectExisting(c)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-ink-800 text-sm flex items-center justify-between"
            >
              {c.name}
              <span className="text-[10px] text-gray-400">Existing</span>
            </button>
          ))}

          {nearMatches && nearMatches.length > 0 && (
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg mb-1">
              <p className="text-xs font-semibold text-amber-600 flex items-center gap-1 mb-1.5">
                <AlertTriangle size={12} /> Similar customer{nearMatches.length > 1 ? 's' : ''} found — select one or confirm new:
              </p>
              {nearMatches.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => selectExisting(c)}
                  className="block w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-white dark:hover:bg-ink-800"
                >
                  {c.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => createNew(true)}
                className="mt-1.5 w-full text-xs font-semibold text-brand-600 dark:text-brand-300 py-1.5 hover:underline"
              >
                None of these — create "{query}" as new customer
              </button>
            </div>
          )}

          {results.length === 0 && !nearMatches && (
            <button
              type="button"
              onClick={() => createNew(false)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 text-sm text-brand-600 dark:text-brand-300 font-medium flex items-center gap-2"
            >
              <UserPlus size={14} /> Create new customer "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
