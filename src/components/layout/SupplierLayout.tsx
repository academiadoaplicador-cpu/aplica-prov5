import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { User } from '../../types';
import { ROUTES } from '../../routes/paths';
import { databaseService } from '../../services/databaseService';

/** Área do fornecedor: hoje é uma página só (o próprio cadastro). */
export default function SupplierLayout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await databaseService.logout();
    onLogout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
        <img
          src="/login.png"
          alt="Aplica PRO"
          className="w-9 h-9 rounded-lg object-contain shrink-0"
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white leading-tight truncate">Aplica Pro</p>
          <p className="text-[10px] text-amber-400 font-mono tracking-widest uppercase truncate">
            Área do Fornecedor
          </p>
        </div>
        <span className="hidden sm:block text-xs text-slate-500 truncate max-w-[16rem]" title={user.email}>
          {user.email}
        </span>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="inline-flex items-center gap-2 shrink-0 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </header>

      <main className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
