import React, { useState, useEffect } from 'react';
import '../styles/notification-system.css';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  // Function to add a notification
  const addNotification = (notification) => {
    const id = Date.now() + Math.random(); // Ensure unique IDs
    const newNotification = {
      id,
      title: notification.title || 'Notification',
      message: notification.message || '',
      type: notification.type || 'info',
      duration: notification.duration || 5000, // Default 5 seconds
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto-remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => removeNotification(id), newNotification.duration);
    }

    return id;
  };

  // Function to remove a notification
  const removeNotification = (id) => {
    setNotifications((prev) => 
      prev.map(notif => 
        notif.id === id ? { ...notif, hiding: true } : notif
      )
    );
    
    // After animation completes, remove from state
    setTimeout(() => {
      setNotifications((prev) => prev.filter(notif => notif.id !== id));
    }, 400); // Match the animation duration
  };

  // Create a global notification method
  useEffect(() => {
    // Add the notification method to window for global access
    window.notify = addNotification;

    // Error interceptor for voice assistant errors
    const originalErrorHandler = console.error;
    console.error = (...args) => {
      // Call the original handler first
      originalErrorHandler.apply(console, args);
      
      // Check if it's related to voice assistant errors
      const errorString = args.join(' ');
      if (
        errorString.includes('voice assistant') || 
        errorString.includes('OpenAI API') ||
        errorString.includes('Connection failed')
      ) {
        // Extract the actual error message
        let errorMessage = "Connection failed";
        
        if (typeof args[0] === 'string' && args[0].includes('Error:')) {
          errorMessage = args[0].split('Error:')[1].trim();
        } else if (args[1] && typeof args[1] === 'object' && args[1].message) {
          errorMessage = args[1].message;
        }
        
        // Add notification for the error
        addNotification({
          title: 'Connection Failed',
          message: errorMessage,
          type: 'error',
          duration: 8000
        });
      }
    };

    return () => {
      // Clean up
      window.notify = null;
      console.error = originalErrorHandler;
    };
  }, []);

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div 
          key={notification.id}
          className={`notification-item ${notification.hiding ? 'hiding' : 'visible'} notification-${notification.type}`}
        >
          <div className="notification-glow"></div>
          <div className="notification-title">{notification.title}</div>
          <div className="notification-message">{notification.message}</div>
          <button 
            className="notification-close" 
            onClick={() => removeNotification(notification.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
