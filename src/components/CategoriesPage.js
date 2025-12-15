import React, { useState, useEffect } from 'react';
import MovieCarousel from './MovieCarousel';
import { getContentByGenre } from '../services/tmdbApi';
import storage from '../services/storage';
import './CategoriesPage.css';

// 🎭 CONFIGURAZIONE GENERI
// Questi sono i generi principali che mostreremo
const GENRE_CONFIG = [
  { id: 28, name: 'Azione', emoji: '🎬' },
  { id: 35, name: 'Commedia', emoji: '😂' },
  { id: 18, name: 'Drammatico', emoji: '💔' },
  { id: 27, name: 'Horror', emoji: '😱' },
  { id: 878, name: 'Fantascienza', emoji: '🔬' },
  { id: 14, name: 'Fantasy', emoji: '🧙' },
  { id: 53, name: 'Thriller', emoji: '🕵️' },
  { id: 10749, name: 'Romantico', emoji: '❤️' },
  { id: 16, name: 'Animazione', emoji: '🎭' },
  { id: 99, name: 'Documentari', emoji: '🌍' }
];

function CategoriesPage() {
  // State per memorizzare i contenuti di ogni genere
  const [genreContent, setGenreContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  // Carica favoriti all'avvio
  useEffect(() => {
    const loadFavorites = async () => {
      const savedFavorites = await storage.getFavorites();
      setFavorites(savedFavorites);
    };
    
    loadFavorites();
    
    // Ascolta cambiamenti nei favoriti
    const handleFavoritesChange = (event) => {
      setFavorites(event.detail.favorites);
    };
    
    window.addEventListener('favoritesChanged', handleFavoritesChange);
    return () => window.removeEventListener('favoritesChanged', handleFavoritesChange);
  }, []);

  // Carica contenuti per tutti i generi
  useEffect(() => {
    const loadAllGenres = async () => {
      setLoading(true);
      console.log('🎭 Caricamento categorie iniziato...');
      
      // Oggetto per memorizzare i risultati
      const results = {};
      
      // Carica ogni genere uno alla volta (per non sovraccaricare l'API)
      for (const genre of GENRE_CONFIG) {
        try {
          console.log(`📥 Caricando genere: ${genre.name}...`);
          const content = await getContentByGenre(genre.id);
          results[genre.id] = content;
          
          // Piccola pausa tra una richiesta e l'altra (250ms)
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.error(`❌ Errore caricamento genere ${genre.name}:`, error);
          results[genre.id] = [];
        }
      }
      
      setGenreContent(results);
      setLoading(false);
      console.log('✅ Tutte le categorie caricate!');
    };

    loadAllGenres();
  }, []);

  // Handler per aggiornare i favoriti
  const handleFavoritesUpdate = (newFavorites) => {
    setFavorites(newFavorites);
  };

  // Loading state
  if (loading) {
    return (
      <div className="categories-loading">
        <div className="loading-spinner"></div>
        <p>Caricamento categorie...</p>
        <small>Preparando {GENRE_CONFIG.length} generi per te</small>
      </div>
    );
  }

  return (
    <div className="categories-page">
      {/* Header della pagina */}
      <div className="categories-header">
        <h1 className="categories-title">
          📋 Esplora per Categorie
        </h1>
        <p className="categories-subtitle">
          Scopri film e serie TV organizzati per genere
        </p>
      </div>

      {/* Lista di carousel per ogni genere */}
      <div className="categories-content">
        {GENRE_CONFIG.map((genre) => {
          const content = genreContent[genre.id] || [];
          
          // Salta generi senza contenuti
          if (content.length === 0) {
            return null;
          }

          return (
            <div key={genre.id} className="category-section">
              <MovieCarousel
                title={`${genre.emoji} ${genre.name}`}
                items={content}
                type="mixed"
                onFavoritesChange={handleFavoritesUpdate}
              />
            </div>
          );
        })}
      </div>

      {/* Messaggio se nessun genere ha contenuti */}
      {Object.values(genreContent).every(arr => arr.length === 0) && (
        <div className="categories-empty">
          <h2>😔 Nessun contenuto disponibile</h2>
          <p>Riprova più tardi</p>
        </div>
      )}
    </div>
  );
}

export default CategoriesPage;