import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';

// ImageGenApp: hold to speak a prompt, then create images via OpenAI Image API
const ImageGenApp = ({ onClose }) => {
  const { settings } = useSettings();
  // Disable right-click context menu
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);
  const [listening, setListening] = useState(false);
  // Prompt state, updated live from speech or input
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageURL, setImageURL] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  // Image generation settings
  const [selectedModel, setSelectedModel] = useState('dall-e-3');
  // Default size and quality
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [qualityMode, setQualityMode] = useState('standard');

  // Reset to default size/quality when model changes
  useEffect(() => {
    setSelectedSize('1024x1024');
    setQualityMode('standard');
  }, [selectedModel]);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('SpeechRecognition not supported');
      return;
    }
    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';
    recog.onresult = (e) => {
      let interim = '';
      let finalT = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalT += r[0].transcript;
        else interim += r[0].transcript;
      }
      // Update prompt live
      setPrompt((prev) => {
        // Overwrite with latest speech
        return finalT + interim;
      });
    };
    recog.onerror = (e) => {
      console.error('Recognition error', e);
      setListening(false);
    };
    recognitionRef.current = recog;
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !listening) {
      // Clear prompt before starting live transcription
      setPrompt('');
      recognitionRef.current.start();
      setListening(true);
    }
  };
  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
      // On stop, keep the last prompt as is
    }
  };

  // Determine API size: always use selected size
  const getApiSize = () => selectedSize;
  const handleCreate = async () => {
    setError('');
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      setError('Please set your OpenAI API key in Settings.');
      return;
    }
    const text = prompt.trim();
    if (!text) {
      setError('Prompt is empty.');
      return;
    }
    setLoading(true);
    setImageURL('');
    try {
      // Build request payload
      const payload = {
        model: selectedModel,
        prompt: text,
        n: 1,
        size: getApiSize(),
        response_format: 'b64_json'
      };
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || res.statusText);
      }
      const data = await res.json();
      // Support both base64 and URL formats
      const item = data.data?.[0] || {};
      let imgSrc = '';
      if (item.b64_json) {
        imgSrc = `data:image/png;base64,${item.b64_json}`;
      } else if (item.url) {
        imgSrc = item.url;
      }
      if (!imgSrc) throw new Error('No image returned');
      setImageURL(imgSrc);
      // Auto-save generated image to project assets using raw base64 if available
      (async () => {
        try {
          // Send raw base64 (without data URL prefix) or URL
          const saveData = item.b64_json ? item.b64_json : imgSrc;
          const saveRes = await fetch('/api/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ b64: saveData })
          });
          const saveJson = await saveRes.json();
          if (saveJson.success) {
            console.log('Image saved to', saveJson.path);
          } else {
            console.error('Save-image error:', saveJson.error);
            setError(`Save failed: ${saveJson.error}`);
          }
        } catch (saveErr) {
          console.error('Auto-save failed', saveErr);
          setError('Save failed: ' + saveErr.message);
        }
      })();
    } catch (e) {
      console.error('Image generation error', e);
      setError(e.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full">
      {showSettings && (
        <div className="absolute right-0 top-0 h-full w-64 bg-gray-900 z-20 p-4">
          <button onClick={() => setShowSettings(false)} className="text-blue-300 mb-4">Close</button>
          <h3 className="text-white mb-2">Image Settings</h3>
          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="settings-input w-full text-sm"
            >
              <option value="dall-e-3">DALL·E 3</option>
              <option value="dall-e-2">DALL·E 2</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Size</label>
            <select
              value={selectedSize}
              onChange={e => setSelectedSize(e.target.value)}
              className="settings-input w-full text-sm"
            >
              {selectedModel === 'dall-e-2' ? (
                <>
                  <option value="256x256">256×256</option>
                  <option value="512x512">512×512</option>
                  <option value="1024x1024">1024×1024</option>
                </>
              ) : (
                <>
                  <option value="1024x1024">1024×1024</option>
                  <option value="1024x1792">1024×1792</option>
                  <option value="1792x1024">1792×1024</option>
                </>
              )}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Quality</label>
            <select
              value={qualityMode}
              onChange={e => setQualityMode(e.target.value)}
              className="settings-input w-full text-sm"
            >
              <option value="standard">Standard</option>
              {selectedModel === 'dall-e-3' && (
                <option value="hd">HD</option>
              )}
            </select>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-start p-4 space-y-4">
        <div className="w-full flex justify-between">
          <button onClick={onClose} className="text-xs text-blue-300">← Back</button>
          <button onClick={() => setShowSettings(true)} className="text-xs text-blue-300">Settings</button>
        </div>
        <button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          className={`px-6 py-3 rounded-full text-white ${listening ? 'bg-red-500' : 'bg-blue-600'}`}
        >
          {listening ? 'Listening...' : 'Hold to Talk'}
        </button>
        <div className="w-full max-w-md">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Generated prompt..."
            className="settings-input w-full font-mono"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded"
        >
          {loading ? 'Creating...' : 'Create!'}
        </button>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        {imageURL && (
          <div className="mt-4 w-full flex flex-col flex-1">
            <div className="flex-1 w-full flex items-center justify-center">
              <img
                src={imageURL}
                alt="Generated"
                className="object-contain w-full h-full border border-blue-500"
              />
            </div>
            <div className="mt-2 flex space-x-2 justify-center">
              <button
                onClick={() => {
                  // Download via anchor
                  const link = document.createElement('a');
                  link.href = imageURL;
                  link.download = `image_${Date.now()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenApp;