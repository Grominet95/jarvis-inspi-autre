/**
 * Shared utilities for service modules
 */

// Client logging buffer
let logBuffer = [];
let lastSent = 0;
const SEND_INTERVAL = 5000; // Send logs every 5 seconds

// Send logs to server
const sendLogsToServer = async (logs) => {
  try {
    await fetch('/api/client-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        logs,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    });
  } catch (error) {
    // Silent fail - don't want to create infinite loops
    console.warn('Failed to send logs to server:', error);
  }
};

// Flush logs to server
const flushLogs = () => {
  if (logBuffer.length > 0) {
    sendLogsToServer([...logBuffer]);
    logBuffer = [];
  }
};

// Auto-flush logs periodically
setInterval(() => {
  const now = Date.now();
  if (now - lastSent > SEND_INTERVAL) {
    flushLogs();
    lastSent = now;
  }
}, 1000);

// Safe console logging for development only
export const logInfo = (message, data) => {
  const logEntry = {
    level: 'info',
    message,
    data,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };
  
  // Add to buffer for server logging
  logBuffer.push(logEntry);
  
  if (process.env.NODE_ENV !== 'production') {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

export const logError = (message, error) => {
  const logEntry = {
    level: 'error',
    message,
    error: error?.toString() || error,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };
  
  // Add to buffer for server logging
  logBuffer.push(logEntry);
  
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  }
};

// Local storage helpers with error handling
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch (error) {
    logError(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logError(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};

// Expose flush function for manual flushing
window.flushClientLogs = flushLogs;
