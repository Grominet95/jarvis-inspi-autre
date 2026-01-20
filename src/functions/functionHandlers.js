/**
 * Function Handlers
 * =================
 * 
 * This file contains the actual implementation for JARVIS functions.
 * Each function defined in functions.js should have a corresponding handler here.
 */

import { logInfo, logError } from '../services/serviceUtils';
import searchService from '../services/searchService';
import imageService from '../services/imageService';

/**
 * Set system volume (placeholder implementation)
 * In a real implementation, this would use system APIs
 */
export const setSystemVolume = async (args) => {
  const { level } = args;
  
  try {
    // Placeholder: In a real app, you'd use system APIs or audio context
    logInfo(`Setting system volume to ${level}%`);
    
    // For now, just return success
    return {
      success: true,
      message: `Volume set to ${level}%`
    };
  } catch (error) {
    logError('Error setting volume:', error);
    return {
      success: false,
      message: `Failed to set volume: ${error.message}`
    };
  }
};

/**
 * Show notification using the existing notification system
 */
export const showNotification = async (args) => {
  const { title, message, type = 'info' } = args;
  
  try {
    if (window.notify) {
      window.notify({
        title,
        message,
        type,
        duration: 5000
      });
      
      return {
        success: true,
        message: `Notification sent: ${title}`
      };
    } else {
      throw new Error('Notification system not available');
    }
  } catch (error) {
    logError('Error showing notification:', error);
    return {
      success: false,
      message: `Failed to show notification: ${error.message}`
    };
  }
};

/**
 * Get system information
 */
export const getSystemInfo = async (args) => {
  const { info_type } = args;
  
  try {
    const now = new Date();
    const systemInfo = {
      time: now.toLocaleTimeString('en-US', { hour12: false }),
      date: now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      cpu: '42%', // Placeholder - in real app, get from system
      memory: '3.2GB', // Placeholder
      network: '215 Mbps' // Placeholder
    };
    
    let responseMessage = '';
    
    switch (info_type) {
      case 'time':
        responseMessage = `Current time is ${systemInfo.time}`;
        break;
      case 'date':
        responseMessage = `Today is ${systemInfo.date}`;
        break;
      case 'cpu':
        responseMessage = `CPU usage is at ${systemInfo.cpu}`;
        break;
      case 'memory':
        responseMessage = `Memory usage is ${systemInfo.memory}`;
        break;
      case 'network':
        responseMessage = `Network speed is ${systemInfo.network}`;
        break;
      case 'all':
      default:
        responseMessage = `System Status: ${systemInfo.date} ${systemInfo.time} | CPU: ${systemInfo.cpu} | Memory: ${systemInfo.memory} | Network: ${systemInfo.network}`;
        break;
    }
    
    return {
      success: true,
      message: responseMessage,
      data: systemInfo
    };
  } catch (error) {
    logError('Error getting system info:', error);
    return {
      success: false,
      message: `Failed to get system info: ${error.message}`
    };
  }
};

/**
 * Take screenshot (placeholder implementation)
 */
export const takeScreenshot = async (args) => {
  const { filename = 'screenshot' } = args;
  
  try {
    // Placeholder: In a real implementation, you'd use:
    // - Screen Capture API for web
    // - Electron's nativeImage for desktop apps
    // - Or other platform-specific APIs
    
    logInfo(`Taking screenshot as ${filename}`);
    
    return {
      success: true,
      message: `Screenshot saved as ${filename}.png`
    };
  } catch (error) {
    logError('Error taking screenshot:', error);
    return {
      success: false,
      message: `Failed to take screenshot: ${error.message}`
    };
  }
};

/**
 * Web search (placeholder implementation)
 */
export const webSearch = async (args) => {
  const { query } = args;
  
  try {
    // Placeholder: In a real implementation, you'd use:
    // - A search API like Google Custom Search
    // - DuckDuckGo API
    // - Or other search services
    
    logInfo(`Searching web for: ${query}`);
    
    // For now, just open Google search in a new tab
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
    
    return {
      success: true,
      message: `Opened web search for "${query}"`
    };
  } catch (error) {
    logError('Error performing web search:', error);
    return {
      success: false,
      message: `Failed to search: ${error.message}`
    };
  }
};

/**
 * Music control (placeholder implementation)
 */
export const controlMusic = async (args) => {
  const { action, volume } = args;
  
  try {
    let message = '';
    
    switch (action) {
      case 'play':
        message = 'Music resumed';
        break;
      case 'pause':
        message = 'Music paused';
        break;
      case 'skip':
        message = 'Skipped to next track';
        break;
      case 'previous':
        message = 'Playing previous track';
        break;
      case 'volume_up':
        message = 'Volume increased';
        break;
      case 'volume_down':
        message = 'Volume decreased';
        break;
      default:
        if (volume !== undefined) {
          message = `Music volume set to ${volume}%`;
        } else {
          message = `Music control: ${action}`;
        }
    }
    
    // Placeholder: In a real implementation, you'd:
    // - Interface with Spotify Web API
    // - Control browser audio elements
    // - Use Web Audio API
    // - Or other music service APIs
    
    logInfo(`Music control: ${action}`, { volume });
    
    return {
      success: true,
      message
    };
  } catch (error) {
    logError('Error controlling music:', error);
    return {
      success: false,
      message: `Failed to control music: ${error.message}`
    };
  }
};

