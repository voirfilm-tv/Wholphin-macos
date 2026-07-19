import type { JellyfinItem } from '../types/jellyfin';

const palette = [
  ['#5b21b6', '#111827'], ['#9f1239', '#1f2937'], ['#0f766e', '#172554'],
  ['#a16207', '#312e81'], ['#334155', '#7c2d12'], ['#0369a1', '#3f3f46'],
];

export const demoItems: JellyfinItem[] = Array.from({ length: 36 }, (_, index) => {
  const movie = index % 3 !== 1;
  const [a, b] = palette[index % palette.length]!;
  return {
    Id: `demo-${index + 1}`,
    Name: movie ? `Film démo ${index + 1}` : `Série démo ${index + 1}`,
    Type: movie ? 'Movie' : 'Series',
    ProductionYear: 1998 + (index % 28),
    RunTimeTicks: movie ? (5_400 + index * 87) * 10_000_000 : 2_700 * 10_000_000,
    CommunityRating: 6.2 + (index % 27) / 10,
    Overview: 'Catalogue fictif déterministe utilisé pour tester l’interface, le focus, les états et les performances sans dépendre d’un serveur privé.',
    Genres: index % 2 ? ['Drame', 'Aventure'] : ['Science-fiction', 'Thriller'],
    UserData: {
      IsFavorite: index % 8 === 0,
      Played: index % 9 === 0,
      PlaybackPositionTicks: index % 5 === 0 ? 1_800 * 10_000_000 : 0,
    },
    ImageTags: { Primary: `${a}|${b}` },
    BackdropImageTags: [`${b}|${a}`],
  };
});

export const demoViews: JellyfinItem[] = [
  { Id: 'demo-movies', Name: 'Films', Type: 'CollectionFolder', CollectionType: 'movies' },
  { Id: 'demo-shows', Name: 'Séries', Type: 'CollectionFolder', CollectionType: 'tvshows' },
  { Id: 'demo-music', Name: 'Musique', Type: 'CollectionFolder', CollectionType: 'music' },
  { Id: 'demo-photos', Name: 'Photos', Type: 'CollectionFolder', CollectionType: 'photos' },
];

export function demoGradient(item: JellyfinItem, backdrop = false): string {
  const token = backdrop ? item.BackdropImageTags?.[0] : item.ImageTags?.Primary;
  const [a = '#4c1d95', b = '#111827'] = String(token ?? '').split('|');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${backdrop ? 1600 : 600} 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="78%" cy="22%" r="24%" fill="white" opacity=".08"/><text x="8%" y="82%" fill="white" opacity=".85" font-size="${backdrop ? 72 : 38}" font-family="system-ui" font-weight="800">${item.Name.replace(/[<>&]/g, '')}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function demoRows(): Array<{ title: string; key: string; items: JellyfinItem[]; landscape?: boolean }> {
  return [
    { key: 'resume', title: 'Continuer à regarder', items: demoItems.filter((item) => (item.UserData?.PlaybackPositionTicks ?? 0) > 0), landscape: true },
    { key: 'latest-movies', title: 'Films récemment ajoutés', items: demoItems.filter((item) => item.Type === 'Movie').slice(0, 16) },
    { key: 'latest-shows', title: 'Séries récemment ajoutées', items: demoItems.filter((item) => item.Type === 'Series').slice(0, 16) },
    { key: 'favorites', title: 'Favoris', items: demoItems.filter((item) => item.UserData?.IsFavorite) },
  ];
}
