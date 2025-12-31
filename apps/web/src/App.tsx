import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout';
import { useUserStore } from './stores/user-store';
import Dashboard from './pages/Dashboard';
import FarmLayout from './pages/FarmLayout';
import ZonesPage from './pages/ZonesPage';
import InventoryPage from './pages/InventoryPage';
import EmployeesPage from './pages/EmployeesPage';
import PlanningPage from './pages/PlanningPage';
import OperationsPage from './pages/OperationsPage';
import FinancialsPage from './pages/FinancialsPage';
import WikiPage from './pages/WikiPage';
import SettingsPage from './pages/SettingsPage';
import CheckoutPage from './pages/CheckoutPage';
import CustomersPage from './pages/CustomersPage';
import StorefrontPage from './pages/StorefrontPage';
import StorePage from './pages/StorePage';
import LoginPage from './pages/LoginPage';
import UserSettingsPage from './pages/UserSettingsPage';
import AcceptInvitePage from './pages/AcceptInvitePage';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUserStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public routes (no AppShell, no auth) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
      <Route path="/pay/:linkId" element={<CheckoutPage />} />
      <Route path="/order/:farmSlug" element={<StorefrontPage />} />

      {/* Protected app routes with shell */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/operations" element={<OperationsPage />} />
                <Route path="/planning" element={<PlanningPage />} />
                <Route path="/layout" element={<FarmLayout />} />
                <Route path="/zones" element={<ZonesPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/store" element={<StorePage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/financials" element={<FinancialsPage />} />
                <Route path="/wiki" element={<WikiPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/user-settings" element={<UserSettingsPage />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
