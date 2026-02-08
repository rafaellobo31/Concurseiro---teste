
import React from 'react';
import { AppView, UserPlan, User } from '../types';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userPlan: UserPlan;
  currentUser: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, userPlan, currentUser, onLogout }) => {
  const NavButton = ({ view, label, icon }: { view: AppView, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => onViewChange(view)} 
      className={`flex items-center gap-2 px-3 lg:px-4 py-2 text-[10px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
        currentView === view 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
          : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );

  return (
    <header className="bg-white border-b border-gray-100 py-3 px-4 sticky top-0 z-50 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-8">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onViewChange('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <h1 className="text-xl font-black tracking-tighter hidden sm:block text-slate-900">C-PRO</h1>
          </div>

          <nav className="flex items-center gap-1">
            <NavButton 
              view="simulado" 
              label="Simulados" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>} 
            />
            <NavButton 
              view="termometro" 
              label="Bancas" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2c1.1 0 2 .9 2 2v10.17c1.13.5 2 1.63 2 2.83 0 1.66-1.34 3-3 3s-3-1.34-3-3c0-1.2.87-2.33 2-2.83V4c0-1.1.9-2 2-2z"/></svg>} 
            />
            {currentUser && (
              <NavButton 
                view="statistics" 
                label="Estatísticas" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>} 
              />
            )}
            <NavButton 
              view="materias" 
              label="Disciplinas" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>} 
            />
            <NavButton 
              view="material" 
              label="Cronogramas" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>} 
            />
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block mr-2">
                <p className="text-[11px] font-black text-gray-900 leading-none">{currentUser.nickname}</p>
                <p className={`text-[9px] font-bold uppercase tracking-widest ${userPlan.isPro ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {userPlan.isPro ? 'Membro PRO' : 'Grátis'}
                </p>
              </div>
              
              <button 
                onClick={() => onViewChange('perfil')} 
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  currentView === 'perfil' 
                    ? 'bg-slate-900 text-white shadow-xl' 
                    : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                }`}
                title="Área do Usuário"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span className="hidden lg:inline">Perfil</span>
              </button>

              <button onClick={onLogout} className="bg-red-50 p-2.5 rounded-xl text-red-400 hover:text-red-600 transition-colors" title="Sair">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          ) : (
            <button onClick={() => onViewChange('auth')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Acessar</button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
