import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, UserPlus, Users, ShoppingCart, Package, Truck,
  Warehouse, Settings, LogOut, Moon, Sun, Megaphone, ListChecks, ClipboardList,
  BarChart3, FileSpreadsheet, CalendarCheck, Layers, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import NotificationBell from './NotificationBell';
import PointsBadge from './PointsBadge';

const NAV = {
  marketing: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads/new', label: 'New Lead', icon: UserPlus },
    { to: '/orders/new', label: 'New Order', icon: ShoppingCart },
    { to: '/my-leads', label: 'My Leads', icon: ListChecks },
    { to: '/my-orders', label: 'My Orders', icon: Package },
    { to: '/model-stock', label: 'Model Stock', icon: Layers },
    { to: '/tasks', label: 'My Tasks', icon: ClipboardList },
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/change-password', label: 'Settings', icon: Settings },
  ],
  warehouse: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/model-stock', label: 'Model Stock', icon: Layers },
    { to: '/stock-upload', label: 'Stock Upload', icon: Warehouse },
    { to: '/orders', label: 'All Orders', icon: ShoppingCart },
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/change-password', label: 'Settings', icon: Settings },
  ],
  dispatch: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/orders', label: 'Dispatch Queue', icon: Truck },
    { to: '/orders/new', label: 'Create Order', icon: ShoppingCart },
    { to: '/model-stock', label: 'Model Stock', icon: Layers },
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/change-password', label: 'Settings', icon: Settings },
  ],
  admin: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads/new', label: 'New Lead', icon: UserPlus },
    { to: '/my-leads', label: 'All Leads', icon: ListChecks },
    { to: '/orders/new', label: 'New Order', icon: ShoppingCart },
    { to: '/orders', label: 'All Orders', icon: Package },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/products', label: 'Products', icon: Warehouse },
    { to: '/model-stock', label: 'Model Stock', icon: Layers },
    { to: '/stock-upload', label: 'Stock Upload', icon: Truck },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/book-match', label: 'Book Match', icon: FileSpreadsheet },
    { to: '/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/change-password', label: 'Settings', icon: Settings },
  ],
};

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();
  const items = NAV[user?.role] || [];
  const [drawerOpen, setDrawerOpen] = useState(false);

  const doLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="h-screen flex overflow-hidden">
      <aside className="w-64 shrink-0 hidden md:flex flex-col h-screen sticky top-0 border-r border-gray-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 overflow-hidden">
        <div className="flex items-center gap-2 px-2 mb-8 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center text-white font-bold">GR</div>
          <div>
            <p className="font-extrabold text-sm leading-none">GR Marketing</p>
            <p className="text-[11px] text-gray-400">CRM</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-ink-800'
                }`
              }
            >
              <item.icon size={17} /> {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={doLogout}
          className="shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors mt-2 border-t border-gray-100 dark:border-ink-800 pt-3"
        >
          <LogOut size={17} /> Log out
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-16 shrink-0 border-b border-gray-200 dark:border-ink-800 bg-white/70 dark:bg-ink-900/70 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
          <div className="md:hidden flex items-center gap-2">
            <button onClick={() => setDrawerOpen(true)} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-ink-800 flex items-center justify-center">
              <Menu size={18} />
            </button>
            <span className="font-extrabold">GR CRM</span>
          </div>
          <div className="hidden md:block text-sm text-gray-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-3">
            <PointsBadge />
            <button onClick={toggle} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-ink-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-ink-700 transition-colors">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <NotificationBell />
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
              title={user?.name}
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto"
        >
          <Outlet />
        </motion.main>
      </div>

      {/* Mobile bottom nav — a few priority shortcuts + a Menu button for everything else */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-ink-900/90 backdrop-blur-md border-t border-gray-200 dark:border-ink-800 flex items-center justify-around px-2 py-2 z-40">
        {items.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium ${
                isActive ? 'text-brand-600 dark:text-brand-300' : 'text-gray-400'
              }`
            }
          >
            <item.icon size={18} />
            {item.label.split(' ')[0]}
          </NavLink>
        ))}
        <button onClick={() => setDrawerOpen(true)} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium text-gray-400">
          <Menu size={18} />
          More
        </button>
      </nav>

      {/* Full mobile menu drawer — every nav item + logout, so nothing is ever out of reach */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={() => setDrawerOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full bg-white dark:bg-ink-900 rounded-t-3xl max-h-[80vh] overflow-y-auto p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center text-white font-bold">GR</div>
                  <div>
                    <p className="font-extrabold text-sm leading-none">GR Marketing</p>
                    <p className="text-[11px] text-gray-400">CRM</p>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-ink-800 flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-medium text-center ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white'
                          : 'bg-gray-50 dark:bg-ink-800 text-gray-600 dark:text-gray-300'
                      }`
                    }
                  >
                    <item.icon size={19} />
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <button
                onClick={doLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 mt-3"
              >
                <LogOut size={17} /> Log out
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
