/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import BrandLogo from './components/BrandLogo';
import { databaseService } from './services/databaseService';
import { User } from './types';
import AuthPage from './components/AuthPage';
import AppLayout from './components/layout/AppLayout';
import DashboardOverview from './components/DashboardOverview';
import CalculatorRouteAnchor from './components/layout/CalculatorRouteAnchor';
import CatalogPage from './pages/CatalogPage';
import AppliancesPage from './pages/AppliancesPage';
import VehiclesPage from './pages/VehiclesPage';
import BudgetHistory from './components/BudgetHistory';
import ProfileView from './components/ProfileView';
import CostsOverview from './components/CostsOverview';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminCreateUserPage from './pages/admin/AdminCreateUserPage';
import AdminBudgetsPage from './pages/admin/AdminBudgetsPage';
import AdminSuppliersPage from './pages/admin/AdminSuppliersPage';
import AdminCreateSupplierPage from './pages/admin/AdminCreateSupplierPage';
import AdminSupplierDetailPage from './pages/admin/AdminSupplierDetailPage';
import AdminPromotionsPage from './pages/admin/AdminPromotionsPage';
import AdminCreatePromotionPage from './pages/admin/AdminCreatePromotionPage';
import AdminPromotionDetailPage from './pages/admin/AdminPromotionDetailPage';
import { AdminRoute, GuestRoute, ProtectedRoute } from './routes/ProtectedRoute';
import { ROUTES } from './routes/paths';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-500">
      <div className="animate-pulse flex flex-col items-center">
        <BrandLogo className="max-h-20 w-auto mb-4" />
        <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">
          Carregando...
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    databaseService
      .getUser()
      .then((savedUser) => {
        if (savedUser) setUser(savedUser);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route element={<GuestRoute user={user} />}>
        <Route
          path={ROUTES.login}
          element={
            <AuthPage
              onLogin={(u) => {
                setUser(u);
              }}
            />
          }
        />
      </Route>

      <Route element={<ProtectedRoute user={user} />}>
        <Route element={<AppLayout user={user!} onLogout={() => setUser(null)} />}>
          <Route index element={<DashboardOverview />} />
          <Route path="custos" element={<CostsOverview />} />
          <Route path="automotivo" element={<CalculatorRouteAnchor />} />
          <Route path="decorativo" element={<CalculatorRouteAnchor />} />
          <Route path="orcamento" element={<BudgetHistory />} />
          <Route path="historico" element={<Navigate to={ROUTES.orcamento} replace />} />
          <Route path="perfil" element={<ProfileView user={user!} />} />
          <Route element={<AdminRoute user={user!} />}>
            <Route path="catalogo" element={<CatalogPage />} />
            <Route path="base-eletros" element={<AppliancesPage />} />
            <Route path="base-veiculos" element={<VehiclesPage />} />
            <Route path="configuracoes" element={<Navigate to={ROUTES.catalog} replace />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
              <Route path="usuarios/novo" element={<AdminCreateUserPage />} />
              <Route path="usuarios/:userId" element={<AdminUserDetailPage />} />
              <Route path="orcamentos" element={<AdminBudgetsPage />} />
              <Route path="fornecedores" element={<AdminSuppliersPage />} />
              <Route path="fornecedores/novo" element={<AdminCreateSupplierPage />} />
              <Route path="fornecedores/:supplierId" element={<AdminSupplierDetailPage />} />
              <Route path="promocoes" element={<AdminPromotionsPage />} />
              <Route path="promocoes/novo" element={<AdminCreatePromotionPage />} />
              <Route path="promocoes/:promotionId" element={<AdminPromotionDetailPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={user ? ROUTES.dashboard : ROUTES.login} replace />} />
    </Routes>
  );
}
