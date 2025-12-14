import React, { useState, useEffect, useCallback, useRef } from 'react';
import { searchMovies, searchTVShows, getContentByGenre } from '../services/tmdbApi';
import MovieCarousel from './MovieCarousel';
import './SearchComponent.css';
import storage from '../services/storage';

// 🎭 TUTTI I GENERI DISPONIBILI (chip scorrevoli)
const ALL_GENRE_CHIPS = [
  { id: null, name: 'Tutti', emoji: '🎬' },
  { id: 28, name: 'Azione', emoji: '💥' },
  { id: 12, name: 'Avventura', emoji: '🗺️' },
  { id: 16, name: 'Animazione', emoji: '🎭' },
  { id: 35, name: 'Commedia', emoji: '😂' },
  { id: 80, name: 'Crimine', emoji: '🔫' },
  { id: 99, name: 'Documentario', emoji: '🌍' },
  { id: 18, name: 'Drammatico', emoji: '💔' },
  { id: 10751, name: 'Famiglia', emoji: '👨‍👩‍👧' },
  { id: 14, name: 'Fantasy', emoji: '🧙' },
  { id: 36, name: 'Storia', emoji: '📜' },
  { id: 27, name: 'Horror', emoji: '😱' },
  { id: 10402, name: 'Musicale', emoji: '🎵' },
  { id: 9648, name: 'Mistero', emoji: '🔍' },
  { id: 10749, name: 'Romantico', emoji: '❤️' },
  { id: 878, name: 'Fantascienza', emoji: '🔬' },
  { id: 10770, name: 'Film TV', emoji: '📺' },
  { id: 53, name: 'Thriller', emoji: '🕵️' },
  { id: 10752, name: 'Guerra', emoji: '⚔️' },
  { id: 37, name: 'Western', emoji: '🤠' }
];

