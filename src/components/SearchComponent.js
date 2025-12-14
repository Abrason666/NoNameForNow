import React, { useState, useEffect, useCallback } from 'react';
import { searchMovies, searchTVShows } from '../services/tmdbApi';
import MovieCarousel from './MovieCarousel';
import './SearchComponent.css';
import storage from '../services/storage';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [movieResults, setMovieResults] = useState([]);
  const [tvResults, setTvResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ✨ DEBOUNCED SEARCH - Ricerca mentre digiti con delay
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
      
      // Cerca sia film che serie TV contemporaneamente
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

  // ✨ DEBOUNCE EFFECT - Attesa di 500ms dopo che smetti di digitare
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query.trim().length >= 1) {
        performSearch(query);
      } else if (query.trim().length === 0) {
        // Pulisci tutto se query vuoto
        setMovieResults([]);
        setTvResults([]);
        setHasSearched(false);
        setLoading(false);
      }
    }, 500);

    // Cleanup del timer se l'utente continua a digitare
    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  // Ricerca manuale (clic su bottone o Enter)
  const handleSearch = async () => {
    if (!query.trim()) return;
    performSearch(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Gestione input con feedback visivo
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Se digita dopo aver cercato, mostra subito loading
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
  };

  // Quick search presets
  const quickSearch = (searchTerm) => {
    setQuery(searchTerm);
    performSearch(searchTerm);
  };

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
              ❌
            </button>
          )}
        </div>
        

      </div>



      {/* Risultati come Carousel Netflix-style */}
      {hasSearched && !loading && (
        <div className="search-results">
          {movieResults.length > 0 && (
            <MovieCarousel 
              title={`Film per "${query}" (${movieResults.length} risultati)`}
              items={movieResults}
              type="movie"
            />
          )}
          
          {tvResults.length > 0 && (
            <MovieCarousel 
              title={`Serie TV per "${query}" (${tvResults.length} risultati)`}
              items={tvResults}
              type="tv"
            />
          )}
          
          {movieResults.length === 0 && tvResults.length === 0 && (
            <div className="no-results">
              <h3>😔 Nessun risultato trovato</h3>
              <p>Prova con termini di ricerca diversi</p>
              <button onClick={clearSearch} className="try-again-button">
                🔄 Nuova Ricerca
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stato iniziale con suggerimenti */}
      {!hasSearched && (
        <div className="search-welcome">
          <h3>🔍 Cerca i tuoi contenuti preferiti</h3>
          <div className="search-suggestions">
            <button onClick={() => quickSearch('Avengers')} className="suggestion-btn">
              Avengers
            </button>
            <button onClick={() => quickSearch('Breaking Bad')} className="suggestion-btn">
              Breaking Bad
            </button>
            <button onClick={() => quickSearch('The Office')} className="suggestion-btn">
              The Office
            </button>
            <button onClick={() => quickSearch('Stranger Things')} className="suggestion-btn">
              Stranger Things
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchComponent;