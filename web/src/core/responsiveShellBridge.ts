export function installResponsiveShellBridge(root: HTMLElement): void {
  root.addEventListener('click', (event) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-action="switch-profile"]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const logout = root.querySelector<HTMLElement>('[data-action="logout"]');
    if (logout && logout !== target) logout.click();
  }, true);
}