// 🎭 GENERI PER LA GRIGLIA (stato iniziale)
const GRID_GENRES = [
  { id: 28, name: 'Azione', emoji: '🎬' },
  { id: 35, name: 'Commedia', emoji: '😂' },
  { id: 18, name: 'Drammatico', emoji: '💔' },
  { id: 27, name: 'Horror', emoji: '😱' },
  { id: 878, name: 'Fantascienza', emoji: '🔬' },
  { id: 14, name: 'Fantasy', emoji: '🧙' },
  { id: 53, name: 'Thriller', emoji: '🕵️' },
  { id: 10749, name: 'Romantico', emoji: '❤️' },
  { id: 16, name: 'Animazione', emoji: '🎭' },
  { id: 99, name: 'Documentario', emoji: '🌍' },
  { id: 10402, name: 'Musicale', emoji: '🎵' },
  { id: 9648, name: 'Mistero', emoji: '🔍' }
];

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [movieResults, setMovieResults] = useState([]);
  const [tvResults, setTvResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [contentType, setContentType] = useState('all');
  
  // 🆕 Ref per lo scroll dei chip
  const chipsScrollRef = useRef(null);

  // ✨ DEBOUNCED SEARCH
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setMovieResults([]);
      setTvResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    
    try {
      console.log(`🔍 Ricerca real-time: "${searchQuery}"`);
      
      const [movieSearchResults, tvSearchResults] = await Promise.all([
        searchMovies(searchQuery),
        searchTVShows(searchQuery)
      ]);
      
      setMovieResults(movieSearchResults);
      setTvResults(tvSearchResults);
    } catch (error) {
      console.error('Errore ricerca:', error);
      setMovieResults([]);
      setTvResults([]);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query.trim().length >= 1) {
        performSearch(query);
      } else if (query.trim().length === 0) {
        setMovieResults([]);
        setTvResults([]);
        setHasSearched(false);
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    performSearch(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    if (newQuery.trim().length >= 1 && hasSearched) {
      setLoading(true);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setMovieResults([]);
    setTvResults([]);
    setHasSearched(false);
    setLoading(false);
    setSelectedGenre(null);
  };

  // 🔧 FUNZIONE CORRETTA: Click su chip genere
  const handleGenreClick = async (genreId, genreName) => {
    setSelectedGenre(genreId);
    
    // 🎯 CASO 1: BARRA VUOTA → Carica contenuti per genere (top ~120)
    if (!query.trim() && genreId !== null) {
      console.log(`🎭 Caricando top contenuti per genere: ${genreName}`);
      setLoading(true);
      setHasSearched(true);
      
      try {
        const content = await getContentByGenre(genreId);
        
        const movies = content.filter(item => item.type === 'movie');
        const tvShows = content.filter(item => item.type === 'tv');
        
        setMovieResults(movies);
        setTvResults(tvShows);
      } catch (error) {
        console.error('Errore caricamento genere:', error);
        setMovieResults([]);
        setTvResults([]);
      }
      
      setLoading(false);
    }
    
    // 🎯 CASO 2: BARRA PIENA → Il filtro viene applicato automaticamente
    // da getFilteredResults() sui risultati già caricati dalla ricerca
    // Questo permette di trovare QUALSIASI film, non solo i top 120!
    
    // 🎯 CASO 3: Reset filtro "Tutti"
    if (genreId === null && query.trim()) {
      // Se clicchi "Tutti" con ricerca attiva, il filtro si resetta
      // e vengono mostrati tutti i risultati della ricerca
      console.log('🎬 Filtro genere rimosso, mostrando tutti i risultati');
    }
  };

  // 🆕 FUNZIONE: Click su card genere (nella griglia)
  const handleGenreCardClick = async (genreId, genreName) => {
    console.log(`🎭 Caricando contenuti per genere: ${genreName}`);
    setLoading(true);
    setHasSearched(true);
    setSelectedGenre(genreId);
    
    try {
      const content = await getContentByGenre(genreId);
      
      const movies = content.filter(item => item.type === 'movie');
      const tvShows = content.filter(item => item.type === 'tv');
      
      setMovieResults(movies);
      setTvResults(tvShows);
    } catch (error) {
      console.error('Errore caricamento genere:', error);
      setMovieResults([]);
      setTvResults([]);
    }
    
    setLoading(false);
  };

  // 🆕 FUNZIONE: Cambio tipo contenuto
  const handleContentTypeChange = (type) => {
    setContentType(type);
  };

  // 🆕 SCROLL CHIP - Sinistra/Destra
  const scrollChips = (direction) => {
    if (chipsScrollRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = chipsScrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      chipsScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  // 🆕 FILTRA RISULTATI in base a genere e tipo selezionati
  const getFilteredResults = (results, type) => {
    let filtered = results;
    
    // Filtra per genere se selezionato
    if (selectedGenre !== null) {
      filtered = filtered.filter(item => 
        item.genre_ids && item.genre_ids.includes(selectedGenre)
      );
    }
    
    // Filtra per tipo se non è "all"
    if (contentType !== 'all') {
      if (type !== contentType) {
        return [];
      }
    }
    
    return filtered;
  };

  const filteredMovies = getFilteredResults(movieResults, 'movie');
  const filteredTV = getFilteredResults(tvResults, 'tv');

  return (
    <div className="search-component">
      {/* Barra di ricerca */}
      <div className="search-header">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Cerca film, serie TV..."
            value={query}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
          <button 
            onClick={handleSearch} 
            className="search-button" 
            disabled={loading || !query.trim()}
          >
            {loading ? '🔄' : '🔍'}
          </button>
          {hasSearched && (
            <button onClick={clearSearch} className="clear-button">
              ✕
            </button>
          )}
        </div>

        {/* 🆕 CHIP GENERI SCORREVOLI */}
        <div className="genre-chips">
          <span className="chips-label">🎭 Filtra per genere:</span>
          
          <div className="chips-scroll-wrapper">
            {/* Freccia sinistra */}
            <button 
              className="chips-scroll-btn left"
              onClick={() => scrollChips('left')}
              aria-label="Scorri generi a sinistra"
            >
              ‹
            </button>
            
            {/* Container scorrevole */}
            <div className="chips-container-scrollable" ref={chipsScrollRef}>
              {ALL_GENRE_CHIPS.map(genre => (
                <button
                  key={genre.id || 'all'}
                  className={`genre-chip ${selectedGenre === genre.id ? 'active' : ''}`}
                  onClick={() => handleGenreClick(genre.id, genre.name)}
                >
                  <span className="chip-emoji">{genre.emoji}</span>
                  <span className="chip-text">{genre.name}</span>
                </button>
              ))}
            </div>
            
            {/* Freccia destra */}
            <button 
              className="chips-scroll-btn right"
              onClick={() => scrollChips('right')}
              aria-label="Scorri generi a destra"
            >
              ›
            </button>
          </div>
        </div>

        {/* 🆕 TOGGLE TIPO CONTENUTO */}
        <div className="content-type-filter">
          <span className="filter-label">📊 Tipo:</span>
          <div className="type-buttons">
            <button
              className={`type-btn ${contentType === 'all' ? 'active' : ''}`}
              onClick={() => handleContentTypeChange('all')}
            >
              Tutti
            </button>
            <button
              className={`type-btn ${contentType === 'movie' ? 'active' : ''}`}
              onClick={() => handleContentTypeChange('movie')}
            >
              🎬 Film
            </button>
            <button
              className={`type-btn ${contentType === 'tv' ? 'active' : ''}`}
              onClick={() => handleContentTypeChange('tv')}
            >
              📺 Serie TV
            </button>
          </div>
        </div>
      </div>

      {/* 🆕 GRIGLIA CATEGORIE (stato iniziale - campo vuoto) */}
      {!hasSearched && !loading && (
        <div className="genre-grid-section">
          <h2 className="grid-title">📋 Esplora per Categorie</h2>
          <p className="grid-subtitle">Scopri contenuti organizzati per genere</p>
          
          <div className="genre-grid">
            {GRID_GENRES.map(genre => (
              <div
                key={genre.id}
                className="genre-card"
                onClick={() => handleGenreCardClick(genre.id, genre.name)}
              >
                <div className="genre-card-emoji">{genre.emoji}</div>
                <h3 className="genre-card-title">{genre.name}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risultati come Carousel */}
      {hasSearched && !loading && (
        <div className="search-results">
          {filteredMovies.length > 0 && (
            <MovieCarousel 
              title={`Film${selectedGenre ? ` - ${ALL_GENRE_CHIPS.find(g => g.id === selectedGenre)?.name}` : ''} (${filteredMovies.length})`}
              items={filteredMovies}
              type="movie"
            />
          )}
          
          {filteredTV.length > 0 && (
            <MovieCarousel 
              title={`Serie TV${selectedGenre ? ` - ${ALL_GENRE_CHIPS.find(g => g.id === selectedGenre)?.name}` : ''} (${filteredTV.length})`}
              items={filteredTV}
              type="tv"
            />
          )}
          
          {filteredMovies.length === 0 && filteredTV.length === 0 && (
            <div className="no-results">
              <h3>😔 Nessun risultato trovato</h3>
              <p>Prova a cambiare i filtri o i termini di ricerca</p>
              <button onClick={clearSearch} className="try-again-button">
                🔄 Nuova Ricerca
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="search-loading">
          <div className="loading-spinner"></div>
          <p>Ricerca in corso...</p>
        </div>
      )}
    </div>
  );
}

export default SearchComponent;