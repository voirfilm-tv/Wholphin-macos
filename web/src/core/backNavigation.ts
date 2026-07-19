function isEditable(element: Element | null): boolean {
  return Boolean(element?.matches('input, textarea, select, [contenteditable="true"]'));
}

function isHardwareBackKey(event: KeyboardEvent): boolean {
  return event.key === 'BrowserBack'
    || event.key === 'GoBack'
    || event.keyCode === 461;
}

export function installBackNavigation(root: HTMLElement): () => void {
  const listener = (event: KeyboardEvent) => {
    if (isEditable(document.activeElement) || document.querySelector('.player-shell')) return;

    if (event.key === 'Escape') {
      const contextMenu = root.querySelector('.context-menu');
      if (contextMenu) {
        event.preventDefault();
        event.stopPropagation();
        contextMenu.remove();
        return;
      }

      const mobileMore = root.querySelector<HTMLDetailsElement>('.mobile-more[open]');
      if (mobileMore) {
        event.preventDefault();
        event.stopPropagation();
        mobileMore.open = false;
        mobileMore.querySelector<HTMLElement>('summary')?.focus();
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
      }
      return;
    }

    if (!isHardwareBackKey(event)) return;
    event.preventDefault();
    event.stopPropagation();
    history.back();
  };

  document.addEventListener('keydown', listener, true);
  return () => document.removeEventListener('keydown', listener, true);
}
