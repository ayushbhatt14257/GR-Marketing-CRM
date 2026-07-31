import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { userApi } from '../../api/endpoints';

const ROLES = ['marketing', 'warehouse', 'dispatch', 'admin'];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'marketing' });

  const load = async () => { const { data } = await userApi.list(); setUsers(data); };
  useEffect(() => { load(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await userApi.create(form);
      toast.success('User created');
      setForm({ name: '', email: '', password: '', role: 'marketing' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggleActive = async (u) => {
    await userApi.update(u._id, { isActive: !u.isActive });
    load();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-xl font-extrabold mb-4">Users</h1>

      <form onSubmit={createUser} className="card p-4 flex flex-wrap gap-2 items-end mb-6">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
        </div>
        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
          <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field capitalize">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary py-2.5"><UserPlus size={16} /> Create</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-ink-800 text-left text-xs text-gray-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t border-gray-100 dark:border-ink-800">
                <td className="px-4 py-3 font-medium">
                  <Link to={`/users/${u._id}`} className="hover:text-brand-500 hover:underline">{u.name}</Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3">{u.totalPoints}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u)} className={`badge ${u.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-gray-100 text-gray-500 dark:bg-ink-800'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
