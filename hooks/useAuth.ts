
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
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          refreshUser(session.user.id);
        }
      });

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, session) => {
        setSupabaseUser(session?.user ?? null);
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          refreshUser(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      });
      subscription = sub;
    }

    setIsHydrated(true);
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
        const profile = await dbService.loadUserProfile(targetId);

        if (profile) {
          // Atualiza o banco local com os dados do Supabase
          db.updateUser(profile.email, {
            isPro: profile.plan === 'pro',
            plan_status: profile.plan_status,
            plan_source: profile.plan_source,
            plan_expires_at: profile.plan_expires_at,
            mp_preapproval_id: profile.mp_preapproval_id,
            mp_last_payment_id: profile.mp_last_payment_id
          });

          const user = db.getUserByEmail(profile.email);
          if (user) {
            // Gating PIX expirado (mantendo lógica existente se necessário, mas profile deve ser soberano)
            if (user.plan_source === 'pix' && user.plan_expires_at) {
              const expiry = new Date(user.plan_expires_at).getTime();
              if (expiry < Date.now()) {
                user.isPro = false;
                user.plan_status = 'inactive';
                db.updateUser(user.email, { isPro: false, plan_status: 'inactive' });
              }
            }
            setCurrentUser(user);
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
