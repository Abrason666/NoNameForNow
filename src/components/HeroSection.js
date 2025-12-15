import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrendingMovies, getBackdropUrl } from '../services/tmdbApi';
import './HeroSection.css';
import storage from '../services/storage';

// Componente ExpandableText INLINE solo per HeroSection
function ExpandableTextInline({ text, maxLength = 200 }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || text.length <= maxLength) {
    return <span>{text}</span>;
  }

  const toggleExpanded = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {isExpanded ? (
        <>
          {text}
          <span className="expand-toggle-inline" onClick={toggleExpanded}>
            <strong> Riduci</strong>
          </span>
        </>
      ) : (
        <>
          {text.substring(0, maxLength)}
          <span className="expand-toggle-inline" onClick={toggleExpanded}>
            ... <strong>Continua a leggere</strong>
          </span>
        </>
      )}
    </>
  );
}

function HeroSection() {
  const [heroMovies, setHeroMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favoriteStates, setFavoriteStates] = useState({});
  
  // 🆕 NUOVO STATE: controlla se il carosello è in pausa
  const [isPaused, setIsPaused] = useState(false);
  
  const navigate = useNavigate();

  // Debug storage
  useEffect(() => {
    console.log('🔍 Debug storage:');
    console.log('- window.electronAPI:', window.electronAPI);
    console.log('- storage.isElectron():', storage.checkIfElectron());
    console.log('- Tipo ambiente:', storage.isElectron ? 'ELECTRON (FILE)' : 'BROWSER (localStorage)');
  }, []);

  useEffect(() => {
    const loadHeroMovies = async () => {
      setLoading(true);
      const movies = await getTrendingMovies();
      const heroMoviesList = movies.slice(0, 5);
      setHeroMovies(heroMoviesList);
      
      // Carica stati favoriti
      const favorites = await storage.getFavorites();
      const states = {};
      heroMoviesList.forEach(movie => {
        states[movie.id] = favorites.some(fav => fav.id === movie.id && fav.type === 'movie');
      });
      setFavoriteStates(states);
      
      setLoading(false);
    };

    loadHeroMovies();
  }, []);

  // 🔧 MODIFICATO: Auto-slide solo se NON è in pausa
  useEffect(() => {
    // Se è in pausa O non ci sono film, esci
    if (isPaused || heroMovies.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % heroMovies.length);
    }, 8000); // Cambia slide ogni 5 secondi

    // Cleanup: ferma il timer
    return () => clearInterval(interval);
  }, [heroMovies.length, isPaused]); // 🔧 Aggiungiamo isPaused alle dipendenze

  // Listen for favorites changes
  useEffect(() => {
    const handleFavoritesChanged = async () => {
      const favorites = await storage.getFavorites();
      const states = {};
      heroMovies.forEach(movie => {
        states[movie.id] = favorites.some(fav => fav.id === movie.id && fav.type === 'movie');
      });
      setFavoriteStates(states);
    };

    window.addEventListener('favoritesChanged', handleFavoritesChanged);
    return () => window.removeEventListener('favoritesChanged', handleFavoritesChanged);
  }, [heroMovies]);

  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % heroMovies.length);
  };

  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + heroMovies.length) % heroMovies.length);
  };

  // 🆕 NUOVA FUNZIONE: Toggle pausa/play
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const playMovie = (movie) => {
    console.log('🎬 Riproduci film:', movie.title);
    navigate(`/player/movie/${movie.id}`);
  };

  const toggleFavorites = async (movie) => {
    const favorites = await storage.getFavorites();
    const isCurrentlyFavorite = favorites.some(fav => fav.id === movie.id && fav.type === 'movie');
    
    let updatedFavorites;
    
    if (isCurrentlyFavorite) {
      // Rimuovi dai favoriti
      updatedFavorites = favorites.filter(fav => !(fav.id === movie.id && fav.type === 'movie'));
      console.log('💔 Film rimosso dai favoriti:', movie.title);
    } else {
      // Aggiungi ai favoriti
      const favoriteItem = { ...movie, type: 'movie' };
      updatedFavorites = [...favorites, favoriteItem];
      console.log('❤️ Film aggiunto ai favoriti:', movie.title);
    }
    
    // Aggiorna storage
    await storage.saveFavorites(updatedFavorites);
    
    // Aggiorna stato locale
    setFavoriteStates(prev => ({
      ...prev,
      [movie.id]: !isCurrentlyFavorite
    }));
    
    // Notifica altri componenti
    window.dispatchEvent(new CustomEvent('favoritesChanged', { 
      detail: { favorites: updatedFavorites } 
    }));
  };

  if (loading) {
    return (
      <div className="hero-loading">
        <div className="loading-spinner"></div>
        <p>Caricamento contenuti in evidenza...</p>
      </div>
    );
  }

  if (heroMovies.length === 0) {
    return (
      <div className="hero-loading">
        <p>Nessun contenuto disponibile</p>
      </div>
    );
  }

  const currentMovie = heroMovies[currentIndex];
  const isFavorite = favoriteStates[currentMovie.id] || false;

  return (
    <div className="hero-carousel">
      <div 
        className="hero-section"
        style={{ background: `url(${getBackdropUrl(currentMovie.backdrop_path)})` }}
      >
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">{currentMovie.title}</h1>
            
            <div className="hero-description">
              <ExpandableTextInline 
                text={currentMovie.overview} 
                maxLength={200}
              />
            </div>
            
            <div className="hero-metadata">
              <span className="hero-rating">⭐ {currentMovie.vote_average.toFixed(1)}</span>
              <span className="hero-year">{new Date(currentMovie.release_date).getFullYear()}</span>
              <span className="hero-genre">Film</span>
            </div>
            
            {/* 🎨 BOTTONI CON NUOVO STILE UNIFORME */}
            <div className="hero-actions">
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => playMovie(currentMovie)}
              >
                <span className="btn-icon">▶️</span>
                <span className="btn-text">Riproduci</span>
              </button>
              
              <button 
                className={`btn btn-secondary btn-lg ${isFavorite ? 'remove' : ''}`}
                onClick={() => toggleFavorites(currentMovie)}
              >
                <span className="btn-icon">{isFavorite ? '💔' : '➕'}</span>
                <span className="btn-text">
                  {isFavorite ? 'Rimuovi dalla Lista' : 'Aggiungi alla Lista'}
                </span>
              </button>
            </div>
          </div>
          
          <div className="hero-navigation">
            <button className="hero-nav-btn prev" onClick={prevSlide}>
              ‹
            </button>
            <button className="hero-nav-btn next" onClick={nextSlide}>
              ›
            </button>
          </div>
        </div>

        {/* 🆕 NUOVO: Bottone Pausa/Play in basso a destra */}
        <button 
          className="hero-pause-btn" 
          onClick={togglePause}
          aria-label={isPaused ? "Riprendi carosello" : "Metti in pausa carosello"}
          title={isPaused ? "Riprendi rotazione automatica" : "Metti in pausa"}
        >
          {isPaused ? '▶' : '❚❚'}
        </button>
      </div>
    </div>
  );
}

export default HeroSection;