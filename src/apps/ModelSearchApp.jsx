import React, { useState, useRef, useEffect } from 'react';

const ModelSearchApp = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollContainerRef = useRef(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      console.log('Searching for:', searchQuery);
      const response = await fetch(`/api/search-models?keyword=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Search results:', data);
      
      if (data.success) {
        setSearchResults(data.models || []);
        
        // Show message if using mock data
        if (data.isMockData && data.message) {
          console.warn('Using mock data:', data.message);
          // Could show a toast notification here
        }
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleModelClick = (model) => {
    console.log('Model clicked:', model);
    // Open the model URL in a new tab
    if (model.url) {
      window.open(model.url, '_blank');
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full h-full bg-black/80 backdrop-blur-sm rounded-lg border border-blue-500/30 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Model Search</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-xl font-bold"
        >
          ×
        </button>
      </div>

      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search for 3D models (e.g., skull, robot, vase)..."
          className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Searching MakerWorld...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-2">Search Error</p>
            <p className="text-gray-400 text-sm">{error}</p>
            <button
              onClick={handleSearch}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && searchResults.length > 0 && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">
              Found {searchResults.length} models
            </p>
            <div className="flex gap-2">
              <button
                onClick={scrollLeft}
                className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                ←
              </button>
              <button
                onClick={scrollRight}
                className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                →
              </button>
            </div>
          </div>
          
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
              {searchResults.map((model, index) => (
                <div
                  key={index}
                  onClick={() => handleModelClick(model)}
                  className="flex-shrink-0 w-48 bg-gray-800/50 rounded-lg border border-gray-600 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:scale-105"
                >
                  <div className="aspect-square rounded-t-lg overflow-hidden bg-gray-700">
                    {model.thumbnail ? (
                      <img
                        src={model.thumbnail}
                        alt={model.title || 'Model'}
                        className="w-full h-full object-cover"
                        onLoad={(e) => {
                          console.log('✅ Image loaded successfully:', model.thumbnail);
                          e.target.nextSibling.style.display = 'none';
                        }}
                        onError={(e) => {
                          console.error('❌ Image failed to load:', model.thumbnail);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center text-gray-500"
                      style={{ display: model.thumbnail ? 'none' : 'flex' }}
                    >
                      No Image
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-white text-sm font-medium mb-1 line-clamp-2">
                      {model.title || 'Untitled Model'}
                    </h3>
                    {model.author && (
                      <p className="text-gray-400 text-xs mb-1">
                        by {model.author}
                      </p>
                    )}
                    {model.stats && (
                      <div className="flex gap-2 text-xs text-gray-500">
                        {model.stats.likes && (
                          <span>👍 {model.stats.likes}</span>
                        )}
                        {model.stats.downloads && (
                          <span>⬇ {model.stats.downloads}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && searchResults.length === 0 && searchQuery && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No models found</p>
            <p className="text-gray-500 text-sm">Try a different search term</p>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!isLoading && !error && searchResults.length === 0 && !searchQuery && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-400 mb-2">Search MakerWorld</p>
            <p className="text-gray-500 text-sm">Enter a keyword to find 3D models</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSearchApp;
