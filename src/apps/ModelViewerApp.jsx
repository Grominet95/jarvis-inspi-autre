import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { throttle } from 'lodash'; // You may need to install lodash

// 3D Model Viewer App
const ModelViewerApp = ({ onClose, initialModelUrl, initialModelName }) => {
  const [viewMode, setViewMode] = useState('smooth');
  const [modelColor, setModelColor] = useState('#3b82f6');
  const [isRotating, setIsRotating] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(true);

  const containerRef = useRef(null);
  const viewerContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const meshRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const gridRef = useRef(null);
  const isInteractingRef = useRef(false);
  const lastRenderTimeRef = useRef(0);

  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS;

  useEffect(() => {
    console.log("🚀 Component mounted - initializing Three.js");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1929);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(800, 600);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    if (containerRef.current) {
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(renderer.domElement);
    } else {
      console.error("❌ Container ref is null!");
      return;
    }

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: modelColor,
      wireframe: viewMode === 'wireframe',
      metalness: 0.3,
      roughness: 0.7
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    meshRef.current = cube;

    const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
    gridRef.current = gridHelper;

    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);

    const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    light2.position.set(-1, -1, 1);
    scene.add(light2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.8;
    controls.touchRotateSpeed = 0.6;
    controls.maxPolarAngle = Math.PI * 0.9;
    controls.enablePan = false; // Disable camera panning (shift + drag)

    controls.addEventListener('start', () => {
      isInteractingRef.current = true;
      setNeedsUpdate(true);
    });

    controls.addEventListener('end', () => {
      isInteractingRef.current = false;
      setNeedsUpdate(true);
      setTimeout(() => {
        if (!isInteractingRef.current) setNeedsUpdate(false);
      }, 1000);
    });

    controlsRef.current = controls;

    setUploadedFile({
      name: initialModelName || "Demo Cube",
      size: 2048,
      type: initialModelUrl ? "3D Model (STL)" : "3D Model (Built-in)"
    });

    const handleResize = throttle(() => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      setNeedsUpdate(true);
    }, 100);

    setTimeout(handleResize, 100);

    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      if (
        needsUpdate ||
        isInteractingRef.current ||
        isRotating ||
        now - lastRenderTimeRef.current >= frameInterval
      ) {
        if (isRotating && meshRef.current) {
          meshRef.current.rotation.y += 0.01;
        }

        controls.update();
        renderer.render(scene, camera);
        lastRenderTimeRef.current = now;
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (meshRef.current) {
        if (meshRef.current.geometry) meshRef.current.geometry.dispose();
        if (meshRef.current.material) {
          if (Array.isArray(meshRef.current.material)) {
            meshRef.current.material.forEach(material => material.dispose());
          } else {
            meshRef.current.material.dispose();
          }
        }
      }

      scene.clear();
      renderer.dispose();

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !gridRef.current) return;

    if (showGrid) {
      sceneRef.current.add(gridRef.current);
    } else {
      sceneRef.current.remove(gridRef.current);
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [showGrid]);

  useEffect(() => {
    if (!meshRef.current) return;

    try {
      setTimeout(() => {
        if (!meshRef.current) return;

        const newMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(modelColor),
          wireframe: viewMode === 'wireframe',
          metalness: 0.3,
          roughness: 0.7,
          wireframeLinewidth: 1.5,
        });

        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach(oldMat => {
            if (oldMat) oldMat.dispose();
          });
          meshRef.current.material = Array(meshRef.current.material.length).fill(newMaterial);
        } else {
          if (meshRef.current.material) meshRef.current.material.dispose();
          meshRef.current.material = newMaterial;
        }

        setNeedsUpdate(true);
      }, 0);
    } catch (error) {
      console.error("Error updating material:", error);
    }
  }, [viewMode, modelColor]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isRotating;
    }
  }, [isRotating]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current && cameraRef.current) {
      setNeedsUpdate(true);

      requestAnimationFrame(() => {
        if (containerRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;

          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
      });
    }
  }, [isFullscreen]);

  const loadDemoModel = (modelType) => {
    if (!sceneRef.current || !meshRef.current) return;

    setNeedsUpdate(true);

    setTimeout(() => {
      sceneRef.current.remove(meshRef.current);
      if (meshRef.current.geometry) meshRef.current.geometry.dispose();
      if (meshRef.current.material) {
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach(material => material.dispose());
        } else {
          meshRef.current.material.dispose();
        }
      }

      let geometry;

      switch (modelType) {
        case 'Cube':
          geometry = new THREE.BoxGeometry(2, 2, 2);
          break;
        case 'Sphere':
          geometry = new THREE.SphereGeometry(1.5, 32, 32);
          break;
        case 'Pyramid':
          geometry = new THREE.ConeGeometry(1.5, 2, 4);
          break;
        case 'Torus':
          geometry = new THREE.TorusGeometry(1, 0.4, 16, 32);
          break;
        default:
          geometry = new THREE.BoxGeometry(2, 2, 2);
      }

      const material = new THREE.MeshStandardMaterial({
        color: modelColor,
        wireframe: viewMode === 'wireframe',
        metalness: 0.3,
        roughness: 0.7,
        wireframeLinewidth: 1.5,
      });

      const mesh = new THREE.Mesh(geometry, material);

      sceneRef.current.add(mesh);
      meshRef.current = mesh;

      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(0, 0, 5);
        controlsRef.current.update();
      }

      setUploadedFile({
        name: `Demo ${modelType}`,
        size: 1024 * (modelType === 'Cube' ? 2 : modelType === 'Sphere' ? 15 : modelType === 'Torus' ? 8 : 3),
        type: '3D Model (Built-in)'
      });
    }, 0);
  };

  // Load STL from URL when provided by other apps
  useEffect(() => {
    if (!initialModelUrl) return;
    if (!sceneRef.current || !rendererRef.current) return;
    try {
      const loader = new STLLoader();
      loader.load(initialModelUrl, (geometry) => {
        if (meshRef.current && sceneRef.current) {
          sceneRef.current.remove(meshRef.current);
          if (meshRef.current.geometry) meshRef.current.geometry.dispose();
          if (meshRef.current.material) {
            if (Array.isArray(meshRef.current.material)) meshRef.current.material.forEach(m => m && m.dispose());
            else meshRef.current.material.dispose();
          }
        }

        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        const material = new THREE.MeshStandardMaterial({ color: modelColor, wireframe: viewMode === 'wireframe', metalness: 0.3, roughness: 0.7 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(scale, scale, scale);
        sceneRef.current.add(mesh);
        meshRef.current = mesh;
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.set(0, 0, 5);
          controlsRef.current.update();
        }
        setUploadedFile({ name: initialModelName || 'STL Model', size: 0, type: '3D Model (STL URL)' });
        setNeedsUpdate(true);
      }, undefined, (err) => {
        console.error('Failed to load initial STL URL', err);
      });
    } catch (e) {
      console.error('Error loading initialModelUrl', e);
    }
  }, [initialModelUrl]);

  // Listen for drag-and-drop model loading events
  useEffect(() => {
    const handleLoadModel = (event) => {
      event.stopPropagation(); // Prevent event from bubbling further
      const { modelUrl, modelName } = event.detail;
      console.log('ModelViewerApp received load-model event:', { modelUrl, modelName });
      
      if (!sceneRef.current || !rendererRef.current) {
        console.log('Scene or renderer not ready yet, retrying in 100ms...');
        setTimeout(() => handleLoadModel(event), 100);
        return;
      }
      
      try {
        const loader = new STLLoader();
        loader.load(modelUrl, (geometry) => {
          console.log('Successfully loaded STL from drag-and-drop:', modelName);
          
          // Remove existing mesh
          if (meshRef.current && sceneRef.current) {
            sceneRef.current.remove(meshRef.current);
            if (meshRef.current.geometry) meshRef.current.geometry.dispose();
            if (meshRef.current.material) {
              if (Array.isArray(meshRef.current.material)) meshRef.current.material.forEach(m => m && m.dispose());
              else meshRef.current.material.dispose();
            }
          }

          // Process new geometry
          geometry.computeBoundingBox();
          const center = new THREE.Vector3();
          geometry.boundingBox.getCenter(center);
          geometry.translate(-center.x, -center.y, -center.z);
          const size = new THREE.Vector3();
          geometry.boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          
          // Create new mesh
          const material = new THREE.MeshStandardMaterial({ 
            color: modelColor, 
            wireframe: viewMode === 'wireframe', 
            metalness: 0.3, 
            roughness: 0.7 
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.scale.set(scale, scale, scale);
          
          // Add to scene
          sceneRef.current.add(mesh);
          meshRef.current = mesh;
          
          // Reset camera
          if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(0, 0, 5);
            controlsRef.current.update();
          }
          
          // Update file info
          setUploadedFile({ name: modelName, size: 0, type: '3D Model (STL)' });
          setNeedsUpdate(true);
        }, undefined, (err) => {
          console.error('Failed to load STL from drag-and-drop:', err);
        });
      } catch (e) {
        console.error('Error loading model from drag-and-drop:', e);
      }
    };

    // Listen on the container element instead of window
    const container = containerRef.current;
    if (container) {
      container.addEventListener('load-model-in-viewer', handleLoadModel);
      
      // Also listen for global events as fallback
      const handleGlobalLoadModel = (event) => {
        const { targetWindowId, modelUrl, modelName } = event.detail;
        // Find our window ID by looking up the DOM tree
        const appWindow = container.closest('[data-window-id]');
        const ourWindowId = appWindow?.getAttribute('data-window-id');
        
        if (ourWindowId === targetWindowId) {
          console.log('ModelViewerApp received global load event for our window:', ourWindowId);
          handleLoadModel({ detail: { modelUrl, modelName }, stopPropagation: () => {} });
        }
      };
      
      window.addEventListener('load-model-in-viewer-global', handleGlobalLoadModel);
      
      return () => {
        container.removeEventListener('load-model-in-viewer', handleLoadModel);
        window.removeEventListener('load-model-in-viewer-global', handleGlobalLoadModel);
      };
    }
  }, [modelColor, viewMode]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);

    setNeedsUpdate(true);

    const loader = new STLLoader();

    const reader = new FileReader();

    reader.onload = function(event) {
      try {
        setTimeout(() => {
          try {
            const geometry = loader.parse(event.target.result);

            if (geometry.attributes.position.count > 50000) {
              console.log("Large model detected, optimizing...");
            }

            if (meshRef.current && sceneRef.current) {
              sceneRef.current.remove(meshRef.current);
              if (meshRef.current.geometry) meshRef.current.geometry.dispose();
              if (meshRef.current.material) {
                if (Array.isArray(meshRef.current.material)) {
                  meshRef.current.material.forEach(material => material.dispose());
                } else {
                  meshRef.current.material.dispose();
                }
              }
            }

            geometry.computeBoundingBox();
            const center = new THREE.Vector3();
            geometry.boundingBox.getCenter(center);
            geometry.translate(-center.x, -center.y, -center.z);

            const size = new THREE.Vector3();
            geometry.boundingBox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3 / maxDim;

            const material = new THREE.MeshStandardMaterial({
              color: modelColor,
              wireframe: viewMode === 'wireframe',
              metalness: 0.3,
              roughness: 0.7,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.scale.set(scale, scale, scale);

            sceneRef.current.add(mesh);
            meshRef.current = mesh;

            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(0, 0, 5);
              controlsRef.current.update();
            }

          } catch (innerError) {
            console.error("Error in STL parsing:", innerError);
            alert("Error loading STL file. Please try another file.");
          }
        }, 0);
      } catch (error) {
        console.error("Error parsing STL:", error);
        alert("Error loading STL file. Please try another file.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const toggleWireframe = () => {
    setViewMode(prev => prev === 'wireframe' ? 'smooth' : 'wireframe');
  };

  const toggleRotation = () => {
    setIsRotating(!isRotating);
  };

  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  const toggleFullscreen = () => {
    if (!viewerContainerRef.current) return;

    try {
      if (!isFullscreen) {
        if (viewerContainerRef.current.requestFullscreen) {
          viewerContainerRef.current.requestFullscreen();
        } else if (viewerContainerRef.current.webkitRequestFullscreen) {
          viewerContainerRef.current.webkitRequestFullscreen();
        } else if (viewerContainerRef.current.mozRequestFullScreen) {
          viewerContainerRef.current.mozRequestFullScreen();
        } else if (viewerContainerRef.current.msRequestFullscreen) {
          viewerContainerRef.current.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    } catch (error) {
      console.error("Fullscreen API error:", error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 bg-blue-900/20 rounded-lg p-3 border border-blue-900/30">
        <div className="text-blue-100 text-lg font-light tracking-wider">
          3D Model Viewer
        </div>
        <div className="flex space-x-2">
          <label className="bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 px-3 py-1.5 rounded cursor-pointer text-sm">
            Upload STL
            <input 
              type="file" 
              accept=".stl" 
              onChange={handleFileSelect}
              className="hidden" 
            />
          </label>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <div 
          ref={viewerContainerRef}
          className="flex-1 rounded-lg overflow-hidden bg-blue-950/20 border border-blue-900/20 relative"
        >
          <div
            ref={containerRef}
            className="w-full h-full"
          ></div>
          
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-4 left-4 bg-blue-900/50 hover:bg-blue-800/60 text-blue-300 p-2 rounded transition-colors flex items-center justify-center"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v4a1 1 0 01-1 1H1a1 1 0 010-2h1V5a3 3 0 013-3h3a1 1 0 010 2H5zm10 0a1 1 0 00-1 1v3a1 1 0 102 0V6h1a1 1 0 100-2h-2zm-8 10a1 1 0 00-1 1v1h3a1 1 0 100 2H3a1 1 0 01-1-1v-3a1 1 0 112 0v1zm12-2a1 1 0 01-1 1h-2a1 1 0 110-2h1V6a1 1 0 112 0v6z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          {uploadedFile && (
            <div className="absolute bottom-4 right-4 bg-blue-900/40 px-3 py-1.5 rounded text-xs text-blue-300 backdrop-blur-sm">
              {viewMode === 'wireframe' ? 'Wireframe View' : 'Solid View'} {isRotating && '• Rotating'} {showGrid && '• Grid'}
            </div>
          )}
        </div>
        
        <div className="w-64 ml-4 space-y-4 overflow-y-auto">
          <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-900/30">
            <h3 className="text-blue-300 text-sm mb-3 uppercase tracking-wider">Display Settings</h3>
            
            <div className="space-y-3">
              <div>
                <label className="flex items-center text-blue-200 text-sm">
                  <input 
                    type="checkbox" 
                    checked={viewMode === 'wireframe'} 
                    onChange={toggleWireframe}
                    className="mr-2 bg-blue-900/40 border-blue-800/70" 
                  />
                  Wireframe Mode
                </label>
              </div>
              
              <div>
                <label className="flex items-center text-blue-200 text-sm">
                  <input 
                    type="checkbox" 
                    checked={isRotating} 
                    onChange={toggleRotation}
                    className="mr-2 bg-blue-900/40 border-blue-800/70" 
                  />
                  Auto-Rotate
                </label>
              </div>
              
              <div>
                <label className="flex items-center text-blue-200 text-sm">
                  <input 
                    type="checkbox" 
                    checked={showGrid} 
                    onChange={toggleGrid}
                    className="mr-2 bg-blue-900/40 border-blue-800/70" 
                  />
                  Show Grid
                </label>
              </div>
              
              <div>
                <label className="block text-blue-200 text-sm mb-1">Color</label>
                <div className="flex items-center">
                  <input 
                    type="color" 
                    value={modelColor} 
                    onChange={(e) => setModelColor(e.target.value)}
                    className="bg-transparent border border-blue-800/50 rounded h-8 w-8 mr-2" 
                  />
                  <span className="text-blue-300 text-xs">{modelColor}</span>
                </div>
              </div>
            </div>
          </div>
          
          {uploadedFile && (
            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-900/30">
              <h3 className="text-blue-300 text-sm mb-3 uppercase tracking-wider">File Information</h3>
              
              <div className="space-y-2">
                <div>
                  <span className="text-blue-400/70 text-xs">Name:</span>
                  <p className="text-blue-200 text-sm truncate">{uploadedFile.name}</p>
                </div>
                <div>
                  <span className="text-blue-400/70 text-xs">Size:</span>
                  <p className="text-blue-200 text-sm">{Math.round(uploadedFile.size / 1024)} KB</p>
                </div>
                <div>
                  <span className="text-blue-400/70 text-xs">Type:</span>
                  <p className="text-blue-200 text-sm">{uploadedFile.type || '3D Model'}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-900/30">
            <h3 className="text-blue-300 text-sm mb-3 uppercase tracking-wider">Demo Models</h3>
            
            <div className="space-y-2">
              {['Cube', 'Pyramid', 'Sphere', 'Torus'].map((model, index) => (
                <button 
                  key={index}
                  onClick={() => loadDemoModel(model)}
                  className="w-full text-left px-3 py-2 bg-blue-900/40 hover:bg-blue-800/50 text-blue-200 text-sm rounded transition-colors"
                >
                  {model}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-blue-400/70 text-xs">
        <p>Left-click + drag to rotate • Scroll to zoom</p>
      </div>
    </div>
  );
};

export default ModelViewerApp;
