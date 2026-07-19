function cardFromTarget(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('[data-open-item]') : null;
}

export function installContextMenuBridge(root: HTMLElement): () => void {
  let longPressTimer = 0;
  let longPressCard: HTMLElement | null = null;
  let startX = 0;
  let startY = 0;
  let suppressCardClick = false;

  const moveMenus = (nodes: NodeList | Node[]) => {
    for (const node of Array.from(nodes)) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches('.context-menu')) root.append(node);
      node.querySelectorAll<HTMLElement>('.context-menu').forEach((menu) => root.append(menu));
    }
  };

  const closeMenu = () => root.querySelector('.context-menu')?.remove();

  const openMenu = (card: HTMLElement) => {
    const id = card.dataset.openItem;
    if (!id) return;
    closeMenu();
    const name = card.getAttribute('aria-label') || card.querySelector('.card-title, strong')?.textContent?.trim() || 'Contenu';
    const menu = document.createElement('section');
    menu.className = 'context-menu panel web-context-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', `Actions pour ${name}`);
    menu.innerHTML = `<h2></h2><button class="btn primary" data-open-item="${id}">Ouvrir la fiche</button><button class="btn" data-toggle-favorite="${id}">Ajouter ou retirer des favoris</button><button class="btn" data-toggle-watched="${id}">Basculer l’état vu</button><button class="btn" data-close-context>Fermer</button>`;
    menu.querySelector('h2')!.textContent = name;
    menu.querySelectorAll<HTMLButtonElement>('button').forEach((button, index) => {
      button.dataset.focusable = 'true';
      button.dataset.focusZone = 'context-menu';
      button.dataset.focusRow = 'context-menu';
      button.dataset.focusKey = `context:${id}:${index}`;
    });
    menu.querySelector<HTMLButtonElement>('[data-close-context]')?.addEventListener('click', closeMenu);
    root.append(menu);
    menu.querySelector<HTMLButtonElement>('button')?.focus();
  };

  const cancelLongPress = () => {
    window.clearTimeout(longPressTimer);
    longPressTimer = 0;
    longPressCard = null;
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) moveMenus(record.addedNodes);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  moveMenus(document.querySelectorAll('.context-menu'));

  const onContextMenu = (event: MouseEvent) => {
    const card = cardFromTarget(event.target);
    if (!card) return;
    event.preventDefault();
    openMenu(card);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    const card = cardFromTarget(event.target);
    if (!card) return;
    cancelLongPress();
    longPressCard = card;
    startX = event.clientX;
    startY = event.clientY;
    longPressTimer = window.setTimeout(() => {
      if (!longPressCard) return;
      suppressCardClick = true;
      navigator.vibrate?.(18);
      openMenu(longPressCard);
      cancelLongPress();
    }, 560);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!longPressCard) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 12) cancelLongPress();
  };

  const onPointerEnd = () => cancelLongPress();

  const onClickCapture = (event: MouseEvent) => {
    if (!suppressCardClick || !cardFromTarget(event.target)) return;
    suppressCardClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  root.addEventListener('contextmenu', onContextMenu);
  root.addEventListener('pointerdown', onPointerDown, { passive: true });
  root.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('pointerup', onPointerEnd, { passive: true });
  root.addEventListener('pointercancel', onPointerEnd, { passive: true });
  root.addEventListener('click', onClickCapture, true);

  return () => {
    observer.disconnect();
    cancelLongPress();
    root.removeEventListener('contextmenu', onContextMenu);
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerup', onPointerEnd);
    root.removeEventListener('pointercancel', onPointerEnd);
    root.removeEventListener('click', onClickCapture, true);
  };
}
