export const apps = [
  {
    id: 1,
    name: "3D Viewer",
    category: "Design",
    description: "Interactive 3D model viewer with support for STL files and real-time manipulation.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "ModelViewerApp",
    acceptedFileTypes: ["stl-model"] // This app accepts STL model files
  },
  {
    id: 2,
    name: "Calendar",
    category: "Productivity",
    description: "Schedule management with AI-powered optimization and team synchronization.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "CalendarApp"
  },
  {
    id: 4,
    name: "Photos",
    category: "Media",
    description: "Advanced image management with neural enhancement and 3D reconstruction.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "PhotosApp",
    acceptedFileTypes: ["image", "drawing"] // This app accepts image and drawing files
  },
  {
    id: 5,
    name: "Weather",
    category: "Information",
    description: "Hyper-local atmospheric conditions with predictive modeling up to 14 days.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "WeatherApp"
  },
  {
    id: 6,
    name: "Security",
    category: "System",
    description: "Advanced protection systems with biometric verification and threat detection.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "SecurityApp"
  },
  {
    id: 7,
    name: "File Explorer",
    category: "System",
    description: "Advanced file management system with intuitive navigation and preview capabilities.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "FileExplorerApp"
  },
  {
    id: 8,
    name: "3D Printing",
    category: "Hardware",
    description: "Integrated BambuBoard dashboard for your 3D printer.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "ThreeDPrintingApp"
  },
  {
    id: 9,
    name: "Drawing",
    category: "Design",
    description: "Touch-based drawing and measurement tool with customizable settings.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M15.232 5.232l3.536 3.536M9 11l6-6M4 20l4-1 7-7-3-3-7 7-1 4z'/%3E%3C/svg%3E",
    componentPath: "DrawingApp",
    acceptedFileTypes: ["drawing", "image"] // This app accepts drawing and image files
  },
  {
    id: 16,
    name: "Image Generator",
    category: "Media",
    description: "Generate images from speech or text prompts using OpenAI.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Crect x='3' y='3' width='18' height='14' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E",
    componentPath: "ImageGenApp"
  },
  {
    id: 17,
    name: "3D Model Creator",
    category: "3D",
    description: "Generate 3D STL models from speech via image and shape pipelines.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "ModelCreator3DApp"
  },
  {
    id: 18,
    name: "Music",
    category: "Entertainment",
    description: "Spotify record player with spinning vinyl UI.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8v8M15 6v10M6 8h9'/%3E%3C/g%3E%3Cg fill='%233b82f6' stroke='%233b82f6' stroke-width='1'%3E%3Ccircle cx='6' cy='16' r='1.5'/%3E%3Ccircle cx='15' cy='16' r='1.5'/%3E%3C/g%3E%3C/svg%3E",
    componentPath: "Music/MusicApp.jsx"
  },
  {
    id: 19,
    name: "Calculator",
    category: "Productivity",
    description: "iPhone-style calculator with circular buttons and smooth animations.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "CalculatorApp"
  },
  {
    id: 20,
    name: "Keyboard",
    category: "Input",
    description: "Spawn a touch-driven virtual keyboard by dragging a circle.",
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'><rect x='2' y='7' width='20' height='10' rx='2' ry='2'/><path d='M6 11h.01M10 11h.01M14 11h.01M18 11h.01M6 14h.01M10 14h.01M14 14h.01M18 14h.01'/></svg>",
    componentPath: "KeyboardApp.jsx"
  }
  ,
  {
    id: 21,
    name: "3D models",
    category: "3D",
    description: "Carousel of STL models with spinning front preview.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='7' height='7'/%3E%3Crect x='14' y='4' width='7' height='7'/%3E%3Crect x='4' y='14' width='7' height='7'/%3E%3Crect x='13' y='13' width='8' height='8'/%3E%3C/svg%3E",
    componentPath: "ModelGalleryApp"
  },
  {
    id: 22,
    name: "Model Search",
    category: "3D",
    description: "Search MakerWorld for 3D models and browse results with thumbnails.",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'%3E%3C/path%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1'%3E%3C/path%3E%3C/svg%3E",
    componentPath: "ModelSearchApp"
  }
];
