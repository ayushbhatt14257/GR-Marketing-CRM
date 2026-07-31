import { Flame, Trophy } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function PointsBadge() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 text-xs font-bold">
        <Flame size={14} /> {user.currentStreak || 0}
      </div>
      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-bold">
        <Trophy size={14} /> {user.totalPoints || 0}
      </div>
    </div>
  );
}
