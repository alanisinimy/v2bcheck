import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import DashboardPage from '@/app/routes/DashboardPage';
import VaultPage from '@/app/routes/VaultPage';
import DiagnosticoPage from '@/app/routes/DiagnosticoPage';
import TimePage from '@/app/routes/TimePage';
import PlanoPage from '@/app/routes/PlanoPage';
import LoginPage from '@/app/routes/LoginPage';
import NotFound from '@/pages/NotFound';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/vault" element={<ProtectedRoute><VaultPage /></ProtectedRoute>} />
        <Route path="/matriz" element={<ProtectedRoute><DiagnosticoPage /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><TimePage /></ProtectedRoute>} />
        <Route path="/plan" element={<ProtectedRoute><PlanoPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
