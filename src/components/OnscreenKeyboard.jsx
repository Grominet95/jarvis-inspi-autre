import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import soundService from '../services/soundService';

// Lightweight tool overlay with menu (Measure, Keyboard, Sketch)
const OnscreenKeyboard = forwardRef(({ onModeChange, mmPerPixel = 0.265 }, ref) => {
  const containerRef = useRef(null);
  const [circlePos, setCirclePos] = useState(null);
  const [circleSize, setCircleSize] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [farthestDelta, setFarthestDelta] = useState(0);
  const [columnsVisible, setColumnsVisible] = useState(0);
  const [glowKey, setGlowKey] = useState(null);
  const [shiftActive, setShiftActive] = useState(false);
  const [mode, setMode] = useState('idle'); // idle | menu | keyboard | measure | sketch
  const [measurements, setMeasurements] = useState([]); // {x1,y1,x2,y2}
  const [draftMeasure, setDraftMeasure] = useState(null);
  const [paths, setPaths] = useState([]); // array of SVG path data
  const [draftPath, setDraftPath] = useState('');
  const maxColumns = 10;
  const keyOrder = [
    '1','2','3','4','5','6','7','8','9','0',
    'Q','W','E','R','T','Y','U','I','O','P',
    'A','S','D','F','G','H','J','K','L',
    'Z','X','C','V','B','N','M'
  ];

  // Spawn on double click anywhere on the window (doesn't steal pointer events)
  useEffect(() => {
    const onDblClick = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCirclePos({ x, y });
      setColumnsVisible(0);
      setFarthestDelta(0);
      setCircleSize(0);
      setTimeout(() => setCircleSize(160), 80);
      // Default tool is keyboard; tabs will show for Measure/Sketch
      setMode('keyboard');
    };
    window.addEventListener('dblclick', onDblClick, true);
    return () => window.removeEventListener('dblclick', onDblClick, true);
  }, []);

  useEffect(() => {
    if (typeof onModeChange === 'function') {
      onModeChange(mode === 'idle' ? null : mode);
    }
  }, [mode, onModeChange]);

  useImperativeHandle(ref, () => ({
    clearArtifacts: () => {
      setColumnsVisible(0);
      setCirclePos(null);
      setDraftMeasure(null);
      setMeasurements([]);
      setDraftPath('');
      setPaths([]);
      setMode('idle');
    }
  }));

  const updateColumnsFromClientX = (clientX) => {
    if (!containerRef.current || !circlePos) return;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = clientX - rect.left;
    const startX = circlePos.x + circleSize / 2 + 10;
    const delta = localX - startX;
    if (delta > farthestDelta) {
      setFarthestDelta(delta);
      const KEY_STEP = 44;
      const newCols = Math.min(maxColumns, Math.floor(delta / KEY_STEP) + 1);
      setColumnsVisible(newCols);
    }
  };

  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x0 = e.clientX - rect.left;
    const y0 = e.clientY - rect.top;
    if (mode === 'measure') {
      setDraftMeasure({ x1: x0, y1: y0, x2: x0, y2: y0 });
      // Play loading sound when starting measurement
      soundService.playLoading();
      return;
    }
    if (mode === 'sketch') {
      setDraftPath(`M ${x0} ${y0}`);
      // Play loading sound when starting sketch
      soundService.playLoading();
      return;
    }
    if (!circlePos) {
      setCirclePos({ x: x0, y: y0 });
      setCircleSize(160);
      setFarthestDelta(0);
      setColumnsVisible(0);
    }
    updateColumnsFromClientX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (mode === 'measure' && draftMeasure) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDraftMeasure(prev => prev ? { ...prev, x2: x, y2: y } : prev);
      return;
    }
    if (mode === 'sketch' && draftPath) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDraftPath(prev => prev + ` L ${x} ${y}`);
      return;
    }
    updateColumnsFromClientX(e.clientX);
  };
  const handleMouseUp = () => {
    if (mode === 'measure' && draftMeasure) {
      setMeasurements(prev => [...prev, draftMeasure]);
      setDraftMeasure(null);
      // Play select sound when finishing measurement
      soundService.playSelect();
      return;
    }
    if (mode === 'sketch' && draftPath) {
      setPaths(prev => [...prev, draftPath]);
      setDraftPath('');
      // Play select sound when finishing sketch
      soundService.playSelect();
      return;
    }
    setIsDragging(false);
  };

  const insertText = (text) => {
    const target = document.activeElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? start;
      const value = target.value ?? '';
      const next = value.slice(0, start) + text + value.slice(end);
      target.value = next;
      target.selectionStart = target.selectionEnd = start + text.length;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const handleKeyClick = (letter) => {
    let char = letter;
    if (/^[A-Z]$/.test(letter)) {
      char = shiftActive ? letter : letter.toLowerCase();
    }
    if (letter === ' ') char = ' ';
    insertText(char);
    setGlowKey(letter);
    setTimeout(() => setGlowKey(null), 160);
    if (shiftActive) setShiftActive(false);
  };

  const handleEnter = () => insertText('\n');
  const handleDelete = () => {
    const target = document.activeElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? start;
      const value = target.value ?? '';
      if (start === 0 && end === 0) return;
      const newStart = start === end ? Math.max(0, start - 1) : start;
      const next = value.slice(0, newStart) + value.slice(end);
      target.value = next;
      target.selectionStart = target.selectionEnd = newStart;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const interactive = !!circlePos || mode === 'measure' || mode === 'sketch' || mode === 'keyboard' || mode === 'menu';

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 ${interactive ? 'pointer-events-auto' : 'pointer-events-none'} z-[60]`}
      onMouseDown={(e) => { 
        if (interactive) { 
          // Don't block clicks on UI elements (settings, chat, etc.)
          const target = e.target;
          if (target.closest('button') || target.closest('[role="button"]') || target.closest('.panel-premium')) {
            return; // Allow UI elements to be clicked
          }
          e.preventDefault(); 
          e.stopPropagation(); 
          handleMouseDown(e); 
        } 
      }}
      onMouseMove={(e) => { if (interactive) handleMouseMove(e); }}
      onMouseUp={(e) => { if (interactive) handleMouseUp(e); }}
      style={{ userSelect: 'none' }}
    >
      {/* Measurement overlay */}
      {(mode === 'measure' || measurements.length > 0 || draftMeasure) && (
        <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
          {measurements.map((m, i) => (
            <g key={i}>
              <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="rgba(59,130,246,0.9)" strokeWidth="2" />
              <circle cx={m.x1} cy={m.y1} r="3" fill="rgba(59,130,246,0.9)" />
              <circle cx={m.x2} cy={m.y2} r="3" fill="rgba(59,130,246,0.9)" />
              <text x={(m.x1+m.x2)/2} y={(m.y1+m.y2)/2 - 8} fill="#cfe8ff" fontSize="12" textAnchor="middle">
                {(() => {
                  const px = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
                  const mm = px * mmPerPixel;
                  return `${mm.toFixed(1)} mm`;
                })()}
              </text>
            </g>
          ))}
          {draftMeasure && (
            <g>
              <line x1={draftMeasure.x1} y1={draftMeasure.y1} x2={draftMeasure.x2} y2={draftMeasure.y2} stroke="rgba(59,130,246,0.6)" strokeDasharray="4 3" strokeWidth="2" />
              <text x={(draftMeasure.x1+draftMeasure.x2)/2} y={(draftMeasure.y1+draftMeasure.y2)/2 - 8} fill="#cfe8ff" fontSize="12" textAnchor="middle">
                {(() => {
                  const px = Math.hypot(draftMeasure.x2 - draftMeasure.x1, draftMeasure.y2 - draftMeasure.y1);
                  const mm = px * mmPerPixel;
                  return `${mm.toFixed(1)} mm`;
                })()}
              </text>
            </g>
          )}
        </svg>
      )}

      {/* Sketch overlay */}
      {(mode === 'sketch' || paths.length > 0 || draftPath) && (
        <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
          {paths.map((p, i) => (
            <path key={i} d={p} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
          ))}
          {draftPath && (
            <path d={draftPath} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
          )}
        </svg>
      )}

      {circlePos && (
        <>
          <div
            className="pointer-events-auto"
            style={{
              position: 'absolute',
              left: circlePos.x,
              top: circlePos.y,
              width: circleSize,
              height: circleSize,
              marginLeft: -circleSize / 2,
              marginTop: -circleSize / 2,
              borderWidth: '3px',
              borderStyle: 'solid',
              borderColor: isDragging ? 'rgba(59,130,246,0.9)' : 'rgba(255,255,255,0.9)',
              borderRadius: '50%',
              transition: 'width 0.25s ease, height 0.25s ease, border-color 0.15s ease',
              boxShadow: isDragging ? '0 0 10px rgba(59,130,246,0.8)' : '0 0 8px rgba(255,255,255,0.35)'
            }}
          />
          {/* Tool tabs (only Measure and Sketch; Keyboard is default) */}
          {circlePos && mode === 'keyboard' && (
            <div className="pointer-events-auto" style={{ position: 'absolute', left: circlePos.x, top: circlePos.y - circleSize/2 - 40, transform: 'translateX(-50%)' }}>
              <div className="flex space-x-2">
                <button onClick={() => { setMode('measure'); setCirclePos(null); }} className="px-3 py-1 text-xs rounded bg-black/40 border border-blue-400/40 text-blue-100">Measure</button>
                <button onClick={() => { setMode('sketch'); setCirclePos(null); }} className="px-3 py-1 text-xs rounded bg-black/40 border border-blue-400/40 text-blue-100">Sketch</button>
              </div>
            </div>
          )}
          {mode === 'keyboard' && columnsVisible > 0 && (() => {
            const cols = columnsVisible;
            const rows = [
              keyOrder.slice(0, Math.min(cols, 10)),
              keyOrder.slice(10, 10 + Math.min(cols, 10)),
              keyOrder.slice(20, 20 + Math.min(cols, 9)),
              keyOrder.slice(29, 29 + Math.min(cols, 7))
            ];
            const rowHeight = 46;
            const totalHeight = rows.length * rowHeight;
            const topOffset = circlePos.y - totalHeight / 2;
            const keyStep = 44;
            return (
              <div
                className="absolute pointer-events-auto"
                style={{ left: circlePos.x + circleSize / 2 + 10, top: topOffset }}
              >
                {rows.map((rowKeys, ri) => (
                  <div key={ri} className="flex space-x-1 mb-1">
                    {rowKeys.map((letter) => (
                      <button
                        key={letter}
                        onClick={() => handleKeyClick(letter)}
                        className={`w-10 h-10 m-0.5 bg-transparent border border-white text-white rounded shadow-md transform transition-all duration-200 ease-out ${glowKey === letter ? 'bg-blue-300 shadow-lg scale-110' : ''}`}
                      >{letter}</button>
                    ))}
                  </div>
                ))}
                <div className="flex justify-center mt-1">
                  <button
                    onClick={() => handleKeyClick(' ')}
                    className={`h-10 m-0.5 bg-transparent border border-white text-white rounded shadow-md transform transition-all duration-200 ease-out ${glowKey === ' ' ? 'bg-blue-300 shadow-lg scale-110' : ''}`}
                    style={{ width: keyStep * cols }}
                  >Space</button>
                </div>

                {/* Surround controls like KeyboardApp: Enter overlay in circle, Shift/Delete around */}
                {/* Left of circle: Shift */}
                <button
                  onClick={() => setShiftActive(s => !s)}
                  className={`absolute -left-14 top-1/2 -translate-y-1/2 px-3 h-10 bg-transparent border border-white text-white rounded ${shiftActive ? 'shadow-[0_0_10px_rgba(59,130,246,0.6)]' : ''}`}
                  style={{ left: circlePos.x - 14, top: circlePos.y }}
                >Shift</button>
                {/* Right of circle: Delete */}
                <button
                  onClick={handleDelete}
                  className="absolute px-3 h-10 bg-transparent border border-white text-white rounded"
                  style={{ left: circlePos.x + circleSize + 20, top: circlePos.y - 20 }}
                >Delete</button>
                {/* Enter inside circle center when full columns */}
                <button
                  onClick={handleEnter}
                  className="absolute bg-transparent border border-white text-white rounded px-3 py-1"
                  style={{ left: circlePos.x - 22, top: circlePos.y - 12 }}
                >Enter</button>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
});

export default OnscreenKeyboard;


