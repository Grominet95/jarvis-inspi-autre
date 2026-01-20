import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { SettingsProvider } from './contexts/SettingsContext';
import { logError } from './services/serviceUtils';

// Global error handlers for debugging
window.addEventListener('error', (event) => {
  logError('Global JavaScript Error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.toString(),
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logError('Unhandled Promise Rejection', {
    reason: event.reason?.toString() || event.reason,
    stack: event.reason?.stack
  });
});

// Log initial page load
logError('Page Load Started', {
  userAgent: navigator.userAgent,
  url: window.location.href,
  timestamp: new Date().toISOString()
});

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </React.StrictMode>
  );
  
  logError('React App Rendered Successfully', {});
} catch (error) {
  logError('Failed to Render React App', error);
}
