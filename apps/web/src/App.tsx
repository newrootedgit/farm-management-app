import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout';
import Dashboard from './pages/Dashboard';
import FarmLayout from './pages/FarmLayout';
import ZonesPage from './pages/ZonesPage';
import InventoryPage from './pages/InventoryPage';
import EmployeesPage from './pages/EmployeesPage';
import PlanningPage from './pages/PlanningPage';
import FinancialsPage from './pages/FinancialsPage';
import WikiPage from './pages/WikiPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/layout" element={<FarmLayout />} />
        <Route path="/zones" element={<ZonesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/financials" element={<FinancialsPage />} />
        <Route path="/wiki" element={<WikiPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;
