import React, { useState, useMemo, useRef, useCallback, memo } from 'react';

// --- CONFIGURATION ---
const ROW_HEIGHT = 36;
const COL_WIDTH = 100;

// To make the math perfectly reliable, we define the exact viewport dimensions
const VIEWPORT_HEIGHT = 600;
const VIEWPORT_WIDTH = 1000; 

const TOTAL_ROWS = 10000;
const TOTAL_COLS = 200;

// --- 2D POOL SIZE MATH ---
const OVERSCAN = 2; // Only 2 extra nodes needed on all axes due to Sticky + SubPixel architecture

const VISIBLE_ROWS = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT);
const ROW_POOL_SIZE = VISIBLE_ROWS + OVERSCAN; // e.g., 17 + 2 = 19 DOM Rows

const VISIBLE_COLS = Math.ceil(VIEWPORT_WIDTH / COL_WIDTH);
const COL_POOL_SIZE = VISIBLE_COLS + OVERSCAN; // e.g., 10 + 2 = 12 DOM Columns per row

// --- LAZY DATA EVALUATION ---
// We DO NOT create an array of 2,000,000 objects in memory. That would crash the browser.
// We dynamically generate the cell content on the fly.
const getCellData = (rowIndex, colIndex) => {
  if (colIndex === 0) return `ID: ${rowIndex}`;
  return `R${rowIndex} - C${colIndex}`;
};
const getColTitle = (colIndex) => colIndex === 0 ? 'Primary ID' : `Metric ${colIndex}`;


// --- ROW COMPONENT (Recycled) ---
const TableRow = memo(({ logicalRowIndex, renderStartCol, top, isEven }) => {
  if (logicalRowIndex >= TOTAL_ROWS) return null;

  const cells = [];
  
  // DUAL-AXIS RECYCLING: The row itself only ever renders 12 column nodes.
  for (let c = 0; c < COL_POOL_SIZE; c++) {
    // Column Modulo Math
    let offsetCol = c - (renderStartCol % COL_POOL_SIZE);
    if (offsetCol < 0) offsetCol += COL_POOL_SIZE;
    
    const logicalColIndex = renderStartCol + offsetCol;

    if (logicalColIndex < TOTAL_COLS) {
      cells.push(
        <div
          key={c}
          className={`absolute top-0 flex items-center px-4 overflow-hidden text-sm whitespace-nowrap overflow-ellipsis border-r border-gray-200 ${
             logicalColIndex === 0 ? 'font-bold bg-gray-100/80 text-gray-900' : 'text-gray-700'
          }`}
          style={{
            left: `${offsetCol * COL_WIDTH}px`,
            width: `${COL_WIDTH}px`,
            height: '100%',
            willChange: 'left'
          }}
        >
          {getCellData(logicalRowIndex, logicalColIndex)}
        </div>
      );
    } else {
      cells.push(<div key={c} style={{ display: 'none' }} />);
    }
  }

  return (
    <div
      className={`absolute left-0 flex border-b border-gray-200 transition-none ${
        isEven ? 'bg-white' : 'bg-gray-50'
      } hover:bg-blue-50`}
      style={{
        height: `${ROW_HEIGHT}px`,
        top: `${top}px`, // Y-position within the sticky body wrapper
        width: `${COL_POOL_SIZE * COL_WIDTH}px` 
      }}
    >
      {cells}
    </div>
  );
// React.memo must now track the horizontal scroll position (renderStartCol) so it knows when to re-render cells
}, (prev, next) => prev.logicalRowIndex === next.logicalRowIndex && prev.top === next.top && prev.renderStartCol === next.renderStartCol);


