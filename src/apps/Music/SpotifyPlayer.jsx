import React, { useState, useEffect } from 'react';

const SpotifyPlayer = ({ accessToken, onLogout }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch current playing track
  const fetchCurrentTrack = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 204 || !response.ok) {
        setCurrentTrack(null);
        setIsPlaying(false);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCurrentTrack(data.item);
      setIsPlaying(data.is_playing);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch current track:', error);
      setLoading(false);
    }
  };

  // Control playback
  const togglePlayback = async () => {
    try {
      const endpoint = isPlaying ? '/me/player/pause' : '/me/player/play';
      await fetch(`https://api.spotify.com/v1${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  // Skip to next track
  const skipToNext = async () => {
    try {
      await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      // Fetch updated track info after a short delay
      setTimeout(fetchCurrentTrack, 500);
    } catch (error) {
      console.error('Failed to skip track:', error);
    }
  };

  // Skip to previous track
  const skipToPrevious = async () => {
    try {
      await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      // Fetch updated track info after a short delay
      setTimeout(fetchCurrentTrack, 500);
    } catch (error) {
      console.error('Failed to skip to previous track:', error);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchCurrentTrack();
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchCurrentTrack, 5000);
      return () => clearInterval(interval);
    }
  }, [accessToken]);

  if (loading) {
    return (
      <div className="spotify-player loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="spotify-player-widget">
      {currentTrack ? (
        <div className="track-widget-container">
          {/* Album Art - Left */}
          <div className="album-art-widget">
            <img 
              src={currentTrack.album.images[0]?.url || '/placeholder-album.png'} 
              alt={currentTrack.album.name}
            />
          </div>

          {/* Track Info and Controls - Right */}
          <div className="track-info-widget">
            {/* Track Details */}
            <div className="track-details-widget">
              <h3 className="track-name-widget">{currentTrack.name}</h3>
              <p className="artist-name-widget">{currentTrack.artists.map(artist => artist.name).join(', ')}</p>
            </div>

            {/* Controls */}
            <div className="player-controls-widget">
              <button className="control-btn-widget" onClick={skipToPrevious} title="Previous">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              
              <button className="control-btn-widget play-pause-widget" onClick={togglePlayback} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              
              <button className="control-btn-widget" onClick={skipToNext} title="Next">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
              
              <button className="control-btn-widget disconnect-widget" onClick={onLogout} title="Disconnect">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-track-widget">
          <div className="no-track-icon-widget">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div>
            <span>No music playing</span>
            <button className="connect-btn-widget" onClick={onLogout}>Connect Spotify</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyPlayer;
