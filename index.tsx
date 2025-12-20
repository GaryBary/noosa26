import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

console.log('Noosa Navigator: Script Loaded');

const init = () => {
  const container = document.getElementById('root');
  if (!container) return;

  // Clear static loading UI
  container.innerHTML = '';

  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('Noosa Navigator: Render Complete');
  } catch (err) {
    console.error('Noosa Navigator: Render Error', err);
  }
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}