import React, { useState, useMemo, useRef, useCallback, memo } from 'react';

// --- CONFIGURATION ---
const ROW_HEIGHT = 36;
const VIEWPORT_HEIGHT = 600;
const TOTAL_ROWS = 10000;
const COLUMNS_COUNT = 10;

// GLIDE OPTIMIZATION: Because we use a sticky visual layer, the screen can never go blank.
// We only need 2 overscan rows to cover the sub-pixel translation gap.
const OVERSCAN_ROWS = 2; 
const VISIBLE_ROWS = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT);
const POOL_SIZE = VISIBLE_ROWS + OVERSCAN_ROWS; 

// --- DATA GENERATION ---
const columns = Array.from({ length: COLUMNS_COUNT }, (_, i) => ({
  id: `col_${i}`,
  title: i === 0 ? 'ID' : `Metric ${i}`,
  width: i === 0 ? 80 : 120,
}));

const mockData = Array.from({ length: TOTAL_ROWS }, (_, rowIndex) => {
  const row = { id: rowIndex };
  for (let i = 1; i < COLUMNS_COUNT; i++) {
    row[`col_${i}`] = `Data ${rowIndex}-${i}`;
  }
  return row;
});

// --- ROW COMPONENT (Recycled) ---
const TableRow = memo(({ data, top, isEven }) => {
  if (!data) return null;

  return (
    <div
      className={`absolute left-0 right-0 flex border-b border-gray-200 transition-none ${
        isEven ? 'bg-white' : 'bg-gray-50'
      } hover:bg-blue-50`}
      style={{
        height: `${ROW_HEIGHT}px`,
        // The physical Y position is now relative to the Sticky view, NOT the document top.
        transform: `translate3d(0px, ${top}px, 0px)`,
        willChange: 'transform',
      }}
    >
      {columns.map((col, index) => (
        <div
          key={col.id}
          className={`flex items-center px-4 overflow-hidden text-sm text-gray-700 whitespace-nowrap overflow-ellipsis ${
            index === 0 ? 'font-semibold text-gray-900 border-r border-gray-200 bg-gray-100/50' : ''
          }`}
          style={{ width: `${col.width}px`, flexShrink: 0 }}
        >
          {data[col.id === 'col_0' ? 'id' : col.id]}
        </div>
      ))}
    </div>
  );
}, (prev, next) => prev.data?.id === next.data?.id && prev.top === next.top);


// --- MAIN APP COMPONENT ---
export default function App() {
  const [renderStart, setRenderStart] = useState(0);
  
  const containerRef = useRef(null);
  const subPixelRef = useRef(null); // Controls the visual smooth scrolling
  
  const scrollTimer = useRef(null);
  const isScrollingRef = useRef(false);
  const startIndexRef = useRef(0);

  // --- THE SCROLL ENGINE ---
  const handleScroll = useCallback((e) => {
    const scrollTop = e.target.scrollTop;
    
    // 1. Calculate the logical starting row based on pixel position
    const logicalStart = Math.floor(scrollTop / ROW_HEIGHT);
    
    // GLIDE OPTIMIZATION: Direct Sub-Pixel DOM Translation
    // We physically offset the wrapper by the remaining pixels (0 to 35px).
    // This perfectly mimics native scrolling without touching React state.
    if (subPixelRef.current) {
        const subPixelOffset = scrollTop % ROW_HEIGHT;
        subPixelRef.current.style.transform = `translate3d(0px, -${subPixelOffset}px, 0px)`;
    }

    // 2. Debounce hover states to save GPU paint cycles
    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      if (containerRef.current) containerRef.current.style.pointerEvents = 'none';
    }
    
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (containerRef.current) containerRef.current.style.pointerEvents = 'auto';
    }, 150);

    // 3. Throttled React State Update
    // We only swap the underlying data if we crossed a 36px threshold.
    if (logicalStart !== startIndexRef.current) {
      startIndexRef.current = logicalStart;
      setRenderStart(logicalStart);
    }
  }, []);

  // --- THE DOM RECYCLING ENGINE (Modulo Math) ---
  const physicalRows = useMemo(() => {
    const rows = [];
    
    for (let p = 0; p < POOL_SIZE; p++) {
      let offset = p - (renderStart % POOL_SIZE);
      if (offset < 0) offset += POOL_SIZE;
      
      const logicalIndex = renderStart + offset;
      const record = mockData[logicalIndex];

      if (record) {
        rows.push(
          <TableRow
            key={p} 
            data={record}
            // CRUCIAL CHANGE: Position is now based on 'offset', placing it precisely 
            // inside the 600px sticky viewport, rather than deep in the 360,000px document.
            top={offset * ROW_HEIGHT}
            isEven={logicalIndex % 2 === 0}
          />
        );
      } else {
        rows.push(<div key={p} style={{ display: 'none' }} />);
      }
    }
    return rows;
  }, [renderStart]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl border border-gray-300 overflow-hidden flex flex-col">
        
        {/* Header (Static) */}
        <div className="bg-gray-800 text-white flex shrink-0 shadow-md z-20 relative">
          {columns.map((col, index) => (
            <div
              key={col.id}
              className={`px-4 py-3 text-sm font-semibold tracking-wider ${
                index === 0 ? 'border-r border-gray-600 bg-gray-900' : ''
              }`}
              style={{ width: `${col.width}px`, flexShrink: 0 }}
            >
              {col.title}
            </div>
          ))}
        </div>

        {/* Scrollable Body */}
        <div
          onScroll={handleScroll}
          className="overflow-auto relative scroll-smooth"
          style={{ height: `${VIEWPORT_HEIGHT}px` }}
        >
          {/* THE SCROLL ENFORCER: This invisible div gives the browser exact dimensions so the scrollbar works natively */}
          <div style={{ height: `${TOTAL_ROWS * ROW_HEIGHT}px`, position: 'absolute', width: '1px', left: 0, top: 0 }} />

          {/* THE STICKY VISUAL LAYER: Glued to the GPU viewport. The compositor can NEVER scroll this out of view. */}
          <div 
            ref={containerRef}
            style={{ 
              position: 'sticky', 
              top: 0, 
              left: 0, 
              height: `${VIEWPORT_HEIGHT}px`, 
              overflow: 'hidden',
              zIndex: 10
            }}
          >
             {/* THE SUB-PIXEL OFFSET WRAPPER: Handles the 0-35px smooth scroll illusion */}
             <div ref={subPixelRef} style={{ willChange: 'transform' }}>
                {physicalRows}
             </div>
          </div>
        </div>
        
        {/* Footer Stats */}
        <div className="bg-gray-50 border-t border-gray-200 p-3 text-xs text-gray-500 flex justify-between z-20 relative">
          <span>Total Records: {TOTAL_ROWS.toLocaleString()}</span>
          <span>Physical DOM Nodes in Memory: {POOL_SIZE} (Glide Data Grid Architecture)</span>
        </div>

      </div>
    </div>
  );
}