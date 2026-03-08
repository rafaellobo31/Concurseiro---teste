
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-red-100 max-w-lg w-full text-center">
            <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Ocorreu um erro inesperado na aplicação. Tente recarregar a página ou voltar para o início.
            </p>
            <div className="space-y-4">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all"
              >
                RECARREGAR PÁGINA
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                className="w-full text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                Voltar para o Início
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-slate-900 rounded-xl text-left overflow-auto max-h-40">
                <code className="text-red-400 text-xs font-mono">{this.state.error.toString()}</code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
