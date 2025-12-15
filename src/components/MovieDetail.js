import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetails, getBackdropUrl } from '../services/tmdbApi';
import ExpandableText from './ExpandableText';
import './MovieDetail.css';
import storage from '../services/storage';

function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movieDetails, setMovieDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavoriteMovie, setIsFavoriteMovie] = useState(false);

  useEffect(() => {
    const loadMovieData = async () => {
      setLoading(true);
      
      const details = await getMovieDetails(id);
      setMovieDetails(details);
      
      // Carica stato favoriti
      await loadFavoriteStatus();
      
      setLoading(false);
    };

    loadMovieData();
  }, [id]);

  const loadFavoriteStatus = async () => {
    const favorites = await storage.getFavorites();
    const isFavorite = favorites.some(fav => fav.id === parseInt(id) && fav.type === 'movie');
    setIsFavoriteMovie(isFavorite);
  };

  const toggleFavorites = async () => {
    const favorites = await storage.getFavorites();
    let updatedFavorites;
    
    if (isFavoriteMovie) {
      // Rimuovi dai favoriti
      updatedFavorites = favorites.filter(fav => 
        !(fav.id === parseInt(id) && fav.type === 'movie'));
      setIsFavoriteMovie(false);
      console.log('💔 Film rimosso dai favoriti:', movieDetails.title);
    } else {
      // Aggiungi ai favoriti
      const favoriteItem = { ...movieDetails, type: 'movie' };
      updatedFavorites = [...favorites, favoriteItem];
      setIsFavoriteMovie(true);
      console.log('❤️ Film aggiunto ai favoriti:', movieDetails.title);
    }
    
    storage.saveFavorites(updatedFavorites);
    
    window.dispatchEvent(new CustomEvent('favoritesChanged', { 
      detail: { favorites: updatedFavorites } 
    }));
  };

  const playMovie = () => {
    console.log('🎬 Riproduci film:', movieDetails.title);
    navigate(`/player/movie/${id}`);
  };

  if (loading) {
    return (
      <div className="movie-detail-loading">
        <div className="loading-spinner"></div>
        <p>Caricamento dettagli film...</p>
      </div>
    );
  }

  if (!movieDetails) {
    return (
      <div className="movie-detail-error">
        <h2>Film non trovato</h2>
        <button onClick={() => navigate(-1)}>← Torna Indietro</button>
      </div>
    );
  }

  return (
    <div className="movie-detail">
      {/* Hero Section */}
      <div 
        className="movie-hero"
        style={{ backgroundImage: `url(${getBackdropUrl(movieDetails.backdrop_path)})` }}
      >
        <div className="movie-hero-overlay">
          <div className="movie-hero-content">
            <h1>{movieDetails.title}</h1>
            
            {/* Descrizione Espandibile */}
            <ExpandableText
              text={movieDetails.overview}
              maxLength={200}
              className="movie-overview"
              expandText="Continua a leggere"
              collapseText="Riduci"
            />
            
            <div className="movie-metadata">
              <span>⭐ {movieDetails.vote_average?.toFixed(1)}</span>
              <span>{new Date(movieDetails.release_date).getFullYear()}</span>
              <span>🎬 Film</span>
              {movieDetails.runtime && (
                <span>⏱️ {movieDetails.runtime} min</span>
              )}
            </div>
            
            {/* Generi */}
            {movieDetails.genres && movieDetails.genres.length > 0 && (
              <div className="movie-genres">
                {movieDetails.genres.map(genre => (
                  <span key={genre.id} className="genre-tag">
                    {genre.name}
                  </span>
                ))}
              </div>
            )}
            
            {/* Bottoni Azioni */}
            <div className="movie-actions">
              <button 
                className="btn btn-primary btn-lg"
                onClick={playMovie}
              >
                <span className="btn-icon">▶️</span>
                <span className="btn-text">Riproduci</span>
              </button>
              
              <button 
                className={`btn btn-secondary btn-lg ${isFavoriteMovie ? 'remove' : ''}`}
                onClick={toggleFavorites}
              >
                <span className="btn-icon">{isFavoriteMovie ? '💔' : '➕'}</span>
                <span className="btn-text">
                  {isFavoriteMovie ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Informazioni Aggiuntive */}
      <div className="movie-info-section">
        <div className="info-grid">
          {/* Cast */}
          {movieDetails.credits?.cast && movieDetails.credits.cast.length > 0 && (
            <div className="info-card">
              <h3>👥 Cast Principale</h3>
              <div className="cast-list">
                {movieDetails.credits.cast.slice(0, 5).map(actor => (
                  <div key={actor.id} className="cast-member">
                    <span className="actor-name">{actor.name}</span>
                    <span className="character-name">{actor.character}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Regista */}
          {movieDetails.credits?.crew && (
            (() => {
              const director = movieDetails.credits.crew.find(person => person.job === 'Director');
              return director ? (
                <div className="info-card">
                  <h3>🎬 Regia</h3>
                  <p className="director-name">{director.name}</p>
                </div>
              ) : null;
            })()
          )}
          
          {/* Budget & Revenue */}
          {(movieDetails.budget > 0 || movieDetails.revenue > 0) && (
            <div className="info-card">
              <h3>💰 Box Office</h3>
              {movieDetails.budget > 0 && (
                <p><strong>Budget:</strong> ${(movieDetails.budget / 1000000).toFixed(1)}M</p>
              )}
              {movieDetails.revenue > 0 && (
                <p><strong>Incasso:</strong> ${(movieDetails.revenue / 1000000).toFixed(1)}M</p>
              )}
            </div>
          )}
          
          {/* Produzione */}
          {movieDetails.production_companies && movieDetails.production_companies.length > 0 && (
            <div className="info-card">
              <h3>🏢 Produzione</h3>
              <div className="production-list">
                {movieDetails.production_companies.slice(0, 3).map(company => (
                  <span key={company.id} className="production-tag">
                    {company.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MovieDetail;