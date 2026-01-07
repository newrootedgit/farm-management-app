import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout';
import { useUserStore } from './stores/user-store';
import Dashboard from './pages/Dashboard';
import FarmLayout from './pages/FarmLayout';
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
import DeliveryPage from './pages/DeliveryPage';
import DriverPage from './pages/DriverPage';
import CsaPage from './pages/CsaPage';
import SuppliesPage from './pages/SuppliesPage';

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

      {/* Driver mobile view (protected, no AppShell for mobile-first UX) */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute>
            <DriverPage />
          </ProtectedRoute>
        }
      />

      {/* Protected app routes with shell */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/operations" element={<OperationsPage />} />
                <Route path="/orders" element={<PlanningPage />} />
                <Route path="/layout" element={<FarmLayout />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/supplies" element={<SuppliesPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/store" element={<StorePage />} />
                <Route path="/delivery" element={<DeliveryPage />} />
                <Route path="/csa" element={<CsaPage />} />
                <Route path="/team" element={<EmployeesPage />} />
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
