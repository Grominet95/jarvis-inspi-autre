/**
 * Check if the file is an image based on extension
 * @param {string} filename - File name to check
 * @returns {boolean} Whether the file is an image
 */
export const isImageFile = (filename) => {
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
};

/**
 * Format file size to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Human-readable file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Format date to human-readable string
 * @param {number|Date} dateVal - Date value
 * @returns {string} Formatted date string
 */
export const formatDate = (dateVal) => {
  const date = new Date(dateVal);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Get file type from extension
 * @param {string} filename - File name to check
 * @returns {string} File type identifier
 */
export const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  
  switch (ext) {
    case 'jsx': return 'jsx';
    case 'js': return 'javascript';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg': return 'image';
    case 'mp3':
    case 'wav':
    case 'ogg': return 'audio';
    case 'mp4':
    case 'webm': return 'video';
    case 'pdf': return 'pdf';
    default: return 'text';
  }
};
