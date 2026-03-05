
import { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabaseClient';
import { dbService } from '../services/dbService';

const SESSION_KEY = 'cp_active_session';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Auth Supabase
    let subscription: any = null;
    if (supabase) {
      if ((import.meta as any).env.DEV) {
        console.log("[Auth] Iniciando verificação de sessão...");
      }

      const initSession = async () => {
        const timeout = setTimeout(() => {
          if (!isHydrated) {
            console.warn("[Auth] Timeout na verificação de sessão. Forçando hidratação.");
            setIsHydrated(true);
          }
        }, 5000); // 5 segundos de timeout

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if ((import.meta as any).env.DEV) {
            console.log("[Auth] Resultado getSession:", session ? "Sessão Ativa" : "Sem Sessão");
          }
          setSupabaseUser(session?.user ?? null);
          if (session?.user) {
            await refreshUser(session.user.id);
          }
        } catch (err) {
          console.error("[Auth] Erro ao inicializar sessão:", err);
        } finally {
          clearTimeout(timeout);
          setIsHydrated(true);
        }
      };

      initSession();

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((import.meta as any).env.DEV) {
          console.log("[Auth] Evento onAuthStateChange:", event);
        }
        setSupabaseUser(session?.user ?? null);
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          await refreshUser(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      });
      subscription = sub;
    } else {
      setIsHydrated(true);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (currentUser) {
      db.updateUser(currentUser.email, updates);
      refreshUser(currentUser.email);
    }
  };

  const handleSaveStudyPlan = (plan: any) => {
    if (currentUser) {
      db.saveStudyPlan(currentUser.email, plan);
      refreshUser(currentUser.email);
    }
  };

  const refreshUser = async (userIdOrEmail?: string) => {
    const targetId = userIdOrEmail || supabaseUser?.id;
    const targetEmail = currentUser?.email;

    if (targetId && supabase) {
      try {
        // Se targetId não for um UUID (contém @), busca por email primeiro ou ignora loadUserProfile
        let profile = null;
        if (targetId.includes('@')) {
          // Se for email, tentamos buscar o perfil pelo email
          const { data } = await supabase
            .from('profiles')
            .select('plan, plan_status, plan_source, plan_expires_at, role, email, mp_preapproval_id, mp_last_payment_id, nickname')
            .eq('email', targetId)
            .single();
          profile = data;
        } else {
          // Se for UUID
          profile = await dbService.loadUserProfile(targetId);
        }

        if (profile) {
          let user = db.getUserByEmail(profile.email);
          if (!user) {
            // Se o usuário existe no Supabase mas não no banco local, registra localmente
            db.register({
              email: profile.email,
              passwordHash: 'supabase_auth',
              nickname: profile.nickname || profile.email.split('@')[0],
              isPro: profile.plan === 'pro',
              favorites: [],
              history: [],
              savedPlans: []
            });
            user = db.getUserByEmail(profile.email);
          }

          if (user) {
            // Atualiza o banco local com os dados do Supabase
            db.updateUser(profile.email, {
              isPro: profile.plan === 'pro',
              plan_status: profile.plan_status,
              plan_source: profile.plan_source,
              plan_expires_at: profile.plan_expires_at,
              mp_preapproval_id: profile.mp_preapproval_id,
              mp_last_payment_id: profile.mp_last_payment_id
            });

            const updatedUser = db.getUserByEmail(profile.email);
            if (updatedUser) {
              // Gating PIX expirado
              if (updatedUser.plan_source === 'pix' && updatedUser.plan_expires_at) {
                const expiry = new Date(updatedUser.plan_expires_at).getTime();
                if (expiry < Date.now()) {
                  updatedUser.isPro = false;
                  updatedUser.plan_status = 'inactive';
                  db.updateUser(updatedUser.email, { isPro: false, plan_status: 'inactive' });
                }
              }
              setCurrentUser(updatedUser);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar perfil do usuário:", error);
      }
    } else if (targetEmail) {
      const user = db.getUserByEmail(targetEmail);
      if (user) setCurrentUser(user);
    }
  };

  return {
    currentUser,
    supabaseUser,
    isHydrated,
    handleLogin,
    handleLogout,
    handleUpdateUser,
    handleSaveStudyPlan,
    refreshUser
  };
};
