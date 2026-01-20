import React, { useState, useRef, useEffect } from 'react';
import '../styles/app-container.css';

const KeyboardApp = ({ onClose }) => {
  const containerRef = useRef(null);
  const [inputText, setInputText] = useState('');
  const [circlePos, setCirclePos] = useState(null);
  const [circleSize, setCircleSize] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // track farthest horizontal reveal for disconnected touches
  const [farthestDelta, setFarthestDelta] = useState(0);
  const [columnsVisible, setColumnsVisible] = useState(0);
  const maxColumns = 10;
  const [glowKey, setGlowKey] = useState(null);
  const keyOrder = [
    '1','2','3','4','5','6','7','8','9','0',
    'Q','W','E','R','T','Y','U','I','O','P',
    'A','S','D','F','G','H','J','K','L',
    'Z','X','C','V','B','N','M'
  ];
  const totalKeys = keyOrder.length;
  // Radial extension animation state
  const [showRadial, setShowRadial] = useState(false);
  const [radialAnim, setRadialAnim] = useState(false);
  // CapsLock, Shift, and active-slice (pressed) states for radial buttons
  const [capsLock, setCapsLock] = useState(false);
  const [shiftActive, setShiftActive] = useState(false);
  const [activeSlice, setActiveSlice] = useState(null);
  // Helper to reveal columns up to the farthest x touched (discontinuous swipes)
  const updateColumnsFromClientX = clientX => {
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

  // Prevent swipe-back navigation (pushstate hack)
  useEffect(() => {
    window.history.pushState(null, null, window.location.href);
    const onPop = () => {
      window.history.pushState(null, null, window.location.href);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };
  // Handle horizontal wheel (trackpad swipe) for opening columns
  const handleWheel = e => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const KEY_STEP = 44;
    // spawn circle on first swipe
    if (!circlePos) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCirclePos({ x, y });
      setCircleSize(160);
      setColumnsVisible(0);
      setFarthestDelta(0);
      setIsDragging(true);
    }
    // expand columns on horizontal swipe
    if (e.deltaX > 0) {
      const inc = Math.ceil(e.deltaX / KEY_STEP);
      setColumnsVisible(prev => Math.min(maxColumns, prev + inc));
      // update farthest
      updateColumnsFromClientX(e.clientX);
    }
  };
  // Handle double click to spawn circle
  const handleDoubleClick = e => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCirclePos({ x, y });
    setColumnsVisible(0);
    setFarthestDelta(0);
    // animate growth
    setCircleSize(0);
    setTimeout(() => setCircleSize(160), 100);
  };

  // Handle pointer down or tap: spawn circle if needed, then reveal based on x
  const handleMouseDown = e => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x0 = e.clientX - rect.left;
    const y0 = e.clientY - rect.top;
    if (!circlePos) {
      setCirclePos({ x: x0, y: y0 });
      setCircleSize(160);
      setFarthestDelta(0);
      setColumnsVisible(0);
    }
    updateColumnsFromClientX(e.clientX);
    setIsDragging(true);
  };

  // Pointer move: reveal columns as pointer moves
  const handleMouseMove = e => {
    if (!containerRef.current) return;
    updateColumnsFromClientX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Key click: append letter respecting CapsLock and Shift, and glow
  const handleKeyClick = letter => {
    let output = letter;
    // apply case for alphabetic letters
    if (/^[A-Z]$/.test(letter)) {
      const upper = capsLock || shiftActive;
      output = upper ? letter : letter.toLowerCase();
    }
    setInputText(prev => prev + output);
    setGlowKey(letter);
    setTimeout(() => setGlowKey(null), 200);
    // reset shift after one use
    if (shiftActive) {
      setShiftActive(false);
    }
  };
  // Animate radial segments when fully extended
  useEffect(() => {
    if (circlePos && columnsVisible === maxColumns) {
      setShowRadial(true);
      // trigger scale up
      requestAnimationFrame(() => setRadialAnim(true));
    } else {
      setRadialAnim(false);
      const t = setTimeout(() => setShowRadial(false), 300);
      return () => clearTimeout(t);
    }
  }, [circlePos, columnsVisible]);
  // Radial menu buttons (Tab, Caps, Shift)
  const radialButtons = [
    { label: 'Tab', value: '\t', angle: 180 },
    { label: 'Caps', action: () => setCapsLock(prev => !prev), angle: 135 },
    { label: 'Shift', action: () => setShiftActive(true), angle: 225 },
  ];
  const radialJSX = showRadial && circlePos ? (() => {
    // spacing and sizing for radial slices
    const ringOffset = 30; // push slices further from circle
    const ringThickness = 40;
    const innerRadius = circleSize / 2 + ringOffset;
    const outerRadius = innerRadius + ringThickness;
    const svgSize = outerRadius * 2;
    const gapDeg = 15; // increase separation between slices
    const count = radialButtons.length;
    const totalArc = 180;
    const arcSpan = (totalArc - gapDeg * (count - 1)) / count;
    const arcStart = 90;
    const a2r = deg => (deg * Math.PI) / 180;
    return (
      <svg
        width={svgSize}
        height={svgSize}
        style={{
          position: 'absolute',
          left: circlePos.x - outerRadius,
          top: circlePos.y - outerRadius,
          overflow: 'visible',
          zIndex: 9,
        }}
      >
        <g
          style={{
            transformOrigin: `${outerRadius}px ${outerRadius}px`,
            transform: radialAnim ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.3s ease-out',
            pointerEvents: radialAnim ? 'all' : 'none'
          }}
        >
          {radialButtons.map((btn, i) => {
            const startAngle = arcStart + i * (arcSpan + gapDeg);
            const endAngle = startAngle + arcSpan;
            const midAngle = (startAngle + endAngle) / 2;
            // compute slice corners
            const x1 = outerRadius + innerRadius * Math.cos(a2r(startAngle));
            const y1 = outerRadius + innerRadius * Math.sin(a2r(startAngle));
            const x2 = outerRadius + outerRadius * Math.cos(a2r(startAngle));
            const y2 = outerRadius + outerRadius * Math.sin(a2r(startAngle));
            const x3 = outerRadius + outerRadius * Math.cos(a2r(endAngle));
            const y3 = outerRadius + outerRadius * Math.sin(a2r(endAngle));
            const x4 = outerRadius + innerRadius * Math.cos(a2r(endAngle));
            const y4 = outerRadius + innerRadius * Math.sin(a2r(endAngle));
            const pathD = [
              `M ${x1} ${y1}`,
              `L ${x2} ${y2}`,
              `A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3}`,
              `L ${x4} ${y4}`,
              `A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}`,
              'Z'
            ].join(' ');
            // text position
            const midRad = a2r(midAngle);
            const textRadius = innerRadius + ringThickness / 2;
            const textX = outerRadius + textRadius * Math.cos(midRad);
            const textY = outerRadius + textRadius * Math.sin(midRad);
            return (
              <g
                key={btn.label}
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'all',
                  filter: activeSlice === btn.label ? 'drop-shadow(0 0 6px white)' : 'none',
                  transform: activeSlice === btn.label ? 'scale(1.1)' : 'scale(1)',
                  transformOrigin: `${textX}px ${textY}px`,
                  transition: 'filter 0.2s ease, transform 0.2s ease',
                }}
                onPointerDown={() => setActiveSlice(btn.label)}
                onPointerUp={() => setActiveSlice(null)}
                onPointerLeave={() => setActiveSlice(null)}
                onClick={() => {
                  if (btn.value !== undefined) handleKeyClick(btn.value);
                  else if (btn.action) btn.action();
                }}
              >
                <path
                  d={pathD}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="12"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                >
                  {btn.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    );
  })() : null;

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative bg-black text-white overflow-hidden select-none flex flex-col items-center"
      onContextMenu={e => e.preventDefault()}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onPointerDown={handleMouseDown}
      onTouchStart={e => { e.preventDefault(); handleMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, stopPropagation: () => {} }); }}
      onMouseMove={handleMouseMove}
      onPointerMove={handleMouseMove}
      onTouchMove={e => { e.preventDefault(); handleMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); }}
      onMouseUp={handleMouseUp}
      onPointerUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    >
      {/* Fullscreen toggle */}
      <button onClick={toggleFullscreen} className="absolute top-4 right-12 text-blue-300">
        {isFullscreen ? '⏏' : '⛶'}
      </button>
      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 text-blue-300">✕</button>
      <input
        type="text"
        readOnly
        value={inputText}
        className="w-3/4 max-w-xl mx-auto mt-8 p-2 bg-gray-900 text-white text-lg rounded text-center"
        placeholder="Type here..."
      />
      {circlePos && (
        <>
          {/* Enter button (circle becomes Enter) */}
          <div
            onClick={() => { if (columnsVisible === maxColumns) handleKeyClick('\n'); }}
            onMouseDown={e => { e.preventDefault(); handleMouseDown(e); }}
            onPointerDown={e => { e.preventDefault(); handleMouseDown(e); }}
            onTouchStart={e => { e.preventDefault(); handleMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, stopPropagation: () => {} }); }}
            onMouseUp={e => { e.preventDefault(); handleMouseUp(e); }}
            onPointerUp={e => { e.preventDefault(); handleMouseUp(e); }}
            onTouchEnd={e => { e.preventDefault(); handleMouseUp(e); }}
            style={{
              position: 'absolute',
              left: circlePos.x,
              top: circlePos.y,
              width: circleSize,
              height: circleSize,
              marginLeft: -circleSize / 2,
              marginTop: -circleSize / 2,
              borderWidth: '4px',
              borderStyle: 'solid',
              borderColor: isDragging ? '#0ea5e9' : 'white',
              borderRadius: '50%',
              transition: 'width 0.3s ease, height 0.3s ease, border-color 0.2s ease, box-shadow 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              cursor: isDragging ? 'grabbing' : 'pointer',
              boxShadow: isDragging ? '0 0 12px #0ea5e9' : undefined,
              userSelect: 'none'
            }}
          >
            <span style={{
              opacity: columnsVisible === maxColumns ? 1 : 0,
              transition: 'opacity 0.2s ease'
            }}>
              Enter
          </span>
          </div>
          {radialJSX}
        </>
      )}
      {circlePos && columnsVisible > 0 && (() => {
        const cols = columnsVisible;
        const rows = [
          // First row: up to 10 keys
          keyOrder.slice(0, Math.min(cols, 10)),
          // Second row: up to 10 keys starting at index 10
          keyOrder.slice(10, 10 + Math.min(cols, 10)),
          // Third row: up to 9 keys (A-L) starting at index 20
          keyOrder.slice(20, 20 + Math.min(cols, 9)),
          // Fourth row: up to 7 keys (Z-M) starting at index 29
          keyOrder.slice(29, 29 + Math.min(cols, 7))
        ];
        // dynamically center keyboard vertically on ring
        const rowCount = rows.length;
        const rowHeight = 48; // approx key+spacing
        const totalHeight = rowCount * rowHeight;
        const topOffset = circlePos.y - totalHeight / 2;
        // Determine wrapper width using max row length (10 keys)
        const maxRowLen = 10;
        const keyStep = 44;
        const wrapperWidth = maxRowLen * keyStep;
        return (
          <div
            className="absolute flex flex-col items-center space-y-1"
            style={{
              left: circlePos.x + circleSize / 2 + 10,
              top: topOffset
            }}
          >
            {rows.map((rowKeys, ri) => (
              <div key={ri} className="flex space-x-1">
                {rowKeys.map(letter => (
                  <button
                    key={letter}
                    onClick={() => handleKeyClick(letter)}
                    className={`w-10 h-10 m-0.5 bg-transparent border border-white text-white rounded shadow-md transform transition-all duration-200 ease-out ${glowKey === letter ? 'bg-blue-300 shadow-lg scale-110' : ''}`}
                  >{letter}</button>
                ))}
              </div>
            ))}
            {/* Space bar row */}
            <div className="flex justify-center mt-1">
              <button
                onClick={() => handleKeyClick(' ')}
                className={`h-10 m-0.5 bg-transparent border border-white text-white rounded shadow-md transform transition-all duration-200 ease-out ${glowKey === ' ' ? 'bg-blue-300 shadow-lg scale-110' : ''}`}
                style={{ width: keyStep * cols }}
              >
                Space
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default KeyboardApp;