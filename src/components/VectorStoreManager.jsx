import React, { useState, useEffect, useRef } from 'react';
import '../styles/vector-store-manager.css';
import openaiTextService from '../services/openaiTextService';

const VectorStoreManager = ({ isOpen, onClose, settings, onVectorStoreSelect }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [vectorStores, setVectorStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch data when component opens
  useEffect(() => {
    if (isOpen && settings.apiKey) {
      fetchVectorStores();
      if (settings.vectorStoreId) {
        setSelectedStoreId(settings.vectorStoreId);
        fetchFiles(settings.vectorStoreId);
        fetchStoreInfo(settings.vectorStoreId);
      }
    }
  }, [isOpen, settings.apiKey, settings.vectorStoreId]);

  // Fetch files when selected store changes
  useEffect(() => {
    if (selectedStoreId && settings.apiKey) {
      fetchFiles(selectedStoreId);
      fetchStoreInfo(selectedStoreId);
    }
  }, [selectedStoreId, settings.apiKey]);

  const fetchVectorStores = async () => {
    try {
      const stores = await openaiTextService.fetchVectorStores();
      setVectorStores(stores);
    } catch (err) {
      console.error('Error fetching vector stores:', err);
      showNotification('Failed to load vector stores', 'error');
    }
  };

  const fetchFiles = async (storeId) => {
    if (!storeId || !settings.apiKey) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const filesList = await openaiTextService.getVectorStoreFiles(storeId);
      setFiles(filesList);
    } catch (err) {
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStoreInfo = async (storeId) => {
    if (!storeId || !settings.apiKey) return;
    
    try {
      const info = await openaiTextService.getVectorStoreDetails(storeId);
      setStoreInfo(info);
    } catch (err) {
      console.error('Error fetching store info:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedStoreId) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.random() * 20;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 500);

    try {
      await openaiTextService.uploadFileToVectorStore(selectedStoreId, file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      showNotification(`File "${file.name}" successfully uploaded!`, 'success');
      
      // Refresh the file list after successful upload
      setTimeout(() => {
        fetchFiles(selectedStoreId);
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
      showNotification(`Upload failed: ${err.message}`, 'error');
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await openaiTextService.removeFileFromVectorStore(selectedStoreId, fileId);
      showNotification(`File "${fileName}" successfully deleted!`, 'success');
      fetchFiles(selectedStoreId);
    } catch (err) {
      setError(err.message);
      showNotification(`Delete failed: ${err.message}`, 'error');
      setIsLoading(false);
    }
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;

    setCreatingStore(true);
    try {
      const newStore = await openaiTextService.createVectorStore(newStoreName.trim());
      showNotification(`Vector store "${newStoreName}" created successfully!`, 'success');
      setNewStoreName('');
      await fetchVectorStores();
      setSelectedStoreId(newStore.id);
    } catch (err) {
      showNotification(`Failed to create store: ${err.message}`, 'error');
    } finally {
      setCreatingStore(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    let date;
    if (typeof dateString === 'number') {
      date = new Date(dateString * 1000);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="vector-store-modal-overlay"
      onClick={(e) => {
        // Only close if clicking the overlay itself, not the modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="vector-store-modal"
        onClick={(e) => {
          // Prevent clicks inside the modal from propagating to the overlay
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="vector-store-header">
          <h2 className="vector-store-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            <span>Vector Store Manager</span>
          </h2>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }} 
            className="vector-store-close-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Store Selection & Creation */}
        <div className="vector-store-controls">
          <div className="store-selection">
            <label className="control-label">Vector Store</label>
            <select 
              value={selectedStoreId} 
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="store-select"
            >
              <option value="">Select a vector store...</option>
              {vectorStores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.file_counts?.total || 0} files)
                </option>
              ))}
            </select>
          </div>

          <div className="store-creation">
            <label className="control-label">Create New Store</label>
            <div className="creation-form">
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Enter store name..."
                className="store-name-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newStoreName.trim()) {
                    handleCreateStore();
                  }
                }}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateStore();
                }}
                disabled={!newStoreName.trim() || creatingStore}
                className="create-store-btn glossy-btn"
              >
                {creatingStore ? (
                  <div className="loading-spinner" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                )}
                <span>{creatingStore ? 'Creating...' : 'Create'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Store Info */}
        {selectedStoreId && storeInfo && (
          <div className="store-info">
            <div className="info-card">
              <div className="info-label">Store ID</div>
              <div className="info-value store-id">{selectedStoreId}</div>
            </div>
            <div className="info-card">
              <div className="info-label">Name</div>
              <div className="info-value">{storeInfo.name || 'Unnamed'}</div>
            </div>
            <div className="info-card">
              <div className="info-label">Created</div>
              <div className="info-value">{formatDate(storeInfo.created_at)}</div>
            </div>
            <div className="info-card">
              <div className="info-label">Files</div>
              <div className="info-value">{storeInfo.file_counts?.total || 0}</div>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification.show && (
          <div className={`notification ${notification.type === 'success' ? 'notification-success' : 'notification-error'}`}>
            <div className="notification-content">
              {notification.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="upload-progress">
            <div className="progress-header">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Files Table */}
        <div className="files-section">
          {error && !isLoading && (
            <div className="error-message">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="files-table-container">
            <table className="files-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="loading-row">
                      <div className="loading-content">
                        <div className="loading-spinner" />
                        <span>Loading files...</span>
                      </div>
                    </td>
                  </tr>
                ) : !selectedStoreId ? (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      Select a vector store to view files
                    </td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      No files found in this vector store
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id} className="file-row">
                      <td className="file-name">
                        <div className="file-name-content">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          <span>{file.filename || file.name || file.object_name || file.id || 'Unnamed File'}</span>
                        </div>
                      </td>
                      <td className="file-size">{formatFileSize(file.bytes)}</td>
                      <td className="file-date">{formatDate(file.created_at)}</td>
                      <td className="file-status">
                        <span className={`status-badge ${file.status === 'completed' ? 'status-success' : 'status-processing'}`}>
                          {file.status === 'completed' ? (
                            <>
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Ready
                            </>
                          ) : (
                            <>
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="animate-pulse">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              {file.status || 'Processing'}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="file-action">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteFile(file.id, file.filename || file.name || 'file');
                          }}
                          disabled={isLoading}
                          className="delete-btn"
                          title="Delete file"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="vector-store-footer">
          <div className="footer-info">
            {selectedStoreId && (
              <span className="file-count">
                {files.length} {files.length === 1 ? 'file' : 'files'} in vector store
              </span>
            )}
          </div>
          
          <div className="footer-actions">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isUploading || isLoading || !selectedStoreId}
              className="upload-btn glossy-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>Upload File</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".txt,.pdf,.md,.doc,.docx,.json,.csv"
              className="hidden-file-input"
            />

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (selectedStoreId) {
                  fetchFiles(selectedStoreId);
                }
              }}
              disabled={isLoading || !selectedStoreId}
              className="refresh-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              <span>Refresh</span>
            </button>

            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }} 
              className="done-btn glossy-btn"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VectorStoreManager;
