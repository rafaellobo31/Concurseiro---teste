
import { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabaseClient';

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
          const user = db.getUserByEmail(session.user.email!);
          if (user) setCurrentUser(user);
        }
      });

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          const user = db.getUserByEmail(session.user.email!);
          if (user) setCurrentUser(user);
        } else {
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
      setCurrentUser(db.getUserByEmail(currentUser.email) || null);
    }
  };

  const handleSaveStudyPlan = (plan: any) => {
    if (currentUser) {
      db.saveStudyPlan(currentUser.email, plan);
      setCurrentUser(db.getUserByEmail(currentUser.email) || null);
    }
  };

  const refreshUser = () => {
    if (currentUser) {
      setCurrentUser(db.getUserByEmail(currentUser.email) || null);
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
