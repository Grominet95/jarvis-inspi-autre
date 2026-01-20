import React, { useState, useRef, useEffect } from 'react';
import '../styles/app-container.css';

// Dynamically import all images from src/assets/photos
function importAll(r) {
  return r.keys().map((key) => ({
    src: r(key),
    name: key.replace('./', ''),
  }));
}
const images = importAll(require.context('../assets/photos', false, /\.(png|jpe?g)$/));

const PhotosApp = ({ onClose }) => {
  const [selected, setSelected] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });

  // Zoom with wheel
  const onWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  // Start drag
  const onMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastOffset.current = { ...offset };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };
  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: lastOffset.current.x + dx, y: lastOffset.current.y + dy });
  };
  const onMouseUp = () => {
    isDragging.current = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
  
  // Touch interaction refs
  const isPinching = useRef(false);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);

  // Calculate distance between two touch points
  const getTouchDist = (t) => {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  };

  // Handle touch start: drag or pinch
  const onTouchStart = (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      // single-finger drag
      isDragging.current = true;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastOffset.current = { ...offset };
    } else if (e.touches.length === 2) {
      // pinch zoom
      isPinching.current = true;
      pinchStartDist.current = getTouchDist(e.touches);
      pinchStartScale.current = scale;
    }
  };

  // Handle touch move: update drag or pinch
  const onTouchMove = (e) => {
    e.preventDefault();
    if (isPinching.current && e.touches.length === 2) {
      const dist = getTouchDist(e.touches);
      const factor = dist / pinchStartDist.current;
      setScale(Math.min(Math.max(pinchStartScale.current * factor, 0.5), 5));
    } else if (isDragging.current && e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setOffset({ x: lastOffset.current.x + dx, y: lastOffset.current.y + dy });
    }
  };

  // Handle touch end: reset flags
  const onTouchEnd = (e) => {
    if (isPinching.current && e.touches.length < 2) {
      isPinching.current = false;
    }
    if (isDragging.current && e.touches.length === 0) {
      isDragging.current = false;
    }
  };

  // Close on Esc and track fullscreen changes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const handleFsChange = () => {
      const fsElem = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      setIsFullscreen(!!fsElem);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
    };
  }, [onClose]);

  // Helpers to enter/exit fullscreen
  const enterFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
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
  const toggleFullscreen = () => isFullscreen ? exitFullscreen() : enterFullscreen();

  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-hidden">
      {/* Thumbnail grid */}
      {!selected && (
        <div className="p-2 overflow-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {images.map((img) => (
              <img
                key={img.name}
                src={img.src}
                alt={img.name}
                className="w-full h-32 object-cover cursor-pointer"
                onClick={() => setSelected(img)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox view */}
      {selected && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center">
          {/* Holographic grid background */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 29px, rgba(59,130,246,0.4) 30px)',
            backgroundSize: '100% 30px'
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 29px, rgba(59,130,246,0.4) 30px)',
            backgroundSize: '30px 100%'
          }} />

          {/* Controls: fullscreen & close */}
          <div className="absolute top-4 right-4 z-50 flex space-x-2">
            <button onClick={toggleFullscreen} className="text-white text-2xl" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
            <button onClick={onClose} className="text-white text-2xl" title="Close">
              ×
            </button>
          </div>

          <div
            className="relative z-50"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              cursor: isDragging.current ? 'grabbing' : 'grab',
              touchAction: 'none'
            }}
          >
            <img
              src={selected.src}
              alt={selected.name}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                maxWidth: '90vw',
                maxHeight: '90vh',
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosApp;