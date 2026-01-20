import React, { useState, useEffect, useRef } from 'react';
import '../styles/text-chat-panel.css';
import openaiTextService from '../services/openaiTextService';
import { getFromStorage } from '../services/serviceUtils';
import VectorStoreManager from './VectorStoreManager';

const TextChatPanel = ({ onExpandedChange }) => {
  // Panel state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Model selection
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4.1');
  const [loadingModels, setLoadingModels] = useState(false);
  
  // Vector store management
  const [vectorStores, setVectorStores] = useState([]);
  const [selectedVectorStores, setSelectedVectorStores] = useState([]);
  const [useFileSearch, setUseFileSearch] = useState(false);
  const [loadingVectorStores, setLoadingVectorStores] = useState(false);
  const [showVectorStores, setShowVectorStores] = useState(false);
  const [isVectorDropdownClosing, setIsVectorDropdownClosing] = useState(false);
  const [vectorStoreManagerOpen, setVectorStoreManagerOpen] = useState(false);
  
  // Visual interpretation mode
  const [useVisualInterpretation, setUseVisualInterpretation] = useState(false);
  
  // Camera and image capture
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // File upload for vector stores
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newVectorStoreName, setNewVectorStoreName] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);
  const fileInputRef = useRef(null);
  
  // STT (cloned from ModelCreator3DApp)
  const [listening, setListening] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // System prompt management
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  // Initialize Speech Recognition (cloned approach from ModelCreator3DApp)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech Recognition API not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      setCurrentMessage(finalTranscript + interimTranscript);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setListening(false);
      if (event.error !== 'no-speech') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };
    
    recognition.onend = () => {
      setListening(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Load available models and vector stores when panel is first expanded
  useEffect(() => {
    if (isExpanded) {
      if (availableModels.length === 0) {
        loadAvailableModels();
      }
      if (vectorStores.length === 0) {
        loadVectorStores();
      }
    }
  }, [isExpanded]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update API key when it changes
  useEffect(() => {
    const apiKey = getFromStorage('openai_api_key', '');
    if (apiKey) {
      openaiTextService.setApiKey(apiKey);
    }
  }, []);

  // Update visual interpretation mode in service
  useEffect(() => {
    openaiTextService.setVisualInterpretation(useVisualInterpretation);
  }, [useVisualInterpretation]);

  // Cleanup camera stream when modal closes
  useEffect(() => {
    if (!showCameraModal && cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [showCameraModal, cameraStream]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAvailableModels = async () => {
    setLoadingModels(true);
    setError('');
    
    try {
      const models = await openaiTextService.fetchAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load models:', error);
      setError('Failed to load available models. Using defaults.');
      // Set fallback models
      setAvailableModels([
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ]);
    } finally {
      setLoadingModels(false);
    }
  };

  const loadVectorStores = async () => {
    setLoadingVectorStores(true);
    setError('');
    
    try {
      const stores = await openaiTextService.fetchVectorStores();
      setVectorStores(stores);
    } catch (error) {
      console.error('Failed to load vector stores:', error);
      setError('Failed to load vector stores. Vector search will be disabled.');
    } finally {
      setLoadingVectorStores(false);
    }
  };

  // Start listening (press-and-hold implementation from ModelCreator3DApp)
  const startListening = () => {
    setError('');
    if (recognitionRef.current && !listening) {
      setCurrentMessage('');
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setError('Failed to start speech recognition');
      }
    }
  };

  // Stop listening (press-and-hold implementation)
  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() && !capturedImageUrl) return;
    
    const userMessage = currentMessage.trim() || "Please analyze this image.";
    setCurrentMessage('');
    setError('');
    setIsLoading(true);

    // Add user message to chat (with image indicator if present)
    const newUserMessage = {
      id: Date.now() + Math.random(), // Fix duplicate key issue
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      hasImage: !!capturedImageUrl,
      imageUrl: capturedImageUrl, // Use the data URL directly for persistent display
      imageDataUrl: capturedImageUrl // Store data URL separately for API
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    
    // Clear captured image immediately after sending message (not after AI response)
    if (capturedImageUrl) {
      clearCapturedImage();
    }
    
    try {
      // Build conversation history for context (excluding image URLs for now)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send message to OpenAI with conversation history and optional image
      const response = await openaiTextService.sendMessage(
        userMessage, 
        selectedModel, 
        systemPrompt.trim() || '', // Use custom system prompt if provided
        conversationHistory,
        selectedVectorStores,
        useFileSearch && selectedVectorStores.length > 0,
        capturedImageUrl // This is now the data URL that OpenAI can process
      );
      
      console.log('Service response:', response);
      
      // Validate response structure
      if (!response || typeof response.message !== 'string') {
        throw new Error('Invalid response structure from AI service');
      }
      
      // Add AI response to chat
      const newAIMessage = {
        id: Date.now() + Math.random() + 1, // Fix duplicate key issue
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        model: response.model || selectedModel,
        usage: response.usage,
        citations: response.citations || [],
        hasVectorResults: response.hasVectorResults || false,
        fileSearchResults: response.fileSearchResults || null,
        apiMode: response.apiMode || (useVisualInterpretation ? 'chat' : 'responses'),
        analyzedImage: !!capturedImageUrl
      };
      
      console.log('New AI message object:', newAIMessage);
      
      setMessages(prev => [...prev, newAIMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message);
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + Math.random() + 2, // Fix duplicate key issue
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentMessage('');
    setError('');
    setCapturedImage(null);
    setCapturedImageUrl(null);
  };

  // Camera functions
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      setCameraStream(stream);
      setShowCameraModal(true);
      
      // Set video stream once modal is open
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Could not access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 data URL (this is what OpenAI can process)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Also create a blob URL for local preview
      canvas.toBlob((blob) => {
        const previewUrl = URL.createObjectURL(blob);
        setCapturedImage({
          blob: blob,
          dataUrl: dataUrl,
          previewUrl: previewUrl
        });
        setCapturedImageUrl(dataUrl); // Use data URL for OpenAI
        closeCameraModal();
      }, 'image/jpeg', 0.8);
    }
  };

  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const clearCapturedImage = () => {
    if (capturedImage && capturedImage.previewUrl) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }
    setCapturedImage(null);
    setCapturedImageUrl(null);
  };

  const pasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        alert('Clipboard access not supported in this browser');
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            
            // Convert blob to data URL
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target.result;
              const previewUrl = URL.createObjectURL(blob);
              
              setCapturedImageUrl(dataUrl);
              setCapturedImage({
                dataUrl: dataUrl,
                previewUrl: previewUrl,
                type: type
              });
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      
      alert('No image found in clipboard');
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      alert('Failed to paste from clipboard. Make sure you have copied an image.');
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format AI response with markdown-like formatting
  const formatMessage = (content) => {
    if (typeof content !== 'string') return content;
    
    // Convert markdown-like formatting to HTML elements
    let formatted = content
      // Bold text **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic text *text* or _text_
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')
      // Code blocks ```code```
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code `code`
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Headers ## Header
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Lists - item or * item
      .replace(/^[\-\*] (.*)$/gm, '<li>$1</li>')
      // Numbers 1. item
      .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    // Wrap list items in ul tags
    formatted = formatted.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    
    // Wrap content in paragraph if it doesn't start with a block element
    if (!formatted.match(/^<(h[1-6]|pre|ul|ol|div)/)) {
      formatted = '<p>' + formatted + '</p>';
    }
    
    return formatted;
  };

  // Handle vector store dropdown closing with animation
  const closeVectorStoreDropdown = () => {
    setIsVectorDropdownClosing(true);
    
    // Wait for animation to complete before hiding dropdown
    setTimeout(() => {
      setShowVectorStores(false);
      setIsVectorDropdownClosing(false);
    }, 300); // Match the animation duration
  };

  const toggleVectorStore = (storeId) => {
    setSelectedVectorStores(prev => {
      if (prev.includes(storeId)) {
        return prev.filter(id => id !== storeId);
      } else {
        return [...prev, storeId];
      }
    });
  };

  const createVectorStore = async () => {
    if (!newVectorStoreName.trim()) {
      setError('Please enter a name for the vector store');
      return;
    }

    setCreatingStore(true);
    setError('');

    try {
      const newStore = await openaiTextService.createVectorStore(newVectorStoreName.trim());
      setVectorStores(prev => [...prev, {
        id: newStore.id,
        name: newStore.name || newStore.id,
        file_counts: newStore.file_counts,
        status: newStore.status,
        created_at: newStore.created_at,
        metadata: newStore.metadata
      }]);
      setNewVectorStoreName('');
      setError('');
    } catch (error) {
      console.error('Failed to create vector store:', error);
      setError(`Failed to create vector store: ${error.message}`);
    } finally {
      setCreatingStore(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0 || selectedVectorStores.length === 0) {
      setError('Please select files and at least one vector store');
      return;
    }

    setUploadingFiles(true);
    setError('');

    try {
      for (const storeId of selectedVectorStores) {
        const { results, errors } = await openaiTextService.uploadFilesToVectorStore(storeId, files);
        
        if (errors.length > 0) {
          console.warn('Some files failed to upload:', errors);
          setError(`Some files failed to upload: ${errors.map(e => e.file).join(', ')}`);
        }
        
        console.log(`Uploaded ${results.length} files to vector store ${storeId}`);
      }
      
      // Refresh vector stores to show updated file counts
      await loadVectorStores();
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      setError(`Failed to upload files: ${error.message}`);
    } finally {
      setUploadingFiles(false);
    }
  };

  // Close panel
  const closePanel = () => {
    setIsClosing(true);
    
    // Stop listening if active when closing
    if (listening) {
      stopListening();
    }
    
    // Wait for animation to complete before setting expanded state
    setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
      // Notify parent of expanded state change
      if (onExpandedChange) {
        onExpandedChange(false);
      }
    }, 400); // Match the animation duration
  };

  // Handle expand/collapse
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    // Notify parent of expanded state change
    if (onExpandedChange) {
      onExpandedChange(newState);
    }
  };

  // Handle click outside to close (when expanded)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't trigger if already closing, if clicking inside modals, or if camera modal is open
      if (isClosing || vectorStoreManagerOpen || showCameraModal) return;
      
      // Handle vector dropdown close
      if (showVectorStores && !isVectorDropdownClosing) {
        if (!event.target.closest('.vector-stores-dropdown') && !event.target.closest('.vector-stores-btn')) {
          closeVectorStoreDropdown();
        }
      }
      
      // Handle main panel close
      if (isExpanded && !event.target.closest('.text-chat-content') && !event.target.closest('.vector-store-modal') && !event.target.closest('.camera-modal-backdrop')) {
        closePanel();
      }
    };

    if ((isExpanded && !isClosing && !showCameraModal) || (showVectorStores && !isVectorDropdownClosing && !showCameraModal)) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded, isClosing, vectorStoreManagerOpen, showVectorStores, isVectorDropdownClosing, showCameraModal]);

  return (
    <>
      {/* Full-screen blurred background overlay */}
      {(isExpanded || isClosing) && (
        <div 
          className="text-chat-backdrop" 
          onClick={(e) => {
            // Don't trigger close if already closing
            if (!isClosing) {
              closePanel();
            }
          }} 
        />
      )}
      
      <div className={`text-chat-panel ${isExpanded ? 'expanded' : 'collapsed'} ${isClosing ? 'closing' : ''}`}>
        {/* Toggle Button */}
        <div 
          className="text-chat-toggle"
          onClick={toggleExpanded}
        >
          <div className="toggle-content">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>AI TEXT CHAT</span>
          </div>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={`expand-icon ${isExpanded ? 'rotated' : ''}`}
          >
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>

        {/* Chat Panel Content */}
        {isExpanded && (
          <div className="text-chat-content">
            {/* Header with model selection and vector store controls */}
            <div className="text-chat-header">
              <div className="header-left">
                <span className="chat-title">Jarvis Text Inference</span>
                
                {/* Move Memory Enabled indicator here, positioned to the left */}
                {useFileSearch && selectedVectorStores.length > 0 && (
                  <div className="vector-indicator">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M9 19c-5 0-8-3-8-7s3-7 8-7 8 3 8 7-3 7-8 7"/>
                      <path d="M15 12h6"/>
                    </svg>
                    <span>Memory Enabled</span>
                  </div>
                )}
                
                {/* Vision Enabled indicator */}
                {useVisualInterpretation && (
                  <div className="vision-indicator">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>Vision Enabled</span>
                  </div>
                )}
                
                {systemPrompt.trim() && (
                  <div className="system-prompt-indicator">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M9 12l2 2 4-4"/>
                      <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.55 0 4.84 1.07 6.5 2.78"/>
                    </svg>
                    <span>Custom Prompt</span>
                  </div>
                )}
              </div>
              <div className="header-right">
                <div className="model-selector">
                  {loadingModels ? (
                    <div className="model-loading">Loading models...</div>
                  ) : (
                    <select 
                      value={selectedModel} 
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="model-select"
                    >
                      {availableModels.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <button 
                  className="system-prompt-toggle" 
                  onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                  title="Configure system prompt"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                
                <button className="clear-button" onClick={clearChat} title="Clear chat">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
                  </svg>
                </button>
                
                <button className="close-button" onClick={closePanel} title="Close chat">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Vector Store Dropdown */}
            {showVectorStores && (
              <>
                {/* Backdrop to close dropdown */}
                <div 
                  className="vector-dropdown-backdrop"
                  onClick={closeVectorStoreDropdown}
                />
                <div className="vector-stores-dropdown">
                  <div className={`vector-stores-list ${isVectorDropdownClosing ? 'closing' : ''}`}>
                  {/* Dropdown Header */}
                  <div className="vector-dropdown-header">
                    <div className="dropdown-title">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M4 7V3a1 1 0 011-1h4l1 2h9a1 1 0 011 1v1"/>
                        <path d="M4 7l16 9"/>
                        <path d="M8 11v6"/>
                        <path d="M16 11v6"/>
                      </svg>
                      <span>Vector Store Selection</span>
                    </div>
                    <button 
                      className="dropdown-close-btn"
                      onClick={closeVectorStoreDropdown}
                      title="Close"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="14" 
                        height="14" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="stores-section">
                    {loadingVectorStores ? (
                      <div className="loading-stores">Loading stores...</div>
                    ) : vectorStores.length === 0 ? (
                      <div className="no-stores">No vector stores found</div>
                    ) : (
                      vectorStores.map(store => (
                        <label key={store.id} className="store-item">
                          <input
                            type="checkbox"
                            checked={selectedVectorStores.includes(store.id)}
                            onChange={() => toggleVectorStore(store.id)}
                          />
                          <span className="store-name">{store.name}</span>
                          <span className="store-files">
                            {store.file_counts?.total || 0} files
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  
                  {/* Vector Store Management Section */}
                  <div className="vector-management">
                    <div className="management-section">
                      <div className="section-title">Add New Store</div>
                      <div className="create-store-form">
                        <input
                          type="text"
                          value={newVectorStoreName}
                          onChange={(e) => setNewVectorStoreName(e.target.value)}
                          placeholder="Vector store ID..."
                          className="store-name-input"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && newVectorStoreName.trim()) {
                              createVectorStore();
                            }
                          }}
                        />
                        <button
                          className="create-store-btn"
                          onClick={createVectorStore}
                          disabled={!newVectorStoreName.trim() || creatingStore}
                        >
                          {creatingStore ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" className="spinning">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="60" strokeDashoffset="60" />
                            </svg>
                          ) : (
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="12" 
                              height="12" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2"
                            >
                              <line x1="12" y1="5" x2="12" y2="19"/>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="management-section">
                      <div className="section-title">Upload Files</div>
                      <div className="upload-section">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".txt,.md,.pdf,.docx,.json,.csv"
                          onChange={handleFileUpload}
                          className="file-input"
                          disabled={selectedVectorStores.length === 0 || uploadingFiles}
                        />
                        <button
                          className="upload-trigger-btn"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={selectedVectorStores.length === 0 || uploadingFiles}
                        >
                          {uploadingFiles ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" className="spinning">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="60" strokeDashoffset="60" />
                              </svg>
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="12" 
                                height="12" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17,8 12,3 7,8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                              </svg>
                              <span>Upload Files</span>
                            </>
                          )}
                        </button>
                        {selectedVectorStores.length === 0 && (
                          <div className="upload-hint">Select stores first</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="management-section">
                      <div className="section-title">Advanced Management</div>
                      <button
                        className="vector-manager-btn"
                        onClick={() => setVectorStoreManagerOpen(true)}
                        title="Open Vector Store Manager"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="12" 
                          height="12" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                        >
                          <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                        </svg>
                        <span>Manage Stores</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}

            {/* Messages Area */}
            <div className="text-chat-messages">
              {messages.length === 0 && (
                <div className="empty-chat">
                  <div className="empty-icon">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>                <p className="empty-title">Jarvis Text Inference Ready</p>
                <p className="empty-subtitle">Type your message or use speech-to-text</p>
                </div>
              )}
              
              {messages.filter(message => 
                message && 
                typeof message === 'object' && 
                message.id && 
                message.role && 
                message.content && 
                message.timestamp
              ).map(message => (
                <div 
                  key={message.id} 
                  className={`message ${message.role} ${message.isError ? 'error' : ''}`}
                >
                  <div className="message-header">
                    <span className="message-role">
                      {message.role === 'user' ? 'USER' : message.model || 'AI'}
                      {message.hasImage && <span className="image-indicator">📷</span>}
                      {message.analyzedImage && <span className="analyzed-indicator">🔍</span>}
                      {message.apiMode && <span className="api-mode">({message.apiMode})</span>}
                      {message.tokenParameter === 'max_completion_tokens' && (
                        <span className="reasoning-indicator" title="Uses max_completion_tokens">🧠</span>
                      )}
                    </span>
                    <span className="message-time">{formatTime(message.timestamp)}</span>
                  </div>
                  <div className="message-content">
                    {message.hasImage && message.imageUrl && (
                      <div className="message-image">
                        <img src={message.imageUrl} alt="User uploaded" />
                      </div>
                    )}
                    {typeof message.content === 'string' ? (
                      <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                    ) : (
                      JSON.stringify(message.content)
                    )}
                  </div>
                  {message.citations && message.citations.length > 0 && (
                    <div className="message-citations">
                      <div className="citations-header">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="12" 
                          height="12" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10,9 9,9 8,9"/>
                        </svg>
                        <span>Sources ({message.citations.length})</span>
                      </div>
                      <div className="citations-list">
                        {[...new Map(message.citations.map(c => [c.filename, c])).values()].map((citation, index) => (
                          <div key={index} className="citation-item">
                            <div className="citation-main">
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="10" 
                                height="10" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                              >
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                <polyline points="13,2 13,9 20,9"/>
                              </svg>
                              <span className="citation-filename">{citation.filename}</span>
                            </div>
                            {citation.file_id && (
                              <span className="citation-id">ID: {citation.file_id.slice(-8)}</span>
                            )}
                            <span className="citation-count">
                              {message.citations.filter(c => c.filename === citation.filename).length} refs
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {message.hasVectorResults && (
                    <div className="vector-indicator-message">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M9 19c-5 0-8-3-8-7s3-7 8-7 8 3 8 7-3 7-8 7"/>
                        <path d="M15 12h6"/>
                      </svg>
                      <span>Enhanced with vector database knowledge</span>
                    </div>
                  )}
                  {message.usage && (
                    <div className="message-usage">
                      Tokens: {message.usage.total_tokens} 
                      (prompt: {message.usage.prompt_tokens}, completion: {message.usage.completion_tokens})
                      {message.tokenParameter && (
                        <span className="token-param-info"> • Using: {message.tokenParameter}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-header">
                    <span className="message-role">{selectedModel}</span>
                    <span className="message-time">...</span>
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="text-chat-input">
              {error && (
                <div className="error-message">{error}</div>
              )}
              
              {/* Show captured image preview */}
              {capturedImage && (
                <div className="captured-image-container">
                  <div className="captured-image-header">
                    <span className="image-status">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      Image ready for analysis
                    </span>
                    <button 
                      className="clear-image-btn"
                      onClick={clearCapturedImage}
                      title="Remove image"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="captured-image-preview">
                    <img src={capturedImage.previewUrl || capturedImage.dataUrl} alt="Captured for analysis" />
                  </div>
                </div>
              )}
              
              <div className="input-controls">
                <div className="text-input">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && (currentMessage.trim() || capturedImageUrl)) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={capturedImageUrl ? "Describe what you'd like to know about the image..." : "Type your message here..."}
                    className="message-input"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="speech-controls">
                  {/* Long-Term Memory Index toggle moved here */}
                  <div className="memory-controls">
                    <label className={`vector-toggle ${useFileSearch ? 'active' : 'inactive'}`}>
                      <input
                        type="checkbox"
                        checked={useFileSearch}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // If enabling LTM, disable Visual Interpretation
                            setUseVisualInterpretation(false);
                            setUseFileSearch(true);
                          } else {
                            setUseFileSearch(false);
                          }
                        }}
                      />
                      <span className="toggle-text">Long-Term Memory Index</span>
                    </label>
                    
                    {/* Visual Interpretation toggle */}
                    <label className={`visual-toggle ${useVisualInterpretation ? 'active' : 'inactive'}`}>
                      <input
                        type="checkbox"
                        checked={useVisualInterpretation}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // If enabling Visual Interpretation, disable LTM
                            setUseFileSearch(false);
                            setUseVisualInterpretation(true);
                          } else {
                            setUseVisualInterpretation(false);
                          }
                        }}
                      />
                      <span className="toggle-text">Visual Interpretation</span>
                    </label>
                    
                    {/* Vector stores button moved here */}
                    <button 
                      className={`vector-stores-btn ${!useFileSearch ? 'disabled' : ''}`}
                      onClick={() => useFileSearch && setShowVectorStores(!showVectorStores)}
                      disabled={!useFileSearch}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="14" 
                        height="14" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M4 7V3a1 1 0 011-1h4l1 2h9a1 1 0 011 1v1"/>
                        <path d="M4 7l16 9"/>
                        <path d="M8 11v6"/>
                        <path d="M16 11v6"/>
                      </svg>
                      <span>{vectorStores.length} stores</span>
                    </button>
                  </div>
                  
                  <div className="input-buttons">
                    <button
                      className={`camera-button ${useVisualInterpretation ? 'enabled' : 'disabled'}`}
                      onClick={useVisualInterpretation ? openCamera : undefined}
                      disabled={isLoading || !useVisualInterpretation}
                      title={useVisualInterpretation ? "Capture photo for analysis" : "Enable Visual Interpretation to use camera"}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </button>
                    
                    <button
                      className={`clipboard-button ${useVisualInterpretation ? 'enabled' : 'disabled'}`}
                      onClick={useVisualInterpretation ? pasteFromClipboard : undefined}
                      disabled={isLoading || !useVisualInterpretation}
                      title={useVisualInterpretation ? "Paste image from clipboard" : "Enable Visual Interpretation to paste images"}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <path d="M12 11l-2 2 4 4"/>
                      </svg>
                    </button>
                    
                    <button
                      className={`stt-button ${listening ? 'listening' : ''}`}
                      onMouseDown={startListening}
                      onMouseUp={stopListening}
                      onMouseLeave={stopListening}
                      onTouchStart={startListening}
                      onTouchEnd={stopListening}
                      disabled={isLoading}
                      title="Press and hold to speak"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    </button>
                    
                    <button
                      className="send-button"
                      onClick={sendMessage}
                      disabled={(!currentMessage.trim() && !capturedImageUrl) || isLoading}
                      title="Send message"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* System Prompt Configuration */}
            {showSystemPrompt && (
              <div className="system-prompt-section">
                <div className="system-prompt-header">
                  <span className="section-title">System Prompt</span>
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter a system prompt to customize the AI's behavior..."
                  className="system-prompt-input"
                  rows={3}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <div 
          className="camera-modal-backdrop" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeCameraModal();
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div 
            className="camera-modal" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="camera-modal-header">
              <h3>Capture Photo for AI Analysis</h3>
              <button 
                className="close-modal-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeCameraModal();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="camera-preview">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="camera-video"
              />
              <canvas 
                ref={canvasRef}
                style={{ display: 'none' }}
              />
            </div>
            
            <div className="camera-controls">
              <button 
                className="capture-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  capturePhoto();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>Capture Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vector Store Manager Modal */}
      <VectorStoreManager
        isOpen={vectorStoreManagerOpen}
        onClose={() => setVectorStoreManagerOpen(false)}
        settings={{
          apiKey: getFromStorage('openai_api_key', ''),
          vectorStoreId: selectedVectorStores[0] || '' // Pass first selected store
        }}
        onVectorStoreSelect={(storeId) => {
          // Add the selected store to our selection if not already selected
          if (!selectedVectorStores.includes(storeId)) {
            setSelectedVectorStores(prev => [...prev, storeId]);
          }
          // Reload vector stores to get updated info
          loadVectorStores();
        }}
      />
    </>
  );
};

export default TextChatPanel;