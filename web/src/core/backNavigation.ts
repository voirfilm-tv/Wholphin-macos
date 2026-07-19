function isEditable(element: Element | null): boolean {
  return Boolean(element?.matches('input, textarea, select, [contenteditable="true"]'));
}

function isBackKey(event: KeyboardEvent): boolean {
  return event.key === 'Escape'
    || event.key === 'Backspace'
    || event.key === 'BrowserBack'
    || event.key === 'GoBack'
    || event.keyCode === 461;
}

export function installBackNavigation(root: HTMLElement): () => void {
  const listener = (event: KeyboardEvent) => {
    if (!isBackKey(event) || isEditable(document.activeElement)) return;
    if (document.querySelector('.player-shell')) return;
    const contextMenu = root.querySelector('.context-menu');
    if (contextMenu) {
      event.preventDefault();
      event.stopPropagation();
      contextMenu.remove();
      return;
    }
    const shell = root.querySelector<HTMLElement>('.app-shell');
    const drawer = root.querySelector<HTMLElement>('.side-nav');
    const expanded = shell?.classList.contains('drawer-expanded') || drawer?.classList.contains('expanded');
    if (expanded) {
      event.preventDefault();
      event.stopPropagation();
      shell?.classList.remove('drawer-expanded');
      drawer?.classList.remove('expanded');
      root.querySelector<HTMLElement>('[data-focus-zone="content"], [data-focus-zone="hero"], [data-focus-zone="topbar"]')?.focus();
      return;
    }
    const route = location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
    if (route === 'home') {
      event.preventDefault();
      event.stopPropagation();
      shell?.classList.add('drawer-expanded');
      drawer?.classList.add('expanded');
      root.querySelector<HTMLElement>('[data-focus-key="nav:home"]')?.focus();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    history.back();
  };
  document.addEventListener('keydown', listener, true);
  return () => document.removeEventListener('keydown', listener, true);
}
