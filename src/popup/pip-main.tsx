import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PipApp } from './PipApp';
import '@fontsource-variable/inter';
import '@/styles/globals.css';
import './App.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <PipApp />
  </StrictMode>,
);
