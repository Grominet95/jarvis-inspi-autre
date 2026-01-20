class SpotifyAuthService {
  constructor() {
    // Spotify App Configuration - load from server
    this.clientId = '';
    this.clientSecret = '';
    this.username = '';
    this.redirectUri = window.location.origin + '/spotify-callback.html';
    this.scopes = [
      'user-read-currently-playing',
      'user-read-playback-state',
      'user-modify-playback-state',
      'streaming'
    ].join(' ');
    
    this.storageKeys = {
      accessToken: 'spotify_access_token',
      refreshToken: 'spotify_refresh_token',
      tokenExpiry: 'spotify_token_expiry',
      codeVerifier: 'spotify_code_verifier'
    };
    
    // Load credentials from server on startup
    this.loadCredentials();
  }

  // Load credentials from server
  async loadCredentials() {
    try {
      const response = await fetch('/api/spotify/config');
      if (response.ok) {
        const config = await response.json();
        this.clientId = config.clientId || '';
        this.clientSecret = config.clientSecret || '';
        this.username = config.username || '';
      }
    } catch (error) {
      console.error('Error loading Spotify credentials from server:', error);
    }
  }

  // Reload credentials from server (call after saving settings)
  async reloadCredentials() {
    await this.loadCredentials();
  }

  // Generate code verifier and challenge for PKCE
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
  }

  async generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Check if user is authenticated
  async getValidToken() {
    const token = localStorage.getItem(this.storageKeys.accessToken);
    const expiry = localStorage.getItem(this.storageKeys.tokenExpiry);
    
    if (!token || !expiry) {
      return null;
    }

    // Check if token is expired
    if (new Date().getTime() > parseInt(expiry)) {
      // Try to refresh token
      const refreshed = await this.refreshAccessToken();
      return refreshed ? localStorage.getItem(this.storageKeys.accessToken) : null;
    }

    return token;
  }

  // Initiate Spotify login
  async login() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    localStorage.setItem(this.storageKeys.codeVerifier, codeVerifier);
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      state: Math.random().toString(36).substring(7)
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    
    // Open in a popup window
    const popup = window.open(
      authUrl,
      'spotify-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      throw new Error('Popup blocked. Please allow popups for this site and try again.');
    }

    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        try {
          if (popup && popup.closed) {
            clearInterval(checkClosed);
            // Check if we got a token
            const token = localStorage.getItem(this.storageKeys.accessToken);
            if (token) {
              resolve(token);
            } else {
              reject(new Error('Authentication cancelled'));
            }
          }
        } catch (error) {
          // Handle cross-origin errors when checking popup.closed
          clearInterval(checkClosed);
          reject(new Error('Authentication window error'));
        }
      }, 1000);

      // Listen for messages from popup
      const messageListener = async (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          
          try {
            // Exchange code for token
            const token = await this.handleCallback(event.data.code);
            resolve(token);
          } catch (error) {
            reject(error);
          }
        } else if (event.data.type === 'SPOTIFY_AUTH_ERROR') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageListener);
    });
  }

  // Handle the callback from Spotify
  async handleCallback(code) {
    const codeVerifier = localStorage.getItem(this.storageKeys.codeVerifier);
    
    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier
    });

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const data = await response.json();
      
      // Store tokens
      localStorage.setItem(this.storageKeys.accessToken, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(this.storageKeys.refreshToken, data.refresh_token);
      }
      localStorage.setItem(
        this.storageKeys.tokenExpiry,
        (new Date().getTime() + data.expires_in * 1000).toString()
      );
      
      // Clean up
      localStorage.removeItem(this.storageKeys.codeVerifier);
      
      return data.access_token;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    const refreshToken = localStorage.getItem(this.storageKeys.refreshToken);
    
    if (!refreshToken) {
      return false;
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId
    });

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        // Refresh token is invalid, clear all tokens
        this.logout();
        return false;
      }

      const data = await response.json();
      
      // Update tokens
      localStorage.setItem(this.storageKeys.accessToken, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(this.storageKeys.refreshToken, data.refresh_token);
      }
      localStorage.setItem(
        this.storageKeys.tokenExpiry,
        (new Date().getTime() + data.expires_in * 1000).toString()
      );
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return false;
    }
  }

  // Logout user
  logout() {
    localStorage.removeItem(this.storageKeys.accessToken);
    localStorage.removeItem(this.storageKeys.refreshToken);
    localStorage.removeItem(this.storageKeys.tokenExpiry);
    localStorage.removeItem(this.storageKeys.codeVerifier);
  }

  // Make authenticated API calls to Spotify
  async makeSpotifyRequest(endpoint, options = {}) {
    const token = await this.getValidToken();
    
    if (!token) {
      throw new Error('No valid access token');
    }

    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try refresh
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request
          const newToken = localStorage.getItem(this.storageKeys.accessToken);
          return fetch(`https://api.spotify.com/v1${endpoint}`, {
            ...options,
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
              ...options.headers
            }
          });
        }
      }
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return response;
  }
}

export default SpotifyAuthService;
