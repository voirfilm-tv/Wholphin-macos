import { App } from './core/app';
import { installContextMenuBridge } from './core/contextMenuBridge';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Racine #app introuvable.');

installContextMenuBridge(root);
new App(root).start();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
