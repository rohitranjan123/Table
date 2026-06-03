import React, { useState, useMemo, useRef, useCallback, useTransition, useEffect } from 'react';

// --- CONFIGURATION ---
const DEFAULT_ROW_HEIGHT = 44; 
const HEADER_HEIGHT = 60; 
const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WIDTH = 50; 
const TOTAL_ROWS = 10000;
const TOTAL_COLS = 200; 
const OVERSCAN = 2; 

// Initial Dynamic Widths
const getInitialWidth = (col) => {
    if (col === 0) return 60; 
    if (col >= 6 && col <= 8) return 200; // Give dynamic text columns more default width
    if (col === TOTAL_COLS) return 150; 
    return DEFAULT_COL_WIDTH;
};

// --- MOCK DATA GENERATORS ---
const getColumnType = (colIndex) => {
  if (colIndex === 0) return 'row-select'; 
  if (colIndex === 1) return 'id';
  if (colIndex === TOTAL_COLS) return 'action'; 
  
  if (colIndex > 1) {
    if (colIndex === 6) return 'text-wrap';
    if (colIndex === 7) return 'text-ellipsis';
    if (colIndex === 8) return 'text-clip';
    
    if (colIndex % 6 === 0) return 'chart';
    if (colIndex % 4 === 0 && colIndex % 6 !== 0) return 'dropdown';
    if (colIndex % 5 === 0 && colIndex % 4 !== 0 && colIndex % 6 !== 0) return 'tags';
  }

  if (colIndex === 2) return 'avatar';
  if (colIndex === 3) return 'status';
  if (colIndex === 4) return 'checkbox';
  
  return 'editable-text';
};

const getColTitle = (colIndex) => {
  if (colIndex === TOTAL_COLS) return 'Action';
  const titles = ['', 'ID', 'Avatar', 'Status', 'Verified', 'Role', 'Wrap Text', 'Ellipsis Text', 'Clipped Text'];
  if (titles[colIndex] !== undefined) return titles[colIndex];
  if (colIndex === 10) return 'Gold';
  if (colIndex === 11) return 'Silver';
  if (colIndex === 12) return 'Bronze';
  if (colIndex === 50) return 'Revenue';
  if (colIndex === 51) return 'Profit';
  return `Metric ${colIndex}`;
};

const getColGroup = (colId) => {
  if (colId >= 10 && colId <= 12) return "Sports Results";
  if (colId >= 50 && colId <= 53) return "Financials";
  if (colId >= 80 && colId <= 81) return "Metadata";
  if (colId >= 100 && colId <= 109) return "Detailed Analytics";
  return null;
};

const getCellData = (rowIndex, colIndex, edits, selectedSet) => {
  if (colIndex === TOTAL_COLS) return null; 
  if (colIndex === 0) return selectedSet ? selectedSet.current.has(rowIndex) : false; 
  
  const editKey = `${rowIndex}-${colIndex}`;
  if (edits && edits.current && edits.current[editKey] !== undefined) return edits.current[editKey];

  if (colIndex === 1) return rowIndex;
  if (colIndex === 2) return `https://i.pravatar.cc/32?u=${rowIndex}`;
  if (colIndex === 3) return ['Active', 'Pending', 'Suspended', 'Banned'][rowIndex % 4];
  if (colIndex === 4) return rowIndex % 3 === 0;
  
  if (colIndex >= 6 && colIndex <= 8) {
      return `Detailed analysis and extended reporting metrics for record entry ${rowIndex} mapped precisely at coordinate bounds ${colIndex}. This text guarantees horizontal overflow constraint checks.`;
  }
  
  const type = getColumnType(colIndex);
  if (type === 'dropdown') return ['Admin', 'Editor', 'Viewer'][rowIndex % 3];
  if (type === 'tags') return ['React', 'UI/UX', 'Perf', 'Data'].slice(0, (rowIndex % 3) + 2);
  if (type === 'chart') return Array.from({length: 10}, (_, i) => 10 + Math.sin(rowIndex + i) * 8);
  
  return `Row ${rowIndex} - Col ${colIndex}`;
};

// --- AG GRID STRATEGY: VANILLA HTML STRING RENDERERS ---
const generateCellHTML = (type, value) => {
  if (type === 'row-select') return `<div style="display:flex; justify-content:center; width:100%;"><input type="checkbox" ${value ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #4f46e5; pointer-events: none;" /></div>`;
  if (type === 'action') return `<div style="display: flex; gap: 14px; justify-content: center; width: 100%; font-size: 16px;"><span data-action="preview" style="cursor: pointer;">👁️</span><span data-action="save" style="cursor: pointer;">💾</span><span data-action="delete" style="cursor: pointer; filter: grayscale(100%);">🗑️</span></div>`;
  if (type === 'avatar') return `<img src="${value}" alt="avatar" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #d1d5db; object-fit: cover;" />`;
  if (type === 'status') {
    const colors = { Active: 'background: #dcfce7; color: #166534', Pending: 'background: #fef9c3; color: #854d0e', Suspended: 'background: #fee2e2; color: #991b1b', Banned: 'background: #1f2937; color: #ffffff' };
    return `<span style="padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; ${colors[value] || 'background: #f3f4f6'}">${value}</span>`;
  }
  if (type === 'checkbox') return `<input type="checkbox" ${value ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #3b82f6; pointer-events: none;" />`;
  if (type === 'tags') return `<div style="display: flex; gap: 4px; overflow: hidden;">${value.map(t => `<span style="background: #1e293b; color: #93c5fd; border: 1px solid #3b82f6; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: bold; text-transform: uppercase;">${t}</span>`).join('')}</div>`;
  if (type === 'chart') return `<svg width="100%" height="24px" viewBox="0 0 90 24" style="overflow: visible;"><polyline points="${value.map((val, i) => `${i * 10},${24 - val}`).join(' ')}" style="fill: none; stroke: #3b82f6; stroke-width: 2px; stroke-linejoin: round; stroke-linecap: round;" /></svg>`;
  if (type === 'dropdown') return `<div style="width: 100%; height: 28px; position: relative;"><select style="width: 100%; height: 100%; border: 1px solid #d1d5db; border-radius: 4px; background-color: #f9fafb; padding: 0 8px; appearance: none; pointer-events: none; color: #374151; font-size: 13px;"><option>${value}</option></select><span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 10px; color: #9ca3af; pointer-events: none;">▼</span></div>`;
  
  if (type === 'text-wrap') return `<div style="width: 100%; white-space: normal; overflow-wrap: break-word; word-wrap: break-word; line-height: 1.4; padding: 8px 0;">${value}</div>`;
  if (type === 'text-ellipsis') return `<div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 8px 0;">${value}</div>`;
  if (type === 'text-clip') return `<div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: clip; padding: 8px 0;">${value}</div>`;

  if (type === 'editable-text') return `<div style="width: 100%; height: 28px;"><input type="text" value="${value}" readonly style="width: 100%; height: 100%; border: 1px solid #d1d5db; border-radius: 4px; background-color: #f9fafb; padding: 0 8px; pointer-events: none; color: #374151; font-size: 13px; overflow: hidden; text-overflow: ellipsis;" /></div>`;
  return `<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; display: block;">${value}</span>`;
};

