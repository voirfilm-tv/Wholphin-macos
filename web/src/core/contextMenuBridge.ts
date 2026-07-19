export function installContextMenuBridge(root: HTMLElement): () => void {
  const moveMenus = (nodes: NodeList | Node[]) => {
    for (const node of Array.from(nodes)) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches('.context-menu')) root.append(node);
      node.querySelectorAll<HTMLElement>('.context-menu').forEach((menu) => root.append(menu));
    }
  };
  const observer = new MutationObserver((records) => {
    for (const record of records) moveMenus(record.addedNodes);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  moveMenus(document.querySelectorAll('.context-menu'));
  return () => observer.disconnect();
}
