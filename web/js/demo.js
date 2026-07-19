const palette = [
  ['#4c1d95', '#0f172a'], ['#7f1d1d', '#111827'], ['#0f766e', '#172554'], ['#9a3412', '#312e81'],
  ['#1e3a8a', '#581c87'], ['#365314', '#0f172a'], ['#831843', '#1f2937'], ['#164e63', '#3f3f46']
];

const titles = [
  ['Éclipse Zéro', 'Movie', 2026, 'Une équipe scientifique détecte une anomalie qui efface progressivement la lumière du ciel.'],
  ['Dernier Métro pour Mars', 'Movie', 2025, 'Un convoyeur accepte une mission impossible à travers une colonie martienne en quarantaine.'],
  ['La Ligne des Ombres', 'Series', 2024, 'Une enquêtrice cartographie les crimes à partir des souvenirs de leurs témoins.'],
  ['Kintsugi', 'Movie', 2023, 'Deux inconnus réparent un théâtre abandonné et les morceaux de leurs propres vies.'],
  ['Nord Magnétique', 'Series', 2026, 'Une station météo arctique reçoit des messages diffusés vingt ans dans le futur.'],
  ['La Ville sous Verre', 'Movie', 2025, 'Une architecte découvre que la cité parfaite qu’elle a conçue est devenue une prison.'],
  ['Onde Courte', 'Series', 2025, 'Chaque nuit, une radio pirate annonce un événement avant qu’il ne se produise.'],
  ['Mille Étages', 'Movie', 2024, 'Dans une tour sans fin, un coursier cherche l’ascenseur qui mène au monde extérieur.'],
  ['Cobalt', 'Movie', 2026, 'Un pilote vieillissant protège un enfant capable de piloter une machine interdite.'],
  ['Les Jardins d’Argile', 'Series', 2023, 'Une famille de botanistes cultive des plantes qui conservent les souvenirs.'],
  ['Silence de Surface', 'Movie', 2024, 'Une plongeuse revient sur un naufrage dont personne ne semble se souvenir.'],
  ['Neon District', 'Series', 2026, 'Un avocat clandestin défend les habitants numériques d’une mégalopole.'],
  ['Le Poids du Vent', 'Movie', 2022, 'Un village de montagne tente d’empêcher la fermeture de son dernier téléphérique.'],
  ['Archive 77', 'Series', 2025, 'Des archivistes découvrent un dossier qui réécrit les documents consultés.'],
  ['Deux Soleils', 'Movie', 2026, 'Sur une planète condamnée, deux sœurs choisissent des voies opposées pour survivre.'],
  ['Vesper', 'Series', 2024, 'Une brigade nocturne intervient dans les rêves qui débordent sur la ville.']
];

function makeItem([Name, Type, ProductionYear, Overview], index) {
  const [a, b] = palette[index % palette.length];
  const runtimeMinutes = Type === 'Series' ? 48 : 92 + (index * 7) % 45;
  const played = index % 5 === 0;
  const progress = index % 4 === 0 ? 18 + (index * 11) % 70 : 0;
  return {
    Id: `demo-${index + 1}`,
    Name,
    Type,
    ProductionYear,
    Overview,
    RunTimeTicks: runtimeMinutes * 60 * 10_000_000,
    CommunityRating: 6.8 + (index % 16) / 10,
    OfficialRating: index % 3 === 0 ? '12' : 'Tout public',
    Genres: [['Drame', 'Science-fiction'], ['Thriller', 'Mystère'], ['Aventure', 'Fantastique']][index % 3],
    UserData: {
      IsFavorite: index % 6 === 0,
      Played: played,
      PlaybackPositionTicks: progress ? Math.round(runtimeMinutes * 60 * 10_000_000 * progress / 100) : 0
    },
    ImageTags: { Primary: `demo-${index}` },
    BackdropImageTags: [`demo-backdrop-${index}`],
    Placeholder: { a, b },
    MediaSources: [{
      Id: `demo-source-${index}`,
      Name: 'Version principale',
      Container: 'mp4',
      Size: 4_000_000_000 + index * 120_000_000,
      MediaStreams: [
        { Type: 'Video', Codec: 'h264', Width: 3840, Height: 2160 },
        { Type: 'Audio', Codec: 'aac', Language: 'fra', DisplayTitle: 'Français AAC 5.1' },
        { Type: 'Subtitle', Codec: 'subrip', Language: 'fra', DisplayTitle: 'Français' }
      ]
    }]
  };
}

export const demoItems = titles.map(makeItem);

export const demoViews = [
  { Id: 'demo-movies', Name: 'Films', CollectionType: 'movies' },
  { Id: 'demo-shows', Name: 'Séries', CollectionType: 'tvshows' },
  { Id: 'demo-music', Name: 'Musique', CollectionType: 'music' }
];

export function demoRows() {
  return [
    { title: 'Continuer à regarder', items: demoItems.filter(item => item.UserData.PlaybackPositionTicks > 0) },
    { title: 'Films récents', items: demoItems.filter(item => item.Type === 'Movie') },
    { title: 'Séries à découvrir', items: demoItems.filter(item => item.Type === 'Series') },
    { title: 'Favoris', items: demoItems.filter(item => item.UserData.IsFavorite) }
  ];
}

export function demoSearch(query) {
  const term = query.trim().toLocaleLowerCase('fr');
  return demoItems.filter(item => [item.Name, item.Overview, ...(item.Genres || [])].join(' ').toLocaleLowerCase('fr').includes(term));
}

export function demoItem(id) {
  return demoItems.find(item => item.Id === id) || null;
}

export function demoBackdrop(item) {
  if (!item?.Placeholder) return '';
  const { a, b } = item.Placeholder;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><radialGradient id="r" cx="70%" cy="30%"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient><filter id="n"><feTurbulence baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .13 0"/></filter></defs><rect width="1600" height="900" fill="url(#r)"/><circle cx="1160" cy="260" r="280" fill="none" stroke="white" stroke-opacity=".12" stroke-width="70"/><path d="M0 710 Q380 520 760 690 T1600 610 V900 H0Z" fill="#000" fill-opacity=".28"/><rect width="1600" height="900" filter="url(#n)" opacity=".45"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
