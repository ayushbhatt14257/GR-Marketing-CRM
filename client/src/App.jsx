import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { authApi } from './api/endpoints';
import { RequireAuth, RequireRole } from './components/RouteGuards';
import AppLayout from './components/AppLayout';

import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

import MarketingDashboard from './pages/marketing/MarketingDashboard';
import NewLeadPage from './pages/marketing/NewLeadPage';
import NewOrderPage from './pages/marketing/NewOrderPage';
import MyLeadsPage from './pages/marketing/MyLeadsPage';

import WarehouseDashboard from './pages/warehouse/WarehouseDashboard';
import ProductsPage from './pages/warehouse/ProductsPage';
import ModelStockPage from './pages/warehouse/ModelStockPage';
import StockUploadPage from './pages/warehouse/StockUploadPage';

import DispatchDashboard from './pages/dispatch/DispatchDashboard';

import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import CustomersPage from './pages/admin/CustomersPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import BookMatchPage from './pages/admin/BookMatchPage';
import AttendancePage from './pages/admin/AttendancePage';

import OrdersPage from './pages/shared/OrdersPage';
import TasksPage from './pages/shared/TasksPage';
import AnnouncementsPage from './pages/shared/AnnouncementsPage';

function RoleDashboard() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'warehouse') return <WarehouseDashboard />;
  if (role === 'dispatch') return <DispatchDashboard />;
  return <MarketingDashboard />;
}

export default function App() {
  const init = useThemeStore((s) => s.init);
  const token = useAuthStore((s) => s.token);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => { init(); }, []);

  // Daily check-in: fires once on app load (and again if the tab is left open
  // across midnight and refreshed) so a user who never explicitly logs out —
  // just reopens the app on a new day — still gets their +2 points and streak
  // update. Safe to call repeatedly; the backend only awards once per IST day.
  useEffect(() => {
    if (!token) return;
    authApi.me().then(({ data }) => {
      updateUser({
        totalPoints: data.user.totalPoints,
        currentStreak: data.user.currentStreak,
        productAccess: data.user.productAccess,
        role: data.user.role,
      });
      if (data.loginResult?.streakMilestone) {
        toast.success(`🔥 ${data.loginResult.streakMilestone}-day streak! Keep it up!`, { duration: 5000 });
      } else if (!data.loginResult?.alreadyAwardedToday && data.loginResult) {
        toast.success("Welcome back! +2 points for today's login");
      }
    }).catch(() => {});
  }, [token]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RoleDashboard />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/my-orders" element={<OrdersPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />

          {/* Marketing (also usable by admin/dispatch where relevant) */}
          <Route element={<RequireRole roles={['marketing', 'admin']} />}>
            <Route path="/leads/new" element={<NewLeadPage />} />
            <Route path="/my-leads" element={<MyLeadsPage />} />
          </Route>
          <Route element={<RequireRole roles={['marketing', 'admin', 'dispatch']} />}>
            <Route path="/orders/new" element={<NewOrderPage />} />
          </Route>

          {/* Warehouse + Admin */}
          <Route element={<RequireRole roles={['warehouse', 'admin']} />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/model-stock" element={<ModelStockPage />} />
            <Route path="/stock-upload" element={<StockUploadPage />} />
          </Route>

          {/* Admin only */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/book-match" element={<BookMatchPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
