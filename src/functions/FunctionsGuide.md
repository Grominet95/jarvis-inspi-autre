# 🎯 JARVIS Functions System

Welcome to the **streamlined JARVIS Functions system**! This folder contains everything related to function calling in your HoloMat interface.

## 📁 **Folder Structure**
```
functions/
├── README.md                    ← You are here!
├── functions.js                 ← Function definitions registry
├── functionManagerService.js    ← Dynamic function management
└── functionHandlers.js          ← Function implementations
```

## ✨ **How to Add New Functions**

Adding new functions is as simple as adding new apps! Just follow these 3 easy steps:

### **Step 1: Define Your Function** (`functions.js`)
Add your function definition to the `functions` array:

```javascript
{
  name: "your_function_name",
  description: "What this function does when called by voice",
  parameters: {
    type: "object",
    properties: {
      param_name: {
        type: "string",        // string, number, boolean
        description: "What this parameter does"
      }
    },
    required: ["param_name"]   // Which parameters are required
  },
  handler: "yourHandlerFunction",
  examples: [
    "voice command example 1",
    "voice command example 2"
  ]
}
```

### **Step 2: Implement the Handler** (`functionHandlers.js`)
Create the actual function implementation:

```javascript
export const yourHandlerFunction = async (args) => {
  const { param_name } = args;
  
  try {
    // Your implementation here
    console.log(`Executing function with: ${param_name}`);
    
    return {
      success: true,
      message: "Function executed successfully!"
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed: ${error.message}`
    };
  }
};
```

### **Step 3: Add to App.jsx Router**
Add a case to the switch statement in `App.jsx` `handleFunctionCall`:

```javascript
case 'your_function_name':
  result = await functionHandlers.yourHandlerFunction(args);
  break;
```

**That's it!** Your function is now available to JARVIS! 🎉

## 🎮 **Built-in Functions**

The system comes with these example functions:

| Function | Voice Command | Description |
|----------|---------------|-------------|
| `launch_app` | *"Open the calendar app"* | Launches HoloMat applications |
| `set_volume` | *"Set volume to 75"* | Adjusts system volume |
| `search_web` | *"Search for AI news"* | Opens web search |
| `take_screenshot` | *"Take a screenshot"* | Captures screen |
| `send_notification` | *"Show me a notification"* | Displays notifications |
| `get_system_info` | *"What's the system status?"* | Gets system information |
| `control_music` | *"Play music"* | Controls music playback |

## 🔧 **Function Schema**

Functions automatically generate OpenAI-compatible schemas for the Realtime API. The `functionManagerService` handles:

- ✅ **Dynamic loading** of function definitions
- ✅ **Schema generation** for OpenAI API
- ✅ **Validation** of function calls
- ✅ **Error handling** and logging
- ✅ **Help system** with examples

## 📝 **Function Definition Format**

Each function must follow this structure:

```javascript
{
  name: "function_name",           // Required: snake_case function name
  description: "...",              // Required: What the function does
  parameters: {                    // Required: OpenAI function schema
    type: "object",
    properties: { /* ... */ },
    required: ["param1", "param2"]
  },
  handler: "handlerFunctionName",  // Required: Function to call
  service: "serviceName",          // Optional: Service file to import
  examples: ["example1", "..."]    // Optional: Voice command examples
}
```

## 🚀 **Advanced Features**

### **Categories**
Organize functions by category in `functions.js`:

```javascript
export const functionCategories = {
  "Apps & System": ["launch_app"],
  "Media & Audio": ["set_volume", "control_music"],
  "Information": ["search_web", "get_system_info"],
  "Utilities": ["take_screenshot", "send_notification"]
};
```

### **Complex Parameters**
Support for nested objects, arrays, and validation:

```javascript
parameters: {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["play", "pause", "skip"],
      description: "Music action to perform"
    },
    volume: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Volume level (0-100)"
    }
  },
  required: ["action"]
}
```

### **Return Format**
All handlers should return this format:

```javascript
{
  success: boolean,        // Whether the function succeeded
  message: string,         // User-friendly message for JARVIS to speak
  data?: any              // Optional: Additional data
}
```

## 📞 **Integration Points**

The functions system integrates with:

- **🎤 Realtime Voice API** - Automatic schema loading
- **📱 App Launch System** - Seamless app launching
- **🔔 Notification System** - Built-in notifications
- **⚙️ Settings System** - Configuration access
- **📊 Logging System** - Comprehensive logging

## 🎯 **Best Practices**

1. **Use clear, descriptive function names** in snake_case
2. **Provide helpful descriptions** that explain when to use the function
3. **Include voice command examples** to guide users
4. **Handle errors gracefully** with user-friendly messages
5. **Keep functions focused** - one responsibility per function
6. **Use consistent return formats** for predictable behavior

---

**Ready to build amazing voice-controlled features? Start with Step 1 above!** 🚀
