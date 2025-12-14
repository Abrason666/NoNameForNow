import axios from 'axios';
import { cacheService } from './cacheService'; // NUOVO IMPORT

const API_KEY = '53a4c50394ff821ef3e752f7763ddd40';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';

const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'it-IT'
  }
});

// === FUNZIONI CON CACHE IMPLEMENTATA ===

export const searchMovies = async (query) => {
  try {
    // Cache per ricerche - scade più velocemente (1 ora)
    const cacheKey = `search_movies_${query}`;
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`🔍 Cercando film: "${query}"`);
    const response = await tmdbApi.get('/search/movie', {
      params: { query }
    });

    const results = response.data.results;
    // Cache ricerca per 1 ora
    await cacheService.saveToCache(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Errore ricerca film:', error);
    return [];
  }
};

export const searchTVShows = async (query) => {
  try {
    const cacheKey = `search_tv_${query}`;
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`🔍 Cercando serie TV: "${query}"`);
    const response = await tmdbApi.get('/search/tv', {
      params: { query }
    });

    const results = response.data.results;
    await cacheService.saveToCache(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Errore ricerca serie TV:', error);
    return [];
  }
};

export const getTrendingMovies = async () => {
  try {
    const cacheKey = 'trending_movies';
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log('📈 Caricando film di tendenza...');
    const response = await tmdbApi.get('/trending/movie/week');
    
    const results = response.data.results;
    await cacheService.saveToCache(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Errore film trending:', error);
    return [];
  }
};

export const getTrendingTVShows = async () => {
  try {
    const cacheKey = 'trending_tv';
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log('📈 Caricando serie TV di tendenza...');
    const response = await tmdbApi.get('/trending/tv/week');
    
    const results = response.data.results;
    await cacheService.saveToCache(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Errore serie TV trending:', error);
    return [];
  }
};

export const getPopularMovies = async () => {
  try {
    const cacheKey = 'popular_movies';
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log('🌟 Caricando film popolari...');
    const response = await tmdbApi.get('/movie/popular');
    
    const results = response.data.results;
    await cacheService.saveToCache(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Errore film popolari:', error);
    return [];
  }
};

export const getPopularTVShows = async () => {
  try {
    const cacheKey = 'popular_tv';
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log('🌟 Caricando serie TV popolari...');
    const response = await tmdbApi.get('/tv/popular');
    
    const results = response.data.results;
    await cacheService.saveToCache(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Errore serie TV popolari:', error);
    return [];
  }
};

export const getMovieDetails = async (id) => {
  try {
    const cacheKey = `movie_${id}`;
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`🎬 Caricando dettagli film: ${id}`);
    const response = await tmdbApi.get(`/movie/${id}`);
    
    const movie = response.data;
    
    // Cache anche le immagini del film
    if (movie.poster_path) {
      const posterUrl = `${IMAGE_BASE_URL}${movie.poster_path}`;
      movie.cached_poster = await cacheService.cacheImage(posterUrl, `poster_${id}`);
    }
    
    if (movie.backdrop_path) {
      const backdropUrl = `${BACKDROP_BASE_URL}${movie.backdrop_path}`;
      movie.cached_backdrop = await cacheService.cacheImage(backdropUrl, `backdrop_${id}`);
    }

    await cacheService.saveToCache(cacheKey, movie);
    return movie;
  } catch (error) {
    console.error('Errore dettagli film:', error);
    return null;
  }
};

export const getTVDetails = async (id) => {
  try {
    const cacheKey = `tv_${id}`;
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`📺 Caricando dettagli serie TV: ${id}`);
    const response = await tmdbApi.get(`/tv/${id}`);
    
    const show = response.data;
    
    // Cache anche le immagini della serie
    if (show.poster_path) {
      const posterUrl = `${IMAGE_BASE_URL}${show.poster_path}`;
      show.cached_poster = await cacheService.cacheImage(posterUrl, `tv_poster_${id}`);
    }
    
    if (show.backdrop_path) {
      const backdropUrl = `${BACKDROP_BASE_URL}${show.backdrop_path}`;
      show.cached_backdrop = await cacheService.cacheImage(backdropUrl, `tv_backdrop_${id}`);
    }

    await cacheService.saveToCache(cacheKey, show);
    return show;
  } catch (error) {
    console.error('Errore dettagli serie TV:', error);
    return null;
  }
};

export const getTVSeasons = async (tvId) => {
  try {
    const cacheKey = `tv_seasons_${tvId}`;
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`📺 Caricando stagioni TV: ${tvId}`);
    const response = await tmdbApi.get(`/tv/${tvId}`);
    
    const result = {
      seasons: response.data.seasons,
      details: response.data
    };
    
    await cacheService.saveToCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Errore stagioni TV:', error);
    return { seasons: [], details: null };
  }
};

export const getSeasonEpisodes = async (tvId, seasonNumber) => {
  try {
    const cacheKey = `tv_episodes_${tvId}_s${seasonNumber}`;
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`📺 Caricando episodi: S${seasonNumber} di ${tvId}`);
    const response = await tmdbApi.get(`/tv/${tvId}/season/${seasonNumber}`);
    
    const episodes = response.data.episodes;
    await cacheService.saveToCache(cacheKey, episodes);
    
    return episodes;
  } catch (error) {
    console.error('Errore episodi stagione:', error);
    return [];
  }
};

export const getEpisodeDetails = async (tvId, seasonNumber, episodeNumber) => {
  try {
    const cacheKey = `episode_${tvId}_s${seasonNumber}e${episodeNumber}`;
    const cached = await cacheService.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`📺 Caricando episodio: S${seasonNumber}E${episodeNumber} di ${tvId}`);
    const response = await tmdbApi.get(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`);
    
    const episode = response.data;
    await cacheService.saveToCache(cacheKey, episode);
    
    return episode;
  } catch (error) {
    console.error('Errore dettagli episodio:', error);
    return null;
  }
};

// === FUNZIONI HELPER CON CACHE IMMAGINI ===

export const getImageUrl = (path) => {
  return path ? `${IMAGE_BASE_URL}${path}` : null;
};

export const getBackdropUrl = (path) => {
  return path ? `${BACKDROP_BASE_URL}${path}` : '/placeholder-backdrop.jpg';
};

export const getEpisodeImageUrl = (path) => {
  return path ? `https://image.tmdb.org/t/p/w500${path}` : '/placeholder-episode.jpg';
};

// Nuova funzione helper per immagini con cache
export const getCachedImageUrl = (originalPath, cachedPath, type = 'poster') => {
  // Se abbiamo la versione cachata, usala
  if (cachedPath && cachedPath.startsWith('data:')) {
    return cachedPath;
  }
  
  // Altrimenti usa l'URL originale
  if (originalPath) {
    return type === 'backdrop' 
      ? `${BACKDROP_BASE_URL}${originalPath}`
      : `${IMAGE_BASE_URL}${originalPath}`;
  }
  
  // Placeholder se nessuna immagine disponibile
  return type === 'backdrop' 
    ? '/placeholder-backdrop.jpg'
    : '/placeholder-poster.jpg';
};

export default tmdbApi;