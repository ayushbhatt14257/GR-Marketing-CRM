import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PackageCheck } from 'lucide-react';
import CustomerAutocomplete from '../../components/CustomerAutocomplete';
import ProductPicker from '../../components/ProductPicker';
import { orderApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

export default function NewOrderPage() {
  const user = useAuthStore((s) => s.user);
  const [customer, setCustomer] = useState(null);
  const [category, setCategory] = useState('fonfox');
  const [products, setProducts] = useState([]);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isDispatchOrAdmin = ['dispatch', 'admin'].includes(user?.role);

  const submit = async (e) => {
    e.preventDefault();
    if (!customer) return toast.error('Select or create a customer first');
    if (!products.length) return toast.error('Select at least one product');

    setSubmitting(true);
    try {
      await orderApi.create({
        customerId: customer._id,
        ownerId: customer.ownerId || user._id,
        category,
        items: products.map((p) => ({ productId: p.productId, quantity: p.quantity })),
        remark: remark.trim() || undefined,
      });
      toast.success('Order created!');
      setCustomer(null); setProducts([]); setRemark('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold mb-1">New Order</h1>
      <p className="text-sm text-gray-500 mb-6">
        {isDispatchOrAdmin ? 'Create an order on behalf of a marketing user' : 'Create an order for a customer'}
      </p>

      <form onSubmit={submit} className="card p-5 space-y-6">
        <div>
          <label className="text-sm font-semibold mb-1.5 block">Customer</label>
          <CustomerAutocomplete value={customer} onChange={setCustomer} createdVia={isDispatchOrAdmin ? 'dispatch' : 'order'} />
          {isDispatchOrAdmin && (
            <p className="text-[11px] text-gray-400 mt-1">
              Note: this order will be created for the customer's owning marketing user. Selecting an existing customer auto-assigns correctly.
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Products & quantity</label>
          <ProductPicker category={category} onCategoryChange={setCategory} selected={products} onChange={setProducts} mode="order" />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Remark <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
          <textarea
            value={remark} onChange={(e) => setRemark(e.target.value)}
            rows={2} className="input-field resize-none" placeholder="Any notes about this order..."
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          <PackageCheck size={16} /> {submitting ? 'Creating...' : 'Create Order'}
        </button>
      </form>
    </motion.div>
  );
}
