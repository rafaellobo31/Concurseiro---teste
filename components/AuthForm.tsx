
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { supabase, supabaseInit } from '../services/supabaseClient';
import { User } from '../types';

interface AuthFormProps {
  onLogin: (user: User) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Logs de diagnóstico utilizando o padrão Vite (import.meta.env)
  // Fix: Cast import.meta to any to resolve TS error when env property is not recognized
  useEffect(() => {
    const metaEnv = (import.meta as any).env;
    console.log("SUPABASE_URL", metaEnv?.VITE_SUPABASE_URL);
    console.log("HAS_ANON_KEY", !!metaEnv?.VITE_SUPABASE_ANON_KEY);
  }, []);

  const validatePassword = (pass: string) => {
    // 6 a 8 caracteres, permitindo letras, números e caracteres especiais
    const regex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{6,8}$/;
    return regex.test(pass);
  };

  const validateEmail = (e: string) => {
    return /\S+@\S+\.\S+/.test(e);
  };

  const isSupabaseConfigured = supabase && supabaseInit.ok;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Autenticação desabilitada: Supabase não configurado.');
      return;
    }
    setError('');
    setIsLoading(true);

    if (isForgot) {
      if (!validateEmail(email)) {
        setError('Por favor, insira um e-mail válido.');
        setIsLoading(false);
        return;
      }
      const { error: resetError } = await supabase!.auth.resetPasswordForEmail(email);
      if (resetError) {
        setError(resetError.message);
      } else {
        alert(`Instruções de recuperação enviadas para: ${email}. Verifique sua caixa de entrada.`);
        setIsForgot(false);
      }
      setIsLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError('E-mail inválido.');
      setIsLoading(false);
      return;
    }

    if (isLogin) {
      const { data, error: loginError } = await supabase!.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) {
        console.error("LOGIN_ERROR", loginError);
        setError(`${loginError.message}${loginError.status ? ` (Status: ${loginError.status})` : ''}`);
      } else if (data.user) {
        // Tenta buscar/criar o perfil local para compatibilidade
        let localUser = db.getUserByEmail(email);
        if (!localUser) {
          db.register({
            email,
            passwordHash: password,
            nickname: email.split('@')[0],
            isPro: false,
            favorites: [],
            history: [],
            savedPlans: []
          });
          localUser = db.getUserByEmail(email);
        }
        if (localUser) onLogin(localUser);
      }
    } else {
      if (!nickname || nickname.length < 3) {
        setError('Seu apelido deve ter pelo menos 3 caracteres.');
        setIsLoading(false);
        return;
      }
      if (!validatePassword(password)) {
        setError('Senha inválida: use de 6 a 8 caracteres (letras, números ou símbolos).');
        setIsLoading(false);
        return;
      }
      
      const { data, error: signUpError } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          data: { nickname }
        }
      });

      if (signUpError) {
        console.error("SIGNUP_ERROR", signUpError);
        setError(`${signUpError.message}${signUpError.status ? ` (Status: ${signUpError.status})` : ''}`);
      } else if (data.user) {
        const success = db.register({
          email,
          passwordHash: password,
          nickname,
          isPro: false,
          favorites: [],
          history: [],
          savedPlans: []
        });

        const newUser = db.getUserByEmail(email);
        if (newUser) onLogin(newUser);
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-3xl border border-gray-200 shadow-2xl animate-in zoom-in duration-500">
      <div className="flex justify-center mb-6">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
      </div>
      
      <h2 className="text-2xl font-black text-center mb-2 text-slate-900">
        {isForgot ? 'Recuperação' : isLogin ? 'Acesse sua Conta' : 'Novo Concurseiro'}
      </h2>
      <p className="text-slate-400 text-center text-xs font-bold uppercase tracking-widest mb-8">
        {isForgot ? 'Enviaremos um link seguro' : isLogin ? 'Entre para ver seu histórico' : 'Junte-se à elite dos estudos'}
      </p>

      {!isSupabaseConfigured && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-[11px] font-bold leading-tight flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Configuração do Supabase ausente no ambiente atual. Autenticação desabilitada até configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isForgot && !isLogin && (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Como quer ser chamado?</label>
            <input 
              type="text" placeholder="Seu apelido de estudos" required 
              className="w-full p-4 rounded-xl border-2 bg-white border-gray-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-sm" 
              value={nickname} onChange={e => setNickname(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">E-mail Válido</label>
          <input 
            type="email" placeholder="estudante@exemplo.com" required 
            className="w-full p-4 rounded-xl border-2 bg-white border-gray-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-sm" 
            value={email} onChange={e => setEmail(e.target.value)}
          />
        </div>
        {!isForgot && (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Senha Segura</label>
            <input 
              type="password" placeholder="••••••••" required 
              className="w-full p-4 rounded-xl border-2 bg-white border-gray-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 shadow-sm" 
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-red-600 text-[11px] font-bold leading-tight flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <button type="submit" disabled={isLoading || !isSupabaseConfigured} className="w-full bg-indigo-600 text-white py-5 rounded-xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-sm tracking-widest uppercase disabled:opacity-50">
          {isLoading ? 'PROCESSANDO...' : isForgot ? 'ENVIAR LINK' : isLogin ? 'ENTRAR NA PLATAFORMA' : 'CRIAR CONTA AGORA'}
        </button>
      </form>

      <div className="mt-8 text-center space-y-4 border-t border-gray-50 pt-6">
        {!isForgot && isLogin && (
          <button onClick={() => { setIsForgot(true); setError(''); }} className="text-[10px] text-slate-400 font-black uppercase hover:text-indigo-600 transition-colors tracking-widest">Esqueci minha senha</button>
        )}
        <p className="text-sm text-slate-500 font-medium">
          {isForgot ? (
            <button onClick={() => { setIsForgot(false); setError(''); }} className="text-indigo-600 font-black uppercase text-xs">Voltar ao login</button>
          ) : isLogin ? (
            <>Não tem conta? <button onClick={() => { setIsLogin(false); setError(''); }} className="text-indigo-600 font-black">Cadastre-se Grátis</button></>
          ) : (
            <>Já faz parte da elite? <button onClick={() => { setIsLogin(true); setError(''); }} className="text-indigo-600 font-black">Faça login</button></>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
