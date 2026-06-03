import React, { useState, useMemo, useRef, useCallback, useTransition, useEffect } from 'react';

// --- CONFIGURATION ---
const ROW_HEIGHT = 44; 
const COL_WIDTH = 120;
const TOTAL_ROWS = 10000;
const TOTAL_COLS = 200;
const OVERSCAN = 2; 

// --- MOCK DATA GENERATORS ---
const getColumnType = (colIndex) => {
  if (colIndex === 0) return 'id';
  
  // Rule 1, 2, 3: Dynamic Multipliers
  if (colIndex > 0) {
    if (colIndex % 6 === 0) return 'chart';
    if (colIndex % 4 === 0 && colIndex % 6 !== 0) return 'dropdown';
    if (colIndex % 5 === 0 && colIndex % 4 !== 0 && colIndex % 6 !== 0) return 'tags';
  }

  // Preserve some specific columns for visual richness if they don't hit the multipliers
  if (colIndex === 1) return 'avatar';
  if (colIndex === 2) return 'status';
  if (colIndex === 3) return 'checkbox';
  
  return 'editable-text';
};

const getColTitle = (colIndex) => {
  const titles = ['ID', 'Avatar', 'Status', 'Verified', 'Role', 'Skills', 'Activity'];
  return titles[colIndex] || `Metric ${colIndex}`;
};

const getCellData = (rowIndex, colIndex, edits) => {
  const editKey = `${rowIndex}-${colIndex}`;
  if (edits.current && edits.current[editKey] !== undefined) return edits.current[editKey];

  if (colIndex === 0) return rowIndex;
  if (colIndex === 1) return `https://i.pravatar.cc/32?u=${rowIndex}`;
  if (colIndex === 2) return ['Active', 'Pending', 'Suspended', 'Banned'][rowIndex % 4];
  if (colIndex === 3) return rowIndex % 3 === 0;
  
  // Align data generation with the dynamically resolved column type
  const type = getColumnType(colIndex);
  if (type === 'dropdown') return ['Admin', 'Editor', 'Viewer'][rowIndex % 3];
  if (type === 'tags') return ['React', 'UI/UX', 'Perf', 'Data'].slice(0, (rowIndex % 3) + 2);
  if (type === 'chart') return Array.from({length: 10}, (_, i) => 10 + Math.sin(rowIndex + i) * 8);
  
  return `Row ${rowIndex} - Col ${colIndex}`;
};

