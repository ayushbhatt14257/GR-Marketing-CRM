import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Sparkles, Lock, Mail, Flame } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import IconInput from '../components/IconInput';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      setAuth(data.token, data.user);

      if (data.loginResult?.streakMilestone) {
        toast.success(`🔥 ${data.loginResult.streakMilestone}-day streak! Keep it up!`, { duration: 5000 });
      } else if (!data.loginResult?.alreadyAwardedToday) {
        toast.success('Welcome back! +2 points for today\'s login');
      } else {
        toast.success(`Welcome back, ${data.user.name}!`);
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 dark:from-ink-950 dark:via-ink-900 dark:to-ink-950 p-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md card p-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center text-white shadow-glow">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">GR Marketing CRM</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Leads · Orders · Stock · Dispatch</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Email</label>
            <IconInput
              icon={Mail} type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@grmarketing.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Password</label>
            <IconInput
              icon={Lock} type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Flame size={14} className="text-orange-400" /> Log in daily to build your streak
        </div>
      </motion.div>
    </div>
  );
}
