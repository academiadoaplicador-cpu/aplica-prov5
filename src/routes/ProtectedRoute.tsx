import { Navigate, Outlet } from 'react-router-dom';
import { User } from '../types';
import { ROUTES } from './paths';

export function ProtectedRoute({ user }: { user: User | null }) {
  if (!user) {
    return <Navigate to={ROUTES.login} replace />;
  }
  return <Outlet context={{ user }} />;
}

export function AdminRoute({ user }: { user: User }) {
  if (!user.isAdmin) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return <Outlet />;
}

export function GuestRoute({ user }: { user: User | null }) {
  if (user) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return <Outlet />;
}
