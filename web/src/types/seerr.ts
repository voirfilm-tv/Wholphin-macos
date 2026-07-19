export type SeerrMediaType = 'movie' | 'tv';

export interface SeerrMediaInfo {
  id?: number;
  tmdbId?: number;
  tvdbId?: number | null;
  status?: number;
  requests?: Array<{ id?: number; status?: number; is4k?: boolean }>;
}

export interface SeerrResult {
  id: number;
  mediaType?: SeerrMediaType;
  title?: string;
  name?: string;
  originalTitle?: string;
  originalName?: string;
  overview?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage?: number;
  voteCount?: number;
  popularity?: number;
  genreIds?: number[];
  mediaInfo?: SeerrMediaInfo | null;
}

export interface SeerrDetails extends SeerrResult {
  runtime?: number;
  episodeRunTime?: number[];
  genres?: Array<{ id: number; name: string }>;
  tagline?: string;
  status?: string;
  numberOfSeasons?: number;
  seasons?: Array<{ id: number; name: string; seasonNumber: number; episodeCount?: number; airDate?: string; posterPath?: string | null }>;
  credits?: {
    cast?: Array<{ id: number; name: string; character?: string; profilePath?: string | null }>;
    crew?: Array<{ id: number; name: string; job?: string; department?: string; profilePath?: string | null }>;
  };
  externalIds?: { imdbId?: string | null; tvdbId?: number | null };
}

export interface SeerrPage<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export interface SeerrStatus {
  version: string;
  commitTag?: string;
  updateAvailable?: boolean;
  restartRequired?: boolean;
}

export interface SeerrRequest {
  id: number;
  status?: number;
  media?: SeerrMediaInfo;
}