// DOM CACHE HELPER
const setStyle = (node, prop, value) => { if (!node) return; if (node[`_${prop}`] !== value) { node.style[prop] = value; node[`_${prop}`] = value; } };
const setClass = (node, value) => { if (!node) return; if (node._class !== value) { node.className = value; node._class = value; } };

const EditorInput = ({ activeCell, getCellData, editsRef, selectedRowsRef, handleEditorCommit }) => {
    const inputRef = useRef(null);
    useEffect(() => { if (inputRef.current) inputRef.current.focus({ preventScroll: true }); }, []);
    const rawData = getCellData(activeCell.rowId, activeCell.colIndex, editsRef, selectedRowsRef);
    const safeStringValue = typeof rawData === 'object' && rawData !== null ? JSON.stringify(rawData) : String(rawData || '');
    
    if (activeCell.type === 'dropdown') {
        return (
            <select ref={inputRef} onChange={(e) => handleEditorCommit(e.target.value)} onBlur={(e) => handleEditorCommit(e.target.value)} defaultValue={safeStringValue} className="w-full h-full border border-blue-400 outline-none bg-white px-2 rounded text-[13px] text-gray-800 shadow-sm cursor-pointer">
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
            </select>
        );
    }
    return <input ref={inputRef} onBlur={(e) => handleEditorCommit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} defaultValue={safeStringValue} className="w-full h-full border border-blue-400 outline-none bg-white px-2 rounded text-[13px] text-gray-800 shadow-sm" />;
};

const ColumnFilterPopup = ({ activeFilter, closeFilter, filterRulesRef, executeDataPipeline, editsRef, selectedRowsRef }) => {
    const { colId, rect } = activeFilter;
    const existingRule = filterRulesRef.current[colId];
    const [searchText, setSearchText] = useState(existingRule?.text || '');
    
    const uniqueValues = useMemo(() => {
        const vals = new Set();
        for(let i = 0; i < Math.min(TOTAL_ROWS, 2000); i++) { 
             const val = getCellData(i, colId, editsRef, selectedRowsRef);
             if(val !== null && val !== undefined) vals.add(String(val));
        }
        return Array.from(vals).sort().slice(0, 100); 
    }, [colId, editsRef, selectedRowsRef]);

    const [selectedVals, setSelectedVals] = useState(existingRule?.values ? new Set(existingRule.values) : new Set(uniqueValues));

    const handleApply = () => {
        if (searchText.trim() === '' && selectedVals.size === uniqueValues.length) {
            delete filterRulesRef.current[colId]; 
        } else {
            filterRulesRef.current[colId] = { text: searchText, values: selectedVals };
        }
        executeDataPipeline();
        closeFilter();
    };

    const handleClear = () => {
        delete filterRulesRef.current[colId];
        executeDataPipeline();
        closeFilter();
    };

    return (
        <>
            <div className="fixed inset-0 z-[100]" onClick={closeFilter} />
            <div className="fixed z-[101] bg-slate-800 border border-slate-600 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-100" 
                 style={{ top: rect.bottom + 8, left: rect.left, width: 260 }}>
                
                <div className="bg-slate-900 px-3 py-2 text-xs font-bold text-gray-300 border-b border-slate-700 flex justify-between items-center">
                    Text Filter
                    <button onClick={handleClear} className="text-blue-400 hover:text-blue-300 text-[10px] uppercase">Clear</button>
                </div>
                
                <div className="p-3 flex flex-col gap-3">
                    <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">🔍</span>
                        <input 
                            autoFocus value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Contains..."
                            className="w-full bg-slate-900 border border-slate-600 rounded text-sm text-white px-3 py-1.5 pl-7 outline-none focus:border-blue-500" 
                        />
                    </div>
                    
                    <div className="h-40 overflow-y-auto border border-slate-700 rounded bg-slate-900/50 p-2 flex flex-col gap-1.5 custom-scrollbar">
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                            <input type="checkbox" checked={selectedVals.size === uniqueValues.length} onChange={(e) => setSelectedVals(e.target.checked ? new Set(uniqueValues) : new Set())} className="accent-blue-500" />
                            (Select All)
                        </label>
                        {uniqueValues.map(v => (
                            <label key={v} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white ml-1">
                                <input type="checkbox" checked={selectedVals.has(v)} onChange={(e) => {
                                    const next = new Set(selectedVals);
                                    if (e.target.checked) next.add(v); else next.delete(v);
                                    setSelectedVals(next);
                                }} className="accent-blue-500" />
                                <span className="truncate">{v}</span>
                            </label>
                        ))}
                    </div>
                    
                    <button onClick={handleApply} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-sm transition-colors shadow-lg">
                        Apply Filter
                    </button>
                </div>
            </div>
        </>
    );
};

