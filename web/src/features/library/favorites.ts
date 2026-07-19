import type { ScreenContext, ScreenResult } from '../../core/context';
import { demoItems } from '../../demo/catalog';
import { mediaCard } from '../../ui/media';

export async function renderFavorites(context: ScreenContext): Promise<ScreenResult> {
  const items = context.demo
    ? demoItems.filter((item) => context.store.isDemoFavorite(item.Id) || item.UserData?.IsFavorite)
    : (await context.api!.items({ filters: 'IsFavorite', limit: 200, signal: context.signal })).Items;
  for (const item of items) context.items.set(item.Id, item);
  if (items[0]) context.setBackdrop(items[0]);
  return {
    title: 'Favoris',
    html: items.length
      ? `<div class="media-grid">${items.map((item) => mediaCard(item, { api: context.api, demo: context.demo, showTitles: context.store.preferences().showTitles, rowKey: 'favorites' })).join('')}</div>`
      : '<div class="empty"><div><h2>Aucun favori</h2><p>Ajoute des contenus depuis leur fiche ou leur menu contextuel.</p></div></div>',
  };
}
