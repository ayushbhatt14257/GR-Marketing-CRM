import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Megaphone, Plus, Pin, Trash2 } from 'lucide-react';
import { announcementApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';

const ROLES = ['marketing', 'warehouse', 'dispatch'];

export default function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState([]);

  const load = async () => { const { data } = await announcementApi.list(); setItems(data); };
  useEffect(() => { load(); }, []);

  const toggleRole = (r) => setTargetRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await announcementApi.create({ title, message, targetRoles });
      toast.success('Announcement posted');
      setTitle(''); setMessage(''); setTargetRoles([]);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const remove = async (id) => { await announcementApi.remove(id); load(); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold mb-4">Announcements</h1>

      {user?.role === 'admin' && (
        <form onSubmit={submit} className="card p-4 space-y-3 mb-6">
          <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
          <textarea required placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} className="input-field" rows={3} />
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Target audience</p>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setTargetRoles([])} className={`chip ${targetRoles.length === 0 ? 'chip-active' : 'chip-inactive'}`}>Everyone</button>
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => toggleRole(r)} className={`chip capitalize ${targetRoles.includes(r) ? 'chip-active' : 'chip-inactive'}`}>{r}</button>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary"><Plus size={16} /> Post Announcement</button>
        </form>
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <div key={a._id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Megaphone size={16} className="text-brand-500" />
                <p className="font-bold">{a.title}</p>
                {a.isPinned && <Pin size={13} className="text-amber-500" />}
              </div>
              {user?.role === 'admin' && (
                <button onClick={() => remove(a._id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{a.message}</p>
            <p className="text-[11px] text-gray-400 mt-2">
              By {a.createdBy?.name} · {new Date(a.createdAt).toLocaleString()}
              {a.targetRoles?.length > 0 && ` · Targeted: ${a.targetRoles.join(', ')}`}
            </p>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-12">No announcements yet.</p>}
      </div>
    </motion.div>
  );
}
