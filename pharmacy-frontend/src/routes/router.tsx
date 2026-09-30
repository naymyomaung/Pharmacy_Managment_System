import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../store/auth';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import UsersPage from '../pages/UsersPage';
import UnitsPage from '../pages/UnitsPage';
import DrugsPage from '../pages/DrugsPage';
import ConversionsPage from '../pages/ConversionsPage';
import SuppliersPage from '../pages/SuppliersPage';
import PurchasesPage from '../pages/PurchasesPage';
import SalesPage from '../pages/SalesPage';
import SalesHistoryPage from '../pages/SalesHistoryPage';
import SalesReportPage from '../pages/reports/SalesReportPage';
import PurchasesReportPage from '../pages/reports/PurchasesReportPage';
import ClosingReportPage from '../pages/reports/ClosingReportPage';
import NearExpiryReportPage from '../pages/reports/NearExpiryReportPage';

function Guard({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  return user ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><Dashboard /></Guard>} />
        <Route path="/users" element={<Guard><UsersPage /></Guard>} />
        <Route path="/units" element={<Guard><UnitsPage /></Guard>} />
        <Route path="/drugs" element={<Guard><DrugsPage /></Guard>} />
        <Route path="/conversions" element={<Guard><ConversionsPage /></Guard>} />
        <Route path="/suppliers" element={<Guard><SuppliersPage /></Guard>} />
        <Route path="/purchases" element={<Guard><PurchasesPage /></Guard>} />
        <Route path="/sales" element={<Guard><SalesPage /></Guard>} />
        <Route path="/sales/history" element={<Guard><SalesHistoryPage /></Guard>} />
        <Route path="/reports/sales" element={<Guard><SalesReportPage /></Guard>} />
        <Route path="/reports/purchases" element={<Guard><PurchasesReportPage /></Guard>} />
        <Route path="/reports/closing" element={<Guard><ClosingReportPage /></Guard>} />
        <Route path="/reports/near-expiry" element={<Guard><NearExpiryReportPage /></Guard>} />
      </Routes>
    </BrowserRouter>
  );
}
