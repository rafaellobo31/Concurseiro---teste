
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Shim para evitar erro de 'process is not defined' em navegadores
// Fix: Added type assertion to bypass TypeScript check for 'process' on window
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Erro crítico na renderização da aplicação:", error);
  rootElement.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">Erro ao carregar a aplicação. Verifique o console.</div>`;
}
