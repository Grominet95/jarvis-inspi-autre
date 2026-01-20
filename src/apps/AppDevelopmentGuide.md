# HoloMat App Development Guide

This guide outlines the essential structural elements needed when creating new apps for the HoloMat system. Following these guidelines will ensure your app integrates properly with the AppContainer framework.

**If you are new to coding, pasting this markdown file into an AI will help it
understand the project structure, making it easier for you to develop new apps 
with AI**

## 1. Component Definition & Props

```jsx
// Essential component structure
const YourApp = ({ onClose }) => {
  // App code...
  
  return (
    // JSX...
  );
};

export default YourApp;
```

- **Must export as default**: The AppContainer loads components dynamically using the default export
- **Must accept `onClose` prop**: This is passed by AppContainer and used to close the app
- **File naming**: The filename must match what's registered in `apps.js` (e.g., "CalendarApp.jsx" matching "CalendarApp")

## 2. UI Container Structure

```jsx
<div className="h-full flex flex-col">
  {/* App Header */}
  <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-900/30">
    {/* Header content */}
  </div>
  
  {/* Main Content Area - with overflow handling */}
  <div className="flex-1 overflow-auto">
    {/* App-specific content */}
  </div>
  
  {/* Optional: Footer or control area */}
</div>
```

- **Root container**: Must use `h-full flex flex-col` to fill the AppContainer space
- **Overflow handling**: Main content should preferably have `overflow-auto` to handle scrolling
- **Flex structure**: Use `flex-1` on the main content to allow it to expand

## 3. Styling Pattern Consistency

```jsx
{/* Examples of consistent styling patterns - you can choose a different style if you're weird and dislike the colour scheme */}
<button className="bg-blue-900/40 hover:bg-blue-800/50 text-blue-300">Button</button>
<div className="border border-blue-900/30 rounded-lg">Panel</div>
<span className="text-blue-400/70 text-xs">Label</span>
```

- **Color theme**: Use blue color scale with proper opacity values
- **Interactive elements**: Include hover states (e.g., `hover:bg-blue-800/50`)
- **Border styling**: Use `border-blue-900/30` for subtle borders
- **Text styling**: Use `text-blue-300` or `text-blue-400/70` for consistent text

## 4. State Management

```jsx
// State management pattern
const [data, setData] = useState(initialValue);

// Cleanup pattern
useEffect(() => {
  // Setup code
  
  return () => {
    // Cleanup code - CRITICAL for preventing memory leaks
  };
}, [dependencies]);
```

- **Component state**: Use React hooks for state management
- **Effect cleanup**: Always include cleanup functions in useEffect hooks
- **App lifecycle**: Handle mounting/unmounting properly

## 5. Modal/Dialog Pattern

```jsx
{selectedItem && (
  <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 animate-fadeIn">
    <div className="bg-blue-950/90 border border-blue-800/50 p-4 rounded-lg animate-scaleIn">
      {/* Modal content */}
      <button onClick={() => setSelectedItem(null)}>Close</button>
    </div>
  </div>
)}
```

- **Overlay**: Use `absolute inset-0` with semi-transparent background
- **Animation**: Use `animate-fadeIn` or `animate-scaleIn` classes
- **Styling**: Follow the blue theme with proper borders

## 6. Responsive Design

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
  {/* Responsive grid items */}
</div>
```

- **Flexible layouts**: Use responsive grid or flex layouts
- **Adaptive sizing**: Avoid fixed pixel widths where possible
- **Container queries**: Use percentage-based or viewport-based units

## 7. Animation Usage

```jsx
<div className="transition-all duration-200 hover:scale-105">
  {/* Content with hover animation */}
</div>
```

- **Transitions**: Use `transition-all` with appropriate duration
- **Animation classes**: Use the predefined animation classes like `animate-fadeIn`
- **Subtle effects**: Keep animations functional and minimal

## 8. API Integration (If Applicable)

```jsx
useEffect(() => {
  const fetchData = async () => {
    try {
      // API request
    } catch (error) {
      // Error handling
      console.error("Error fetching data:", error);
    }
  };
  
  fetchData();
}, []);
```

- **Error handling**: Always include error catching
- **Loading states**: Show loading indicators when fetching data
- **Cleanup**: Cancel any pending requests on unmount

## Common Mistakes to Avoid

1. **Missing the `onClose` prop**: This will break the ability to close the app
2. **Not handling overflow**: Content can spill out of the container
3. **Inconsistent styling**: Breaks the visual coherence of the system
4. **Memory leaks**: Not cleaning up subscriptions or timers
5. **Non-responsive design**: Creating layouts that break on different sizes

By following these structural patterns, your app will integrate seamlessly with the HoloMat interface system and maintain a consistent user experience.