// --- MAIN APP COMPONENT ---
export default function App() {
  // We track both X and Y starting boundaries
  const [renderStartRow, setRenderStartRow] = useState(0);
  const [renderStartCol, setRenderStartCol] = useState(0);
  
  const containerRef = useRef(null);
  const headerSubPixelRef = useRef(null);
  const bodySubPixelRef = useRef(null); 
  
  const scrollTimer = useRef(null);
  const isScrollingRef = useRef(false);
  const startRowRef = useRef(0);
  const startColRef = useRef(0);

  // --- THE 2D SCROLL ENGINE ---
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollLeft } = e.target;
    
    const logicalRow = Math.floor(scrollTop / ROW_HEIGHT);
    const logicalCol = Math.floor(scrollLeft / COL_WIDTH);
    
    // 1. DUAL-AXIS SUB-PIXEL TRANSLATION
    // We physically move the wrapper grids by the exact pixel remainder (0-35px Y, 0-99px X)
    if (bodySubPixelRef.current && headerSubPixelRef.current) {
        const subPixelY = scrollTop % ROW_HEIGHT;
        const subPixelX = scrollLeft % COL_WIDTH;
        
        bodySubPixelRef.current.style.transform = `translate3d(-${subPixelX}px, -${subPixelY}px, 0px)`;
        // Header only translates on the X axis, it ignores Y axis scrolling
        headerSubPixelRef.current.style.transform = `translate3d(-${subPixelX}px, 0px, 0px)`; 
    }

    // 2. DEBOUNCE HOVER PAINTS
    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      if (containerRef.current) containerRef.current.style.pointerEvents = 'none';
    }
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (containerRef.current) containerRef.current.style.pointerEvents = 'auto';
    }, 150);

    // 3. THROTTLED REACT STATE UPDATES
    let shouldUpdate = false;
    if (logicalRow !== startRowRef.current) {
      startRowRef.current = logicalRow;
      shouldUpdate = true;
    }
    if (logicalCol !== startColRef.current) {
      startColRef.current = logicalCol;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      setRenderStartRow(startRowRef.current);
      setRenderStartCol(startColRef.current);
    }
  }, []);

  // --- 1. GENERATE RECYCLED HEADER NODES ---
  const physicalHeaders = useMemo(() => {
    const headers = [];
    for (let c = 0; c < COL_POOL_SIZE; c++) {
      let offsetCol = c - (renderStartCol % COL_POOL_SIZE);
      if (offsetCol < 0) offsetCol += COL_POOL_SIZE;
      
      const logicalColIndex = renderStartCol + offsetCol;
      if (logicalColIndex < TOTAL_COLS) {
        headers.push(
          <div
            key={c}
            className={`absolute top-0 px-4 py-3 text-sm font-semibold tracking-wider border-b border-gray-600 bg-gray-900 border-r ${
              logicalColIndex === 0 ? 'border-gray-500 text-white' : 'border-gray-700 text-gray-200'
            }`}
            style={{ left: `${offsetCol * COL_WIDTH}px`, width: `${COL_WIDTH}px`, height: '100%' }}
          >
            {getColTitle(logicalColIndex)}
          </div>
        );
      } else {
        headers.push(<div key={c} style={{ display: 'none' }} />);
      }
    }
    return headers;
  }, [renderStartCol]);

  // --- 2. GENERATE RECYCLED ROW NODES ---
  const physicalRows = useMemo(() => {
    const rows = [];
    for (let r = 0; r < ROW_POOL_SIZE; r++) {
      let offsetRow = r - (renderStartRow % ROW_POOL_SIZE);
      if (offsetRow < 0) offsetRow += ROW_POOL_SIZE;
      
      const logicalRowIndex = renderStartRow + offsetRow;

      if (logicalRowIndex < TOTAL_ROWS) {
        rows.push(
          <TableRow
            key={r} 
            logicalRowIndex={logicalRowIndex}
            renderStartCol={renderStartCol}
            top={offsetRow * ROW_HEIGHT}
            isEven={logicalRowIndex % 2 === 0}
          />
        );
      } else {
        rows.push(<div key={r} style={{ display: 'none' }} />);
      }
    }
    return rows;
  }, [renderStartRow, renderStartCol]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8 font-sans">
      <div 
        className="bg-white rounded-xl shadow-xl border border-gray-300 flex flex-col overflow-hidden"
        style={{ width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT + 90}px` }} 
      >
        
        {/* Scrollable Container */}
        <div
          onScroll={handleScroll}
          className="overflow-auto relative bg-white flex-1"
        >
          {/* THE 2D SCROLL ENFORCER: Forces the browser to render Native X and Y Scrollbars */}
          <div 
            style={{ 
              width: `${TOTAL_COLS * COL_WIDTH}px`, 
              height: `${(TOTAL_ROWS * ROW_HEIGHT) + 48}px`, // +48px for header height
              position: 'absolute', 
              top: 0, left: 0 
            }} 
          />

          {/* THE STICKY VISUAL LAYER */}
          <div 
            ref={containerRef}
            className="sticky top-0 left-0 overflow-hidden"
            // FIX: Changed from explicit pixels to 100% so it doesn't overlap the vertical scrollbar
            style={{ width: '100%', height: `${VIEWPORT_HEIGHT + 48}px`, zIndex: 10 }}
          >
             
             {/* HEADER LAYER */}
             <div className="absolute top-0 left-0 right-0 h-[48px] bg-gray-900 z-20 shadow-md">
               <div ref={headerSubPixelRef} className="relative w-full h-full" style={{ willChange: 'transform' }}>
                  {physicalHeaders}
               </div>
             </div>

             {/* BODY LAYER */}
             <div className="absolute top-[48px] left-0 right-0 bottom-0 bg-white z-10">
               <div ref={bodySubPixelRef} className="relative w-full h-full" style={{ willChange: 'transform' }}>
                  {physicalRows}
               </div>
             </div>

          </div>
        </div>
        
        {/* Footer Stats (Standard Flex Child, NO LONGER ABSOLUTE) */}
        {/* FIX: Removed absolute positioning so it sits nicely below the scroll container */}
        <div className="bg-gray-50 border-t border-gray-200 p-3 text-xs text-gray-500 flex justify-between z-30 shrink-0">
          <span>Matrix: {TOTAL_ROWS.toLocaleString()} Rows × {TOTAL_COLS} Cols ({(TOTAL_ROWS * TOTAL_COLS).toLocaleString()} Data Points)</span>
          <span>Physical DOM Nodes in Memory: {ROW_POOL_SIZE * COL_POOL_SIZE} (2D Matrix Recycling)</span>
        </div>

      </div>
    </div>
  );
}