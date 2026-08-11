import { type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { User } from '../../types';
import { ROUTES } from '../../routes/paths';
import DashboardOverview from '../DashboardOverview';
import CostsOverview from '../CostsOverview';
import BudgetHistory from '../BudgetHistory';
import ProfileView from '../ProfileView';
import CatalogPage from '../../pages/CatalogPage';
import AppliancesPage from '../../pages/AppliancesPage';
import VehiclesPage from '../../pages/VehiclesPage';
import GuiaTecnicoPage from '../../pages/GuiaTecnicoPage';

interface AppStaticRoutesProps {
  path: string;
  user: User;
}

function AdminOnly({ user, children }: { user: User; children: ReactNode }) {
  if (!user.isAdmin) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return children;
}

export default function AppStaticRoutes({ path, user }: AppStaticRoutesProps) {
  if (path === ROUTES.dashboard) {
    return <DashboardOverview key="dashboard" />;
  }
  if (path.startsWith(ROUTES.costs)) {
    return <CostsOverview key="costs" />;
  }
  if (path.startsWith(ROUTES.orcamento)) {
    return <BudgetHistory key="orcamento" />;
  }
  if (path.startsWith(ROUTES.profile)) {
    return <ProfileView key="profile" user={user} />;
  }
  if (path.startsWith(ROUTES.guiaTecnico)) {
    return <GuiaTecnicoPage key="guia-tecnico" />;
  }
  if (path.startsWith(ROUTES.catalog)) {
    return (
      <AdminOnly user={user}>
        <CatalogPage key="catalog" />
      </AdminOnly>
    );
  }
  if (path.startsWith(ROUTES.appliancesBase)) {
    return (
      <AdminOnly user={user}>
        <AppliancesPage key="appliances" />
      </AdminOnly>
    );
  }
  if (path.startsWith(ROUTES.vehiclesBase)) {
    return (
      <AdminOnly user={user}>
        <VehiclesPage key="vehicles" />
      </AdminOnly>
    );
  }
  if (path.startsWith('/admin')) {
    return (
      <AdminOnly user={user}>
        <div key={path}>
          <Outlet />
        </div>
      </AdminOnly>
    );
  }

  return <DashboardOverview key="dashboard-fallback" />;
}
