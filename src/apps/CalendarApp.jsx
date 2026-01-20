import React, { useState, useEffect } from 'react';

// Fully Functional Calendar App for HoloMat
const CalendarApp = ({ onClose }) => {
  // --- STATE MANAGEMENT ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    category: 'work',
    priority: 'medium',
    location: '',
    attendees: ''
  });

  // Event categories with colors
  const eventCategories = {
    work: { label: 'Work', color: 'bg-blue-800/60 border-blue-600', textColor: 'text-blue-200' },
    personal: { label: 'Personal', color: 'bg-green-800/60 border-green-600', textColor: 'text-green-200' },
    health: { label: 'Health', color: 'bg-red-800/60 border-red-600', textColor: 'text-red-200' },
    social: { label: 'Social', color: 'bg-purple-800/60 border-purple-600', textColor: 'text-purple-200' },
    education: { label: 'Education', color: 'bg-orange-800/60 border-orange-600', textColor: 'text-orange-200' },
    travel: { label: 'Travel', color: 'bg-teal-800/60 border-teal-600', textColor: 'text-teal-200' }
  };

  // Priority levels
  const priorityLevels = {
    low: { label: 'Low', color: 'text-gray-400' },
    medium: { label: 'Medium', color: 'text-yellow-400' },
    high: { label: 'High', color: 'text-red-400' }
  };

  // --- LIFECYCLE HOOKS ---
  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    saveEvents();
  }, [events]);

  // --- DATA PERSISTENCE ---
  const loadEvents = () => {
    try {
      const savedEvents = localStorage.getItem('holomat-calendar-events');
      if (savedEvents) {
        const parsed = JSON.parse(savedEvents);
        // Convert date strings back to Date objects
        const eventsWithDates = parsed.map(event => ({
          ...event,
          date: new Date(event.date)
        }));
        setEvents(eventsWithDates);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const saveEvents = () => {
    try {
      localStorage.setItem('holomat-calendar-events', JSON.stringify(events));
    } catch (error) {
      console.error('Error saving events:', error);
    }
  };

  // --- EVENT MANAGEMENT ---
  const generateEventId = () => {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  };

  const createEvent = (eventData) => {
    const newEvent = {
      ...eventData,
      id: generateEventId(),
      date: new Date(`${eventData.date}T${eventData.time}`),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEvents(prev => [...prev, newEvent]);
    resetEventForm();
    setShowEventForm(false);
  };

  const updateEvent = (eventId, eventData) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { 
            ...event, 
            ...eventData, 
            date: new Date(`${eventData.date}T${eventData.time}`),
            updatedAt: new Date() 
          }
        : event
    ));
    resetEventForm();
    setShowEventForm(false);
    setEditingEvent(null);
    setSelectedEvent(null);
  };

  const deleteEvent = (eventId) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
    setSelectedEvent(null);
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: '',
      time: '',
      duration: 60,
      category: 'work',
      priority: 'medium',
      location: '',
      attendees: ''
    });
  };

  // --- HELPER FUNCTIONS ---
  // Generate calendar grid data
  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    
    // Get the day of week for the first day (0-6, 0 = Sunday)
    const firstDayOfMonth = date.getDay();
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Add days of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  // Format time from Date object to readable string
  const formatTime = (dateObj) => {
    return new Date(dateObj).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for form inputs
  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTimeForInput = (date) => {
    return date.toTimeString().slice(0, 5);
  };

  // Navigation functions
  const prevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const nextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Get filtered and searched events
  const getFilteredEvents = () => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || event.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    });
  };

  // Get events for a specific day
  const getEventsForDay = (day) => {
    if (!day) return [];
    
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const filteredEvents = getFilteredEvents();
    
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === targetDate.getMonth() && 
             eventDate.getFullYear() === targetDate.getFullYear();
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Handle clicking on a day to add event
  const handleDayClick = (day) => {
    if (!day) return;
    
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const now = new Date();
    
    setEventForm({
      ...eventForm,
      date: formatDateForInput(clickedDate),
      time: formatTimeForInput(now)
    });
    setShowEventForm(true);
  };

  // Handle editing an event
  const handleEditEvent = (event) => {
    setEventForm({
      title: event.title,
      description: event.description || '',
      date: formatDateForInput(event.date),
      time: formatTimeForInput(event.date),
      duration: event.duration,
      category: event.category,
      priority: event.priority || 'medium',
      location: event.location || '',
      attendees: event.attendees || ''
    });
    setEditingEvent(event);
    setShowEventForm(true);
    setSelectedEvent(null);
  };

  // Handle form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (!eventForm.title.trim() || !eventForm.date || !eventForm.time) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingEvent) {
      updateEvent(editingEvent.id, eventForm);
    } else {
      createEvent(eventForm);
    }
  };

  // --- DATA PREPARATION ---
  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // --- JSX RENDERING ---
  return (
    <div className="h-full flex flex-col">
      {/* App Header Section */}
      <div className="flex justify-between items-center mb-4 bg-blue-900/20 rounded-lg p-3 border border-blue-900/30">
        <div className="text-blue-100 text-lg font-light tracking-wider">
          {monthName} {year}
        </div>
        <div className="flex space-x-2">
          {/* Navigation Controls */}
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-900/40 hover:bg-blue-800/50 text-blue-300"
            onClick={prevMonth}
          >
            ←
          </button>
          <button 
            className="px-3 py-1 rounded bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 text-sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-900/40 hover:bg-blue-800/50 text-blue-300"
            onClick={nextMonth}
          >
            →
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4 space-x-2">
        {/* Search and Filter */}
        <div className="flex space-x-2 flex-1">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1 text-sm bg-blue-950/50 border border-blue-800/30 rounded text-blue-200 placeholder-blue-400/50"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1 text-sm bg-blue-950/50 border border-blue-800/30 rounded text-blue-200"
          >
            <option value="all">All Categories</option>
            {Object.entries(eventCategories).map(([key, category]) => (
              <option key={key} value={key}>{category.label}</option>
            ))}
          </select>
        </div>
        
        {/* Add Event Button */}
        <button
          onClick={() => {
            const today = new Date();
            setEventForm({
              ...eventForm,
              date: formatDateForInput(today),
              time: formatTimeForInput(today)
            });
            setShowEventForm(true);
          }}
          className="px-4 py-1 bg-green-800/40 hover:bg-green-700/50 text-green-300 text-sm rounded border border-green-700/30"
        >
          + Add Event
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {/* Days of week header */}
        <div className="grid grid-cols-7 mb-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-blue-400/70 text-xs py-1 font-medium">{day}</div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const isToday = day === new Date().getDate() && 
                           currentDate.getMonth() === new Date().getMonth() && 
                           currentDate.getFullYear() === new Date().getFullYear();
            
            return (
              <div 
                key={index} 
                onClick={() => handleDayClick(day)}
                className={`
                  h-24 border rounded p-1 relative cursor-pointer transition-colors
                  ${day ? 'border-blue-900/40' : 'border-transparent bg-transparent cursor-default'} 
                  ${isToday ? 'bg-blue-900/30 border-blue-700' : day ? 'bg-blue-950/30 hover:bg-blue-900/20' : ''}
                `}
              >
                {day && (
                  <>
                    <div className={`text-xs ${isToday ? 'text-blue-300 font-semibold' : 'text-blue-400/80'}`}>
                      {day}
                    </div>
                    <div className="mt-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map(event => {
                        const categoryStyle = eventCategories[event.category];
                        return (
                          <div 
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                            className={`
                              text-xs mb-1 px-1 py-0.5 rounded truncate cursor-pointer border
                              ${categoryStyle.color} ${categoryStyle.textColor}
                              hover:opacity-80 transition-opacity
                            `}
                          >
                            {formatTime(event.date)} {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-blue-400/60">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-blue-950/95 border border-blue-800/50 p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-blue-200 text-xl font-medium">{selectedEvent.title}</h3>
              <button 
                className="w-8 h-8 rounded-full bg-blue-900/60 hover:bg-blue-800/60 text-blue-400 flex items-center justify-center"
                onClick={() => setSelectedEvent(null)}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center text-blue-300 text-sm">
                <span className="mr-2">🕒</span>
                {formatTime(selectedEvent.date)} • {selectedEvent.duration} minutes
              </div>
              
              {selectedEvent.location && (
                <div className="flex items-center text-blue-300 text-sm">
                  <span className="mr-2">📍</span>
                  {selectedEvent.location}
                </div>
              )}
              
              <div className="flex items-center text-blue-300 text-sm">
                <span className="mr-2">🏷️</span>
                <span className={`px-2 py-1 rounded text-xs border ${eventCategories[selectedEvent.category].color}`}>
                  {eventCategories[selectedEvent.category].label}
                </span>
              </div>
              
              {selectedEvent.priority && (
                <div className="flex items-center text-sm">
                  <span className="mr-2 text-blue-300">⭐</span>
                  <span className={priorityLevels[selectedEvent.priority].color}>
                    {priorityLevels[selectedEvent.priority].label} Priority
                  </span>
                </div>
              )}
              
              {selectedEvent.description && (
                <div className="bg-blue-900/30 p-3 rounded border border-blue-800/30">
                  <p className="text-blue-200 text-sm">{selectedEvent.description}</p>
                </div>
              )}
              
              {selectedEvent.attendees && (
                <div className="flex items-center text-blue-300 text-sm">
                  <span className="mr-2">👥</span>
                  {selectedEvent.attendees}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => handleEditEvent(selectedEvent)}
                className="px-4 py-2 bg-blue-800/40 hover:bg-blue-700/50 text-blue-300 text-sm rounded border border-blue-700/30"
              >
                Edit
              </button>
              <button 
                onClick={() => deleteEvent(selectedEvent.id)}
                className="px-4 py-2 bg-red-900/30 hover:bg-red-800/40 text-red-300 text-sm rounded border border-red-800/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Event Form Modal */}
      {showEventForm && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-blue-950/95 border border-blue-800/50 p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-blue-200 text-xl font-medium">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h3>
              <button 
                className="w-8 h-8 rounded-full bg-blue-900/60 hover:bg-blue-800/60 text-blue-400 flex items-center justify-center"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  resetEventForm();
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-blue-300 text-sm mb-1">Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  className="w-full px-3 py-2 bg-blue-950/50 border border-blue-800/30 rounded text-blue-200 placeholder-blue-400/50"
                  placeholder="Enter event title"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-blue-300 text-sm mb-1">Date *</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    className="w-full px-3 py-2 bg-blue-950/50 border border-blue-800/30 rounded text-blue-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-blue-300 text-sm mb-1">Time *</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                    className="w-full px-3 py-2 bg-blue-950/50 border border-blue-800/30 rounded text-blue-200"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-blue-300 text-sm mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={eventForm.duration}
                    onChange={(e) => setEventForm({...eventForm, duration: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-blue-950/50 border border-blue-800/30 rounded text-blue-200"
                    min="15"
                    step="15"
                  />
                </div>
                <div>
                  <label className="block text-blue-300 text-sm mb-1">Priority</label>
                  <select
                    value={eventForm.priority}
                    onChange={(e) => setEventForm({...eventForm, priority: e.target.value})}
                    className="w-full px-3 py-2 bg-blue-950/50 border border-blue-800/30 rounded text-blue-200"
                  >
                    {Object.entries(priorityLevels).map(([key, priority]) => (
                      <option key={key} value={key}>{priority.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-blue-300 text-sm mb-1">Category</label>
                <select
                  value={eventForm.category}
                  onChange={(e) => setEventForm({...eventForm, category: e.target.value})}
                  className="w-full px-3 py-2 bg-blue-950/50 border border-blue-800/30 rounded text-blue-200"
                >
                  {Object.entries(eventCategories).map(([key, category]) => (
                    <option key={key} value={key}>{category.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-blue-300 text-sm mb-1">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  className="w-full px-3 py-2 bg-blue-950/50 border border-blue-800/30 rounded text-blue-200 placeholder-blue-400/50"
                  placeholder="Enter location"
                />
              </div>
              
              <div>
                <label className="block text-blue-300 text-sm mb-1">Attendees</label>
                <input
                  type="text"
                  value={eventForm.attendees}
                  onChange={(e) => setEventForm({...eventForm, attendees: e.target.value})}
                  className="w-full px-3 py-2 bg-blue-950/50 border border-blue-800/30 rounded text-blue-200 placeholder-blue-400/50"
                  placeholder="Enter attendees (comma separated)"
                />
              </div>
              
              <div>
                <label className="block text-blue-300 text-sm mb-1">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  className="w-full px-3 py-2 bg-blue-950/50 border border-blue-800/30 rounded text-blue-200 placeholder-blue-400/50"
                  placeholder="Enter event description"
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                    resetEventForm();
                  }}
                  className="px-4 py-2 bg-gray-700/40 hover:bg-gray-600/50 text-gray-300 text-sm rounded border border-gray-600/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-800/40 hover:bg-green-700/50 text-green-300 text-sm rounded border border-green-700/30"
                >
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarApp;
