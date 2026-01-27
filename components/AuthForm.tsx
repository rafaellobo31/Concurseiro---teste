
import React, { useState } from 'react';
import { db } from '../services/db';
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
  const [error, setError] = useState('');

  // 8+ caracteres, letras (M/m), números e especiais
  const validatePassword = (pass: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pass);
  };

  const validateEmail = (e: string) => {
    return /\S+@\S+\.\S+/.test(e);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isForgot) {
      if (!validateEmail(email)) {
        setError('Por favor, insira um e-mail válido.');
        return;
      }
      alert(`Instruções de recuperação enviadas para: ${email}. Verifique sua caixa de entrada.`);
      setIsForgot(false);
      return;
    }

    if (!validateEmail(email)) {
      setError('E-mail inválido.');
      return;
    }

    if (isLogin) {
      const user = db.getUserByEmail(email);
      if (user && user.passwordHash === password) {
        onLogin(user);
      } else {
        setError('E-mail ou senha incorretos.');
      }
    } else {
      if (!nickname) {
        setError('Como quer ser chamado?');
        return;
      }
      if (!validatePassword(password)) {
        setError('A senha deve ter 8+ caracteres, incluindo maiúsculas, minúsculas, números e símbolos (@$!%*?&).');
        return;
      }
      // Fix: Added missing 'savedPlans' property to comply with User interface
      const success = db.register({
        email,
        passwordHash: password,
        nickname,
        isPro: false,
        favorites: [],
        history: [],
        savedPlans: []
      });
      if (success) {
        onLogin(db.getUserByEmail(email)!);
      } else {
        setError('Este e-mail já está em uso.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-3xl border border-gray-200 shadow-2xl animate-in zoom-in">
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isForgot && !isLogin && (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Como quer ser chamado?</label>
            <input 
              type="text" placeholder="Seu apelido de estudos" required 
              className="w-full p-4 rounded-xl border-2 bg-white border-gray-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400" 
              value={nickname} onChange={e => setNickname(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Válido</label>
          <input 
            type="email" placeholder="estudante@exemplo.com" required 
            className="w-full p-4 rounded-xl border-2 bg-white border-gray-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400" 
            value={email} onChange={e => setEmail(e.target.value)}
          />
        </div>
        {!isForgot && (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Segura</label>
            <input 
              type="password" placeholder="••••••••" required 
              className="w-full p-4 rounded-xl border-2 bg-white border-gray-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400" 
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-red-600 text-[11px] font-bold leading-tight">
            {error}
          </div>
        )}

        <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
          {isForgot ? 'ENVIAR LINK DE RECUPERAÇÃO' : isLogin ? 'ENTRAR NA PLATAFORMA' : 'CRIAR CONTA AGORA'}
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
