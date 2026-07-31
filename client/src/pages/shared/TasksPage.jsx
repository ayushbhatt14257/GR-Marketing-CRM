import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle2, ClipboardList, Plus } from 'lucide-react';
import { taskApi, userApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

export default function TasksPage() {
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', dueDate: '', bonusPoints: 10 });

  const load = async () => { const { data } = await taskApi.list(); setTasks(data); };
  useEffect(() => {
    load();
    if (user?.role === 'admin') userApi.list({ role: 'marketing' }).then(({ data }) => setUsers(data));
  }, []);

  const createTask = async (e) => {
    e.preventDefault();
    try {
      await taskApi.create(form);
      toast.success('Task assigned');
      setForm({ title: '', description: '', assignedTo: '', dueDate: '', bonusPoints: 10 });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const complete = async (id) => {
    await taskApi.complete(id);
    toast.success('Task completed — bonus points awarded! 🎉');
    load();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-xl font-extrabold mb-4">{user?.role === 'admin' ? 'Task Management' : 'My Tasks'}</h1>

      {user?.role === 'admin' && (
        <form onSubmit={createTask} className="card p-4 space-y-3 mb-6">
          <div className="grid md:grid-cols-2 gap-3">
            <input required placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" />
            <select required value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="input-field">
              <option value="">Assign to...</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" />
            <input type="number" min={0} placeholder="Bonus points" value={form.bonusPoints} onChange={(e) => setForm({ ...form, bonusPoints: e.target.value })} className="input-field" />
          </div>
          <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          <button type="submit" className="btn-primary"><Plus size={16} /> Assign Task</button>
        </form>
      )}

      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t._id} className="card p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList size={15} className="text-brand-500 shrink-0" />
                <p className="font-semibold truncate">{t.title}</p>
                {t.bonusPoints > 0 && <span className="badge bg-amber-50 text-amber-600 dark:bg-amber-500/10">+{t.bonusPoints} pts</span>}
              </div>
              {t.description && <p className="text-sm text-gray-500 mb-0.5">{t.description}</p>}
              <p className="text-[11px] text-gray-400">
                {user?.role === 'admin' && `Assigned to ${t.assignedTo?.name} · `}
                {t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : 'No due date'}
              </p>
            </div>
            {t.status === 'completed' ? (
              <span className="flex items-center gap-1 text-emerald-500 text-xs font-semibold shrink-0"><CheckCircle2 size={14} /> Done</span>
            ) : (
              user?.role !== 'admin' && <button onClick={() => complete(t._id)} className="btn-secondary text-xs py-1.5 px-3 shrink-0">Mark Complete</button>
            )}
          </div>
        ))}
        {tasks.length === 0 && <p className="text-center text-gray-400 py-12">No tasks yet.</p>}
      </div>
    </motion.div>
  );
}
