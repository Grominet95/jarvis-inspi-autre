
/**
 * JARVIS Function Calling Registry
 * =================================
 * 
 * This file contains all available functions that JARVIS can call via voice commands.
 * To add a new function, simply add it to the 'functions' array below.
 * 
 * EASY STEPS TO ADD A NEW FUNCTION:
 * 1. Add your function definition to the array below
 * 2. Create your function handler in the services folder (optional)
 * 3. Add your function to the handler switch statement in App.jsx
 * 
 * That's it! Your function will automatically be available to JARVIS.
 */

export const functions = [
  {
    // Current function - App Launcher
    name: "launch_app",
    description: "Launch or open an application in the HoloMat interface",
    parameters: {
      type: "object",
      properties: {
        app_name: {
          type: "string",
          description: "The name of the application to launch. Available apps: Calculator, 3D Viewer, Calendar, Photos, Weather, Security, File Explorer, 3D Printing, Drawing, Image Generator, 3D Model Creator, Music, Keyboard"
        }
      },
      required: ["app_name"]
    },
    // Handler function - will be called when this function is triggered
    handler: "appLaunchService.launchApp",
    // Service file to import (optional - for complex functions)
    service: "appLaunchService",
    // Example voice commands
    examples: [
      "open the calendar app",
      "launch file explorer", 
      "start the drawing app",
      "open weather"
    ]
  },
  
  // 🔥 EXAMPLE NEW FUNCTIONS - ADD YOUR OWN BELOW:
  
  {
    name: "set_volume",
    description: "Adjust the system volume level",
    parameters: {
      type: "object",
      properties: {
        level: {
          type: "number",
          description: "Volume level from 0 (mute) to 100 (max volume)",
          minimum: 0,
          maximum: 100
        }
      },
      required: ["level"]
    },
    handler: "setSystemVolume", // Custom handler function
    examples: [
      "set volume to 50",
      "turn volume up to 80",
      "mute the volume"
    ]
  },
  
  {
    name: "search_web",
    description: "Search the web for information",
    parameters: {
      type: "object", 
      properties: {
        query: {
          type: "string",
          description: "The search query to look up on the web"
        }
      },
      required: ["query"]
    },
    handler: "webSearchService.search",
    service: "webSearchService",
    examples: [
      "search for latest AI news",
      "look up weather in Tokyo",
      "find information about machine learning"
    ]
  },
  
  {
    name: "take_screenshot",
    description: "Capture a screenshot of the current screen",
    parameters: {
      type: "object",
      properties: {
        filename: {
          type: "string", 
          description: "Optional filename for the screenshot (without extension)"
        }
      },
      required: []
    },
    handler: "screenshotService.capture",
    service: "screenshotService",
    examples: [
      "take a screenshot",
      "capture screen as 'my-project'",
      "screenshot this"
    ]
  },
  
  {
    name: "send_notification",
    description: "Display a system notification with custom message",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Notification title"
        },
        message: {
          type: "string", 
          description: "Notification message content"
        },
        type: {
          type: "string",
          description: "Notification type: info, success, warning, or error",
          enum: ["info", "success", "warning", "error"]
        }
      },
      required: ["title", "message"]
    },
    handler: "showNotification", // Uses existing notification system
    examples: [
      "notify me that the task is complete",
      "show success notification 'Project Built'",
      "display warning about system resources"
    ]
  },
  
  {
    name: "get_system_info",
    description: "Get current system information and status",
    parameters: {
      type: "object",
      properties: {
        info_type: {
          type: "string",
          description: "Type of system info: time, date, cpu, memory, network, or all",
          enum: ["time", "date", "cpu", "memory", "network", "all"]
        }
      },
      required: ["info_type"]
    },
    handler: "getSystemInfo", // Uses existing system metrics
    examples: [
      "what time is it",
      "show me system information", 
      "check memory usage",
      "get network speed"
    ]
  },
  
  {
    name: "control_music",
    description: "Control music playback (play, pause, skip, volume)",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Music control action",
          enum: ["play", "pause", "skip", "previous", "volume_up", "volume_down"]
        },
        volume: {
          type: "number",
          description: "Volume level for volume action (0-100)",
          minimum: 0,
          maximum: 100
        }
      },
      required: ["action"]
    },    handler: "musicControlService.control",
    service: "musicControlService",
    examples: [
      "pause the music",
      "skip to next song", 
      "turn music volume to 60"
    ]
  },

  // 📅 CALENDAR FUNCTIONS
  {
    name: "create_calendar_event",
    description: "Create a new calendar event with voice input",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the event"
        },
        date: {
          type: "string",
          description: "Date for the event (e.g., 'today', 'tomorrow', 'next Monday', or specific date like '2025-05-26')"
        },
        time: {
          type: "string",
          description: "Time for the event (e.g., '2:30 PM', '14:30', 'morning', 'afternoon')"
        },
        duration: {
          type: "number",
          description: "Duration in minutes (default: 60)",
          minimum: 15
        },
        category: {
          type: "string",
          enum: ["work", "personal", "health", "social", "education", "travel"],
          description: "Category of the event"
        },
        location: {
          type: "string",
          description: "Location of the event (optional)"
        }
      },
      required: ["title", "date", "time"]
    },
    handler: "createCalendarEvent",
    examples: [
      "create a meeting tomorrow at 2 PM",
      "schedule a doctor appointment next Tuesday at 10 AM",
      "add a workout session today at 6 PM for 90 minutes",
      "create a work meeting on Friday at 3:30 PM in conference room A"
    ]
  },

  {
    name: "check_calendar",
    description: "Check calendar events for a specific date or period",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to check (e.g., 'today', 'tomorrow', 'this week', 'next Monday')"
        }
      },
      required: ["date"]
    },
    handler: "checkCalendarEvents",
    examples: [
      "what's on my calendar today",
      "check my schedule for tomorrow",
      "what meetings do I have this week",
      "show me next Monday's events"
    ]
  },

  {
    name: "delete_calendar_event",
    description: "Delete a calendar event by title or time",
    parameters: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "Event title or time to identify which event to delete"
        },
        date: {
          type: "string",
          description: "Date of the event (optional, helps narrow down search)"
        }
      },
      required: ["identifier"]
    },
    handler: "deleteCalendarEvent",
    examples: [
      "delete the meeting at 2 PM",
      "cancel my doctor appointment",
      "remove the workout session today",
      "delete the team lunch tomorrow"
    ]
  },

  // Web Search Function
  {
    name: "search_web",
    description: "Search the web for current information on any topic and display results in a formatted document viewer",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query or topic to research (e.g., 'raspberry pi specifications', 'latest AI news', 'how to install Node.js')"
        }
      },
      required: ["query"]
    },
    handler: "searchWeb",
    examples: [
      "search for information on raspberry pi",
      "research the latest AI developments",
      "find information about electric vehicles",
      "search for Node.js installation guide"
    ]
  },

  // Image Generation Function
  {
    name: "generate_image",
    description: "Generate an image from a text prompt using AI image generation models like DALL-E or GPT Image",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The text prompt describing the image to generate (e.g., 'a raccoon wearing a party hat', 'a futuristic cityscape at sunset', 'a cute robot playing piano')"
        }
      },
      required: ["prompt"]
    },
    handler: "generateImage",
    examples: [
      "generate an image of a raccoon in a party hat",
      "create a picture of a sunset over mountains",
      "make an image of a robot playing guitar",
      "generate a photo of a cozy cabin in the woods"
    ]
  }
];

/**
 * FUNCTION CATEGORIES
 * ===================
 * Organize functions by category for better discoverability
 */
export const functionCategories = {
  "Apps & System": ["launch_app"],
  "Media & Audio": ["set_volume", "control_music"], 
  "Information": ["search_web", "get_system_info"],
  "Utilities": ["take_screenshot", "send_notification"],
  "Calendar": ["create_calendar_event", "check_calendar", "delete_calendar_event"]
};

/**
 * QUICK ADD TEMPLATE
 * ==================
 * Copy this template to quickly add new functions:
 * 
 * {
 *   name: "function_name",
 *   description: "What this function does",
 *   parameters: {
 *     type: "object",
 *     properties: {
 *       param_name: {
 *         type: "string|number|boolean",
 *         description: "Parameter description"
 *       }
 *     },
 *     required: ["param_name"]
 *   },
 *   handler: "functionName", // Function to call in App.jsx
 *   service: "serviceName", // Optional service file
 *   examples: [
 *     "voice command example 1",
 *     "voice command example 2"
 *   ]
 * }
 */