// --- REACT PAGINATION COMPONENT ---
const PaginationUI = ({ current, pageSize, total, onChange }) => {
    const totalPages = Math.ceil(total / pageSize) || 1;
    const [jumpPage, setJumpPage] = useState('');

    const getPages = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (current <= 4) {
                for(let i=1; i<=5; i++) pages.push(i);
                pages.push('...'); pages.push(totalPages);
            } else if (current >= totalPages - 3) {
                pages.push(1); pages.push('...');
                for(let i=totalPages-4; i<=totalPages; i++) pages.push(i);
            } else {
                pages.push(1); pages.push('...');
                pages.push(current - 1); pages.push(current); pages.push(current + 1);
                pages.push('...'); pages.push(totalPages);
            }
        }
        return pages;
    };

    const handleJump = (e) => {
        if (e.key === 'Enter') {
            let p = parseInt(jumpPage, 10);
            if (!isNaN(p)) {
                if (p < 1) p = 1;
                if (p > totalPages) p = totalPages;
                onChange(p, pageSize);
            }
            setJumpPage('');
        }
    };

    return (
        <div className="flex items-center gap-3 text-sm text-gray-700 font-medium select-none">
            <div className="text-gray-500 mr-2">Total {total} items</div>
            
            <div className="flex items-center gap-1">
                <button disabled={current === 1} onClick={() => onChange(current - 1, pageSize)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 disabled:opacity-40 hover:border-blue-500 hover:text-blue-500 transition-colors bg-white shadow-sm">&lt;</button>
                {getPages().map((p, i) => (
                    <button key={i} disabled={p === '...'} onClick={() => p !== '...' && onChange(p, pageSize)}
                        className={`min-w-[32px] h-8 px-1 flex items-center justify-center rounded border shadow-sm ${p === current ? 'border-blue-500 text-blue-600 bg-blue-50 z-10' : p === '...' ? 'border-transparent cursor-default shadow-none' : 'border-gray-300 hover:border-blue-500 hover:text-blue-500 bg-white'} transition-colors`}
                    >
                        {p}
                    </button>
                ))}
                <button disabled={current === totalPages} onClick={() => onChange(current + 1, pageSize)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 disabled:opacity-40 hover:border-blue-500 hover:text-blue-500 transition-colors bg-white shadow-sm">&gt;</button>
            </div>
            
            <div className="relative border border-gray-300 rounded overflow-hidden hover:border-blue-500 transition-colors bg-white shadow-sm ml-2">
                <select value={pageSize} onChange={(e) => onChange(1, parseInt(e.target.value, 10))} className="h-8 px-2 outline-none cursor-pointer appearance-none bg-transparent pr-6 text-sm">
                    {[25, 50, 100, 500, 2000, 5000, 10000].map(sz => (<option key={sz} value={sz}>{sz} / page</option>))}
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-gray-500">▼</span>
            </div>

            <div className="flex items-center gap-2 ml-2">
                Go to <input type="text" value={jumpPage} onChange={e => setJumpPage(e.target.value)} onKeyDown={handleJump} className="w-12 h-8 border border-gray-300 rounded text-center outline-none focus:border-blue-500 transition-colors shadow-sm" /> Page
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const scrollContainerRef = useRef(null);
  
  const [activeCell, setActiveCell] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [, setRenderTick] = useState(0); 

  // Wrappers & Object Pools
  const scrollEnforcerRef = useRef(null);
  const headerCenterWrapperRef = useRef(null); const bodyCenterWrapperRef = useRef(null);
  const leftPaneHeaderRef = useRef(null); const leftPaneBodyRef = useRef(null); const bodyLeftWrapperRef = useRef(null);
  const centerPaneHeaderRef = useRef(null); const centerPaneBodyRef = useRef(null); 
  const rightPaneHeaderRef = useRef(null); const rightPaneBodyRef = useRef(null); const bodyRightWrapperRef = useRef(null);
  
  const rowCenterRefs = useRef([]); const cellCenterRefs = useRef({}); const headerCenterRefs = useRef([]); const groupCenterRefs = useRef([]);
  const rowLeftRefs = useRef([]); const cellLeftRefs = useRef({}); const headerLeftRefs = useRef([]); const groupLeftRefs = useRef([]);
  const rowRightRefs = useRef([]); const cellRightRefs = useRef({}); const headerRightRefs = useRef([]); const groupRightRefs = useRef([]);

  const editsRef = useRef({});
  const sortRulesRef = useRef([]);
  const filterRulesRef = useRef({}); 
  const isMultiSortRef = useRef(false);
  const selectedRowsRef = useRef(new Set());

  // --- DYNAMIC ROW HEIGHT ENGINE ---
  const rowHeightsRef = useRef(new Float64Array(TOTAL_ROWS).fill(DEFAULT_ROW_HEIGHT));
  const rowLayoutRef = useRef({ positions: new Float64Array(0), totalHeight: 0 });
  const requestRowRecalcRef = useRef(false);

  const fullDataMapRef = useRef(Array.from({ length: TOTAL_ROWS }, (_, i) => i));
  const rowOrderMapRef = useRef(Array.from({ length: 50 }, (_, i) => i)); 
  const paginationRef = useRef({ current: 1, pageSize: 50, total: TOTAL_ROWS });

  const [colOrder, setColOrder] = useState(() => Array.from({length: TOTAL_COLS + 1}, (_, i) => i));
  const collapsedGroupsRef = useRef({});
  const groupCountsRef = useRef({});
  const [collapsedGroupsTick, setCollapsedGroupsTick] = useState(0);
  const editorOpenedAtRef = useRef(0);
  
  const colWidthsRef = useRef({}); 
  const leftLayoutRef = useRef({ positions: [], totalWidth: 0, groups: [] });
  const centerLayoutRef = useRef({ positions: [], totalWidth: 0, groups: [] });
  const rightLayoutRef = useRef({ positions: [], totalWidth: 0, groups: [] });
  const dragRef = useRef({ isDragging: false, colId: null, startX: 0, startWidth: 0 });

  const [isPinned, setIsPinned] = useState(false);
  
  const { visibleColOrder } = useMemo(() => {
    const counts = {}; colOrder.forEach(c => { const g = getColGroup(c); if (g) counts[g] = (counts[g] || 0) + 1; });
    groupCountsRef.current = counts;
    const visible = []; const seen = new Set();
    colOrder.forEach(c => {
        const g = getColGroup(c);
        if (g && collapsedGroupsRef.current[g]) { if (!seen.has(g)) { visible.push(c); seen.add(g); } } 
        else visible.push(c);
    });
    return { visibleColOrder: visible };
  }, [colOrder, collapsedGroupsTick]);

  const { leftCols, rightCols, centerCols } = useMemo(() => {
    if (isPinned) {
        return {
            leftCols: visibleColOrder.filter(c => c === 0 || c === 1 || c === 5),
            rightCols: visibleColOrder.filter(c => c === TOTAL_COLS),
            centerCols: visibleColOrder.filter(c => c !== 0 && c !== 1 && c !== 5 && c !== TOTAL_COLS)
        };
    }
    return { leftCols: [], rightCols: [], centerCols: visibleColOrder };
  }, [isPinned, visibleColOrder]);

  const buildLayout = useCallback((cols) => {
      let total = 0; const pos = []; let currentGroup = null; let groupStartX = 0; let groupWidth = 0; const groups = [];
      for (let i = 0; i < cols.length; i++) {
          const c = cols[i]; pos.push(total);
          const w = colWidthsRef.current[c] || getInitialWidth(c);
          const gName = getColGroup(c);
          if (gName !== currentGroup) {
              if (currentGroup) groups.push({ name: currentGroup, left: groupStartX, width: groupWidth });
              currentGroup = gName; groupStartX = total; groupWidth = w;
          } else if (currentGroup) groupWidth += w;
          total += w;
      }
      if (currentGroup) groups.push({ name: currentGroup, left: groupStartX, width: groupWidth });
      return { positions: pos, totalWidth: total, groups };
  }, []);

  const recalcColLayouts = useCallback(() => {
      leftLayoutRef.current = buildLayout(leftCols);
      centerLayoutRef.current = buildLayout(centerCols);
      rightLayoutRef.current = buildLayout(rightCols);
  }, [leftCols, centerCols, rightCols, buildLayout]);

  const recalcRowLayout = useCallback(() => {
      let total = 0;
      const visibleLength = rowOrderMapRef.current.length;
      const pos = new Float64Array(visibleLength + 1);
      for (let i = 0; i < visibleLength; i++) {
          pos[i] = total;
          total += rowHeightsRef.current[rowOrderMapRef.current[i]] || DEFAULT_ROW_HEIGHT;
      }
      pos[visibleLength] = total;
      rowLayoutRef.current = { positions: pos, totalHeight: total };
  }, []);

  const updateShellDimensions = useCallback(() => {
      const leftW = leftLayoutRef.current.totalWidth; const centerW = centerLayoutRef.current.totalWidth; const rightW = rightLayoutRef.current.totalWidth;
      
      const totalH = rowLayoutRef.current.totalHeight + HEADER_HEIGHT; 
      setStyle(scrollEnforcerRef.current, 'width', `${leftW + centerW + rightW}px`);
      setStyle(scrollEnforcerRef.current, 'height', `${totalH}px`);
      
      setStyle(leftPaneHeaderRef.current, 'width', `${leftW}px`); setStyle(leftPaneBodyRef.current, 'width', `${leftW}px`);
      setStyle(rightPaneHeaderRef.current, 'width', `${rightW}px`); setStyle(rightPaneBodyRef.current, 'width', `${rightW}px`);
      if (centerPaneHeaderRef.current) { setStyle(centerPaneHeaderRef.current, 'left', `${leftW}px`); setStyle(centerPaneHeaderRef.current, 'right', `${rightW}px`); }
      if (centerPaneBodyRef.current) { setStyle(centerPaneBodyRef.current, 'left', `${leftW}px`); setStyle(centerPaneBodyRef.current, 'right', `${rightW}px`); }
      setStyle(headerCenterWrapperRef.current, 'width', `${centerW}px`); setStyle(bodyCenterWrapperRef.current, 'width', `${centerW}px`);
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver((entries) => { if (entries[0]) setViewport({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }); });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const rowPoolSize = viewport.height > 0 ? Math.ceil(viewport.height / DEFAULT_ROW_HEIGHT) + OVERSCAN : 0;
  const colPoolSize = viewport.width > 0 ? Math.ceil(viewport.width / MIN_COL_WIDTH) + OVERSCAN : 0;

  const populateDOMCell = useCallback((cellNode, actualRowId, actualColId) => {
      const type = getColumnType(actualColId);
      const isSel = selectedRowsRef.current.has(actualRowId);
      const dataCoord = type === 'row-select' ? `${actualRowId}-${actualColId}-${isSel}` : `${actualRowId}-${actualColId}`;
      if (cellNode.dataset.coord === dataCoord) return; 
      
      cellNode.dataset.coord = dataCoord; cellNode.dataset.row = actualRowId; cellNode.dataset.col = actualColId;
      cellNode.innerHTML = generateCellHTML(type, getCellData(actualRowId, actualColId, editsRef, selectedRowsRef));
      
      const isWrap = type === 'text-wrap';
      setClass(cellNode, `ag-cell absolute top-0 flex items-center px-3 overflow-hidden text-sm border-r border-gray-200 h-full transition-none ${isWrap ? '' : 'whitespace-nowrap'} ${actualColId === 1 ? 'font-bold bg-gray-100/90 text-gray-900 border-gray-300' : 'text-gray-700'} ${['editable-text', 'dropdown', 'checkbox', 'row-select'].includes(type) ? 'cursor-pointer hover:bg-black/5' : ''}`);

      if (isWrap) {
          cellNode.style.height = 'auto'; 
          const requiredHeight = Math.max(DEFAULT_ROW_HEIGHT, cellNode.scrollHeight);
          cellNode.style.height = '100%'; 
          
          if (Math.abs(requiredHeight - rowHeightsRef.current[actualRowId]) > 1) {
              rowHeightsRef.current[actualRowId] = requiredHeight;
              requestRowRecalcRef.current = true;
          }
      }
  }, []);

  const populateDOMHeader = useCallback((headerNode, actualColId) => {
      const colType = getColumnType(actualColId);
      const hasFilter = !!filterRulesRef.current[actualColId];
      const headerStateStr = colType === 'row-select' ? `${actualColId}-${selectedRowsRef.current.size}` : `${actualColId}-${hasFilter}`;
      if (headerNode.dataset.col === headerStateStr) return;
      
      headerNode.dataset.col = headerStateStr;
      headerNode.setAttribute('draggable', 'true');
      
      const hasGroup = !!getColGroup(actualColId);
      const isSortable = colType !== 'chart' && colType !== 'tags' && colType !== 'action' && colType !== 'row-select';
      const ruleIndex = sortRulesRef.current.findIndex(r => r.colIndex === actualColId);
      
      let headerContentHTML = '';
      if (colType === 'row-select') {
          const isAll = selectedRowsRef.current.size === fullDataMapRef.current.length && fullDataMapRef.current.length > 0;
          const isSome = selectedRowsRef.current.size > 0 && !isAll;
          const checkboxHtml = isSome 
              ? `<div style="width:16px;height:16px;background:#4f46e5;border-radius:2px;display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:2px;background:white;"></div></div>`
              : `<input type="checkbox" ${isAll ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #4f46e5; pointer-events: none;" />`;
          headerContentHTML = `<div class="flex items-center justify-center w-full h-full pointer-events-none group">${checkboxHtml}</div>`;
      } else {
          let sortIcon = '';
          if (ruleIndex >= 0) sortIcon = `<span class="flex items-center text-xs ml-1 text-blue-400 pointer-events-none">${sortRulesRef.current[ruleIndex].dir === 'asc' ? '▲' : '▼'}</span>`;
          else if (isSortable) sortIcon = `<span class="flex items-center text-xs ml-1 text-gray-500 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none">↕</span>`;
          
          let filterIcon = '';
          if (isSortable || colType === 'tags') {
              filterIcon = `<svg class="filter-icon w-3 h-3 ml-2 hover:text-blue-300 transition-colors cursor-pointer ${hasFilter ? 'text-blue-400' : 'text-slate-500 opacity-40 group-hover:opacity-100'}" style="pointer-events: auto;" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V6.58579C21 6.851 20.8946 7.10536 20.7071 7.29289L14 14V20.5C14 20.8978 13.5826 21.1447 13.2361 20.9715L10.2361 19.4715C10.0911 19.399 10 19.2536 10 19V14L3.29289 7.29289C3.10536 7.10536 3 6.851 3 6.58579V4Z"/></svg>`;
          }

          headerContentHTML = `<div class="flex items-center justify-between w-full h-full pointer-events-none group pr-3"><span class="truncate">${getColTitle(actualColId)}</span><div class="flex items-center pointer-events-auto">${filterIcon}${sortIcon}</div></div>`;
      }

      headerNode.innerHTML = `${headerContentHTML}<div class="resize-handle hover:bg-blue-500 hover:opacity-100 opacity-0 transition-opacity" data-col="${actualColId}" style="position: absolute; right: 0; top: 0; width: 6px; height: 100%; cursor: col-resize; z-index: 100; pointer-events: auto;"></div>`;
      setStyle(headerNode, 'top', hasGroup ? '24px' : '0px'); setStyle(headerNode, 'height', hasGroup ? '36px' : '60px');
      setClass(headerNode, `ag-header-cell absolute ${colType === 'row-select' ? 'px-0' : 'pl-3'} text-[12px] font-semibold tracking-wide border-b select-none transition-none border-r border-gray-700 bg-slate-800 ${actualColId === TOTAL_COLS ? 'text-center text-blue-300' : isSortable ? 'cursor-grab hover:bg-slate-700' : ''} text-gray-200`);
  }, []);

  // --- CORE VANILLA REDRAW ENGINE ---
  const redrawVanillaDOM = useCallback((scrollTop, scrollLeft) => {
    if (!rowPoolSize || !colPoolSize) return;

    const roundedScrollTop = Math.max(0, Math.round(scrollTop));
    const roundedScrollLeft = Math.max(0, Math.round(scrollLeft));
    
    const rowPosArr = rowLayoutRef.current.positions;
    let startRow = 0;
    for (let i = 0; i < rowPosArr.length; i++) { if (rowPosArr[i] > roundedScrollTop) break; startRow = i; }

    const centerPosArr = centerLayoutRef.current.positions;
    let startCol = 0;
    for (let i = 0; i < centerPosArr.length; i++) { if (centerPosArr[i] > roundedScrollLeft) break; startCol = i; }

    const centerStartX = centerPosArr[startCol] || 0;
    const subPixelX = roundedScrollLeft - centerStartX;

    setStyle(bodyCenterWrapperRef.current, 'transform', `translate3d(-${roundedScrollLeft}px, -${roundedScrollTop}px, 0)`);
    setStyle(headerCenterWrapperRef.current, 'transform', `translate3d(-${roundedScrollLeft}px, 0px, 0)`);
    setStyle(bodyLeftWrapperRef.current, 'transform', `translate3d(0, -${roundedScrollTop}px, 0)`);
    setStyle(bodyRightWrapperRef.current, 'transform', `translate3d(0, -${roundedScrollTop}px, 0)`);

    // 1. ROWS & CELLS
    for (let r = 0; r < rowPoolSize; r++) {
      let offsetRow = r - (startRow % rowPoolSize);
      if (offsetRow < 0) offsetRow += rowPoolSize;
      const logicalRowIndex = startRow + offsetRow;
      const actualRowId = rowOrderMapRef.current[logicalRowIndex];
      const isVisibleRow = logicalRowIndex < rowOrderMapRef.current.length;
      
      const absoluteRowY = rowPosArr[logicalRowIndex] || 0;
      const rowHeight = rowHeightsRef.current[actualRowId] || DEFAULT_ROW_HEIGHT;
      const rowYTransform = `translate3d(0, ${absoluteRowY}px, 0)`;
      
      const bgClass = selectedRowsRef.current.has(actualRowId) ? 'bg-indigo-50/80 border-indigo-200 hover:bg-indigo-100' : (logicalRowIndex % 2 === 0 ? 'bg-white border-gray-200' : 'bg-gray-50/50 border-gray-200');
      const rowClass = `absolute left-0 flex border-b transition-none hover:bg-blue-50/50 w-full ${bgClass}`;
      const rowDisplay = isVisibleRow ? 'flex' : 'none';

      [rowCenterRefs.current[r], rowLeftRefs.current[r], rowRightRefs.current[r]].forEach(rowNode => {
          if (rowNode) { 
              setStyle(rowNode, 'transform', rowYTransform); 
              setStyle(rowNode, 'height', `${rowHeight}px`); 
              setStyle(rowNode, 'display', rowDisplay); 
              setClass(rowNode, rowClass); 
          }
      });

      if (!isVisibleRow) continue;

      for (let c = 0; c < colPoolSize; c++) {
        let offsetCol = c - (startCol % colPoolSize); if (offsetCol < 0) offsetCol += colPoolSize;
        const logicalColIndex = startCol + offsetCol; const isVisibleCol = logicalColIndex < centerCols.length;
        const cellNode = cellCenterRefs.current[`${r}-${c}`];
        if (!cellNode) continue;
        setStyle(cellNode, 'transform', `translate3d(${centerPosArr[logicalColIndex] || 0}px, 0, 0)`);
        setStyle(cellNode, 'width', `${colWidthsRef.current[centerCols[logicalColIndex]] || getInitialWidth(centerCols[logicalColIndex])}px`);
        setStyle(cellNode, 'display', isVisibleCol ? 'flex' : 'none');
        if (isVisibleCol) populateDOMCell(cellNode, actualRowId, centerCols[logicalColIndex]);
      }
      for (let c = 0; c < leftCols.length; c++) {
          const cellNode = cellLeftRefs.current[`${r}-${c}`]; if (!cellNode) continue;
          setStyle(cellNode, 'transform', `translate3d(${leftLayoutRef.current.positions[c]}px, 0, 0)`);
          setStyle(cellNode, 'width', `${colWidthsRef.current[leftCols[c]] || getInitialWidth(leftCols[c])}px`);
          populateDOMCell(cellNode, actualRowId, leftCols[c]);
      }
      for (let c = 0; c < rightCols.length; c++) {
          const cellNode = cellRightRefs.current[`${r}-${c}`]; if (!cellNode) continue;
          setStyle(cellNode, 'transform', `translate3d(${rightLayoutRef.current.positions[c]}px, 0, 0)`);
          setStyle(cellNode, 'width', `${colWidthsRef.current[rightCols[c]] || getInitialWidth(rightCols[c])}px`);
          populateDOMCell(cellNode, actualRowId, rightCols[c]);
      }
    }

    // 2. HEADERS
    for (let c = 0; c < colPoolSize; c++) {
        let offsetCol = c - (startCol % colPoolSize); if (offsetCol < 0) offsetCol += colPoolSize;
        const logicalColIndex = startCol + offsetCol; const headerNode = headerCenterRefs.current[c];
        if (!headerNode) continue;
        setStyle(headerNode, 'transform', `translate3d(${centerPosArr[logicalColIndex] || 0}px, 0, 0)`);
        setStyle(headerNode, 'width', `${colWidthsRef.current[centerCols[logicalColIndex]] || getInitialWidth(centerCols[logicalColIndex])}px`);
        setStyle(headerNode, 'display', logicalColIndex < centerCols.length ? 'flex' : 'none');
        if (logicalColIndex < centerCols.length) populateDOMHeader(headerNode, centerCols[logicalColIndex]);
    }
    for (let c = 0; c < leftCols.length; c++) {
        const headerNode = headerLeftRefs.current[c]; if (!headerNode) continue;
        setStyle(headerNode, 'transform', `translate3d(${leftLayoutRef.current.positions[c]}px, 0, 0)`);
        setStyle(headerNode, 'width', `${colWidthsRef.current[leftCols[c]] || getInitialWidth(leftCols[c])}px`); populateDOMHeader(headerNode, leftCols[c]);
    }
    for (let c = 0; c < rightCols.length; c++) {
        const headerNode = headerRightRefs.current[c]; if (!headerNode) continue;
        setStyle(headerNode, 'transform', `translate3d(${rightLayoutRef.current.positions[c]}px, 0, 0)`);
        setStyle(headerNode, 'width', `${colWidthsRef.current[rightCols[c]] || getInitialWidth(rightCols[c])}px`); populateDOMHeader(headerNode, rightCols[c]);
    }

    // 3. SPANNING GROUP HEADERS
    const updateGroups = (layout, refs) => {
        const visibleGroups = layout.groups;
        for (let i = 0; i < 30; i++) {
            const node = refs.current[i]; if (!node) continue;
            const g = visibleGroups[i];
            if (g) {
                setStyle(node, 'display', 'flex'); setStyle(node, 'transform', `translate3d(${g.left}px, 0, 0)`); setStyle(node, 'width', `${g.width}px`);
                const isCollapsed = collapsedGroupsRef.current[g.name]; const count = groupCountsRef.current[g.name] || 0;
                const newHtmlKey = `${g.name}-${isCollapsed}-${count}`; 
                if (node.dataset.name !== newHtmlKey) {
                    node.dataset.name = newHtmlKey; const icon = isCollapsed ? '➕' : '➖';
                    const extraHtml = isCollapsed && count > 1 ? `<span class="ml-2 text-[10px] bg-blue-900/60 text-blue-300 font-bold px-1.5 py-[1px] rounded-full border border-blue-700/50">+${count - 1}</span>` : '';
                    node.innerHTML = `<div class="w-full h-full flex items-center px-3 text-[12px] text-gray-300 font-bold border-b border-r border-gray-700 bg-slate-900 justify-between"><div class="flex items-center collapse-trigger cursor-pointer hover:text-white transition-colors" data-group="${g.name}"><span class="mr-2 text-[10px] bg-slate-700 hover:bg-slate-600 rounded px-1 leading-none py-[2px] flex items-center justify-center">${icon}</span><span>${g.name}</span>${extraHtml}</div></div>`;
                }
            } else { setStyle(node, 'display', 'none'); }
        }
    };
    updateGroups(centerLayoutRef.current, groupCenterRefs); updateGroups(leftLayoutRef.current, groupLeftRefs); updateGroups(rightLayoutRef.current, groupRightRefs);

    // FLUSH ASYNC DYNAMIC ROW HEIGHT CALCULATIONS
    if (requestRowRecalcRef.current) {
        requestRowRecalcRef.current = false;
        recalcRowLayout();
        updateShellDimensions();
        requestAnimationFrame(() => {
            if (scrollContainerRef.current) redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
        });
    }

  }, [rowPoolSize, colPoolSize, centerCols, leftCols, rightCols, populateDOMCell, populateDOMHeader]);


  useEffect(() => {
      recalcRowLayout();
      recalcColLayouts(); updateShellDimensions();
      [cellCenterRefs, cellLeftRefs, cellRightRefs].forEach(ref => Object.values(ref.current).forEach(n => { if (n) n.dataset.coord = 'INVALID'; }));
      [headerCenterRefs, headerLeftRefs, headerRightRefs].forEach(ref => Object.values(ref.current).forEach(n => { if (n) n.dataset.col = 'INVALID'; }));
      if (rowPoolSize > 0 && colPoolSize > 0 && scrollContainerRef.current) redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
  }, [isPinned, colOrder, collapsedGroupsTick, rowPoolSize, colPoolSize, recalcColLayouts, recalcRowLayout, updateShellDimensions, redrawVanillaDOM]);

  useEffect(() => {
      let rafId;
      const handleMouseMove = (e) => {
          if (!dragRef.current.isDragging) return;
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
              const { colId, startX, startWidth } = dragRef.current;
              colWidthsRef.current[colId] = Math.max(MIN_COL_WIDTH, Math.round(startWidth + (e.clientX - startX)));
              recalcColLayouts(); updateShellDimensions();
              if (scrollContainerRef.current) redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
          });
      };
      const handleMouseUp = () => {
          if (dragRef.current.isDragging) {
              dragRef.current.isDragging = false;
              document.body.style.cursor = ''; document.body.classList.remove('is-resizing-col');
              
              // Force text wrap measurement to re-calculate instantly upon dropping a column resize border
              [cellCenterRefs, cellLeftRefs, cellRightRefs].forEach(ref => Object.values(ref.current).forEach(n => { if (n) n.dataset.coord = 'INVALID'; }));
              if (scrollContainerRef.current) redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
              
              setRenderTick(t => t + 1); 
          }
      };
      document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
      return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); }
  }, [recalcColLayouts, updateShellDimensions, redrawVanillaDOM]);

  useEffect(() => {
    const el = scrollContainerRef.current; if (!el) return;
    let isScrolling = false; let scrollTimeout;
    const onScroll = () => {
        if (!isScrolling) {
            isScrolling = true;
            if (Date.now() - editorOpenedAtRef.current > 150) setActiveCell(null); 
            if (bodyCenterWrapperRef.current) setStyle(bodyCenterWrapperRef.current, 'pointerEvents', 'none');
            if (bodyLeftWrapperRef.current) setStyle(bodyLeftWrapperRef.current, 'pointerEvents', 'none');
            if (bodyRightWrapperRef.current) setStyle(bodyRightWrapperRef.current, 'pointerEvents', 'none');
        }
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            if (bodyCenterWrapperRef.current) setStyle(bodyCenterWrapperRef.current, 'pointerEvents', 'auto');
            if (bodyLeftWrapperRef.current) setStyle(bodyLeftWrapperRef.current, 'pointerEvents', 'auto');
            if (bodyRightWrapperRef.current) setStyle(bodyRightWrapperRef.current, 'pointerEvents', 'auto');
        }, 150);
        redrawVanillaDOM(el.scrollTop, el.scrollLeft);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [redrawVanillaDOM]);

  // --- 4. ADVANCED DATA PIPELINE (FILTER, SORT, PAGINATE) ---
  const applyPagination = useCallback((page, size, fullArray) => {
      const start = (page - 1) * size;
      const end = start + size;
      rowOrderMapRef.current = fullArray.slice(start, end);
      paginationRef.current = { current: page, pageSize: size, total: fullArray.length };
      
      recalcRowLayout();
      
      // FIX: Explicitly call updateShellDimensions when the pagination changes
      // This immediately shrinks/grows the physical height of the scrollbar wrapper, eliminating blank space!
      updateShellDimensions(); 
      
      if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0; 
          [cellCenterRefs, cellLeftRefs, cellRightRefs].forEach(ref => Object.values(ref.current).forEach(n => { if (n) n.dataset.coord = 'INVALID'; }));
          [headerCenterRefs, headerLeftRefs, headerRightRefs].forEach(ref => Object.values(ref.current).forEach(n => { if (n) n.dataset.col = 'INVALID'; }));
          redrawVanillaDOM(0, scrollContainerRef.current.scrollLeft);
      }
      setRenderTick(t => t + 1);
  }, [redrawVanillaDOM, recalcRowLayout, updateShellDimensions]);

  const executeDataPipeline = useCallback(() => {
    startTransition(() => {
      let pointers = Array.from({ length: TOTAL_ROWS }, (_, i) => i);
      
      if (Object.keys(filterRulesRef.current).length > 0) {
          pointers = pointers.filter(rowId => {
              for (const [colIdStr, rule] of Object.entries(filterRulesRef.current)) {
                  const colId = parseInt(colIdStr);
                  const rawVal = getCellData(rowId, colId, editsRef, selectedRowsRef);
                  const strVal = String(rawVal === null || rawVal === undefined ? '' : rawVal).toLowerCase();
                  
                  if (rule.text && !strVal.includes(rule.text.toLowerCase())) return false;
                  if (rule.values && rule.values.size > 0) {
                      if (!rule.values.has(String(rawVal))) return false;
                  }
              }
              return true;
          });
      }

      if (sortRulesRef.current.length > 0) {
        pointers.sort((rowA, rowB) => {
          for (let rule of sortRulesRef.current) {
            const valA = getCellData(rowA, rule.colIndex, editsRef, selectedRowsRef);
            const valB = getCellData(rowB, rule.colIndex, editsRef, selectedRowsRef);
            if (valA === valB) continue; 
            if (typeof valA === 'boolean' && typeof valB === 'boolean') return rule.dir === 'asc' ? (valA === valB ? 0 : valA ? 1 : -1) : (valA === valB ? 0 : valA ? -1 : 1);
            if (typeof valA === 'number' && typeof valB === 'number') return rule.dir === 'asc' ? valA - valB : valB - valA;
            return rule.dir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
          }
          return 0;
        });
      }
      
      fullDataMapRef.current = pointers;
      applyPagination(1, paginationRef.current.pageSize, pointers);
    });
  }, [applyPagination]);

  const handleTableMouseDown = (e) => {
      if (e.target.classList.contains('resize-handle')) {
          e.stopPropagation(); e.preventDefault(); 
          const colId = parseInt(e.target.dataset.col);
          dragRef.current = { isDragging: true, colId, startX: e.clientX, startWidth: colWidthsRef.current[colId] || getInitialWidth(colId) };
          document.body.style.cursor = 'col-resize'; document.body.classList.add('is-resizing-col');
          return;
      }
  };

  const handleTableClick = useCallback((e) => {
      const collapseTrigger = e.target.closest('.collapse-trigger');
      if (collapseTrigger) {
          e.stopPropagation();
          collapsedGroupsRef.current[collapseTrigger.dataset.group] = !collapsedGroupsRef.current[collapseTrigger.dataset.group];
          setCollapsedGroupsTick(t => t + 1);
          return;
      }

      const filterIcon = e.target.closest('.filter-icon');
      if (filterIcon) {
          e.stopPropagation();
          const headerNode = e.target.closest('.ag-header-cell');
          if (headerNode) {
              const rect = filterIcon.getBoundingClientRect();
              setActiveFilter({ colId: parseInt(headerNode.dataset.col), rect });
          }
          return;
      }

      const cellNode = e.target.closest('.ag-cell');
      if (cellNode) {
          const rowId = parseInt(cellNode.dataset.row); const colId = parseInt(cellNode.dataset.col); const type = getColumnType(colId);
          if (type === 'row-select') {
              if (selectedRowsRef.current.has(rowId)) selectedRowsRef.current.delete(rowId); else selectedRowsRef.current.add(rowId);
              redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft); setRenderTick(t => t + 1); return;
          }
          if (type === 'action') {
              const actionBtn = e.target.closest('[data-action]');
              if (actionBtn) {
                  const msg = document.createElement('div'); msg.className = "fixed bottom-10 right-10 bg-indigo-900 text-white px-6 py-3 rounded-lg shadow-2xl font-bold z-[100] animate-bounce";
                  msg.innerText = `${actionBtn.dataset.action.toUpperCase()} triggered for Record ID: ${rowId}`; document.body.appendChild(msg); setTimeout(() => document.body.removeChild(msg), 2000);
              }
              return;
          }
          if (type === 'checkbox') {
              editsRef.current[`${rowId}-${colId}`] = !getCellData(rowId, colId, editsRef, selectedRowsRef);
              cellNode.dataset.coord = 'INVALID'; redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
              if (sortRulesRef.current.some(r => r.colIndex === colId)) executeDataPipeline();
              return;
          }
          if (type === 'editable-text' || type === 'dropdown') {
              editorOpenedAtRef.current = Date.now();
              setActiveCell({ rowId, colIndex: colId, type, rect: cellNode.getBoundingClientRect() });
          }
      }

      const headerNode = e.target.closest('.ag-header-cell');
      if (headerNode && headerNode.dataset.col) {
          if (e.target.classList.contains('resize-handle')) return;
          const colIndex = parseInt(headerNode.dataset.col); const colType = getColumnType(colIndex);
          if (colType === 'row-select') {
              if (selectedRowsRef.current.size === fullDataMapRef.current.length) selectedRowsRef.current.clear();
              else { for (let i of fullDataMapRef.current) selectedRowsRef.current.add(i); }
              redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft); setRenderTick(t => t + 1); return;
          }
          if (colType === 'chart' || colType === 'tags' || colType === 'action') return;

          const existingIdx = sortRulesRef.current.findIndex(r => r.colIndex === colIndex);
          if (!isMultiSortRef.current) sortRulesRef.current = existingIdx >= 0 && sortRulesRef.current[existingIdx].dir === 'asc' ? [{ colIndex, dir: 'desc' }] : [{ colIndex, dir: 'asc' }];
          else {
             if (existingIdx >= 0) {
                if (sortRulesRef.current[existingIdx].dir === 'asc') sortRulesRef.current[existingIdx].dir = 'desc';
                else sortRulesRef.current.splice(existingIdx, 1);
             } else sortRulesRef.current.push({ colIndex, dir: 'asc' });
          }
          executeDataPipeline();
      }
  }, [redrawVanillaDOM, executeDataPipeline]);

  const handleEditorCommit = (value) => {
      if (!activeCell) return;
      editsRef.current[`${activeCell.rowId}-${activeCell.colIndex}`] = value;
      [cellCenterRefs.current, cellLeftRefs.current, cellRightRefs.current].forEach(pane => {
          const nodeKey = Object.keys(pane).find(k => pane[k]?.dataset?.coord === `${activeCell.rowId}-${activeCell.colIndex}`);
          if (nodeKey && pane[nodeKey]) pane[nodeKey].dataset.coord = 'INVALID'; 
      });
      setActiveCell(null);
      if (scrollContainerRef.current) redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
      if (sortRulesRef.current.some(r => r.colIndex === activeCell.colIndex)) executeDataPipeline();
  };

  const handleDragStart = (e) => {
      const headerNode = e.target.closest('.ag-header-cell');
      if (headerNode && headerNode.dataset.col) { e.dataTransfer.setData('text/plain', headerNode.dataset.col); e.dataTransfer.effectAllowed = 'move'; headerNode.style.opacity = '0.5'; }
  };
  const handleDragOver = (e) => {
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      const headerNode = e.target.closest('.ag-header-cell');
      if (headerNode) { document.querySelectorAll('.ag-header-cell').forEach(el => el.classList.remove('border-l-4', 'border-blue-500')); headerNode.classList.add('border-l-4', 'border-blue-500'); }
  };
  const handleDragEnd = (e) => {
      const headerNode = e.target.closest('.ag-header-cell');
      if (headerNode) headerNode.style.opacity = '1';
      document.querySelectorAll('.ag-header-cell').forEach(el => el.classList.remove('border-l-4', 'border-blue-500'));
  };
  const handleDrop = (e) => {
      e.preventDefault(); document.querySelectorAll('.ag-header-cell').forEach(el => el.classList.remove('border-l-4', 'border-blue-500'));
      const sourceCol = parseInt(e.dataTransfer.getData('text/plain')); const targetNode = e.target.closest('.ag-header-cell');
      
      if (targetNode && targetNode.dataset.col) {
          const targetCol = parseInt(targetNode.dataset.col);
          if (!isNaN(sourceCol) && sourceCol !== targetCol) {
              setColOrder(prev => {
                  const newOrder = [...prev]; const idxA = newOrder.indexOf(sourceCol); const idxB = newOrder.indexOf(targetCol);
                  if (idxA !== -1 && idxB !== -1) { newOrder[idxA] = targetCol; newOrder[idxB] = sourceCol; } return newOrder;
              });
          }
      }
  };

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col p-6 font-sans box-border overflow-hidden">
      <style>{`.is-resizing-col * { user-select: none !important; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 4px; }`}</style>

      <div className="w-full flex-shrink-0 mb-4 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-300">
        <div className="flex items-center gap-4">
          <button onClick={() => { isMultiSortRef.current = !isMultiSortRef.current; sortRulesRef.current = []; executeDataPipeline(); }} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${isMultiSortRef.current ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {isMultiSortRef.current ? '✓ Multi-Sort Enabled' : 'Single Sort Mode'}
          </button>
          <button onClick={() => setIsPinned(!isPinned)} className={`px-4 py-2 rounded-lg font-bold transition-all shadow-sm ${isPinned ? 'bg-blue-600 text-white' : 'bg-white border-2 border-blue-600 text-blue-700 hover:bg-blue-50'}`}>
            📌 {isPinned ? 'Unpin Columns' : 'Pin Columns'}
          </button>
          <span className="text-sm text-gray-500 ml-4 border-l-2 pl-4 border-gray-300">
             Scrollbar adjusts flawlessly when changing the pagination size below!
          </span>
        </div>
        {isPending && <span className="text-sm text-blue-600 font-medium animate-pulse">Running Data Pipeline...</span>}
      </div>

      <div className={`flex-1 bg-white rounded-xl shadow-xl border border-gray-300 flex flex-col overflow-hidden relative transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        
        {/* REACT ACTIVE CELL EDITOR OVERLAY */}
        {activeCell && (
            <div className="fixed z-50 bg-blue-50 flex items-center px-2" style={{ top: activeCell.rect.top, left: activeCell.rect.left, width: activeCell.rect.width, height: activeCell.rect.height, boxShadow: 'inset 0 0 0 2px #3b82f6', outline: 'none' }}>
                 <EditorInput activeCell={activeCell} getCellData={getCellData} editsRef={editsRef} selectedRowsRef={selectedRowsRef} handleEditorCommit={handleEditorCommit} />
            </div>
        )}

        {/* REACT COLUMN FILTER OVERLAY */}
        {activeFilter && (
            <ColumnFilterPopup 
                activeFilter={activeFilter} closeFilter={() => setActiveFilter(null)} filterRulesRef={filterRulesRef} 
                executeDataPipeline={executeDataPipeline} editsRef={editsRef} selectedRowsRef={selectedRowsRef} 
            />
        )}

        <div ref={scrollContainerRef} className="overflow-auto relative bg-white flex-1 select-none">
          <div ref={scrollEnforcerRef} style={{ position: 'absolute', top: 0, left: 0 }} />

          <div className="sticky top-0 left-0 overflow-hidden" style={{ width: '100%', height: '100%', zIndex: 10 }} onMouseDown={handleTableMouseDown} onClick={handleTableClick} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}>
             
             {/* --- HEADERS --- */}
             <div className={`absolute top-0 left-0 right-0 h-[${HEADER_HEIGHT}px] z-20 shadow-md bg-slate-800`}>
               <div ref={leftPaneHeaderRef} className={`absolute left-0 top-0 h-full bg-slate-900 z-30 transition-none ${isPinned ? 'shadow-[4px_0_10px_rgba(0,0,0,0.5)] border-r-2 border-blue-500' : ''}`} style={{ display: isPinned ? 'block' : 'none' }}>
                   {Array.from({ length: 10 }).map((_, g) => <div key={`g-${g}`} ref={el => groupLeftRefs.current[g] = el} className="hidden transition-none absolute top-0 h-[24px]" />)}
                   {leftCols.map((_, i) => <div key={i} ref={el => headerLeftRefs.current[i] = el} className="hidden transition-none" style={{ height: '100%' }} />)}
               </div>
               
               <div ref={centerPaneHeaderRef} className="absolute top-0 h-full bg-slate-900 overflow-hidden transition-none">
                   <div ref={headerCenterWrapperRef} className="relative w-full h-full transition-none" style={{ willChange: 'transform' }}>
                       {Array.from({ length: 30 }).map((_, g) => <div key={`g-${g}`} ref={el => groupCenterRefs.current[g] = el} className="hidden transition-none absolute top-0 h-[24px]" />)}
                       {Array.from({ length: colPoolSize }).map((_, c) => <div key={c} ref={el => headerCenterRefs.current[c] = el} className="hidden transition-none" style={{ height: '100%' }} />)}
                   </div>
               </div>

               <div ref={rightPaneHeaderRef} className={`absolute right-0 top-0 h-full bg-slate-900 z-30 transition-none ${isPinned ? 'shadow-[-4px_0_10px_rgba(0,0,0,0.5)] border-l-2 border-blue-500' : ''}`} style={{ display: isPinned ? 'block' : 'none' }}>
                   {Array.from({ length: 10 }).map((_, g) => <div key={`g-${g}`} ref={el => groupRightRefs.current[g] = el} className="hidden transition-none absolute top-0 h-[24px]" />)}
                   {rightCols.map((_, i) => <div key={i} ref={el => headerRightRefs.current[i] = el} className="hidden transition-none" style={{ height: '100%' }} />)}
               </div>
             </div>

             {/* --- BODY --- */}
             <div className={`absolute top-[${HEADER_HEIGHT}px] left-0 right-0 bottom-0 z-10 transition-none`}>
               <div ref={leftPaneBodyRef} className={`absolute left-0 top-0 h-full bg-white z-30 transition-none ${isPinned ? 'shadow-[4px_0_10px_rgba(0,0,0,0.05)] border-r-2 border-blue-500' : ''}`} style={{ display: isPinned ? 'block' : 'none' }}>
                   <div ref={bodyLeftWrapperRef} className="relative w-full h-full transition-none" style={{ willChange: 'transform' }}>
                       {Array.from({ length: rowPoolSize }).map((_, r) => (
                           <div key={r} ref={el => rowLeftRefs.current[r] = el} className="hidden transition-none">
                               {leftCols.map((_, c) => <div key={`${r}-${c}`} ref={el => cellLeftRefs.current[`${r}-${c}`] = el} className="hidden transition-none" />)}
                           </div>
                       ))}
                   </div>
               </div>

               <div ref={centerPaneBodyRef} className="absolute top-0 h-full bg-white overflow-hidden transition-none">
                   <div ref={bodyCenterWrapperRef} className="relative w-full h-full transition-none" style={{ willChange: 'transform' }}>
                       {Array.from({ length: rowPoolSize }).map((_, r) => (
                           <div key={r} ref={el => rowCenterRefs.current[r] = el} className="hidden transition-none">
                               {Array.from({ length: colPoolSize }).map((_, c) => <div key={`${r}-${c}`} ref={el => cellCenterRefs.current[`${r}-${c}`] = el} className="hidden transition-none" />)}
                           </div>
                       ))}
                   </div>
               </div>

               <div ref={rightPaneBodyRef} className={`absolute right-0 top-0 h-full bg-white z-30 transition-none ${isPinned ? 'shadow-[-4px_0_10px_rgba(0,0,0,0.05)] border-l-2 border-blue-500' : ''}`} style={{ display: isPinned ? 'block' : 'none' }}>
                   <div ref={bodyRightWrapperRef} className="relative w-full h-full transition-none" style={{ willChange: 'transform' }}>
                       {Array.from({ length: rowPoolSize }).map((_, r) => (
                           <div key={r} ref={el => rowRightRefs.current[r] = el} className="hidden transition-none">
                               {rightCols.map((_, c) => <div key={`${r}-${c}`} ref={el => cellRightRefs.current[`${r}-${c}`] = el} className="hidden transition-none" />)}
                           </div>
                       ))}
                   </div>
               </div>
             </div>

          </div>
        </div>
        
        <div className="bg-white border-t border-gray-200 p-3 flex justify-between items-center z-30 shrink-0 select-none">
          <div className="flex items-center gap-3">
              <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider border border-indigo-100 shadow-sm">
                  {selectedRowsRef.current.size.toLocaleString()} Selected
              </span>
          </div>
          
          <PaginationUI 
              current={paginationRef.current.current} 
              pageSize={paginationRef.current.pageSize} 
              total={paginationRef.current.total} 
              onChange={(p, sz) => applyPagination(p, sz, fullDataMapRef.current)} 
          />
        </div>

      </div>
    </div>
  );
}