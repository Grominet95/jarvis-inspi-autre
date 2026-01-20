import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

const DesktopFile = ({ file, onDrag, onDrop, onDoubleClick, onDelete, isDragging }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const meshRef = useRef(null);
  const frameRef = useRef(null);
  const [loadingState, setLoadingState] = useState('loading');

  useEffect(() => {
    // Handle non-STL files immediately
    if (file.type !== 'stl-model') {
      setLoadingState('loaded');
      return;
    }
    
    if (!mountRef.current) return;

    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      premultipliedAlpha: false
    });
    
    renderer.setSize(80, 80);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;
    
    mountRef.current.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x4f8eff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x4f8eff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    camera.position.set(0, 0, 3);
    
    sceneRef.current = { scene, camera, renderer };
    
    // Load STL model
    const loader = new STLLoader();
    loader.load(
      file.url,
      (geometry) => {
        console.log(`[DesktopFile] Loading STL: ${file.name}`);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        
        // Center geometry
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        
        // Scale to fit
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.2 / maxDim;
        
        const material = new THREE.MeshStandardMaterial({
          color: 0x4f8eff,
          metalness: 0.3,
          roughness: 0.4,
          side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.setScalar(scale);
        mesh.rotation.x = -Math.PI / 2; // Upright orientation
        
        meshRef.current = mesh;
        scene.add(mesh);
        setLoadingState('loaded');
      },
      undefined,
      (error) => {
        console.error(`[DesktopFile] Failed to load STL: ${file.name}`, error);
        setLoadingState('error');
      }
    );
    
    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (meshRef.current) {
        meshRef.current.rotation.z += 0.01; // Continuous spin
      }
      renderer.render(scene, camera);
    };
    animate();
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [file?.url, file?.name, file?.type]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX - file.x;
    const startY = e.clientY - file.y;
    
    onDrag(file.id, true);
    
    const handlePointerMove = (e) => {
      const newX = e.clientX - startX;
      const newY = e.clientY - startY;
      onDrag(file.id, true, newX, newY);
      
      // Check proximity to trash button (bottom-left corner)
      const trashButtonRect = { x: 18, y: window.innerHeight - 98, width: 80, height: 80 };
      const fileCenter = { x: newX + 40, y: newY + 40 }; // File is 80px wide/tall
      
      const distance = Math.sqrt(
        Math.pow(fileCenter.x - (trashButtonRect.x + trashButtonRect.width/2), 2) + 
        Math.pow(fileCenter.y - (trashButtonRect.y + trashButtonRect.height/2), 2)
      );
      
      // If within 100px of trash button, show trash_open
      const isNearTrash = distance < 100;
      
      // Dispatch event to update trash button state
      window.dispatchEvent(new CustomEvent('desktop-file-drag', { 
        detail: { nearTrash: isNearTrash } 
      }));
      
      // Check for compatible app windows under cursor
      const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
      
      // Look for app windows in multiple ways
      let appWindow = null;
      let appName = null;
      
      // Method 1: Find by .panel-premium class (app window container)
      appWindow = elementsUnderCursor.find(el => 
        el.classList.contains('panel-premium') || 
        el.closest('.panel-premium')
      );
      
      if (appWindow) {
        const appNameElement = appWindow.querySelector('[data-app-name]');
        appName = appNameElement?.getAttribute('data-app-name');
      }
      
      // Method 2: Find by data-window-id
      if (!appWindow || !appName) {
        const windowElement = elementsUnderCursor.find(el => 
          el.hasAttribute('data-window-id') || 
          el.closest('[data-window-id]')
        );
        if (windowElement) {
          appWindow = windowElement.closest('[data-window-id]') || windowElement;
          const appNameElement = appWindow.querySelector('[data-app-name]');
          appName = appNameElement?.getAttribute('data-app-name');
        }
      }
      
      // Method 3: Look for music-app-window class
      if (!appWindow || !appName) {
        const musicWindow = elementsUnderCursor.find(el => 
          el.classList.contains('music-app-window') || 
          el.closest('.music-app-window')
        );
        if (musicWindow) {
          appWindow = musicWindow;
          const appNameElement = appWindow.querySelector('[data-app-name]');
          appName = appNameElement?.getAttribute('data-app-name') || 'Music';
        }
      }
      
      if (appWindow && appName) {
        console.log('DesktopFile detected app:', { appName, fileType: file?.type, appWindow });
        // Dispatch event to highlight compatible apps
        window.dispatchEvent(new CustomEvent('desktop-file-hover-app', {
          detail: { 
            appName, 
            fileType: file?.type || 'unknown',
            isHovering: true,
            windowElement: appWindow
          }
        }));
      } else {
        // Clear any app highlighting
        window.dispatchEvent(new CustomEvent('desktop-file-hover-app', {
          detail: { isHovering: false }
        }));
      }
    };
    
    const handlePointerUp = (e) => {
      onDrag(file.id, false);
      
      // Reset trash button state and app highlighting
      window.dispatchEvent(new CustomEvent('desktop-file-drag', { 
        detail: { nearTrash: false } 
      }));
      window.dispatchEvent(new CustomEvent('desktop-file-hover-app', {
        detail: { isHovering: false }
      }));
      
      // Check if dropped on trash button (bottom-left corner)
      const trashButtonRect = { x: 18, y: window.innerHeight - 98, width: 80, height: 80 };
      const fileCenter = { x: e.clientX, y: e.clientY };
      
      const distance = Math.sqrt(
        Math.pow(fileCenter.x - (trashButtonRect.x + trashButtonRect.width/2), 2) + 
        Math.pow(fileCenter.y - (trashButtonRect.y + trashButtonRect.height/2), 2)
      );
      
      if (distance < 100) {
        // Delete the file
        onDelete(file.id);
        
        // Visual feedback for deletion
        const notification = new CustomEvent('show-notification', {
          detail: { 
            message: `Deleted ${file.name} from desktop`, 
            type: 'info',
            duration: 2000 
          }
        });
        window.dispatchEvent(notification);
      } else {
        // Check if dropped on any app window
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        console.log('Elements at drop point:', elements.map(el => el.className));
        
        // Look for app windows - prioritize finding elements that can traverse up to find the app container
        let appWindow = null;
        
        // Method 1: Find elements that have or can reach [data-app-name]
        for (const el of elements) {
          const appNameContainer = el.closest('[data-app-name]');
          if (appNameContainer) {
            console.log('Found element with data-app-name:', {
              element: el,
              appNameContainer,
              appName: appNameContainer.getAttribute('data-app-name')
            });
            
            // Get the app window container (should be the parent with panel-premium)
            appWindow = appNameContainer.closest('.panel-premium') || 
                       appNameContainer.closest('.music-app-window') ||
                       appNameContainer.closest('[data-window-id]') ||
                       appNameContainer;
            if (appWindow) {
              console.log('Found app window from data-app-name traversal:', appWindow);
              break;
            }
          }
        }
        
        // Method 2: Direct class matching as fallback
        if (!appWindow) {
          appWindow = elements.find(el => 
            el.classList.contains('panel-premium') || 
            el.classList.contains('music-app-window')
          );
        }
        
        console.log('Found app window for drop:', { 
          appWindow, 
          hasAppName: !!appWindow?.querySelector('[data-app-name]'),
          appWindowTag: appWindow?.tagName,
          appWindowClass: appWindow?.className
        });
        
        if (appWindow) {
          const appNameElement = appWindow.querySelector('[data-app-name]');
          const appName = appNameElement?.getAttribute('data-app-name');
          console.log('Drop detected on app:', { 
            appName, 
            appWindow, 
            appNameElement,
            appNameElementClass: appNameElement?.className
          });
          
          // Import apps data to check compatibility
          import('../data/apps.js').then(({ apps }) => {
            const app = apps.find(a => a.name === appName);
            const isCompatible = app?.acceptedFileTypes?.includes(file?.type);
            
            if (isCompatible) {
              console.log('File is compatible, loading in app:', { appName, fileName: file.name, fileUrl: file.url });
              
              // Handle compatible file drop
              if (appName === '3D Viewer' && file?.type === 'stl-model') {
                console.log('Dispatching load event to specific app window:', { appWindow, fileName: file.name });
                
                // Try multiple approaches to ensure the event reaches the ModelViewerApp
                const loadModelEvent = new CustomEvent('load-model-in-viewer', {
                  detail: { 
                    modelUrl: file.url,
                    modelName: file.name
                  },
                  bubbles: true
                });
                
                // Method 1: Dispatch to the app window element
                appWindow.dispatchEvent(loadModelEvent);
                
                // Method 2: Also dispatch to the app content div
                const appContentDiv = appWindow.querySelector('[data-app-name="3D Viewer"]');
                if (appContentDiv) {
                  console.log('Also dispatching to app content div');
                  appContentDiv.dispatchEvent(loadModelEvent);
                }
                
                // Method 3: As fallback, also dispatch globally with window ID
                const windowElement = appWindow.closest('[data-window-id]') || appWindow.querySelector('[data-window-id]');
                const windowId = windowElement?.getAttribute('data-window-id');
                if (windowId) {
                  console.log('Dispatching global event with window ID:', windowId);
                  const globalEvent = new CustomEvent('load-model-in-viewer-global', {
                    detail: { 
                      modelUrl: file.url,
                      modelName: file.name,
                      targetWindowId: windowId
                    }
                  });
                  window.dispatchEvent(globalEvent);
                }
                
                // Visual feedback for successful drop
                const notification = new CustomEvent('show-notification', {
                  detail: { 
                    message: `Loaded ${file.name} in ${appName}`, 
                    type: 'success',
                    duration: 2000 
                  }
                });
                window.dispatchEvent(notification);
              } else if (appName === 'Drawing' && file?.type === 'drawing') {
                console.log('Dispatching load event to Drawing app window:', { appWindow, fileName: file.name });
                
                // Try multiple approaches to ensure the event reaches the DrawingApp
                const loadDrawingEvent = new CustomEvent('load-drawing-in-app', {
                  detail: { 
                    drawingData: file.data,
                    drawingName: file.name
                  },
                  bubbles: true
                });
                
                // Method 1: Dispatch to the app window element
                appWindow.dispatchEvent(loadDrawingEvent);
                
                // Method 2: Also dispatch to the app content div
                const appContentDiv = appWindow.querySelector('[data-app-name="Drawing"]');
                if (appContentDiv) {
                  console.log('Also dispatching to Drawing app content div');
                  appContentDiv.dispatchEvent(loadDrawingEvent);
                }
                
                // Method 3: As fallback, also dispatch globally with window ID
                const windowElement = appWindow.closest('[data-window-id]') || appWindow.querySelector('[data-window-id]');
                const windowId = windowElement?.getAttribute('data-window-id');
                if (windowId) {
                  console.log('Dispatching global Drawing event with window ID:', windowId);
                  const globalEvent = new CustomEvent('load-drawing-in-app-global', {
                    detail: { 
                      drawingData: file.data,
                      drawingName: file.name,
                      targetWindowId: windowId
                    }
                  });
                  window.dispatchEvent(globalEvent);
                }
                
                // Visual feedback for successful drop
                const notification = new CustomEvent('show-notification', {
                  detail: { 
                    message: `Loaded ${file.name} in ${appName}`, 
                    type: 'success',
                    duration: 2000 
                  }
                });
                window.dispatchEvent(notification);
              } else {
                // Handle other compatible apps in the future
                onDrop(file, 'desktop');
              }
            } else {
              // File type not compatible with this app
              onDrop(file, 'desktop');
              
              if (app) {
                const notification = new CustomEvent('show-notification', {
                  detail: { 
                    message: `${appName} doesn't support this file type`, 
                    type: 'warning',
                    duration: 2000 
                  }
                });
                window.dispatchEvent(notification);
              }
            }
          });
        } else {
          onDrop(file, 'desktop');
        }
      }
      
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDoubleClick(file);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create a simple context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'fixed bg-black/80 backdrop-blur-sm border border-blue-500/30 rounded-lg p-2 z-50 text-white text-sm';
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'block w-full text-left px-3 py-2 hover:bg-red-500/20 rounded';
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => {
      onDelete(file.id);
      document.body.removeChild(contextMenu);
    };
    
    contextMenu.appendChild(deleteButton);
    document.body.appendChild(contextMenu);
    
    // Remove context menu when clicking elsewhere
    const removeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        document.body.removeChild(contextMenu);
        document.removeEventListener('click', removeMenu);
      }
    };
    
    setTimeout(() => document.addEventListener('click', removeMenu), 100);
  };

  // Validate file object before rendering
  if (!file || !file.type || !file.name) {
    console.warn('DesktopFile: Invalid file object:', file);
    return null;
  }

  return (
    <motion.div
      className={`absolute cursor-pointer select-none ${isDragging ? 'z-[100]' : 'z-[80]'}`}
      style={{ 
        left: file.x, 
        top: file.y,
        opacity: isDragging ? 0.8 : 1
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex flex-col items-center">
        {/* File Icon/Preview */}
        <div className="w-20 h-20 rounded-lg border border-blue-500/30 bg-black/20 backdrop-blur-sm overflow-hidden shadow-lg">
          {file?.type === 'stl-model' ? (
            <div ref={mountRef} className="w-full h-full" />
          ) : file?.type === 'drawing' ? (
            <div className="w-full h-full relative bg-gray-800/30">
              <img 
                src={file.thumbnail} 
                alt={file.name}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
              {/* Drawing overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
            </div>
          ) : file?.type === 'image' ? (
            <div className="w-full h-full relative">
              <img 
                src={file.thumbnail} 
                alt={file.name}
                className="w-full h-full object-cover rounded-lg"
              />
              {/* Image overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none rounded-lg" />
              {/* AI generated indicator */}
              <div className="absolute bottom-1 right-1 w-3 h-3 bg-purple-500 rounded-full border border-white/50" title="AI Generated" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-400">
              📄
            </div>
          )}
          {loadingState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        {/* File Name */}
        <div className="mt-1 px-2 py-1 max-w-20 text-center text-blue-100/80 text-xs truncate bg-black/20 rounded">
          {file.name.replace('.stl', '').replace('.STL', '')}
        </div>
      </div>
    </motion.div>
  );
};

// Add drag and drop compatibility for images in apps
if (typeof window !== 'undefined') {
  // Listen for image drag events and handle app compatibility
  window.addEventListener('desktop-file-hover-app', (event) => {
    const { file, appName, appElement } = event.detail;
    
    if (file?.type === 'image') {
      // Show visual feedback for compatible apps
      if (appName === 'Drawing' || appName === 'Photos') {
        appElement.style.filter = 'blur(2px)';
        appElement.style.transform = 'scale(1.05)';
        
        // Add + symbol overlay
        let overlay = appElement.querySelector('.drop-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'drop-overlay';
          overlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            color: #3b82f6;
            pointer-events: none;
            z-index: 1000;
          `;
          overlay.textContent = '+';
          appElement.appendChild(overlay);
        }
      }
    }
  });
  
  window.addEventListener('desktop-file-unhover-app', (event) => {
    const { appElement } = event.detail;
    
    // Remove visual feedback
    appElement.style.filter = '';
    appElement.style.transform = '';
    
    const overlay = appElement.querySelector('.drop-overlay');
    if (overlay) {
      overlay.remove();
    }
  });
}

export default DesktopFile;
