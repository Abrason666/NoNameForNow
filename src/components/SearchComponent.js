import React, { useState, useEffect, useCallback, useRef } from 'react';
import { searchMovies, searchTVShows, getContentByGenre } from '../services/tmdbApi';
import SearchResultsGrid from './SearchResultsGrid';
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
  const [sortOrder, setSortOrder] = useState('popularity'); // 🆕 STATO ORDINAMENTO
  
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

      // ✅ FIX: Aggiungi campo "type" a ogni item
      const moviesWithType = movieSearchResults.map(item => ({ ...item, type: 'movie' }));
      const tvWithType = tvSearchResults.map(item => ({ ...item, type: 'tv' }));

      setMovieResults(moviesWithType);
      setTvResults(tvWithType);
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

  // 🔧 FUNZIONE: Click su chip genere
  const handleGenreClick = async (genreId, genreName) => {
    setSelectedGenre(genreId);
    
    // 🎯 CASO SPECIALE: Click su "Tutti" con barra vuota → RESET COMPLETO
    if (genreId === null && !query.trim()) {
      console.log('🎬 Reset completo: tornando alla griglia categorie');
      setMovieResults([]);
      setTvResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }
    
    // 🎯 CASO 1: BARRA VUOTA → Carica contenuti per genere
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
    if (genreId === null && query.trim()) {
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


  // 🆕 FILTRA RISULTATI solo per tipo (genere già filtrato da API)
  const getFilteredResults = (results, type) => {
    let filtered = results;
    
    // 🎯 FILTRO GENERE SOLO PER RICERCA TESTUALE (non per generi cliccati)
    if (selectedGenre !== null && query.trim()) {
      // Se c'è una ricerca testuale E un genere selezionato, applica filtro client-side
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

  // 🆕 ORDINA RISULTATI in base alla scelta utente
  const getSortedResults = (items) => {
    const combined = [...items];
    
    switch (sortOrder) {
      case 'alphabetical':
        return combined.sort((a, b) => {
          const nameA = (a.title || a.name).toLowerCase();
          const nameB = (b.title || b.name).toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
      case 'date':
        return combined.sort((a, b) => {
          const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
          const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
          return dateB - dateA;
        });
        
      case 'rating':
        return combined.sort((a, b) => b.vote_average - a.vote_average);
        
      case 'random':
        return combined.sort(() => Math.random() - 0.5);
        
      case 'popularity':
      default:
        return combined.sort((a, b) => b.popularity - a.popularity);
    }
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
                {/* 🆕 FILTERS ROW - LAYOUT COMPATTO */}
        <div className="filters-row">
          {/* CHIP GENERI */}
          <div className="genre-chips">
            <span className="chips-label">🎭 Genere:</span>
            
            <div className="chips-scroll-wrapper">
              <button 
                className="chips-scroll-btn left"
                onClick={() => scrollChips('left')}
                aria-label="Scorri generi a sinistra"
              >
                ‹
              </button>
              
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
              
              <button 
                className="chips-scroll-btn right"
                onClick={() => scrollChips('right')}
                aria-label="Scorri generi a destra"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* TYPE + SORT IN UNA RIGA */}
        <div className="type-sort-row">
          {/* TIPO CONTENUTO */}
          <div className="content-type-filter">
            
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

          {/* ORDINAMENTO */}
          <div className="sort-selector">
            <span className="sort-label">📊 Ordina:</span>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value)}
              className="sort-dropdown"
            >
              <option value="popularity">⭐ Popolarità</option>
              <option value="alphabetical">🔤 Alfabetico (A-Z)</option>
              <option value="date">📅 Data uscita</option>
              <option value="rating">🏆 Voto alto</option>
              <option value="random">🎲 Casuale</option>
            </select>
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

      {/* Risultati come Griglia Paginata */}
      {hasSearched && !loading && (
        <div className="search-results">
          {(filteredMovies.length > 0 || filteredTV.length > 0) ? (
            <SearchResultsGrid 
              items={getSortedResults([...filteredMovies, ...filteredTV])} 
              query={query || `Genere: ${ALL_GENRE_CHIPS.find(g => g.id === selectedGenre)?.name || 'Tutti'}`}
              selectedGenre={selectedGenre}
              contentType={contentType}
            />
          ) : (
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