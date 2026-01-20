import React, { useState, useEffect } from 'react';

const WeatherApp = ({ onClose }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zip, setZip] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // AI advice state
  const [prompt, setPrompt] = useState(
    'Based on this weather data what should I wear today? Be brief. [weather data].'
  );
  const [advice, setAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('weatherSettings');
    if (saved) {
      try {
        const { zip: z, prompt: p } = JSON.parse(saved);
        if (z) setZip(z);
        if (p) setPrompt(p);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Fetch location and current weather whenever ZIP changes
  useEffect(() => {
    if (!zip) return;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      setWeatherData(null);
      setLocationName('');
      try {
        // Geocode ZIP to lat/lon
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${zip}&count=1&language=en&format=json`
        );
        if (!geoRes.ok) throw new Error('Location lookup failed');
        const geoJson = await geoRes.json();
        if (!geoJson.results || geoJson.results.length === 0) {
          setError('Location not found');
          setLoading(false);
          return;
        }
        const loc = geoJson.results[0];
        setLocationName(`${loc.name}${loc.admin1 ? ', ' + loc.admin1 : ''}${loc.country ? ', ' + loc.country : ''}`);
        const { latitude, longitude } = loc;
        // Fetch current weather
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
            `&current_weather=true&temperature_unit=fahrenheit&timezone=auto`
        );
        if (!weatherRes.ok) throw new Error('Weather fetch failed');
        const weatherJson = await weatherRes.json();
        setWeatherData(weatherJson.current_weather || null);
      } catch (e) {
        console.error(e);
        setError('Unable to fetch weather');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [zip]);

  // Fetch AI advice when weatherData or prompt changes
  useEffect(() => {
    if (!weatherData || !prompt) return;
    const fetchAdvice = async () => {
      setLoadingAdvice(true);
      setAdvice('');
      try {
        const apiKey = localStorage.getItem('openai_api_key');
        if (!apiKey) throw new Error('OpenAI API key not set');
        // Replace placeholder with actual weather JSON
        const userContent = prompt.replace(
          '[weather data]',
          JSON.stringify(weatherData)
        );
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'user', content: userContent }
            ]
          })
        });
        if (!res.ok) throw new Error(`Chat API error ${res.status}`);
        const json = await res.json();
        const msg = json.choices?.[0]?.message?.content || '';
        setAdvice(msg.trim());
      } catch (e) {
        console.error(e);
        setAdvice('Unable to generate advice');
      } finally {
        setLoadingAdvice(false);
      }
    };
    fetchAdvice();
  }, [weatherData, prompt]);

  // Save ZIP and prompt to localStorage
  const saveSettings = () => {
    localStorage.setItem(
      'weatherSettings',
      JSON.stringify({ zip, prompt })
    );
    setSettingsOpen(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="relative flex-1 bg-blue-900/10">
        {/* Settings panel */}
        <div
          className={`absolute top-0 right-0 h-full w-64 bg-blue-950/90 border-l border-blue-800/50 p-4 transform transition-transform ${
            settingsOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <h3 className="text-blue-100 text-lg mb-4">Settings</h3>
          <div className="mb-4">
            <label className="text-blue-300 text-sm block mb-1">ZIP Code</label>
            <input
              type="text"
              value={zip}
              onChange={e => setZip(e.target.value)}
              placeholder="e.g. 10001"
              className="w-full p-1 bg-blue-900/20 text-blue-100 border border-blue-800/30 rounded"
            />
          </div>
          <div className="mb-4">
            <label className="text-blue-300 text-sm block mb-1">Prompt</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full p-1 bg-blue-900/20 text-blue-100 border border-blue-800/30 rounded"
            />
          </div>
          <button
            onClick={saveSettings}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
          >
            Save
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
          {loading && <div className="text-blue-300">Loading...</div>}
          {error && <div className="text-red-400">{error}</div>}
          {!zip && !loading && (
            <div className="text-blue-300">Please enter a ZIP code in Settings</div>
          )}
          {weatherData && (
            <div className="text-center space-y-2">
              {/* Simple emoji mapping for weather codes */}
              <div className="text-6xl">
                {(() => {
                  const code = weatherData.weathercode;
                  const map = {
                    0: '☀️', 1: '🌤️', 2: '⛅️', 3: '☁️',
                    45: '🌫️', 48: '🌫️',
                    51: '🌦️', 53: '🌦️', 55: '🌦️',
                    56: '🌧️', 57: '🌧️',
                    61: '🌧️', 63: '🌧️', 65: '🌧️',
                    66: '🌧️', 67: '🌧️',
                    71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
                    80: '🌧️', 81: '🌧️', 82: '🌧️',
                    85: '🌨️', 86: '🌨️',
                    95: '⛈️', 96: '⛈️', 99: '⛈️'
                  };
                  return map[code] || '❓';
                })()}
              </div>
              <h2 className="text-2xl text-blue-200 font-light">{locationName}</h2>
              <p className="text-6xl text-blue-100">{Math.round(weatherData.temperature)}°F</p>
              <p className="text-blue-300">
                {(() => {
                  const descMap = {
                    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
                    45: 'Fog', 48: 'Depositing rime fog',
                    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
                    56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
                    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
                    66: 'Light freezing rain', 67: 'Heavy freezing rain',
                    71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall', 77: 'Snow grains',
                    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
                    85: 'Slight snow showers', 86: 'Heavy snow showers',
                    95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ heavy hail'
                  };
                  return descMap[weatherData.weathercode] || 'Unknown';
                })()}
              </p>
            </div>
        )}
        {/* Advice bubble */}
        {weatherData && (
          <div className="mt-6 w-full flex flex-col items-center">
            <h3 className="text-2xl text-blue-100 font-light mb-2">What should you wear today?</h3>
            <div className="max-w-xl bg-blue-800/20 border border-blue-800 rounded-lg p-6 text-blue-100 text-2xl leading-snug">
              {loadingAdvice ? 'Thinking...' : advice}
            </div>
          </div>
        )}
        </div>

        {/* Settings toggle button */}
        <button
          onClick={() => setSettingsOpen(open => !open)}
          className="absolute top-4 right-4 text-blue-300 text-2xl"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
};

export default WeatherApp;