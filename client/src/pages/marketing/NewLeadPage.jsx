import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CreditCard, PhoneCall, Clock3, Send, PackageSearch, CalendarClock } from 'lucide-react';
import CustomerAutocomplete from '../../components/CustomerAutocomplete';
import ProductPicker from '../../components/ProductPicker';
import { leadApi } from '../../api/endpoints';

const TALK_OPTIONS = [
  { value: 'payment', label: 'Payment', icon: CreditCard },
  { value: 'order_talk', label: 'Order Talks', icon: PackageSearch },
  { value: 'follow_up', label: 'Follow-up', icon: Clock3 },
  { value: 'call_later', label: 'Call Later', icon: PhoneCall },
];

const NEEDS_FOLLOW_UP_DATE = ['follow_up', 'call_later'];

export default function NewLeadPage() {
  const [customer, setCustomer] = useState(null);
  const [category, setCategory] = useState('fonfox');
  const [products, setProducts] = useState([]);
  const [talkRegarding, setTalkRegarding] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const needsDate = NEEDS_FOLLOW_UP_DATE.includes(talkRegarding);

  const reset = () => {
    setCustomer(null); setProducts([]); setTalkRegarding(''); setNextFollowUpDate(''); setRemark('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!customer) return toast.error('Select or create a customer first');
    if (!talkRegarding) return toast.error('Select what this call was regarding');
    if (needsDate && !nextFollowUpDate) return toast.error('Next follow-up date is required for Follow-up / Call Later');
    if (!remark.trim()) return toast.error('Remark is required');

    setSubmitting(true);
    try {
      await leadApi.create({
        customerId: customer._id,
        category,
        productIds: products.map((p) => p.productId),
        talkRegarding,
        nextFollowUpDate: needsDate ? nextFollowUpDate : undefined,
        remark: remark.trim(),
      });
      toast.success('Lead saved!');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold mb-1">New Lead</h1>
      <p className="text-sm text-gray-500 mb-6">Log a customer call — takes ~15 seconds</p>

      <form onSubmit={submit} className="card p-5 space-y-6">
        <div>
          <label className="text-sm font-semibold mb-1.5 block">Customer</label>
          <CustomerAutocomplete value={customer} onChange={setCustomer} createdVia="lead" />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Product(s) discussed</label>
          <ProductPicker category={category} onCategoryChange={setCategory} selected={products} onChange={setProducts} mode="lead" />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Talk regarding</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TALK_OPTIONS.map((opt) => (
              <button
                key={opt.value} type="button"
                onClick={() => { setTalkRegarding(opt.value); if (!NEEDS_FOLLOW_UP_DATE.includes(opt.value)) setNextFollowUpDate(''); }}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                  talkRegarding === opt.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'border-gray-200 dark:border-ink-700 text-gray-500 hover:border-brand-300'
                }`}
              >
                <opt.icon size={18} /> {opt.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {needsDate && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5"><CalendarClock size={15} /> Next follow-up date <span className="text-red-500">*</span></label>
              <input
                type="date" required={needsDate} value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="input-field" min={new Date().toISOString().slice(0, 10)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Remark <span className="text-red-500">*</span></label>
          <textarea
            required value={remark} onChange={(e) => setRemark(e.target.value)}
            rows={3} className="input-field resize-none" placeholder="What was discussed?"
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          <Send size={16} /> {submitting ? 'Saving...' : 'Save Lead'}
        </button>
      </form>
    </motion.div>
  );
}