// --- AG GRID STRATEGY: VANILLA HTML STRING RENDERERS ---
const generateCellHTML = (type, value) => {
  if (type === 'avatar') {
    return `<img src="${value}" alt="avatar" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #d1d5db; object-fit: cover;" />`;
  }
  if (type === 'status') {
    const colors = { 
        Active: 'background: #dcfce7; color: #166534', 
        Pending: 'background: #fef9c3; color: #854d0e', 
        Suspended: 'background: #fee2e2; color: #991b1b', 
        Banned: 'background: #1f2937; color: #ffffff' 
    };
    return `<span style="padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; ${colors[value] || 'background: #f3f4f6'}">${value}</span>`;
  }
  if (type === 'checkbox') {
    return `<input type="checkbox" ${value ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #2563eb; pointer-events: none;" />`;
  }
  if (type === 'tags') {
    const tagsHtml = value.map(t => `<span style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: bold; text-transform: uppercase;">${t}</span>`).join('');
    return `<div style="display: flex; gap: 4px; overflow: hidden;">${tagsHtml}</div>`;
  }
  if (type === 'chart') {
    const points = value.map((val, i) => `${i * 10},${24 - val}`).join(' ');
    return `
      <svg width="100%" height="24px" viewBox="0 0 90 24" style="overflow: visible;">
        <polyline points="${points}" style="fill: none; stroke: #3b82f6; stroke-width: 2px; stroke-linejoin: round; stroke-linecap: round;" />
      </svg>
    `;
  }
  
  // Rule 4: Actual UI appearance for Dropdowns and Editable Text in Read-Only Mode
  // pointer-events: none guarantees the click is caught by the wrapper cell
  if (type === 'dropdown') {
      return `
        <div style="width: 100%; height: 28px; position: relative;">
            <select style="width: 100%; height: 100%; border: 1px solid #d1d5db; border-radius: 4px; background-color: #f9fafb; padding: 0 8px; appearance: none; pointer-events: none; color: #374151; font-size: 13px;">
                <option>${value}</option>
            </select>
            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 10px; color: #9ca3af; pointer-events: none;">▼</span>
        </div>
      `;
  }
  if (type === 'editable-text') {
      return `
        <div style="width: 100%; height: 28px;">
            <input type="text" value="${value}" readonly style="width: 100%; height: 100%; border: 1px solid #d1d5db; border-radius: 4px; background-color: #f9fafb; padding: 0 8px; pointer-events: none; color: #374151; font-size: 13px; overflow: hidden; text-overflow: ellipsis;" />
        </div>
      `;
  }

  return `<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; display: block;">${value}</span>`;
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const scrollContainerRef = useRef(null);
  
  // DOM References for Vanilla JS updates
  const headerWrapperRef = useRef(null);
  const bodyWrapperRef = useRef(null);
  const rowRefs = useRef([]);
  const cellRefs = useRef({});
  const headerRefs = useRef([]);

  // Data & State Refs
  const editsRef = useRef({});
  const sortRulesRef = useRef([]);
  const isMultiSortRef = useRef(false);
  const rowOrderMapRef = useRef(Array.from({ length: TOTAL_ROWS }, (_, i) => i));
  
  // React State for UI Overlays
  const [activeCell, setActiveCell] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [, forceRender] = useState({});

  // --- 1. DYNAMIC VIEWPORT SIZING ---
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
          setViewport({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
      }
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const rowPoolSize = viewport.height > 0 ? Math.ceil(viewport.height / ROW_HEIGHT) + OVERSCAN : 0;
  const colPoolSize = viewport.width > 0 ? Math.ceil(viewport.width / COL_WIDTH) + OVERSCAN : 0;

  // --- THE VANILLA JS CORE ---
  const redrawVanillaDOM = useCallback((scrollTop, scrollLeft) => {
    if (!rowPoolSize || !colPoolSize) return;

    const startRow = Math.floor(scrollTop / ROW_HEIGHT);
    const startCol = Math.floor(scrollLeft / COL_WIDTH);

    if (bodyWrapperRef.current && headerWrapperRef.current) {
        bodyWrapperRef.current.style.transform = `translate3d(-${scrollLeft % COL_WIDTH}px, -${scrollTop % ROW_HEIGHT}px, 0)`;
        headerWrapperRef.current.style.transform = `translate3d(-${scrollLeft % COL_WIDTH}px, 0px, 0)`;
    }

    for (let r = 0; r < rowPoolSize; r++) {
      let offsetRow = r - (startRow % rowPoolSize);
      if (offsetRow < 0) offsetRow += rowPoolSize;
      
      const logicalRowIndex = startRow + offsetRow;
      const actualRowId = rowOrderMapRef.current[logicalRowIndex];
      const isVisibleRow = logicalRowIndex < TOTAL_ROWS;

      if (rowRefs.current[r]) {
          rowRefs.current[r].style.transform = `translate3d(0, ${offsetRow * ROW_HEIGHT}px, 0)`;
          rowRefs.current[r].style.display = isVisibleRow ? 'flex' : 'none';
          rowRefs.current[r].className = `absolute left-0 flex border-b border-gray-200 transition-none ${logicalRowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 w-full h-[${ROW_HEIGHT}px]`;
      }

      if (!isVisibleRow) continue;

      for (let c = 0; c < colPoolSize; c++) {
        let offsetCol = c - (startCol % colPoolSize);
        if (offsetCol < 0) offsetCol += colPoolSize;
        
        const logicalColIndex = startCol + offsetCol;
        const isVisibleCol = logicalColIndex < TOTAL_COLS;
        const cellKey = `${r}-${c}`;
        const cellNode = cellRefs.current[cellKey];
        
        if (!cellNode) continue;

        cellNode.style.transform = `translate3d(${offsetCol * COL_WIDTH}px, 0, 0)`;
        cellNode.style.display = isVisibleCol ? 'flex' : 'none';

        if (!isVisibleCol) continue;

        const dataCoord = `${actualRowId}-${logicalColIndex}`;
        if (cellNode.dataset.coord !== dataCoord) {
            cellNode.dataset.coord = dataCoord;
            cellNode.dataset.row = actualRowId;
            cellNode.dataset.col = logicalColIndex;
            
            const type = getColumnType(logicalColIndex);
            const rawValue = getCellData(actualRowId, logicalColIndex, editsRef);
            
            cellNode.innerHTML = generateCellHTML(type, rawValue);
            cellNode.className = `ag-cell absolute top-0 flex items-center px-3 overflow-hidden text-sm whitespace-nowrap border-r border-gray-200 h-full ${
                logicalColIndex === 0 ? 'font-bold bg-gray-100/90 text-gray-900 border-r-2 border-gray-300 z-10' : 'text-gray-700'
            } ${type === 'editable-text' || type === 'dropdown' || type === 'checkbox' ? 'cursor-pointer hover:bg-black/5' : ''}`;
        }
      }
    }

    for (let c = 0; c < colPoolSize; c++) {
        let offsetCol = c - (startCol % colPoolSize);
        if (offsetCol < 0) offsetCol += colPoolSize;
        
        const logicalColIndex = startCol + offsetCol;
        const headerNode = headerRefs.current[c];
        if (!headerNode) continue;

        headerNode.style.transform = `translate3d(${offsetCol * COL_WIDTH}px, 0, 0)`;
        headerNode.style.display = logicalColIndex < TOTAL_COLS ? 'flex' : 'none';

        if (logicalColIndex < TOTAL_COLS && headerNode.dataset.col != logicalColIndex) {
            headerNode.dataset.col = logicalColIndex;
            const title = getColTitle(logicalColIndex);
            
            const ruleIndex = sortRulesRef.current.findIndex(r => r.colIndex === logicalColIndex);
            const sortIcon = ruleIndex >= 0 
                ? `<span class="flex items-center text-xs ml-1 text-blue-400">${sortRulesRef.current[ruleIndex].dir === 'asc' ? '▲' : '▼'}${isMultiSortRef.current && sortRulesRef.current.length > 1 ? `<span class="ml-1 text-[10px] bg-blue-900 px-1 rounded-full">${ruleIndex + 1}</span>` : ''}</span>`
                : '';

            headerNode.innerHTML = `<div class="flex items-center justify-between w-full pointer-events-none"><span class="truncate">${title}</span>${sortIcon}</div>`;
            headerNode.className = `absolute top-0 h-full px-4 py-3 text-sm font-semibold tracking-wider border-b select-none transition-colors border-r border-gray-600 bg-gray-900 cursor-pointer hover:bg-gray-700 ${logicalColIndex === 0 ? 'text-white border-r-2 border-gray-500 z-10' : 'text-gray-200'}`;
        }
    }
  }, [rowPoolSize, colPoolSize]);

  useEffect(() => {
    if (rowPoolSize > 0 && colPoolSize > 0 && scrollContainerRef.current) {
        redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
    }
  }, [rowPoolSize, colPoolSize, redrawVanillaDOM]);


  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    let isScrolling = false;
    let scrollTimeout;

    const onScroll = () => {
        if (!isScrolling) {
            isScrolling = true;
            setActiveCell(null); 
            if (bodyWrapperRef.current) bodyWrapperRef.current.style.pointerEvents = 'none';
        }

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            if (bodyWrapperRef.current) bodyWrapperRef.current.style.pointerEvents = 'auto';
        }, 150);

        redrawVanillaDOM(el.scrollTop, el.scrollLeft);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [redrawVanillaDOM]);

  const executeSort = () => {
    startTransition(() => {
      const pointers = Array.from({ length: TOTAL_ROWS }, (_, i) => i);
      if (sortRulesRef.current.length > 0) {
        pointers.sort((rowA, rowB) => {
          for (let rule of sortRulesRef.current) {
            const valA = getCellData(rowA, rule.colIndex, editsRef);
            const valB = getCellData(rowB, rule.colIndex, editsRef);
            if (valA === valB) continue; 
            
            if (typeof valA === 'boolean' && typeof valB === 'boolean') {
              return rule.dir === 'asc' ? (valA === valB ? 0 : valA ? 1 : -1) : (valA === valB ? 0 : valA ? -1 : 1);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
               return rule.dir === 'asc' ? valA - valB : valB - valA;
            } else {
               return rule.dir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
            }
          }
          return 0;
        });
      }
      rowOrderMapRef.current = pointers;
      
      if (scrollContainerRef.current) {
          Object.values(cellRefs.current).forEach(node => { if(node) node.dataset.coord = ''; });
          Object.values(headerRefs.current).forEach(node => { if(node) node.dataset.col = ''; });
          redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
      }
      forceRender({}); 
    });
  };

  const handleTableClick = (e) => {
      const cellNode = e.target.closest('.ag-cell');
      if (!cellNode) return;
      
      const rowId = parseInt(cellNode.dataset.row);
      const colId = parseInt(cellNode.dataset.col);
      const type = getColumnType(colId);

      if (type === 'checkbox') {
          const currentVal = getCellData(rowId, colId, editsRef);
          editsRef.current[`${rowId}-${colId}`] = !currentVal;
          cellNode.dataset.coord = ''; 
          redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
          
          if (sortRulesRef.current.some(r => r.colIndex === colId)) executeSort();
          return;
      }

      if (type === 'editable-text' || type === 'dropdown') {
          setActiveCell({ rowId, colIndex: colId, type, rect: cellNode.getBoundingClientRect() });
      }
  };

  const handleHeaderClick = (e) => {
      const headerNode = e.target.closest('.border-b');
      if (!headerNode || !headerNode.dataset.col) return;
      
      const colIndex = parseInt(headerNode.dataset.col);
      if (getColumnType(colIndex) === 'chart' || getColumnType(colIndex) === 'tags') return;

      const rules = sortRulesRef.current;
      const existingIdx = rules.findIndex(r => r.colIndex === colIndex);

      if (!isMultiSortRef.current) {
         if (existingIdx >= 0) sortRulesRef.current = rules[existingIdx].dir === 'asc' ? [{ colIndex, dir: 'desc' }] : [];
         else sortRulesRef.current = [{ colIndex, dir: 'asc' }];
      } else {
         if (existingIdx >= 0) {
            if (rules[existingIdx].dir === 'asc') rules[existingIdx].dir = 'desc';
            else rules.splice(existingIdx, 1);
         } else rules.push({ colIndex, dir: 'asc' });
      }
      executeSort();
  };

  const handleEditorCommit = (value) => {
      if (!activeCell) return;
      editsRef.current[`${activeCell.rowId}-${activeCell.colIndex}`] = value;
      
      const nodeKey = Object.keys(cellRefs.current).find(key => cellRefs.current[key]?.dataset?.coord === `${activeCell.rowId}-${activeCell.colIndex}`);
      if (nodeKey && cellRefs.current[nodeKey]) {
         cellRefs.current[nodeKey].dataset.coord = ''; 
      }
      
      setActiveCell(null);
      if (scrollContainerRef.current) redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
      if (sortRulesRef.current.some(r => r.colIndex === activeCell.colIndex)) executeSort();
  };

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col p-6 font-sans box-border overflow-hidden">
      
      <div className="w-full flex-shrink-0 mb-4 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              isMultiSortRef.current = !isMultiSortRef.current;
              sortRulesRef.current = [];
              executeSort();
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              isMultiSortRef.current ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isMultiSortRef.current ? '✓ Multi-Sort Enabled' : 'Single Sort Mode'}
          </button>
        </div>
        {isPending && <span className="text-sm text-blue-600 font-medium animate-pulse">Applying Sort Engine...</span>}
      </div>

      <div className={`flex-1 bg-white rounded-xl shadow-xl border border-gray-300 flex flex-col overflow-hidden relative transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        
        {/* REACT ACTIVE EDITOR OVERLAY */}
        {activeCell && (
            <div 
                className="fixed z-50 bg-blue-50 flex items-center px-3"
                style={{
                    top: activeCell.rect.top, left: activeCell.rect.left, 
                    width: activeCell.rect.width, height: activeCell.rect.height,
                    boxShadow: 'inset 0 0 0 2px #3b82f6',
                    outline: 'none'
                }}
            >
                {activeCell.type === 'dropdown' ? (
                    <select autoFocus onBlur={(e) => handleEditorCommit(e.target.value)} defaultValue={getCellData(activeCell.rowId, activeCell.colIndex, editsRef)} className="w-full h-[28px] border border-blue-400 outline-none bg-white px-2 rounded text-[13px] text-gray-800 shadow-sm cursor-pointer">
                        <option value="Admin">Admin</option>
                        <option value="Editor">Editor</option>
                        <option value="Viewer">Viewer</option>
                    </select>
                ) : (
                    <input autoFocus onBlur={(e) => handleEditorCommit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} defaultValue={getCellData(activeCell.rowId, activeCell.colIndex, editsRef)} className="w-full h-[28px] border border-blue-400 outline-none bg-white px-2 rounded text-[13px] text-gray-800 shadow-sm" />
                )}
            </div>
        )}

        <div ref={scrollContainerRef} className="overflow-auto relative bg-white flex-1 select-none">
          <div style={{ width: `${TOTAL_COLS * COL_WIDTH}px`, height: `${(TOTAL_ROWS * ROW_HEIGHT) + 48}px`, position: 'absolute', top: 0, left: 0 }} />

          <div className="sticky top-0 left-0 overflow-hidden" style={{ width: '100%', height: '100%', zIndex: 10 }}>
             
             <div className="absolute top-0 left-0 right-0 h-[48px] bg-gray-900 z-20 shadow-md" onClick={handleHeaderClick}>
               <div ref={headerWrapperRef} className="relative w-full h-full" style={{ willChange: 'transform' }}>
                   {Array.from({ length: colPoolSize }).map((_, c) => (
                       <div key={c} ref={el => headerRefs.current[c] = el} className="hidden" style={{ width: `${COL_WIDTH}px`, height: '100%' }} />
                   ))}
               </div>
             </div>

             <div className="absolute top-[48px] left-0 right-0 bottom-0 bg-white z-10" onClick={handleTableClick}>
               <div ref={bodyWrapperRef} className="relative w-full h-full" style={{ willChange: 'transform' }}>
                   {Array.from({ length: rowPoolSize }).map((_, r) => (
                       <div key={r} ref={el => rowRefs.current[r] = el} className="hidden h-[44px]">
                           {Array.from({ length: colPoolSize }).map((_, c) => (
                               <div key={`${r}-${c}`} ref={el => cellRefs.current[`${r}-${c}`] = el} className="hidden" style={{ width: `${COL_WIDTH}px` }} />
                           ))}
                       </div>
                   ))}
               </div>
             </div>

          </div>
        </div>
        
        <div className="bg-gray-50 border-t border-gray-200 p-3 text-xs text-gray-500 flex justify-between z-30 shrink-0">
          <span>Matrix: {TOTAL_ROWS.toLocaleString()} Rows × {TOTAL_COLS} Cols</span>
          <span>Zero-React Render Cycle: Native innerHTML injection</span>
        </div>
      </div>
    </div>
  );
}