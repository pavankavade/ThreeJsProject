import './style.css';
import { Engine } from './core/Engine';

window.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    const engine = new Engine(appContainer);
    engine.start();
  }
});
