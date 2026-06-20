import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const originalError = console.error;
console.error = (...args) => {
  fetch('/__log', { method: 'POST', body: JSON.stringify(args) }).catch(()=>{});
  originalError(...args);
};

// Apply persisted theme early to avoid flash
const savedTheme = (localStorage.getItem('cs_theme') || 'dark');
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);