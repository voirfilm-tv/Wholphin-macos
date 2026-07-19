import { installAbortSignalPolyfills } from './core/abortSignalPolyfills';
import { App } from './core/app';
import { installContextMenuBridge } from './core/contextMenuBridge';
import { installBackNavigation } from './core/backNavigation';
import { installResponsiveShellBridge } from './core/responsiveShellBridge';

installAbortSignalPolyfills();

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Racine #app introuvable.');

installContextMenuBridge(root);
installBackNavigation(root);
installResponsiveShellBridge(root);
new App(root).start();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}
