import React, { useState, useRef, useEffect } from 'react';
import '../styles/app-container.css';
import soundService from '../services/soundService';

const DrawingApp = ({ onClose }) => {
  const [mode, setMode] = useState('freeform');
  const [showSettings, setShowSettings] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [thickness, setThickness] = useState(2);
  const [pixelsPerMm, setPixelsPerMm] = useState(1.8);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);
  const bgCtx = useRef(null);
  const fgCtx = useRef(null);
  const drawing = useRef(false);
  const measuring = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });

  // Initialize canvases and fullscreen listener
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      bgCanvas.width = width;
      bgCanvas.height = height;
      fgCanvas.width = width;
      fgCanvas.height = height;
      const bg = bgCanvas.getContext('2d');
      const fg = fgCanvas.getContext('2d');
      bg.lineCap = 'round';
      fg.lineCap = 'round';
      bg.strokeStyle = color;
      bg.lineWidth = thickness;
      bg.font = '16px sans-serif';
      fg.strokeStyle = color;
      fg.lineWidth = thickness;
      fg.font = '16px sans-serif';
      bgCtx.current = bg;
      fgCtx.current = fg;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleFsChange = () => {
      const fsElem = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      setIsFullscreen(!!fsElem);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update stroke style when settings change
  useEffect(() => {
    if (bgCtx.current) {
      bgCtx.current.strokeStyle = color;
      bgCtx.current.lineWidth = thickness;
      fgCtx.current.strokeStyle = color;
      fgCtx.current.lineWidth = thickness;
    }
  }, [color, thickness]);

  // Helper to get pointer position relative to canvas - fixed for precise positioning
  const getPos = (e) => {
    const canvas = fgCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
    const clientY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
    
    // Account for canvas scaling and precise positioning
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return { 
      x: (clientX - rect.left) * scaleX, 
      y: (clientY - rect.top) * scaleY 
    };
  };

  // Pointer event handlers
  const handlePointerDown = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    if (mode === 'freeform') {
      drawing.current = true;
      bgCtx.current.beginPath();
      bgCtx.current.moveTo(x, y);
      // Play loading sound when starting to draw
      soundService.playLoading();
    } else if (mode === 'measure') {
      measuring.current = true;
      startPoint.current = { x, y };
      // Play loading sound when starting to measure
      soundService.playLoading();
    }
  };

  const handlePointerMove = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    if (mode === 'freeform' && drawing.current) {
      bgCtx.current.lineTo(x, y);
      bgCtx.current.stroke();
    } else if (mode === 'measure' && measuring.current) {
      // preview line
      const fg = fgCtx.current;
      fg.clearRect(0, 0, fg.canvas.width, fg.canvas.height);
      fg.beginPath();
      fg.moveTo(startPoint.current.x, startPoint.current.y);
      fg.lineTo(x, y);
      fg.stroke();
      // measurement text
      const dx = x - startPoint.current.x;
      const dy = y - startPoint.current.y;
      const pxLength = Math.hypot(dx, dy);
      const mm = (pxLength / pixelsPerMm).toFixed(2);
      const midX = startPoint.current.x + dx / 2;
      const midY = startPoint.current.y + dy / 2;
      fg.fillStyle = color;
      fg.fillText(`${mm} mm`, midX + 5, midY - 5);
    }
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (mode === 'freeform' && drawing.current) {
      drawing.current = false;
      bgCtx.current.closePath();
      // Play select sound when finishing drawing
      soundService.playSelect();
    } else if (mode === 'measure' && measuring.current) {
      // finalize line on bg
      const { x, y } = getPos(e);
      // clear preview
      fgCtx.current.clearRect(0, 0, fgCtx.current.canvas.width, fgCtx.current.canvas.height);
      // draw permanent line
      bgCtx.current.beginPath();
      bgCtx.current.moveTo(startPoint.current.x, startPoint.current.y);
      bgCtx.current.lineTo(x, y);
      bgCtx.current.stroke();
      // draw text
      const dx = x - startPoint.current.x;
      const dy = y - startPoint.current.y;
      const pxLength = Math.hypot(dx, dy);
      const mm = (pxLength / pixelsPerMm).toFixed(2);
      const midX = startPoint.current.x + dx / 2;
      const midY = startPoint.current.y + dy / 2;
      bgCtx.current.fillStyle = color;
      bgCtx.current.fillText(`${mm} mm`, midX + 5, midY - 5);
      measuring.current = false;
      // Play select sound when finishing measurement
      soundService.playSelect();
    }
  };

  // Attach pointer events
  useEffect(() => {
    const fgCanvas = fgCanvasRef.current;
    fgCanvas.style.touchAction = 'none';
    fgCanvas.addEventListener('pointerdown', handlePointerDown);
    fgCanvas.addEventListener('pointermove', handlePointerMove);
    fgCanvas.addEventListener('pointerup', handlePointerUp);
    fgCanvas.addEventListener('pointerleave', handlePointerUp);
    return () => {
      fgCanvas.removeEventListener('pointerdown', handlePointerDown);
      fgCanvas.removeEventListener('pointermove', handlePointerMove);
      fgCanvas.removeEventListener('pointerup', handlePointerUp);
      fgCanvas.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [mode, pixelsPerMm, color, thickness]);

  // Clear both drawing and measurement layers
  const clearCanvas = () => {
    if (bgCtx.current && bgCanvasRef.current) {
      bgCtx.current.clearRect(0, 0, bgCanvasRef.current.width, bgCanvasRef.current.height);
    }
    if (fgCtx.current && fgCanvasRef.current) {
      fgCtx.current.clearRect(0, 0, fgCanvasRef.current.width, fgCanvasRef.current.height);
    }
  };

  // Fullscreen helpers
  const enterFullscreen = () => {
    const el = containerRef.current;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };
  const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  };
  const toggleFullscreen = () => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  };

  // Export drawing as desktop icon (like 3D models)
  const exportDrawing = () => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    
    const width = bgCanvas.width;
    const height = bgCanvas.height;
    
    // Create offscreen canvas for export with transparent background
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    const tmpCtx = tmpCanvas.getContext('2d');
    
    // No background fill - keep transparent
    // Draw original drawing (preserving transparency and color)
    tmpCtx.drawImage(bgCanvas, 0, 0);
    
    // Create thumbnail for desktop icon (smaller version) with transparent background
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 128;
    thumbCanvas.height = 128;
    const thumbCtx = thumbCanvas.getContext('2d');
    
    // No background fill for thumbnail - keep transparent
    // Draw scaled drawing to thumbnail
    thumbCtx.drawImage(tmpCanvas, 0, 0, width, height, 0, 0, 128, 128);
    
    // Generate filename with timestamp
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const filename = `Drawing_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    
    // Create desktop file object
    const desktopFile = {
      id: `drawing-${Date.now()}`,
      name: filename,
      type: 'drawing',
      data: tmpCanvas.toDataURL('image/png'), // Full resolution
      thumbnail: thumbCanvas.toDataURL('image/png'), // Thumbnail for icon
      x: Math.random() * (window.innerWidth - 200) + 100, // Random position
      y: Math.random() * (window.innerHeight - 300) + 100,
      timestamp: Date.now()
    };
    
    // Dispatch custom event to add to desktop
    window.dispatchEvent(new CustomEvent('add-to-desktop', {
      detail: { file: desktopFile }
    }));
    
    console.log('Drawing exported to desktop:', filename);
  };

  // Close or exit fullscreen on Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) exitFullscreen();
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen, onClose]);

  // Listen for drawing load events from drag-and-drop
  useEffect(() => {
    const handleLoadDrawing = (event) => {
      console.log('Drawing app received load drawing event:', event.detail);
      const { drawingData, drawingName } = event.detail;
      
      if (drawingData && bgCtx.current) {
        // Clear current canvas
        clearCanvas();
        
        // Load the drawing data onto the canvas
        const img = new Image();
        img.onload = () => {
          console.log('Loading drawing into canvas:', drawingName);
          bgCtx.current.drawImage(img, 0, 0);
          
          // Show success notification
          const notification = new CustomEvent('show-notification', {
            detail: { 
              message: `Loaded drawing: ${drawingName}`, 
              type: 'success',
              duration: 2000 
            }
          });
          window.dispatchEvent(notification);
        };
        img.onerror = () => {
          console.error('Failed to load drawing:', drawingName);
          const notification = new CustomEvent('show-notification', {
            detail: { 
              message: `Failed to load: ${drawingName}`, 
              type: 'error',
              duration: 2000 
            }
          });
          window.dispatchEvent(notification);
        };
        img.src = drawingData;
      }
    };

    const handleLoadDrawingGlobal = (event) => {
      const { targetWindowId } = event.detail;
      const currentWindowId = containerRef.current?.closest('[data-window-id]')?.getAttribute('data-window-id');
      
      if (targetWindowId === currentWindowId) {
        handleLoadDrawing(event);
      }
    };

    // Listen for both local and global events
    if (containerRef.current) {
      containerRef.current.addEventListener('load-drawing-in-app', handleLoadDrawing);
    }
    window.addEventListener('load-drawing-in-app-global', handleLoadDrawingGlobal);

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('load-drawing-in-app', handleLoadDrawing);
      }
      window.removeEventListener('load-drawing-in-app-global', handleLoadDrawingGlobal);
    };
  }, [bgCtx, clearCanvas]);

  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-hidden" data-app-name="Drawing">
      <div className="flex flex-1 relative">
        {/* Mode buttons */}
        <div className="flex flex-col space-y-2 p-2 bg-blue-900/10 border-r border-blue-900/30">
          <button
            className={`px-2 py-1 rounded ${mode === 'freeform' ? 'bg-blue-900/30' : ''}`}
            onClick={() => setMode('freeform')}
          >
            Free Form
          </button>
          <button
            className={`px-2 py-1 rounded ${mode === 'measure' ? 'bg-blue-900/30' : ''}`}
            onClick={() => setMode('measure')}
          >
            Measure
          </button>
        </div>
        {/* Canvas area */}
        <div className="relative flex-1">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 29px, rgba(59,130,246,0.4) 30px)',
              backgroundSize: '100% 30px',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 29px, rgba(59,130,246,0.4) 30px)',
              backgroundSize: '30px 100%',
            }}
          />
          <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          <canvas ref={fgCanvasRef} className="absolute inset-0 w-full h-full" />
        </div>
        {/* Settings panel */}
        <div
          className={`absolute top-0 right-0 h-full w-64 bg-blue-950/90 border-l border-blue-800/50 p-4 transform transition-transform ${
            showSettings ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <h3 className="text-blue-100 text-lg mb-4">Settings</h3>
          <div className="mb-4">
            <label className="text-blue-300 text-sm">Pen Color</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-8 mt-1" />
          </div>
          <div className="mb-4">
            <label className="text-blue-300 text-sm">Thickness</label>
            <input
              type="range"
              min="1"
              max="50"
              value={thickness}
              onChange={(e) => setThickness(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="text-blue-300 text-sm">Pixels per mm</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={pixelsPerMm}
              onChange={(e) => setPixelsPerMm(parseFloat(e.target.value))}
              className="w-full mt-1 p-1 bg-blue-900/20 text-blue-100 border border-blue-800/30 rounded"
            />
          </div>
          <button onClick={() => setShowSettings(false)} className="text-blue-400/80 text-sm">
            Close
          </button>
        </div>
        {/* Controls: fullscreen, settings toggle, and export */}
        <div className="absolute top-4 right-16 z-50 flex space-x-2">
          <button onClick={toggleFullscreen} className="text-blue-300 text-2xl" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? '⏏️' : '⛶'}
          </button>
          <button onClick={() => setShowSettings((s) => !s)} className="text-blue-300 text-2xl" title="Settings">
            ⚙️
          </button>
        </div>
        {/* Export button */}
        <button
          onClick={exportDrawing}
          className="absolute bottom-4 right-4 z-50 px-3 py-1 bg-blue-900/40 hover:bg-blue-900/60 text-blue-200 text-sm rounded"
        >
          Export
        </button>
        {/* Clear all drawings/measurements */}
        <button
          onClick={clearCanvas}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default DrawingApp;