/**
 * Calendar Functions
 * ==================
 * These functions interact with the calendar app's localStorage data
 */

/**
 * Create a new calendar event
 */
export const createCalendarEvent = async (args) => {
  const { title, date, time, duration = 60, category = 'work', location, description } = args;
  
  try {
    // Parse and validate the date
    let eventDate;
    const today = new Date();
    
    if (date.toLowerCase() === 'today') {
      eventDate = new Date();
    } else if (date.toLowerCase() === 'tomorrow') {
      eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 1);
    } else {
      eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        throw new Error('Invalid date format');
      }
    }
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new Error('Invalid time format. Please use HH:MM format');
    }
    
    // Create the event object
    const newEvent = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      title,
      description: description || '',
      date: new Date(`${eventDate.toISOString().split('T')[0]}T${time}:00`),
      duration: parseInt(duration),
      category: category || 'work',
      priority: 'medium',
      location: location || '',
      attendees: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Load existing events from localStorage
    let events = [];
    try {
      const savedEvents = localStorage.getItem('holomat-calendar-events');
      if (savedEvents) {
        events = JSON.parse(savedEvents);
      }
    } catch (error) {
      logError('Error loading existing events:', error);
      events = [];
    }
    
    // Add the new event
    events.push(newEvent);
    
    // Save back to localStorage
    localStorage.setItem('holomat-calendar-events', JSON.stringify(events));
    
    logInfo('Calendar event created:', newEvent);
    
    return {
      success: true,
      message: `Event "${title}" scheduled for ${eventDate.toLocaleDateString()} at ${time}`
    };
    
  } catch (error) {
    logError('Error creating calendar event:', error);
    return {
      success: false,
      message: `Failed to create event: ${error.message}`
    };
  }
};

/**
 * Check calendar events for a specific date
 */
