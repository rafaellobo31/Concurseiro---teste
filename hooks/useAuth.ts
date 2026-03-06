
import { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabaseClient';
import { dbService } from '../services/dbService';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Auth Supabase
    let subscription: any = null;
    
    const initAuth = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          await refreshUser(session.user.id);
        }
      }
      setIsHydrated(true);
    };

    initAuth();

    if (supabase) {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSupabaseUser(session?.user ?? null);
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          await refreshUser(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      });
      subscription = sub;
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
    
    if (targetId && supabase) {
      try {
        // Se for um ID (UUID do Supabase), carrega o perfil
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
        
        let profile;
        if (isUUID) {
          profile = await dbService.loadUserProfile(targetId);
        } else {
          // Se for e-mail, tenta achar o usuário no Supabase primeiro se possível, 
          // mas loadUserProfile espera ID. Vamos assumir que refreshUser é chamado com ID quando logado via Supabase.
          // Se tivermos currentUser, podemos usar o id do supabaseUser
          if (supabaseUser?.id) {
            profile = await dbService.loadUserProfile(supabaseUser.id);
          } else {
            // Se não temos ID, buscamos localmente pelo e-mail
            const user = db.getUserByEmail(targetId);
            if (user) setCurrentUser(user);
            return;
          }
        }

        if (profile) {
          // Sincroniza dados do plano do Supabase para o db local (compatibilidade)
          db.updateUser(profile.email, {
            isPro: profile.plan === 'pro',
            plan_status: profile.plan_status,
            plan_source: profile.plan_source,
            plan_expires_at: profile.plan_expires_at,
            mp_preapproval_id: profile.mp_preapproval_id,
            mp_last_payment_id: profile.mp_last_payment_id
          });

          let localUser = db.getUserByEmail(profile.email);
          if (!localUser) {
            db.register({
              email: profile.email,
              passwordHash: '', // Não temos a senha aqui, mas o auth é via Supabase
              nickname: profile.email.split('@')[0],
              isPro: profile.plan === 'pro',
              favorites: [],
              history: [],
              savedPlans: []
            });
            localUser = db.getUserByEmail(profile.email);
          }

          if (localUser) {
            // Garante que os dados do Supabase sobrescrevam o estado local para plano
            const finalUser: User = {
              ...localUser,
              isPro: profile.plan === 'pro',
              plan_status: profile.plan_status,
              plan_source: profile.plan_source,
              plan_expires_at: profile.plan_expires_at,
              mp_preapproval_id: profile.mp_preapproval_id,
              mp_last_payment_id: profile.mp_last_payment_id
            };
            setCurrentUser(finalUser);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar perfil do usuário:", error);
      }
    } else if (userIdOrEmail && !supabase) {
      const user = db.getUserByEmail(userIdOrEmail);
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
