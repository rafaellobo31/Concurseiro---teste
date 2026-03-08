<<<<<<< HEAD

import { useState, useEffect } from 'react';
import { AppView } from '../types';

export const useNavigation = (isPro: boolean) => {
  const [view, setView] = useState<AppView | 'admin'>('home');
  const [proWallFeature, setProWallFeature] = useState<string | null>(null);

  useEffect(() => {
    const handleAdminSecret = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'A') {
        setView('admin');
      }
    };
    window.addEventListener('keydown', handleAdminSecret);

    // Detectar rota de retorno de assinatura
    if (window.location.pathname === '/assinatura/retorno') {
      setView('assinatura_retorno');
    }

    return () => {
      window.removeEventListener('keydown', handleAdminSecret);
    };
  }, []);

  const handleViewChange = (newView: AppView | 'admin', resetExamCallback?: () => void) => {
    if ((newView === 'material' || newView === 'termometro') && !isPro) {
      setProWallFeature(newView === 'material' ? "gerar cronogramas táticos e personalizados de estudo" : "acessar o termômetro de recorrência de questões");
      return; 
    }
    
    if (newView !== 'user_analysis' && newView !== 'planos') {
      if (resetExamCallback) resetExamCallback();
    }
    
    setView(newView);
    setProWallFeature(null);
  };

  return {
    view,
    setView,
    proWallFeature,
    setProWallFeature,
    handleViewChange
  };
};
=======

import { useState, useEffect } from 'react';
import { AppView } from '../types';

export const useNavigation = (isPro: boolean) => {
  const [view, setView] = useState<AppView | 'admin'>('home');
  const [proWallFeature, setProWallFeature] = useState<string | null>(null);

  useEffect(() => {
    const handleAdminSecret = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'A') {
        setView('admin');
      }
    };
    window.addEventListener('keydown', handleAdminSecret);

    // Detectar rota de retorno de assinatura
    if (window.location.pathname === '/assinatura/retorno') {
      setView('assinatura_retorno');
    }

    return () => {
      window.removeEventListener('keydown', handleAdminSecret);
    };
  }, []);

  const handleViewChange = (newView: AppView | 'admin', resetExamCallback?: () => void) => {
    if ((newView === 'material' || newView === 'termometro') && !isPro) {
      setProWallFeature(newView === 'material' ? "gerar cronogramas táticos e personalizados de estudo" : "acessar o termômetro de recorrência de questões");
      return; 
    }
    
    if (newView !== 'user_analysis' && newView !== 'planos') {
      if (resetExamCallback) resetExamCallback();
    }
    
    setView(newView);
    setProWallFeature(null);
  };

  return {
    view,
    setView,
    proWallFeature,
    setProWallFeature,
    handleViewChange
  };
};
>>>>>>> 2e9a6ce4e8a03bcb16cce85d3c8bb8bf34489aad