export const checkCalendarEvents = async (args) => {
  const { date } = args;
  
  try {
    // Parse the date input
    let targetDate;
    const today = new Date();
    
    if (date.toLowerCase() === 'today') {
      targetDate = new Date();
    } else if (date.toLowerCase() === 'tomorrow') {
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (date.toLowerCase() === 'this week') {
      // Return events for the next 7 days
      const events = getEventsInRange(today, 7);
      if (events.length === 0) {
        return {
          success: true,
          message: "You have no events scheduled for this week"
        };
      }
      
      const eventList = events.map(event => {
        const eventDate = new Date(event.date);
        return `${event.title} on ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      }).join(', ');
      
      return {
        success: true,
        message: `This week you have: ${eventList}`
      };
    } else {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        throw new Error('Invalid date format');
      }
    }
    
    // Load events from localStorage
    let events = [];
    try {
      const savedEvents = localStorage.getItem('holomat-calendar-events');
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents);
        // Convert date strings back to Date objects
        events = parsedEvents.map(event => ({
          ...event,
          date: new Date(event.date)
        }));
      }
    } catch (error) {
      logError('Error loading calendar events:', error);
      return {
        success: false,
        message: 'Failed to load calendar events'
      };
    }
    
    // Filter events for the target date
    const targetDateStr = targetDate.toDateString();
    const dayEvents = events.filter(event => {
      return new Date(event.date).toDateString() === targetDateStr;
    });
    
    if (dayEvents.length === 0) {
      const dateLabel = date.toLowerCase() === 'today' ? 'today' : 
                       date.toLowerCase() === 'tomorrow' ? 'tomorrow' : 
                       targetDate.toLocaleDateString();
      return {
        success: true,
        message: `You have no events scheduled for ${dateLabel}`
      };
    }
    
    // Sort events by time
    dayEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Format the response
    const eventList = dayEvents.map(event => {
      const eventTime = new Date(event.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `${event.title} at ${eventTime}`;
    }).join(', ');
    
    const dateLabel = date.toLowerCase() === 'today' ? 'today' : 
                     date.toLowerCase() === 'tomorrow' ? 'tomorrow' : 
                     targetDate.toLocaleDateString();
    
    return {
      success: true,
      message: `For ${dateLabel} you have: ${eventList}`
    };
    
  } catch (error) {
    logError('Error checking calendar events:', error);
    return {
      success: false,
      message: `Failed to check calendar: ${error.message}`
    };
  }
};

/**
 * Delete a calendar event by identifier
 */
export const deleteCalendarEvent = async (args) => {
  const { identifier, date } = args;
  
  try {
    // Load events from localStorage
    let events = [];
    try {
      const savedEvents = localStorage.getItem('holomat-calendar-events');
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents);
        events = parsedEvents.map(event => ({
          ...event,
          date: new Date(event.date)
        }));
      }
    } catch (error) {
      logError('Error loading calendar events:', error);
      return {
        success: false,
        message: 'Failed to load calendar events'
      };
    }
    
    if (events.length === 0) {
      return {
        success: false,
        message: 'No events found in calendar'
      };
    }
    
    // Find the event to delete
    let eventToDelete = null;
    let eventIndex = -1;
    
    // Try to find by exact title match first
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.title.toLowerCase().includes(identifier.toLowerCase())) {
        // If date is provided, check if it matches
        if (date) {
          const targetDate = new Date(date);
          const eventDate = new Date(event.date);
          if (eventDate.toDateString() === targetDate.toDateString()) {
            eventToDelete = event;
            eventIndex = i;
            break;
          }
        } else {
          eventToDelete = event;
          eventIndex = i;
          break;
        }
      }
    }
    
    // If not found by title, try to find by time
    if (!eventToDelete) {
      const timeRegex = /(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i;
      const timeMatch = identifier.match(timeRegex);
      
      if (timeMatch) {
        const targetTime = timeMatch[0];
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const eventTime = new Date(event.date).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          });
          
          if (eventTime.toLowerCase().includes(targetTime.toLowerCase())) {
            eventToDelete = event;
            eventIndex = i;
            break;
          }
        }
      }
    }
    
    if (!eventToDelete) {
      return {
        success: false,
        message: `Could not find an event matching "${identifier}"`
      };
    }
    
    // Remove the event
    events.splice(eventIndex, 1);
    
    // Save back to localStorage
    localStorage.setItem('holomat-calendar-events', JSON.stringify(events));
    
    logInfo('Calendar event deleted:', eventToDelete);
    
    return {
      success: true,
      message: `Deleted event "${eventToDelete.title}"`
    };
    
  } catch (error) {
    logError('Error deleting calendar event:', error);
    return {
      success: false,
      message: `Failed to delete event: ${error.message}`
    };
  }
};

/**
 * Helper function to get events in a date range
 */
function getEventsInRange(startDate, days) {
  let events = [];
  try {
    const savedEvents = localStorage.getItem('holomat-calendar-events');
    if (savedEvents) {
      const parsedEvents = JSON.parse(savedEvents);
      events = parsedEvents.map(event => ({
        ...event,
        date: new Date(event.date)
      }));
    }
  } catch (error) {
    return [];
  }
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + days);
  
  return events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= startDate && eventDate <= endDate;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Web Search using OpenAI's search-enabled models
 */
export const searchWeb = async (args) => {
  const { query } = args;
  
  try {
    console.log(`🔍 Searching web for: ${query}`);
    
    // Get current settings for search model
    const settings = JSON.parse(localStorage.getItem('holomatv3_settings') || '{}');
    
    const searchOptions = {
      model: settings.searchModel || 'gpt-4o-search-preview',
      contextSize: settings.searchContextSize || 'medium'
    };
    
    // Perform the search
    const results = await searchService.searchWeb(query, searchOptions);
    
    // Dispatch custom event to open document viewer
    window.dispatchEvent(new CustomEvent('open-document-viewer', {
      detail: {
        title: `Search: ${query}`,
        content: results.content,
        sources: results.sources
      }
    }));
    
    return {
      success: true,
      message: `Found information about "${query}" and opened in document viewer`
    };
    
  } catch (error) {
    console.error('❌ Web search failed:', error);
    return {
      success: false,
      message: `Search failed: ${error.message}`
    };
  }
};

/**
 * Generate Image using OpenAI's image generation models
 */
export const generateImage = async (args) => {
  const { prompt } = args;
  
  try {
    console.log(`🎨 Generating image for: ${prompt}`);
    
    // Get current settings for image model
    const settings = JSON.parse(localStorage.getItem('holomatv3_settings') || '{}');
    
    const imageOptions = {
      model: settings.imageModel || 'dall-e-3',
      quality: settings.imageQuality || 'standard',
      size: settings.imageSize || '1024x1024',
      format: settings.imageFormat || 'png',
      partialImages: settings.partialImages || 2,
      stream: true
    };
    
    // Set up streaming callback
    const onPartialImage = (imageData) => {
      // Dispatch custom event to update image viewer
      window.dispatchEvent(new CustomEvent('image-generation-update', {
        detail: imageData
      }));
    };
    
    // Dispatch event to open image viewer immediately
    window.dispatchEvent(new CustomEvent('open-image-viewer', {
      detail: {
        prompt: prompt,
        isStreaming: true
      }
    }));
    
    // Start the image generation and wait for completion
    const results = await imageService.generateImage(prompt, imageOptions, onPartialImage);
    
    console.log('✅ Image generation completed:', results.finalImage ? 'Success' : 'Failed');
    
    return {
      success: true,
      message: `Generated image: "${prompt}"`
    };
    
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    
    // Close image viewer on error
    window.dispatchEvent(new CustomEvent('close-image-viewer'));
    
    return {
      success: false,
      message: `Image generation failed: ${error.message}`
    };
  }
};
