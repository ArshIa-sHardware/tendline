import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@daypicker/react/style.css';
import './styles.css';

try {
  document.documentElement.dataset.theme = localStorage.getItem('bedside-theme') || 'system';
} catch {
  /* System theme works without storage. */
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
// Do not force an update while someone is writing. The new worker activates after
// all old tabs close, so a reload cannot discard a draft or an unsynced notebook.
registerSW({ immediate: true });
