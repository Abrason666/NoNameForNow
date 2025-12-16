import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTVSeasons, getSeasonEpisodes, getBackdropUrl, getEpisodeImageUrl } from '../services/tmdbApi';
import ExpandableText from './ExpandableText';
import SmartImage from './SmartImage';
import './TVShowDetail.css';
import './ExpandableText.css';
import storage from '../services/storage';

function TVShowDetail({ initialSeason }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // ============================================
  // 📦 STATI
  // ============================================
  const [showDetails, setShowDetails] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchedEpisodes, setWatchedEpisodes] = useState([]);
  const [continueWatching, setContinueWatching] = useState(null);
  const [isFavoriteShow, setIsFavoriteShow] = useState(false);

  // ============================================
  // 🎬 CARICAMENTO DATI
  // ============================================
  useEffect(() => {
    const loadShowData = async () => {
      setLoading(true);
      
      // 1. Carica dettagli e stagioni
      const { seasons: showSeasons, details } = await getTVSeasons(id);
      setShowDetails(details);
      
      // Filtra solo stagioni valide (non speciali)
      const validSeasons = showSeasons.filter(season => season.season_number > 0);
      setSeasons(validSeasons);
      
      // 2. Determina quale stagione caricare
      let targetSeason = 1;
      if (initialSeason) {
        targetSeason = parseInt(initialSeason);
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const seasonFromUrl = urlParams.get('season');
        if (seasonFromUrl) {
          targetSeason = parseInt(seasonFromUrl);
        }
      }
      
      console.log('🎯 Stagione target:', targetSeason);
      
      // 3. Carica episodi della stagione
      if (validSeasons.length > 0) {
        const seasonToLoad = validSeasons.find(s => s.season_number === targetSeason) 
          ? targetSeason 
          : validSeasons[0].season_number;
        
        setSelectedSeason(seasonToLoad);
        
        const seasonEpisodes = await getSeasonEpisodes(id, seasonToLoad);
        setEpisodes(seasonEpisodes);
      }
      
      // 4. Carica dati di visione
      await loadWatchingData();
      await loadFavoriteStatus();
      
      setLoading(false);
    };

    loadShowData();
  }, [id, initialSeason]);

  // ============================================
  // 💾 GESTIONE PREFERITI
  // ============================================
  const loadFavoriteStatus = async () => {
    const favorites = await storage.getFavorites();
    const isFavorite = favorites.some(fav => fav.id === parseInt(id) && fav.type === 'tv');
    setIsFavoriteShow(isFavorite);
  };

  const toggleFavorites = async () => {
    const favorites = await storage.getFavorites();
    let updatedFavorites;
    
    if (isFavoriteShow) {
      // Rimuovi dai favoriti
      updatedFavorites = favorites.filter(fav => 
        !(fav.id === parseInt(id) && fav.type === 'tv')
      );
      setIsFavoriteShow(false);
      console.log('💔 Serie rimossa dai favoriti:', showDetails.name);
    } else {
      // Aggiungi ai favoriti
      const favoriteItem = { ...showDetails, type: 'tv' };
      updatedFavorites = [...favorites, favoriteItem];
      setIsFavoriteShow(true);
      console.log('❤️ Serie aggiunta ai favoriti:', showDetails.name);
    }
    
    storage.saveFavorites(updatedFavorites);
    
    window.dispatchEvent(new CustomEvent('favoritesChanged', { 
      detail: { favorites: updatedFavorites } 
    }));
  };

  // ============================================
  // 📺 GESTIONE EPISODI
  // ============================================
  const loadWatchingData = async () => {
    // Carica episodi visti
    const watched = await storage.getWatchedEpisodes(id) || [];
    setWatchedEpisodes(watched);
    
    // Carica "continua a guardare"
    const continueData = await storage.getContinueWatching(id);
    setContinueWatching(continueData);
  };

  const handleSeasonChange = async (seasonNumber) => {
    setSelectedSeason(seasonNumber);
    setLoading(true);
    
    const seasonEpisodes = await getSeasonEpisodes(id, seasonNumber);
    setEpisodes(seasonEpisodes);
    setLoading(false);
  };

  const playEpisode = (episode) => {
    // Salva come "continua a guardare"
    const continueData = {
      seasonNumber: selectedSeason,
      episodeNumber: episode.episode_number,
      episodeTitle: episode.name,
      timestamp: Date.now()
    };
    storage.saveContinueWatching(id, continueData);
    
    // Naviga al player
    navigate(`/player/tv/${id}/${selectedSeason}/${episode.episode_number}`);
  };

  const playFromBeginning = () => {
    // Inizia dalla stagione 1, episodio 1
    const firstSeason = seasons.find(s => s.season_number === 1) || seasons[0];
    const seasonNumber = firstSeason.season_number;
    
    console.log('🎬 Iniziando serie dal primo episodio: S', seasonNumber, 'E1');
    
    const continueData = {
      seasonNumber: seasonNumber,
      episodeNumber: 1,
      episodeTitle: `Episodio 1`,
      timestamp: Date.now()
    };
    storage.saveContinueWatching(id, continueData);
    
    navigate(`/player/tv/${id}/${seasonNumber}/1`);
  };

  const handleContinueWatching = () => {
    navigate(`/player/tv/${id}/${continueWatching.seasonNumber}/${continueWatching.episodeNumber}`);
  };

  const markAsWatched = (episode, e) => {
    e.stopPropagation();
    
    const episodeKey = `S${selectedSeason}E${episode.episode_number}`;
    const currentWatched = [...watchedEpisodes];
    
    if (currentWatched.includes(episodeKey)) {
      const updated = currentWatched.filter(ep => ep !== episodeKey);
      setWatchedEpisodes(updated);
      storage.saveWatchedEpisodes(id, updated);
    } else {
      const updated = [...currentWatched, episodeKey];
      setWatchedEpisodes(updated);
      storage.saveWatchedEpisodes(id, updated);
    }
  };

  const isEpisodeWatched = (episode) => {
    const episodeKey = `S${selectedSeason}E${episode.episode_number}`;
    return watchedEpisodes.includes(episodeKey);
  };

  // ============================================
  // 🎬 RENDERING
  // ============================================
  if (loading) {
    return (
      <div className="tv-detail-loading">
        <div className="loading-spinner"></div>
        <p>Caricamento serie TV...</p>
      </div>
    );
  }

  if (!showDetails) {
    return (
      <div className="tv-detail-error">
        <h2>Serie TV non trovata</h2>
        <button onClick={() => navigate(-1)}>← Torna Indietro</button>
      </div>
    );
  }

  return (
    <div className="tv-show-detail">
      
      {/* ========================================
          HERO SECTION - IDENTICA A MOVIEDETAIL
          ======================================== */}
      <div 
        className="tv-hero"
        style={{ backgroundImage: `url(${getBackdropUrl(showDetails.backdrop_path)})` }}
      >
        <div className="tv-hero-overlay">
          <div className="tv-hero-content">
            
            {/* Titolo */}
            <h1 className="tv-title">{showDetails.name}</h1>
            
            {/* Metadata Inline */}
            <div className="tv-metadata-inline">
              <span className="metadata-rating">
                ⭐ {showDetails.vote_average?.toFixed(1)}
              </span>
              <span className="metadata-separator">•</span>
              <span className="metadata-year">
                {new Date(showDetails.first_air_date).getFullYear()}
              </span>
              <span className="metadata-separator">•</span>
              <span className="metadata-seasons">
                {seasons.length} Stagion{seasons.length === 1 ? 'e' : 'i'}
              </span>
            </div>
            
            {/* Generi (se disponibili) */}
            {showDetails.genres && showDetails.genres.length > 0 && (
              <div className="tv-genres-inline">
                {showDetails.genres.slice(0, 3).map(genre => (
                  <span key={genre.id} className="genre-pill">{genre.name}</span>
                ))}
              </div>
            )}
            
            {/* Descrizione */}
            <div className="tv-description">
              <ExpandableText
                text={showDetails.overview}
                maxLength={200}
                className="tv-overview-text"
                expandText="Leggi tutto"
                collapseText="Riduci"
              />
            </div>
            
            {/* Bottoni Azioni - IDENTICI A MOVIEDETAIL */}
            <div className="tv-actions">
              {continueWatching ? (
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={handleContinueWatching}
                >
                  <span className="btn-icon">▶️</span>
                  <div className="btn-text">
                    <div>Continua S{continueWatching.seasonNumber}E{continueWatching.episodeNumber}</div>
                    <small style={{opacity: 0.8, fontSize: '0.9rem', fontWeight: 'normal'}}>
                      {continueWatching.episodeTitle}
                      {continueWatching.watchTime ? ` • ${Math.floor(continueWatching.watchTime / 60)}m guardati` : ''}
                    </small>
                  </div>
                </button>
              ) : (
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={playFromBeginning}
                >
                  <span className="btn-icon">▶️</span>
                  <span className="btn-text">Riproduci</span>
                </button>
              )}
              
              <button 
                className={`btn btn-secondary btn-lg ${isFavoriteShow ? 'remove' : ''}`}
                onClick={toggleFavorites}
              >
                <span className="btn-icon">{isFavoriteShow ? '💔' : '➕'}</span>
                <span className="btn-text">
                  {isFavoriteShow ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}
                </span>
              </button>
            </div>
            
          </div>
        </div>
      </div>

      {/* ========================================
          SELEZIONE STAGIONI - STILE "ORDINA:"
          ======================================== */}
      <div className="season-selector-styled">
        <h2 className="section-title">Episodi</h2>
        
        <div className="season-dropdown-wrapper">
          
          <select 
            value={selectedSeason} 
            onChange={(e) => handleSeasonChange(parseInt(e.target.value))}
            className="season-dropdown"
          >
            {seasons.map(season => (
              <option key={season.season_number} value={season.season_number}>
                Stagione {season.season_number} ({season.episode_count} episodi)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================
          GRID EPISODI - MANTIENE LAYOUT ATTUALE
          ======================================== */}
      <div className="episodes-grid">
        {episodes.map((episode, index) => (
          <div 
            key={episode.id} 
            className={`episode-card ${isEpisodeWatched(episode) ? 'watched' : ''}`}
            onClick={() => playEpisode(episode)}
          >
            <div className="episode-number">{episode.episode_number}</div>
            
            <div className="episode-thumbnail">
              <SmartImage
                src={getEpisodeImageUrl(episode.still_path)}
                alt={episode.name}
                title={episode.name}
                type="backdrop"
                className="episode-thumbnail-image"
              />
              <div className="episode-play-overlay">
                <button className="episode-play-btn">▶️</button>
              </div>
              
              {isEpisodeWatched(episode) && (
                <div className="watched-indicator">✓</div>
              )}
            </div>
            
            <div className="episode-info">
              <h3 className="episode-title">{episode.name}</h3>
              <p className="episode-runtime">{episode.runtime || 45} min</p>
              
              {/* Descrizione Espandibile */}
              <ExpandableText
                text={episode.overview}
                maxLength={120}
                className="episode-overview"
                expandText="Continua a leggere"
                collapseText="Riduci"
              />
              
              {/* Bottone "Segna come visto" */}
              <button 
                className={`btn btn-episode ${isEpisodeWatched(episode) ? 'watched' : ''}`}
                onClick={(e) => markAsWatched(episode, e)}
              >
                <span className="btn-icon">{isEpisodeWatched(episode) ? '✅' : '👁️'}</span>
                <span className="btn-text">
                  {isEpisodeWatched(episode) ? 'Visto' : 'Segna come visto'}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}

export default TVShowDetail;