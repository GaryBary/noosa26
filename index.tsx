import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

/**
 * Entry Point for Noosa Navigator
 * The system automatically imports this file. 
 */
const mount = () => {
  console.log('Noosa Navigator: Initializing Coastal Guide...');
  const container = document.getElementById('root');
  
  if (!container) {
    console.error('Fatal: Root container not found');
    return;
  }

  // Clear existing static loading UI
  container.innerHTML = '';

  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('Noosa Navigator: Successfully mounted');
  } catch (error) {
    console.error('Noosa Navigator: Mount failed', error);
  }
};

// Ensure we only mount once the DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  mount();
} else {
  document.addEventListener('DOMContentLoaded', mount);
}