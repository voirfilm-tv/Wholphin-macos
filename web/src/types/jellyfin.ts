export type CollectionType =
  | 'movies'
  | 'tvshows'
  | 'boxsets'
  | 'playlists'
  | 'livetv'
  | 'music'
  | 'photos'
  | 'homevideos'
  | 'musicvideos'
  | 'books'
  | 'folders'
  | string;

export type ItemType =
  | 'Movie'
  | 'Series'
  | 'Episode'
  | 'Season'
  | 'BoxSet'
  | 'Playlist'
  | 'CollectionFolder'
  | 'Folder'
  | 'UserView'
  | 'Person'
  | 'PhotoAlbum'
  | 'MusicAlbum'
  | 'MusicArtist'
  | 'Audio'
  | 'Photo'
  | 'Video'
  | 'MusicVideo'
  | string;

export interface JellyfinUserData {
  IsFavorite?: boolean;
  Played?: boolean;
  PlaybackPositionTicks?: number;
  UnplayedItemCount?: number;
  PlayCount?: number;
}

export interface JellyfinMediaStream {
  Index?: number;
  Type?: 'Video' | 'Audio' | 'Subtitle' | string;
  Codec?: string;
  DisplayTitle?: string;
  Language?: string;
  IsDefault?: boolean;
  IsForced?: boolean;
  SupportsExternalStream?: boolean;
  DeliveryUrl?: string;
  Title?: string;
  ChannelLayout?: string;
}

export interface JellyfinChapter {
  StartPositionTicks: number;
  Name?: string;
  ImageTag?: string;
}

export interface JellyfinMediaSource {
  Id?: string;
  Name?: string;
  Path?: string;
  Container?: string;
  SupportsDirectPlay?: boolean;
  SupportsDirectStream?: boolean;
  SupportsTranscoding?: boolean;
  TranscodingUrl?: string;
  DirectStreamUrl?: string;
  MediaStreams?: JellyfinMediaStream[];
  Bitrate?: number;
  Size?: number;
  VideoType?: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: ItemType;
  CollectionType?: CollectionType;
  Overview?: string;
  ProductionYear?: number;
  RunTimeTicks?: number;
  CommunityRating?: number;
  CriticRating?: number;
  OfficialRating?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  SeriesName?: string;
  SeriesId?: string;
  SeasonId?: string;
  ParentId?: string;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  Artists?: string[];
  AlbumPrimaryImageTag?: string;
  ChildCount?: number;
  Genres?: string[];
  Studios?: Array<{ Name?: string; Id?: string }>;
  People?: Array<{ Name?: string; Id?: string; Type?: string; Role?: string; PrimaryImageTag?: string }>;
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  ParentBackdropImageTags?: string[];
  ParentBackdropItemId?: string;
  PrimaryImageAspectRatio?: number;
  MediaSources?: JellyfinMediaSource[];
  Chapters?: JellyfinChapter[];
  UserData?: JellyfinUserData;
  DateCreated?: string;
  PremiereDate?: string;
  EndDate?: string;
  Status?: string;
}

export interface QueryResult<T> {
  Items: T[];
  TotalRecordCount?: number;
  StartIndex?: number;
}

export interface PublicSystemInfo {
  ServerName: string;
  Version: string;
  Id?: string;
  LocalAddress?: string;
}

export interface AuthenticationResult {
  AccessToken: string;
  ServerId?: string;
  User: {
    Id: string;
    Name: string;
    PrimaryImageTag?: string;
    Policy?: { IsAdministrator?: boolean };
  };
}

export interface PlaybackInfoResult {
  PlaySessionId?: string;
  MediaSources?: JellyfinMediaSource[];
  ErrorCode?: string;
}
