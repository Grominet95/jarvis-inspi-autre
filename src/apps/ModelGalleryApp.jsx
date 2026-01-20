import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const Preview = ({ url, active }) => {
  const wrapRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const frameRef = useRef(null);
  const [loadingState, setLoadingState] = useState('loading');

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    console.log(`[Preview] Loading STL: ${url}`);
    setLoadingState('loading');

    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    console.log(`[Preview] Canvas size: ${w}x${h}`);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent background
    wrap.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(2, 2, 3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dl = new THREE.DirectionalLight(0xffffff, 1.0);
    dl.position.set(5, 5, 5);
    scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dl2.position.set(-5, -5, -5);
    scene.add(dl2);

    const loader = new STLLoader();
    let cancelled = false;
    
    console.log(`[Preview] Starting STL load for: ${url}`);
    
    loader.load(url, (geo) => {
      if (cancelled) return;
      console.log(`[Preview] STL loaded successfully:`, geo);
      
      try {
        geo.computeVertexNormals();
        geo.computeBoundingBox();
        
        if (!geo.boundingBox) {
          console.error('[Preview] No bounding box computed');
          setLoadingState('error');
          return;
        }
        
        const center = new THREE.Vector3();
        geo.boundingBox.getCenter(center);
        geo.translate(-center.x, -center.y, -center.z);

        const size = new THREE.Vector3();
        geo.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        console.log(`[Preview] Model size: ${size.x}, ${size.y}, ${size.z}, max: ${maxDim}`);
        
        if (maxDim === 0) {
          console.error('[Preview] Model has zero size');
          setLoadingState('error');
          return;
        }
        
        const target = 1.5;
        const scale = target / maxDim;
        console.log(`[Preview] Applying scale: ${scale}`);

        const mat = new THREE.MeshStandardMaterial({ 
          color: 0x4f8eff, 
          metalness: 0.2, 
          roughness: 0.4,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.scale.setScalar(scale);
        // Rotate model upright (-90 degrees around X-axis)
        mesh.rotation.x = -Math.PI / 2;
        meshRef.current = mesh;
        scene.add(mesh);
        setLoadingState('loaded');
        console.log(`[Preview] Mesh added to scene successfully`);
      } catch (e) {
        console.error('[Preview] Error processing STL:', e);
        setLoadingState('error');
      }
    }, undefined, (err) => {
      console.error('[Preview] STL load failed:', err);
      setLoadingState('error');
    });

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (meshRef.current) {
        // Spin around Z-axis for horizontal rotation (like a turntable)
        meshRef.current.rotation.z += active ? 0.015 : 0.005;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = wrap.clientWidth;
      const nh = wrap.clientHeight;
      if (nw === 0 || nh === 0) return;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);

    return () => {
      cancelled = true;
      ro.disconnect();
      cancelAnimationFrame(frameRef.current);
      if (sceneRef.current && meshRef.current) sceneRef.current.remove(meshRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
      if (renderer && renderer.domElement && wrap.contains(renderer.domElement)) wrap.removeChild(renderer.domElement);
    };
  }, [url, active]);

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loadingState === 'loading' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#60a5fa',
          fontSize: '12px',
          zIndex: 10
        }}>
          Loading...
        </div>
      )}
      {loadingState === 'error' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ef4444',
          fontSize: '12px',
          zIndex: 10
        }}>
          Error
        </div>
      )}
    </div>
  );
};

const ModelGalleryApp = () => {
  const [models, setModels] = useState([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const touchStartRef = useRef(null);

  useEffect(() => {
    fetch('/api/models')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(list => setModels(list))
      .catch(err => {
        console.error('Failed to load models', err);
        setError('Could not load models from /public/models.');
      });
  }, []);

  // Always show all models but calculate which ones are visible in viewport
  const visibleModels = useMemo(() => {
    return models.map((m, i) => ({ item: m, actual: i }));
  }, [models]);

  // Touch/Swipe handlers
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };
    
    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    const deltaTime = touchEnd.time - touchStartRef.current.time;
    
    // Only register swipe if it's fast enough and horizontal enough
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && deltaTime < 300) {
      if (deltaX > 0) {
        // Swipe right - previous
        setIndex(prev => Math.max(0, prev - 1));
      } else {
        // Swipe left - next
        setIndex(prev => Math.min(models.length - 1, prev + 1));
      }
    }
    
    touchStartRef.current = null;
  };

  const openCurrent = () => {
    const current = models[index];
    if (!current) return;
    const event = new CustomEvent('open-app', {
      detail: { name: '3D Viewer', props: { initialModelUrl: current.url, initialModelName: current.name } }
    });
    window.dispatchEvent(event);
  };

  const addToHome = () => {
    const current = models[index];
    if (!current) return;
    const event = new CustomEvent('add-to-desktop', {
      detail: { 
        type: 'stl-model',
        name: current.name,
        url: current.url,
        // Random position on the grid
        x: Math.random() * (window.innerWidth - 200) + 100,
        y: Math.random() * (window.innerHeight - 200) + 100
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      <div 
        ref={containerRef}
        className="relative" 
        style={{ width: 900, height: 280, perspective: 1000 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {visibleModels.map(({ item, actual }) => {
          const offset = actual - index;
          const scale = offset === 0 ? 1 : 0.78;
          const x = offset * 230;
          const z = Math.abs(offset) * -140;
          const opacity = offset === 0 ? 1 : 0.6;
          
          // Only render models that are close to viewport for performance
          if (Math.abs(offset) > 3) return null;
          
          return (
            <div
              key={`${item.url}-${actual}`} // Stable key to prevent reloads
              onClick={() => setIndex(actual)}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 240,
                height: 170,
                transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) scale(${scale})`,
                transition: 'transform 300ms ease',
                cursor: 'pointer',
                opacity,
                filter: offset === 0 ? 'none' : 'blur(0.2px)'
              }}
            >
              <div className="rounded-xl border border-blue-500/20 bg-black/20 backdrop-blur-sm overflow-hidden shadow-lg" style={{ width: '100%', height: 140 }}>
                <Preview url={item.url} active={offset === 0} />
              </div>
              <div className="text-center text-blue-100/80 text-xs mt-2 truncate">{item.name}</div>
            </div>
          );
        })}
        
        {/* Navigation buttons - smaller and more subtle */}
        <button 
          className="absolute left-2 top-1/2 -translate-y-1/2 px-1 py-1 text-blue-200/50 hover:text-blue-200/80 text-lg"
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
        >
          ‹
        </button>
        <button 
          className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-1 text-blue-200/50 hover:text-blue-200/80 text-lg"
          onClick={() => setIndex(Math.min(models.length - 1, index + 1))}
          disabled={index === models.length - 1}
        >
          ›
        </button>
        
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mt-3 flex gap-2">
          <button
            className="px-3 py-1 rounded bg-blue-500/30 border border-blue-400/30 text-blue-100"
            onClick={openCurrent}
            disabled={!models.length}
          >
            {models.length ? 'Open in Viewer' : (error || 'Loading...')}
          </button>
          <button
            className="px-3 py-1 rounded bg-green-500/30 border border-green-400/30 text-green-100"
            onClick={addToHome}
            disabled={!models.length}
          >
            Add to Home
          </button>
        </div>
        
        {/* Swipe indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-blue-200/40 text-xs">
          Swipe or use arrows to navigate
        </div>
      </div>
    </div>
  );
};

export default ModelGalleryApp;


