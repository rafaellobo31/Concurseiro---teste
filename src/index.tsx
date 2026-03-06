
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log("[Index] Carregando ponto de entrada...");
const rootElement = document.getElementById('root');
console.log("[Index] Root element:", rootElement ? "Encontrado" : "NÃO ENCONTRADO");

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("[Index] Erro fatal na renderização:", err);
    rootElement.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;"><h1>Erro de Inicialização</h1><p>' + err.message + '</p></div>';
  }
}
