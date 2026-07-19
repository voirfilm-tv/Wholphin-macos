import { App } from './core/app';
import { installContextMenuBridge } from './core/contextMenuBridge';
import { installBackNavigation } from './core/backNavigation';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Racine #app introuvable.');

installContextMenuBridge(root);
installBackNavigation(root);
new App(root).start();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
