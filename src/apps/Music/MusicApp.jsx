import React, { useState, useEffect } from 'react';
import SpotifyAuthService from './SpotifyAuthService';
import SpotifyPlayer from './SpotifyPlayer';
import './MusicApp.css';

const MusicApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [authService] = useState(() => new SpotifyAuthService());
  const [authError, setAuthError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const token = await authService.getValidToken();
      if (token) {
        setAccessToken(token);
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, [authService]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      
      // Ensure credentials are loaded from server before login
      await authService.reloadCredentials();
      
      await authService.login();
      const token = await authService.getValidToken();
      if (token) {
        setAccessToken(token);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setAccessToken(null);
    setIsAuthenticated(false);
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="music-app music-app-login">
        <div className="auth-container">
          <div className="spotify-logo">
            <svg viewBox="0 0 168 168" width="60" height="60">
              <path fill="#1DB954" d="M83.996.277C37.747.277.253 37.77.253 84.019c0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741 0-46.246-37.49-83.738-83.744-83.738l.001-.004zm38.404 120.78a5.217 5.217 0 01-7.18 1.73c-19.662-12.01-44.414-14.73-73.564-8.07a5.222 5.222 0 01-6.249-3.93 5.213 5.213 0 013.926-6.25c31.9-7.291 59.263-4.15 81.337 9.34 2.46 1.51 3.24 4.72 1.73 7.18zm10.25-22.805c-1.89 3.075-5.91 4.045-8.98 2.155-22.51-13.839-56.823-17.846-83.448-9.764-3.453 1.043-7.1-.903-8.148-4.35a6.538 6.538 0 014.354-8.143c30.413-9.228 68.222-4.758 94.072 11.127 3.07 1.89 4.04 5.91 2.15 8.976v-.001zm.88-23.744c-26.99-16.031-71.52-17.505-97.289-9.684-4.138 1.255-8.514-1.081-9.768-5.219a7.835 7.835 0 015.221-9.771c29.581-8.98 78.756-7.245 109.83 11.202a7.823 7.823 0 012.74 10.733c-2.2 3.722-7.02 4.949-10.73 2.739z"/>
            </svg>
          </div>
          <h2>Connect to Spotify</h2>
          <p>To use the music player, please connect your Spotify account</p>
          
          {authError && (
            <div className="auth-error">
              <p>{authError}</p>
            </div>
          )}
          
          <button 
            className="spotify-login-btn" 
            onClick={handleLogin} 
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <div className="login-spinner"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg viewBox="0 0 168 168" width="20" height="20">
                  <path fill="currentColor" d="M83.996.277C37.747.277.253 37.77.253 84.019c0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741 0-46.246-37.49-83.738-83.744-83.738l.001-.004zm38.404 120.78a5.217 5.217 0 01-7.18 1.73c-19.662-12.01-44.414-14.73-73.564-8.07a5.222 5.222 0 01-6.249-3.93 5.213 5.213 0 013.926-6.25c31.9-7.291 59.263-4.15 81.337 9.34 2.46 1.51 3.24 4.72 1.73 7.18zm10.25-22.805c-1.89 3.075-5.91 4.045-8.98 2.155-22.51-13.839-56.823-17.846-83.448-9.764-3.453 1.043-7.1-.903-8.148-4.35a6.538 6.538 0 014.354-8.143c30.413-9.228 68.222-4.758 94.072 11.127 3.07 1.89 4.04 5.91 2.15 8.976v-.001zm.88-23.744c-26.99-16.031-71.52-17.505-97.289-9.684-4.138 1.255-8.514-1.081-9.768-5.219a7.835 7.835 0 015.221-9.771c29.581-8.98 78.756-7.245 109.83 11.202a7.823 7.823 0 012.74 10.733c-2.2 3.722-7.02 4.949-10.73 2.739z"/>
                </svg>
                Login with Spotify
              </>
            )}
          </button>
          <div className="auth-note">
            <p>You'll need a Spotify Premium account for full playback control</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="music-app music-app-player">
      <SpotifyPlayer 
        accessToken={accessToken}
        currentTrack={currentTrack}
        setCurrentTrack={setCurrentTrack}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default MusicApp;
