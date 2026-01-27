
import React, { useState } from 'react';
import { User, UserPlan, Question, StudyPlan, ModeloQuestao } from '../types';
import HistoryView from './HistoryView';
import QuestionItem from './QuestionItem';
import { db } from '../services/db';

interface UserProfileProps {
  user: User;
  userPlan: UserPlan;
  onUpdate: (updates: Partial<User>) => void;
  onUpgrade: () => void;
  onStartFavExam: () => void;
}

type ProfileTab = 'dados' | 'assinatura' | 'seguranca' | 'planos' | 'favoritos' | 'historico';

const UserProfile: React.FC<UserProfileProps> = ({ user, userPlan, onUpdate, onUpgrade, onStartFavExam }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('dados');
  const [nickname, setNickname] = useState(user.nickname);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleUpdateNickname = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ nickname });
    showMsg('Nome atualizado com sucesso!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.passwordHash !== currentPass) {
      showMsg('Senha atual incorreta.', 'error');
      return;
    }
    if (newPass.length < 8) {
      showMsg('A nova senha deve ter pelo menos 8 caracteres.', 'error');
      return;
    }
    onUpdate({ passwordHash: newPass });
    setCurrentPass('');
    setNewPass('');
    showMsg('Senha alterada com sucesso!');
  };

  const handleRemovePlan = (planId: string) => {
    db.removeStudyPlan(user.email, planId);
    onUpdate({ savedPlans: (user.savedPlans || []).filter(p => p.id !== planId) });
    showMsg('Cronograma removido com sucesso!');
  };

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const TabButton = ({ id, label, icon }: { id: ProfileTab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`group flex items-center gap-3 w-full px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
        activeTab === id 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
          : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
      }`}
    >
      <span className={`${activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {activeTab === id && (
        <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
      )}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar de Navegação */}
        <aside className="lg:w-80 flex flex-col gap-6">
          {/* Card de Perfil Resumido */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-2xl font-black mb-4 shadow-xl border-4 border-slate-800">
                {user.nickname.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-black tracking-tight mb-1">{user.nickname}</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest truncate">{user.email}</p>
              
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nível de Acesso</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${userPlan.isPro ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
                    {userPlan.tier}
                  </span>
                </div>
              </div>
            </div>
            {/* Elemento decorativo de fundo */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-600/10 rounded-full blur-2xl"></div>
          </div>

          {/* Menu de Abas (Sidebar no Desktop / Grid no Mobile) */}
          <nav className="bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-xl grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-col gap-2">
            <TabButton id="dados" label="Meus Dados" icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} />
            <TabButton id="assinatura" label="Assinatura" icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>} />
            <TabButton id="seguranca" label="Segurança" icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>} />
            <TabButton id="planos" label="Cronogramas" icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>} />
            <TabButton id="favoritos" label="Favoritos" icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>} />
            <TabButton id="historico" label="Histórico" icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>} />
          </nav>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden min-h-[600px]">
          <div className="p-8 md:p-12">
            {message && (
              <div className={`mb-8 p-5 rounded-2xl border font-black text-xs uppercase tracking-widest animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  {message.text}
                </div>
              </div>
            )}

            {activeTab === 'dados' && (
              <div className="max-w-xl animate-in fade-in slide-in-from-left-4 duration-500">
                <header className="mb-10">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Meus Dados</h3>
                  <p className="text-slate-400 font-medium">Gerencie como você aparece na plataforma.</p>
                </header>
                <form onSubmit={handleUpdateNickname} className="space-y-8">
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nickname de Guerra</label>
                      <input 
                        type="text" 
                        value={nickname} 
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full p-5 rounded-2xl border-2 border-white focus:border-indigo-500 bg-white font-bold text-slate-900 outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">E-mail de Cadastro</label>
                      <div className="w-full p-5 rounded-2xl border-2 border-slate-100 bg-slate-100/50 font-bold text-slate-400 cursor-not-allowed">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                    ATUALIZAR PERFIL
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'assinatura' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <header className="mb-10">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Plano Atual</h3>
                  <p className="text-slate-400 font-medium">Gestão de acessos e benefícios.</p>
                </header>
                <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="bg-white/20 w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-inner">
                         <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <span className="bg-white/20 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-4 inline-block">
                          Plano {userPlan.tier}
                        </span>
                        <h4 className="text-3xl font-black mb-2">Acesso {userPlan.isPro ? 'Ilimitado' : 'Limitado'}</h4>
                        <p className="text-indigo-100 font-medium text-lg leading-relaxed">
                          {userPlan.isPro 
                            ? 'Você está no nível máximo de preparação. Aproveite todas as ferramentas de IA.' 
                            : 'Mude para o plano PRO e libere simulados ilimitados e cronogramas estratégicos.'}
                        </p>
                      </div>
                      {!userPlan.isPro && (
                        <button onClick={onUpgrade} className="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-50 active:scale-95 transition-all">
                          DAR UN UPGRADE
                        </button>
                      )}
                    </div>
                    {userPlan.proExpiry && (
                      <div className="mt-8 pt-6 border-t border-white/10 text-right">
                        <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest">
                          Sua assinatura expira em: {new Date(userPlan.proExpiry).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                </div>
              </div>
            )}

            {activeTab === 'seguranca' && (
              <div className="max-w-xl animate-in fade-in slide-in-from-left-4 duration-500">
                <header className="mb-10">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Privacidade e Senha</h3>
                  <p className="text-slate-400 font-medium">Mantenha sua conta segura.</p>
                </header>
                <form onSubmit={handleChangePassword} className="space-y-8">
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Senha Atual</label>
                      <input 
                        type="password" 
                        value={currentPass} 
                        onChange={(e) => setCurrentPass(e.target.value)}
                        className="w-full p-5 rounded-2xl border-2 border-white focus:border-indigo-500 bg-white font-bold text-slate-900 outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nova Senha de Acesso</label>
                      <input 
                        type="password" 
                        value={newPass} 
                        onChange={(e) => setNewPass(e.target.value)}
                        className="w-full p-5 rounded-2xl border-2 border-white focus:border-indigo-500 bg-white font-bold text-slate-900 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <button type="submit" className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all">
                    ATUALIZAR CREDENCIAIS
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'planos' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-10">
                <header>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Meus Cronogramas</h3>
                  <p className="text-slate-400 font-medium">Sua bússola tática para os estudos.</p>
                </header>
                
                {!user.savedPlans || user.savedPlans.length === 0 ? (
                  <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="bg-slate-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
                    </div>
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhum cronograma salvo.</p>
                    <p className="text-slate-400 text-xs mt-2">Gere seu primeiro plano na aba "Cronogramas".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8">
                    {user.savedPlans.map((plan) => (
                      <div key={plan.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden group hover:border-indigo-200 transition-all">
                         <div className="bg-slate-50 p-8 border-b border-gray-100 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                           <div>
                              <h4 className="text-xl font-black text-slate-900 mb-1">{plan.title}</h4>
                              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                Criado em {plan.date ? new Date(plan.date).toLocaleDateString('pt-BR') : '---'}
                              </p>
                           </div>
                           <button 
                             onClick={() => plan.id && handleRemovePlan(plan.id)}
                             className="text-slate-300 hover:text-red-500 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md active:scale-95"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                           </button>
                         </div>
                         <div className="p-8">
                           <p className="text-slate-500 font-medium italic mb-8 leading-relaxed">"{plan.summary}"</p>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">Ciclo de Estudo</h5>
                                {plan.phases.slice(0, 3).map((f, i) => (
                                  <div key={i} className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs shrink-0">{i+1}</div>
                                    <div>
                                      <p className="text-xs font-black text-slate-800">{f.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold">{f.duration}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                                 <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                                   Assuntos Chave
                                 </h5>
                                 <div className="space-y-2 relative z-10">
                                    {plan.criticalTopics.slice(0, 4).map((t, i) => (
                                      <div key={i} className="text-[11px] font-bold text-slate-200 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                        {t}
                                      </div>
                                    ))}
                                 </div>
                                 <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl"></div>
                              </div>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favoritos' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Favoritos</h3>
                    <p className="text-slate-400 font-medium">Sua biblioteca de questões para revisão.</p>
                  </div>
                  
                  {user.favorites.length >= 10 && (
                    <button 
                      onClick={onStartFavExam}
                      className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-3 shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      INICIAR SIMULADO DE FAVORITOS
                    </button>
                  )}
                </header>

                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${user.favorites.length >= 10 ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-200 text-amber-700'}`}>
                        {user.favorites.length}
                      </div>
                      <div>
                        <p className="font-black text-amber-900 text-sm uppercase tracking-tight">Status da Revisão</p>
                        <p className="text-xs text-amber-700 font-medium">
                          {user.favorites.length < 10 
                            ? `Faltam ${10 - user.favorites.length} questões para liberar o simulado.` 
                            : 'Simulado de revisão desbloqueado!'}
                        </p>
                      </div>
                   </div>
                   <div className="flex-1 w-full md:max-w-xs bg-amber-200/50 h-3 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min((user.favorites.length / 10) * 100, 100)}%` }}
                      ></div>
                   </div>
                </div>
                
                {user.favorites.length === 0 ? (
                  <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="bg-slate-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </div>
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhuma questão favoritada.</p>
                  </div>
                ) : (
                  <div className="grid gap-8">
                    {user.favorites.map((q, idx) => (
                      <QuestionItem 
                        key={q.id} 
                        question={q} 
                        index={idx} 
                        modelo={q.options ? ModeloQuestao.MULTIPLA_ESCOLHA : ModeloQuestao.VERDADEIRO_FALSO}
                        selectedAnswer={null}
                        onSelect={() => {}}
                        isCorrected={true}
                        isFavorite={true}
                        onToggleFavorite={() => onUpdate({ favorites: user.favorites.filter(f => f.id !== q.id) })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'historico' && <HistoryView history={user.history} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserProfile;
