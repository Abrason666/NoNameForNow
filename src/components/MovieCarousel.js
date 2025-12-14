import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../services/tmdbApi';
import SmartImage from './SmartImage';
import './MovieCarousel.css';
import './SmartImage.css';
import './PlaceholderImage.css';
import storage from '../services/storage';

function MovieCarousel({ title, items, type = 'movie', onFavoritesChange }) {
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [localFavorites, setLocalFavorites] = useState([]);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Carica i favoriti localmente per aggiornamenti real-time
  useEffect(() => {
    const loadFavorites = async () => {
      const favorites = await storage.getFavorites();
      setLocalFavorites(favorites);
      setForceUpdate(prev => prev + 1);
    };
    
    loadFavorites();
    
    // Ascolta cambiamenti nei favoriti da TUTTI i componenti
    const handleFavoritesChange = (event) => {
      console.log('🔄 Aggiornamento favoriti ricevuto nel carousel:', title);
      loadFavorites();
    };
    
    const handleStorageChange = () => loadFavorites();
    
    window.addEventListener('favoritesChanged', handleFavoritesChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [title]);

  const checkScrollButtons = () => {
    const carousel = carouselRef.current;
    if (carousel) {
      setCanScrollLeft(carousel.scrollLeft > 0);
      setCanScrollRight(
        carousel.scrollLeft < carousel.scrollWidth - carousel.clientWidth
      );
    }
  };

  const scrollLeft = () => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.scrollBy({ left: -300, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.scrollBy({ left: 300, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const handleItemClick = (item) => {
    // Determina il tipo corretto dell'item
    let itemType = type;
    
    if (type === 'mixed' && item.type) {
      itemType = item.type;
    }
    
    if (type === 'mixed' && !item.type) {
      itemType = item.title ? 'movie' : 'tv';
    }
    
    console.log('🎬 Apertura:', item.title || item.name, 'Tipo:', itemType);
    
    // Se è una serie TV, vai alla pagina dettagli
    if (itemType === 'tv') {
      navigate(`/tv/${item.id}`);
    } else {
      // Se è un film, vai direttamente al player
      navigate(`/player/movie/${item.id}`);
    }
  };

  const addToFavorites = async (item, e) => {
    e.stopPropagation();
    
    // Ottieni favoriti dal storage
    const favorites = await storage.getFavorites();
    
    // Determina il tipo corretto
    let itemType = type;
    if (type === 'mixed' && item.type) {
      itemType = item.type;
    } else if (type === 'mixed' && !item.type) {
      itemType = item.title ? 'movie' : 'tv';
    }
    
    // Controlla se è già nei favoriti
    const isAlreadyFavorite = favorites.some(fav => fav.id === item.id && fav.type === itemType);
    
    let updatedFavorites;
    
    if (isAlreadyFavorite) {
      // Rimuovi dai favoriti
      updatedFavorites = favorites.filter(fav => !(fav.id === item.id && fav.type === itemType));
      console.log('💔 Rimosso dai favoriti:', item.title || item.name);
    } else {
      // Aggiungi ai favoriti
      const favoriteItem = { ...item, type: itemType };
      updatedFavorites = [...favorites, favoriteItem];
      console.log('❤️ Aggiunto ai favoriti:', item.title || item.name);
    }
    
    // Salva e aggiorna stato locale
    await storage.saveFavorites(updatedFavorites);
    setLocalFavorites(updatedFavorites);
    
    // Notifica il parent component
    if (onFavoritesChange) {
      onFavoritesChange(updatedFavorites);
    }
    
    // Trigger evento personalizzato per aggiornare TUTTI gli altri componenti
    window.dispatchEvent(new CustomEvent('favoritesChanged', { 
      detail: { 
        favorites: updatedFavorites,
        action: isAlreadyFavorite ? 'removed' : 'added',
        item: item,
        timestamp: Date.now()
      } 
    }));
    
    // Force re-render di questo componente
    setForceUpdate(prev => prev + 1);
  };

  const isFavorite = (item) => {
    let itemType = type;
    if (type === 'mixed' && item.type) {
      itemType = item.type;
    } else if (type === 'mixed' && !item.type) {
      itemType = item.title ? 'movie' : 'tv';
    }
    
    const result = localFavorites.some(fav => fav.id === item.id && fav.type === itemType);
    return result;
  };

  return (
    <div className="movie-carousel">
      <h2 className="carousel-title">{title}</h2>
      
      <div className="carousel-container">
        {canScrollLeft && (
          <button 
            className="carousel-button left"
            onClick={scrollLeft}
          >
            ‹
          </button>
        )}
        
        <div 
          className="carousel-items"
          ref={carouselRef}
          onScroll={checkScrollButtons}
        >
          {items.map((item) => {
            const isItemFavorite = isFavorite(item);
            return (
              <div 
                key={`${item.id}-${item.type || type}-${forceUpdate}`}
                className="carousel-item"
                onClick={() => handleItemClick(item)}
              >
                <div className="item-image-container">
                  {/* 🎯 SMARTIMAGE CON FALLBACK AUTOMATICO */}
                  <SmartImage
                    src={getImageUrl(item.poster_path)}
                    alt={item.title || item.name}
                    title={item.title || item.name}
                    type="poster"
                    className="item-image"
                  />
                  
                  <div className="item-overlay">
                    <div className="item-info">
                      <h3>{item.title || item.name}</h3>
                      <p className="item-rating">⭐ {item.vote_average?.toFixed(1) || 'N/A'}</p>
                      <p className="item-year">
                        {item.release_date || item.first_air_date 
                          ? new Date(item.release_date || item.first_air_date).getFullYear()
                          : 'N/A'
                        }
                      </p>
                      {type === 'mixed' && (
                        <p className="item-type">
                          {item.type === 'movie' ? '🎬 Film' : '📺 Serie TV'}
                        </p>
                      )}
                    </div>
                    
                    <div className="item-actions">
                      <button 
                        className="play-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                      >
                        ▶️
                      </button>
                      
                      <button 
                        className={`favorite-button ${isItemFavorite ? 'active' : ''}`}
                        onClick={(e) => addToFavorites(item, e)}
                        title={isItemFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                      >
                        {isItemFavorite ? '❤️' : '🤍'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {canScrollRight && (
          <button 
            className="carousel-button right"
            onClick={scrollRight}
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

export default MovieCarousel;