import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { authApi } from '../api/endpoints';

export default function ChangePasswordPage() {
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.changePassword({ oldPassword, newPassword });
      toast.success('Password updated');
      setOld(''); setNew('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto">
      <h1 className="text-xl font-extrabold mb-4">Change Password</h1>
      <form onSubmit={submit} className="card p-5 space-y-4">
        <input type="password" required placeholder="Current password" value={oldPassword} onChange={(e) => setOld(e.target.value)} className="input-field" />
        <input type="password" required placeholder="New password (min 6 chars)" value={newPassword} onChange={(e) => setNew(e.target.value)} className="input-field" />
        <button type="submit" disabled={loading} className="btn-primary w-full"><KeyRound size={16} /> Update Password</button>
      </form>
    </motion.div>
  );
}
