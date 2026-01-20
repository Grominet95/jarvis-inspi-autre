import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';



// ModelCreator3DApp: File selection then image-to-3D via Hunyuan3D-2.1 API
const ModelCreator3DApp = ({ onClose }) => {
  // Disable right-click context menu
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageURL, setImageURL] = useState('');
  const [error, setError] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelURL, setModelURL] = useState('');
  const [modelFile, setModelFile] = useState(null); // Store the actual file from API
  const [modelStats, setModelStats] = useState(null); // Store mesh statistics
  // Fullscreen toggle state
  const [isFullscreen, setIsFullscreen] = useState(false);
  // UI: show image generation settings
  const [showSettings, setShowSettings] = useState(false);
  // File input reference
  const fileInputRef = useRef(null);
  
  // Hunyuan3D-2.1 API parameters
  const [generationMode, setGenerationMode] = useState('Standard'); // Turbo or Standard (changed to Standard for 30 steps)
  const [decodingMode, setDecodingMode] = useState('Standard'); // Low, Standard, High
  const [steps, setSteps] = useState(30); // Inference steps (set to 30 as requested)
  const [guidanceScale, setGuidanceScale] = useState(5); // Guidance scale: 5
  const [seed, setSeed] = useState(1234); // Seed: 1234
  const [randomizeSeed, setRandomizeSeed] = useState(false); // Turn off random seed to use 1234
  const [octreeResolution, setOctreeResolution] = useState(256); // Octree Resolution: 256
  const [removeBackground, setRemoveBackground] = useState(true); // Remove background: true
  const [numChunks, setNumChunks] = useState(8000); // Number of Chunks: 8000
  
  // Export settings
  const [includeTexture, setIncludeTexture] = useState(false);
  const [simplifyMesh, setSimplifyMesh] = useState(false);
  const [targetFaceNum, setTargetFaceNum] = useState(10000); // Target face number: 10000
  const viewerRef = useRef(null);

  // Handle fullscreen change events
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Auto-update steps based on generation mode
  useEffect(() => {
    if (generationMode === 'Turbo') {
      setSteps(1);
    } else {
      setSteps(30); // Standard mode uses 30 steps
    }
  }, [generationMode]);

  // Auto-update octree resolution based on decoding mode
  useEffect(() => {
    if (decodingMode === 'Low') {
      setOctreeResolution(16);
    } else if (decodingMode === 'Standard') {
      setOctreeResolution(256);
    } else { // High
      setOctreeResolution(512);
    }
  }, [decodingMode]);

  const toggleFullscreen = () => {
    const el = viewerRef.current;
    if (!el) return;
    try {
      if (!isFullscreen) {
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
        else if (el.msRequestFullscreen) el.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
    } catch (e) {
      console.error('Fullscreen error', e);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageURL(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    } else {
      setError('Please select a valid image file');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };



  const createModel = async () => {
    setError(''); 
    setModelURL('');
    setModelFile(null);
    setModelStats(null);
    
    if (!selectedFile) return setError('No image selected');
    setModelLoading(true);
    
    try {
      console.log('Starting 3D model generation...');
      
      // Fetch Hugging Face token for authentication
      let hfToken = null;
      try {
        const hfResponse = await fetch('/api/huggingface/config');
        if (hfResponse.ok) {
          const hfConfig = await hfResponse.json();
          hfToken = hfConfig.token;
          console.log('Using Hugging Face token for authentication');
        }
      } catch (hfError) {
        console.warn('Could not load HF token, using anonymous access:', hfError);
      }
      
      // Import Gradio client with proper handle_file function
      const { Client, handle_file } = await import('@gradio/client');
      
      console.log('Connecting to Hunyuan3D-2.1...');
      console.log('HF Token available:', !!hfToken);
      
      // Try different authentication methods for Gradio client
      let app;
      
      // Set global fetch interceptor for all HF requests BEFORE connecting
      if (hfToken) {
        console.log('Setting up global HF authentication...');
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
          if (typeof url === 'string') {
            console.log('Fetch to:', url);
            
            // Add auth headers for all HF-related requests
            if (url.includes('huggingface.co') || url.includes('hf.co') || 
                url.includes('gradio') || url.includes('tencent')) {
              console.log('Adding auth headers to:', url);
              options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${hfToken}`,
                'X-HF-TOKEN': hfToken,
                'Cookie': `token=${hfToken}`
              };
            }
          }
          return originalFetch(url, options);
        };
      }
      
      console.log('Connecting to Space...');
      try {
        app = await Client.connect("tencent/Hunyuan3D-2.1");
        console.log('Connected successfully');
      } catch (connectError) {
        console.error('Connection failed:', connectError);
        throw new Error(`Failed to connect to Hunyuan3D Space: ${connectError.message}`);
      }
      
      console.log('Preparing file for upload...');
      const finalSeed = randomizeSeed ? Math.floor(Math.random() * 10000) : seed;
      
      console.log('Calling shape_generation API...');
      // Use the exact format from the API documentation (object format, not array)
      const result = await app.predict("/shape_generation", {
        image: handle_file(selectedFile), // Use handle_file for proper file upload
        mv_image_front: null,
        mv_image_back: null, 
        mv_image_left: null, 
        mv_image_right: null,
        steps: steps,
        guidance_scale: guidanceScale,
        seed: finalSeed,
        octree_resolution: octreeResolution,
        check_box_rembg: removeBackground,
        num_chunks: numChunks,
        randomize_seed: randomizeSeed,
      });

      console.log('API Result received:', result);
      
      // Handle the response data according to the API documentation
      if (result.data && result.data.length > 0) {
        const modelFile = result.data[0]; // 3D model file
        // const htmlOutput = result.data[1]; // HTML output (unused)
        const meshStats = result.data[2]; // Mesh statistics  
        const usedSeed = result.data[3]; // Final seed used
        
        console.log('Model file received:', modelFile);
        
        // Handle different types of model file responses for STL
        let modelUrl;
        console.log('Processing model file:', typeof modelFile, modelFile);
        
        if (typeof modelFile === 'string') {
          modelUrl = modelFile; // Already a URL
        } else if (modelFile && modelFile.url) {
          modelUrl = modelFile.url; // File object with URL
        } else if (modelFile && modelFile.orig_name) {
          // Gradio file object - use the path/url property
          modelUrl = modelFile.path || modelFile.url;
        } else if (modelFile && typeof modelFile === 'object') {
          // Try to create blob URL from file data
          try {
            // If it's a File/Blob object, create object URL
            if (modelFile instanceof Blob || modelFile instanceof File) {
              modelUrl = URL.createObjectURL(modelFile);
            } else {
              // If it has data property, try to create blob
              const fileData = modelFile.data || modelFile;
              if (fileData instanceof ArrayBuffer) {
                const blob = new Blob([fileData], { type: 'application/octet-stream' });
                modelUrl = URL.createObjectURL(blob);
              } else {
                throw new Error('Unknown file data format');
              }
            }
          } catch (blobError) {
            console.error('Error creating blob URL:', blobError);
            throw new Error(`Failed to process model file: ${blobError.message}`);
          }
        } else {
          throw new Error('Invalid model file format received from API');
        }
        
        setModelURL(modelUrl);
        setModelFile({ url: modelUrl, data: modelFile });
        setModelStats(meshStats);
        setSeed(usedSeed || finalSeed);
        
        console.log('3D model generation completed successfully!');
        
      } else {
        throw new Error('No 3D model data received from API');
      }
      
    } catch (e) {
      console.error('Hunyuan3D API Error:', e);
      // Provide more detailed error information
      let errorMessage = e.message;
      if (e.message.includes('AttributeError')) {
        errorMessage = `API Error: ${e.message}. This might be due to incorrect parameter format or missing required fields.`;
      }
      setError(`3D Generation failed: ${errorMessage}`);
    } finally {
      setModelLoading(false);
    }
  };

  // Reset to initial state
  const handleReset = () => {
    setSelectedFile(null);
    setImageURL('');
    setModelURL('');
    setModelFile(null);
    setModelStats(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Export model with custom settings
  const exportModel = async () => {
    if (!modelFile) return setError('No model to export');
    
    try {
      setModelLoading(true);
      
      // Use Gradio client for export if available, otherwise direct download
      try {
        console.log('Attempting to use export API...');
        
        // Fetch Hugging Face token for authentication
        let hfToken = null;
        try {
          const hfResponse = await fetch('/api/huggingface/config');
          if (hfResponse.ok) {
            const hfConfig = await hfResponse.json();
            hfToken = hfConfig.token;
          }
        } catch (hfError) {
          console.warn('Could not load HF token for export:', hfError);
        }
        
        const { Client } = await import('@gradio/client');
        
        // Use the same authentication setup
        if (hfToken) {
          const originalFetch = window.fetch;
          window.fetch = function(url, options = {}) {
            if (typeof url === 'string' && (url.includes('huggingface.co') || url.includes('tencent') || url.includes('gradio'))) {
              options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${hfToken}`
              };
            }
            return originalFetch.call(this, url, options);
          };
        }
        
        const app = await Client.connect("tencent/Hunyuan3D-2.1");
        
        // Use the on_export_click endpoint with the model file (object format)
        const result = await app.predict("/on_export_click", {
          file_out: modelFile.data || modelFile,
          file_out2: modelFile.data || modelFile,
          file_type: "stl", // Changed to STL format
          reduce_face: simplifyMesh,
          export_texture: includeTexture,
          target_face_num: targetFaceNum,
        });

        console.log('Export Result:', result);
        
        // Handle export result
        if (result.data && result.data[1]) {
          const exportedFile = result.data[1];
          
          // Create download URL
          let downloadUrl;
          if (typeof exportedFile === 'string') {
            downloadUrl = exportedFile;
          } else if (exportedFile.url) {
            downloadUrl = exportedFile.url;
          } else {
            downloadUrl = URL.createObjectURL(new Blob([exportedFile]));
          }
          
          // Trigger download
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `hunyuan3d_model_${Date.now()}.stl`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Clean up object URL if we created it
          if (!exportedFile.url && downloadUrl.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
          }
        } else {
          throw new Error('Export API did not return a file');
        }
        
      } catch (exportError) {
        console.log('Export API failed, falling back to direct download:', exportError);
        
        // Fallback: Direct download of the original model file
        if (modelFile.url) {
          const a = document.createElement('a');
          a.href = modelFile.url;
          a.download = `hunyuan3d_model_${Date.now()}.stl`;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          throw new Error('No model file URL available for download');
        }
      }
      
    } catch (e) {
      console.error('Export Error:', e);
      setError(`Export failed: ${e.message}`);
    } finally {
      setModelLoading(false);
    }
  };

  // Initialize and render 3D model when modelURL is set
  useEffect(() => {
    if (!modelURL || !viewerRef.current) return;
    const container = viewerRef.current;
    // Clear any existing
    container.innerHTML = '';
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene, camera, renderer
    const scene = new THREE.Scene();
    // Match ModelViewerApp background
    scene.background = new THREE.Color(0x0a1929);
    // Default grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
    scene.add(gridHelper);
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Add lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(1, 1, 1);
    scene.add(directional);

    // Load STL model
    const loadModel = () => {
      console.log('Loading STL model from:', modelURL);
      
      const loader = new STLLoader();
      loader.load(modelURL, (geometry) => {
        console.log('STL geometry loaded successfully');
        
        const material = new THREE.MeshNormalMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        
        // Center & scale the STL model
        geometry.center();
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3()).length();
        const scale = 3 / size;
        mesh.scale.set(scale, scale, scale);
        
        scene.add(mesh);
        console.log('STL model added to scene');
      }, (progress) => {
        console.log('Loading progress:', progress);
      }, (error) => {
        console.error('Error loading STL:', error);
        // Fallback to basic geometry if model fails to load
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshNormalMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
      });
    };

    loadModel();

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [modelURL]);

  // If a 3D model URL is available, render the 3D viewer
  if (modelURL) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-blue-900/30">
          <div className="flex justify-between items-center">
            <button onClick={handleReset} className="text-xs text-blue-300">← Back</button>
            <div className="flex items-center space-x-2">
              {modelStats && (
                <div className="text-xs text-blue-200">
                  Vertices: {modelStats.vertices || 'N/A'} | Faces: {modelStats.faces || 'N/A'}
                </div>
              )}
              <button
                onClick={exportModel}
                disabled={modelLoading}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded disabled:opacity-50"
              >
                {modelLoading ? 'Exporting...' : 'Export GLB'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="relative flex-1 w-full">
          <div ref={viewerRef} className="w-full h-full" />
          
          {/* Control buttons */}
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-4 left-4 bg-blue-900/50 hover:bg-blue-800/60 text-blue-300 p-2 rounded transition-colors flex items-center justify-center"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v4a1 1 0 01-1 1H1a1 1 0 010-2h1V5a3 3 0 013-3h3a1 1 0 010 2H5zm10 0a1 1 0 00-1 1v3a1 1 0 102 0V6h1a1 1 0 100-2h-2zm-8 10a1 1 0 00-1 1v1h3a1 1 0 100 2H3a1 1 0 01-1-1v-3a1 1 0 112 0v1zm12-2a1 1 0 01-1 1h-2a1 1 0 110-2h1V6a1 1 0 112 0v6z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 01-1 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          {/* Export settings panel */}
          <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white p-3 rounded-lg text-xs space-y-2 max-w-48">
            <div className="font-semibold text-blue-300">Export Settings</div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeTexture}
                onChange={(e) => setIncludeTexture(e.target.checked)}
                className="mr-2"
              />
              Include Texture
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={simplifyMesh}
                onChange={(e) => setSimplifyMesh(e.target.checked)}
                className="mr-2"
              />
              Simplify Mesh
            </label>
            {simplifyMesh && (
              <div>
                <label className="block text-xs text-blue-200 mb-1">Target Faces</label>
                <input
                  type="number"
                  value={targetFaceNum}
                  onChange={(e) => setTargetFaceNum(parseInt(e.target.value))}
                  className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
                  min="100"
                  max="50000"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default UI: speech->image->3D model
  return (
    <div className="relative flex flex-col h-full">
      {/* Settings panel */}
      {showSettings && (
        <div className="absolute right-0 top-0 h-full w-80 bg-gray-900 z-20 p-4 overflow-y-auto">
          <button onClick={() => setShowSettings(false)} className="text-blue-300 mb-4">Close</button>
          
          {/* 3D Generation Settings */}
          <h3 className="text-white mb-2 font-semibold">3D Generation Settings</h3>
          
          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Generation Mode</label>
            <select
              value={generationMode}
              onChange={e => setGenerationMode(e.target.value)}
              className="settings-input w-full text-sm"
            >
              <option value="Turbo">Turbo (Fast)</option>
              <option value="Standard">Standard (Quality)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Decoding Mode</label>
            <select
              value={decodingMode}
              onChange={e => setDecodingMode(e.target.value)}
              className="settings-input w-full text-sm"
            >
              <option value="Low">Low (16 res)</option>
              <option value="Standard">Standard (256 res)</option>
              <option value="High">High (512 res)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Inference Steps: {steps}</label>
            <input
              type="range"
              value={steps}
              onChange={e => setSteps(parseInt(e.target.value))}
              min="1"
              max="50"
              className="w-full"
            />
          </div>

          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Guidance Scale: {guidanceScale}</label>
            <input
              type="range"
              value={guidanceScale}
              onChange={e => setGuidanceScale(parseFloat(e.target.value))}
              min="1"
              max="10"
              step="0.5"
              className="w-full"
            />
          </div>

          <div className="mb-3">
            <label className="block text-blue-200 text-sm mb-1">Number of Chunks: {numChunks}</label>
            <input
              type="range"
              value={numChunks}
              onChange={e => setNumChunks(parseInt(e.target.value))}
              min="1000"
              max="20000"
              step="1000"
              className="w-full"
            />
          </div>

          <div className="mb-3">
            <label className="flex items-center text-blue-200 text-sm">
              <input
                type="checkbox"
                checked={removeBackground}
                onChange={e => setRemoveBackground(e.target.checked)}
                className="mr-2"
              />
              Remove Background
            </label>
          </div>

          <div className="mb-3">
            <label className="flex items-center text-blue-200 text-sm">
              <input
                type="checkbox"
                checked={randomizeSeed}
                onChange={e => setRandomizeSeed(e.target.checked)}
                className="mr-2"
              />
              Randomize Seed
            </label>
          </div>

          {!randomizeSeed && (
            <div className="mb-3">
              <label className="block text-blue-200 text-sm mb-1">Seed</label>
              <input
                type="number"
                value={seed}
                onChange={e => setSeed(parseInt(e.target.value))}
                className="settings-input w-full text-sm"
                min="0"
                max="999999"
              />
            </div>
          )}
        </div>
      )}
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-3">
        <div className="w-full flex justify-between">
          <button onClick={onClose} className="text-xs text-blue-300">← Back</button>
          <button onClick={() => setShowSettings(true)} className="text-xs text-blue-300">Settings</button>
        </div>
        <h2 className="text-lg font-light">3D Model Creator</h2>
        
        {/* File Selection */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={triggerFileSelect}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded w-full flex items-center justify-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span>{selectedFile ? 'Change Image' : 'Select Image'}</span>
          </button>
          {selectedFile && (
            <div className="text-xs text-blue-200 text-center">
              Selected: {selectedFile.name}
            </div>
          )}
        </div>
        {imageURL && (
          <img src={imageURL} alt="Selected file preview" className="mt-4 w-full h-64 object-contain border rounded" />
        )}
        {selectedFile && !modelURL && (
          <button
            onClick={createModel} disabled={modelLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded w-full"
          >
            {modelLoading ? 'Generating 3D Model...' : 'Generate 3D Model'}
          </button>
        )}
        {modelURL && (
          <div className="space-y-2">
            <button
              onClick={exportModel}
              disabled={modelLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 w-full"
            >
              {modelLoading ? 'Exporting...' : 'Export 3D Model (STL)'}
            </button>
            {modelStats && (
              <div className="text-xs text-blue-200 text-center">
                Seed: {seed} | Vertices: {modelStats.vertices || 'N/A'} | Faces: {modelStats.faces || 'N/A'}
              </div>
            )}
          </div>
        )}
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  </div>
  );
};

export default ModelCreator3DApp;