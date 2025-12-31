import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout';
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

function App() {
  return (
    <Routes>
      {/* Public routes (no AppShell) */}
      <Route path="/pay/:linkId" element={<CheckoutPage />} />
      <Route path="/order/:farmSlug" element={<StorefrontPage />} />

      {/* App routes with shell */}
      <Route
        path="/*"
        element={
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
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}

export default App;
