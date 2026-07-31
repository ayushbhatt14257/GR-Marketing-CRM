import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationApi } from '../api/endpoints';

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const lastIdRef = useRef(null);
  const ref = useRef(null);

  const fetchNotifications = async (announceNew = false) => {
    try {
      const { data } = await notificationApi.list();
      setItems(data.notifications);
      setUnread(data.unreadCount);

      const newest = data.notifications[0];
      if (announceNew && newest && newest._id !== lastIdRef.current && lastIdRef.current !== null) {
        setOpen(true); // auto-open on new notification
        toast(newest.title, { icon: '🔔' });
      }
      if (newest) lastIdRef.current = newest._id;
    } catch (e) {
      // silent fail on poll
    }
  };

  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => fetchNotifications(true), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clearOne = async (id) => {
    setItems((prev) => prev.filter((n) => n._id !== id));
    await notificationApi.clearOne(id);
  };

  const clearAll = async () => {
    setItems([]);
    setUnread(0);
    await notificationApi.clearAll();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-ink-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-ink-700 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-fade-in">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card p-2 z-50 shadow-xl"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="font-semibold text-sm">Notifications</span>
              {items.length > 0 && (
                <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <Trash2 size={12} /> Clear all
                </button>
              )}
            </div>
            {items.length === 0 && (
              <div className="text-center text-sm text-gray-400 py-8">You're all caught up 🎉</div>
            )}
            {items.map((n) => (
              <div key={n._id} className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-ink-800 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => clearOne(n._id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                  <X size={14} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
