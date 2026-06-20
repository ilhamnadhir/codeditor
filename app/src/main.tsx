import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
// Apply persisted theme early to avoid flash
const savedTheme = (localStorage.getItem('cs_theme') || 'dark');
document.documentElement.setAttribute('data-theme', savedTheme);
createRoot(document.getElementById('root')!).render(<StrictMode>
    <App />
  </StrictMode>);
