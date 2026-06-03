import React, { useState, useMemo, useRef, useCallback, useTransition, useEffect } from 'react';

// --- CONFIGURATION ---
const ROW_HEIGHT = 44; 
const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WIDTH = 50; 
const TOTAL_ROWS = 10000;
const TOTAL_COLS = 200; 
const OVERSCAN = 2; 

// --- MOCK DATA GENERATORS ---
const getColumnType = (colIndex) => {
  if (colIndex === 0) return 'id';
  if (colIndex === TOTAL_COLS) return 'action'; 
  
  if (colIndex > 0) {
    if (colIndex % 6 === 0) return 'chart';
    if (colIndex % 4 === 0 && colIndex % 6 !== 0) return 'dropdown';
    if (colIndex % 5 === 0 && colIndex % 4 !== 0 && colIndex % 6 !== 0) return 'tags';
  }

  if (colIndex === 1) return 'avatar';
  if (colIndex === 2) return 'status';
  if (colIndex === 3) return 'checkbox';
  
  return 'editable-text';
};

const getColTitle = (colIndex) => {
  if (colIndex === TOTAL_COLS) return 'Action';
  const titles = ['ID', 'Avatar', 'Status', 'Verified', 'Role', 'Skills', 'Activity'];
  return titles[colIndex] || `Metric ${colIndex}`;
};

const getCellData = (rowIndex, colIndex, edits) => {
  if (colIndex === TOTAL_COLS) return null; 
  
  const editKey = `${rowIndex}-${colIndex}`;
  if (edits.current && edits.current[editKey] !== undefined) return edits.current[editKey];

  if (colIndex === 0) return rowIndex;
  if (colIndex === 1) return `https://i.pravatar.cc/32?u=${rowIndex}`;
  if (colIndex === 2) return ['Active', 'Pending', 'Suspended', 'Banned'][rowIndex % 4];
  if (colIndex === 3) return rowIndex % 3 === 0;
  
  const type = getColumnType(colIndex);
  if (type === 'dropdown') return ['Admin', 'Editor', 'Viewer'][rowIndex % 3];
  if (type === 'tags') return ['React', 'UI/UX', 'Perf', 'Data'].slice(0, (rowIndex % 3) + 2);
  if (type === 'chart') return Array.from({length: 10}, (_, i) => 10 + Math.sin(rowIndex + i) * 8);
  
  return `Row ${rowIndex} - Col ${colIndex}`;
};

// --- AG GRID STRATEGY: VANILLA HTML STRING RENDERERS ---
const generateCellHTML = (type, value) => {
  if (type === 'action') {
      return `
      <div style="display: flex; gap: 14px; justify-content: center; width: 100%; font-size: 16px;">
          <span data-action="preview" title="Preview Record" style="cursor: pointer; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">👁️</span>
          <span data-action="save" title="Save Record" style="cursor: pointer; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">💾</span>
          <span data-action="delete" title="Delete Record" style="cursor: pointer; transition: transform 0.1s; filter: grayscale(100%);" onmouseover="this.style.transform='scale(1.2)'; this.style.filter='none';" onmouseout="this.style.transform='scale(1)'; this.style.filter='grayscale(100%)';">🗑️</span>
      </div>`;
  }
  if (type === 'avatar') {
    return `<img src="${value}" alt="avatar" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #d1d5db; object-fit: cover;" />`;
  }
  if (type === 'status') {
    const colors = { Active: 'background: #dcfce7; color: #166534', Pending: 'background: #fef9c3; color: #854d0e', Suspended: 'background: #fee2e2; color: #991b1b', Banned: 'background: #1f2937; color: #ffffff' };
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
    return `<svg width="100%" height="24px" viewBox="0 0 90 24" style="overflow: visible;"><polyline points="${points}" style="fill: none; stroke: #3b82f6; stroke-width: 2px; stroke-linejoin: round; stroke-linecap: round;" /></svg>`;
  }
  if (type === 'dropdown') {
      return `<div style="width: 100%; height: 28px; position: relative;"><select style="width: 100%; height: 100%; border: 1px solid #d1d5db; border-radius: 4px; background-color: #f9fafb; padding: 0 8px; appearance: none; pointer-events: none; color: #374151; font-size: 13px;"><option>${value}</option></select><span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 10px; color: #9ca3af; pointer-events: none;">▼</span></div>`;
  }
  if (type === 'editable-text') {
      return `<div style="width: 100%; height: 28px;"><input type="text" value="${value}" readonly style="width: 100%; height: 100%; border: 1px solid #d1d5db; border-radius: 4px; background-color: #f9fafb; padding: 0 8px; pointer-events: none; color: #374151; font-size: 13px; overflow: hidden; text-overflow: ellipsis;" /></div>`;
  }
  return `<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; display: block;">${value}</span>`;
};


// --- ULTRA-FAST DOM CACHE HELPER ---
const setStyle = (node, prop, value) => {
    if (!node) return;
    if (node[`_${prop}`] !== value) {
        node.style[prop] = value;
        node[`_${prop}`] = value;
    }
};
const setClass = (node, value) => {
    if (!node) return;
    if (node._class !== value) {
        node.className = value;
        node._class = value;
    }
};

// --- ISOLATED EDITOR COMPONENT (Crash Proof) ---
const EditorInput = ({ activeCell, getCellData, editsRef, handleEditorCommit }) => {
    const inputRef = useRef(null);
    
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus({ preventScroll: true });
        }
    }, []);
    
    // FIX: Safely parse data. If an Array or Object ever leaks in, stringify it 
    // to prevent the "Objects are not valid as a React child" crash.
    const rawData = getCellData(activeCell.rowId, activeCell.colIndex, editsRef);
    const safeStringValue = typeof rawData === 'object' ? JSON.stringify(rawData) : String(rawData);
    
    if (activeCell.type === 'dropdown') {
        return (
            <select ref={inputRef} onChange={(e) => handleEditorCommit(e.target.value)} onBlur={(e) => handleEditorCommit(e.target.value)} defaultValue={safeStringValue} className="w-full h-full border border-blue-400 outline-none bg-white px-2 rounded text-[13px] text-gray-800 shadow-sm cursor-pointer">
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
            </select>
        );
    }
    
    return (
        <input ref={inputRef} onBlur={(e) => handleEditorCommit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} defaultValue={safeStringValue} className="w-full h-full border border-blue-400 outline-none bg-white px-2 rounded text-[13px] text-gray-800 shadow-sm" />
    );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const scrollContainerRef = useRef(null);
  
  const [activeCell, setActiveCell] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [, forceRender] = useState({});

  // Container Refs
  const scrollEnforcerRef = useRef(null);
  const headerCenterWrapperRef = useRef(null);
  const bodyCenterWrapperRef = useRef(null);
  const bodyLeftWrapperRef = useRef(null);
  const bodyRightWrapperRef = useRef(null);
  const leftPaneHeaderRef = useRef(null);
  const leftPaneBodyRef = useRef(null);
  const centerPaneHeaderRef = useRef(null);
  const centerPaneBodyRef = useRef(null);
  const rightPaneHeaderRef = useRef(null);
  const rightPaneBodyRef = useRef(null);
  
  const rowCenterRefs = useRef([]); const cellCenterRefs = useRef({}); const headerCenterRefs = useRef([]);
  const rowLeftRefs = useRef([]); const cellLeftRefs = useRef({}); const headerLeftRefs = useRef([]);
  const rowRightRefs = useRef([]); const cellRightRefs = useRef({}); const headerRightRefs = useRef([]);

  const editsRef = useRef({});
  const sortRulesRef = useRef([]);
  const isMultiSortRef = useRef(false);
  const rowOrderMapRef = useRef(Array.from({ length: TOTAL_ROWS }, (_, i) => i));

  // Editor Lock Ref (Prevents auto-scroll from closing editor instantly)
  const editorOpenedAtRef = useRef(0);

  const colWidthsRef = useRef({}); 
  const leftLayoutRef = useRef({ positions: [], totalWidth: 0 });
  const centerLayoutRef = useRef({ positions: [], totalWidth: 0 });
  const rightLayoutRef = useRef({ positions: [], totalWidth: 0 });
  const dragRef = useRef({ isDragging: false, colId: null, startX: 0, startWidth: 0 });

  const [isPinned, setIsPinned] = useState(false);
  
  const { leftCols, rightCols, centerCols } = useMemo(() => {
    const allCols = Array.from({ length: TOTAL_COLS + 1 }, (_, i) => i);
    if (isPinned) {
        return {
            leftCols: [0, 4], 
            rightCols: [TOTAL_COLS], 
            centerCols: allCols.filter(c => c !== 0 && c !== 4 && c !== TOTAL_COLS)
        };
    } else {
        return { leftCols: [], rightCols: [], centerCols: allCols };
    }
  }, [isPinned]);

  const recalcLayouts = useCallback(() => {
      let total = 0;
      const lPos = [];
      for (let c of leftCols) { lPos.push(total); total += colWidthsRef.current[c] || DEFAULT_COL_WIDTH; }
      leftLayoutRef.current = { positions: lPos, totalWidth: total };

      total = 0;
      const cPos = [];
      for (let c of centerCols) { cPos.push(total); total += colWidthsRef.current[c] || DEFAULT_COL_WIDTH; }
      centerLayoutRef.current = { positions: cPos, totalWidth: total };

      total = 0;
      const rPos = [];
      for (let c of rightCols) { rPos.push(total); total += colWidthsRef.current[c] || DEFAULT_COL_WIDTH; }
      rightLayoutRef.current = { positions: rPos, totalWidth: total };
  }, [leftCols, centerCols, rightCols]);

  const updateShellDimensions = useCallback(() => {
      const leftW = leftLayoutRef.current.totalWidth;
      const centerW = centerLayoutRef.current.totalWidth;
      const rightW = rightLayoutRef.current.totalWidth;
      const totalW = leftW + centerW + rightW;

      setStyle(scrollEnforcerRef.current, 'width', `${totalW}px`);
      setStyle(leftPaneHeaderRef.current, 'width', `${leftW}px`);
      setStyle(leftPaneBodyRef.current, 'width', `${leftW}px`);

      if (centerPaneHeaderRef.current) {
          setStyle(centerPaneHeaderRef.current, 'left', `${leftW}px`);
          setStyle(centerPaneHeaderRef.current, 'right', `${rightW}px`);
      }
      if (centerPaneBodyRef.current) {
          setStyle(centerPaneBodyRef.current, 'left', `${leftW}px`);
          setStyle(centerPaneBodyRef.current, 'right', `${rightW}px`);
      }

      setStyle(headerCenterWrapperRef.current, 'width', `${centerW}px`);
      setStyle(bodyCenterWrapperRef.current, 'width', `${centerW}px`);

      setStyle(rightPaneHeaderRef.current, 'width', `${rightW}px`);
      setStyle(rightPaneBodyRef.current, 'width', `${rightW}px`);
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) setViewport({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const rowPoolSize = viewport.height > 0 ? Math.ceil(viewport.height / ROW_HEIGHT) + OVERSCAN : 0;
  const colPoolSize = viewport.width > 0 ? Math.ceil(viewport.width / MIN_COL_WIDTH) + OVERSCAN : 0;

  const populateDOMCell = useCallback((cellNode, actualRowId, actualColId) => {
      const dataCoord = `${actualRowId}-${actualColId}`;
      if (cellNode.dataset.coord === dataCoord) return; 
      
      cellNode.dataset.coord = dataCoord;
      cellNode.dataset.row = actualRowId;
      cellNode.dataset.col = actualColId;
      
      const type = getColumnType(actualColId);
      const rawValue = getCellData(actualRowId, actualColId, editsRef);
      
      cellNode.innerHTML = generateCellHTML(type, rawValue);
      setClass(cellNode, `ag-cell absolute top-0 flex items-center px-3 overflow-hidden text-sm whitespace-nowrap border-r border-gray-200 h-full transition-none ${
          actualColId === 0 ? 'font-bold bg-gray-100/90 text-gray-900 border-gray-300' : 'text-gray-700'
      } ${['editable-text', 'dropdown', 'checkbox'].includes(type) ? 'cursor-pointer hover:bg-black/5' : ''}`);
  }, []);

  const populateDOMHeader = useCallback((headerNode, actualColId) => {
      if (headerNode.dataset.col === String(actualColId)) return;
      
      headerNode.dataset.col = actualColId;
      const title = getColTitle(actualColId);
      const colType = getColumnType(actualColId);
      const isSortable = colType !== 'chart' && colType !== 'tags' && colType !== 'action';
      const ruleIndex = sortRulesRef.current.findIndex(r => r.colIndex === actualColId);
      
      let sortIconHtml = '';
      if (ruleIndex >= 0) {
          sortIconHtml = `<span class="flex items-center text-xs ml-1 text-blue-400">${sortRulesRef.current[ruleIndex].dir === 'asc' ? '▲' : '▼'}${isMultiSortRef.current && sortRulesRef.current.length > 1 ? `<span class="ml-1 text-[10px] bg-blue-900 px-1 rounded-full text-white">${ruleIndex + 1}</span>` : ''}</span>`;
      } else if (isSortable) {
          sortIconHtml = `<span class="flex items-center text-xs ml-1 text-gray-500 opacity-30 group-hover:opacity-100 transition-opacity">↕</span>`;
      }

      headerNode.innerHTML = `
          <div class="flex items-center justify-between w-full h-full pointer-events-none group pr-3">
              <span class="truncate">${title}</span>${sortIconHtml}
          </div>
          <div class="resize-handle hover:bg-indigo-500 hover:opacity-100 opacity-0 transition-opacity" data-col="${actualColId}" style="position: absolute; right: 0; top: 0; width: 6px; height: 100%; cursor: col-resize; z-index: 100;"></div>
      `;
      setClass(headerNode, `absolute top-0 h-full pl-4 text-sm font-semibold tracking-wider border-b select-none transition-none border-r border-gray-600 bg-gray-900 ${actualColId === TOTAL_COLS ? 'text-center text-indigo-300' : isSortable ? 'cursor-pointer hover:bg-gray-700' : ''} ${actualColId === 0 ? 'text-white border-gray-500' : 'text-gray-200'}`);
  }, []);

  const redrawVanillaDOM = useCallback((scrollTop, scrollLeft) => {
    if (!rowPoolSize || !colPoolSize) return;

    const roundedScrollTop = Math.max(0, Math.round(scrollTop));
    const roundedScrollLeft = Math.max(0, Math.round(scrollLeft));

    const startRow = Math.floor(roundedScrollTop / ROW_HEIGHT);
    let startCol = 0;
    const centerPosArr = centerLayoutRef.current.positions;
    
    for (let i = 0; i < centerPosArr.length; i++) {
        if (centerPosArr[i] > roundedScrollLeft) break;
        startCol = i;
    }

    const centerStartX = centerPosArr[startCol] || 0;
    const subPixelX = roundedScrollLeft - centerStartX;
    const subPixelY = roundedScrollTop % ROW_HEIGHT;

    setStyle(bodyCenterWrapperRef.current, 'transform', `translate3d(-${roundedScrollLeft}px, -${roundedScrollTop}px, 0)`);
    setStyle(headerCenterWrapperRef.current, 'transform', `translate3d(-${roundedScrollLeft}px, 0px, 0)`);
    
    setStyle(bodyLeftWrapperRef.current, 'transform', `translate3d(0, -${roundedScrollTop}px, 0)`);
    setStyle(bodyRightWrapperRef.current, 'transform', `translate3d(0, -${roundedScrollTop}px, 0)`);

    for (let r = 0; r < rowPoolSize; r++) {
      let offsetRow = r - (startRow % rowPoolSize);
      if (offsetRow < 0) offsetRow += rowPoolSize;
      
      const logicalRowIndex = startRow + offsetRow;
      const actualRowId = rowOrderMapRef.current[logicalRowIndex];
      const isVisibleRow = logicalRowIndex < TOTAL_ROWS;
      
      const absoluteRowY = logicalRowIndex * ROW_HEIGHT;
      const rowYTransform = `translate3d(0, ${absoluteRowY}px, 0)`;
      const rowBaseClass = `absolute left-0 flex border-b border-gray-200 transition-none ${logicalRowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 w-full h-[${ROW_HEIGHT}px]`;
      const rowDisplay = isVisibleRow ? 'flex' : 'none';

      [rowCenterRefs.current[r], rowLeftRefs.current[r], rowRightRefs.current[r]].forEach(rowNode => {
          if (rowNode) {
              setStyle(rowNode, 'transform', rowYTransform);
              setStyle(rowNode, 'display', rowDisplay);
              setClass(rowNode, rowBaseClass);
          }
      });

      if (!isVisibleRow) continue;

      // CENTER CELLS
      for (let c = 0; c < colPoolSize; c++) {
        let offsetCol = c - (startCol % colPoolSize);
        if (offsetCol < 0) offsetCol += colPoolSize;
        
        const logicalColIndex = startCol + offsetCol;
        const isVisibleCol = logicalColIndex < centerCols.length;
        const cellNode = cellCenterRefs.current[`${r}-${c}`];
        
        if (!cellNode) continue;
        
        const absoluteCellX = centerPosArr[logicalColIndex] || 0;
        
        setStyle(cellNode, 'transform', `translate3d(${absoluteCellX}px, 0, 0)`);
        setStyle(cellNode, 'width', `${colWidthsRef.current[centerCols[logicalColIndex]] || DEFAULT_COL_WIDTH}px`);
        setStyle(cellNode, 'display', isVisibleCol ? 'flex' : 'none');

        if (isVisibleCol) populateDOMCell(cellNode, actualRowId, centerCols[logicalColIndex]);
      }

      // LEFT CELLS
      for (let c = 0; c < leftCols.length; c++) {
          const cellNode = cellLeftRefs.current[`${r}-${c}`];
          if (!cellNode) continue;
          setStyle(cellNode, 'transform', `translate3d(${leftLayoutRef.current.positions[c]}px, 0, 0)`);
          setStyle(cellNode, 'width', `${colWidthsRef.current[leftCols[c]] || DEFAULT_COL_WIDTH}px`);
          populateDOMCell(cellNode, actualRowId, leftCols[c]);
      }

      // RIGHT CELLS
      for (let c = 0; c < rightCols.length; c++) {
          const cellNode = cellRightRefs.current[`${r}-${c}`];
          if (!cellNode) continue;
          setStyle(cellNode, 'transform', `translate3d(${rightLayoutRef.current.positions[c]}px, 0, 0)`);
          setStyle(cellNode, 'width', `${colWidthsRef.current[rightCols[c]] || DEFAULT_COL_WIDTH}px`);
          populateDOMCell(cellNode, actualRowId, rightCols[c]);
      }
    }

    // HEADERS
    for (let c = 0; c < colPoolSize; c++) {
        let offsetCol = c - (startCol % colPoolSize);
        if (offsetCol < 0) offsetCol += colPoolSize;
        const logicalColIndex = startCol + offsetCol;
        const headerNode = headerCenterRefs.current[c];
        if (!headerNode) continue;

        const absoluteCellX = centerPosArr[logicalColIndex] || 0;
        setStyle(headerNode, 'transform', `translate3d(${absoluteCellX}px, 0, 0)`);
        setStyle(headerNode, 'width', `${colWidthsRef.current[centerCols[logicalColIndex]] || DEFAULT_COL_WIDTH}px`);
        setStyle(headerNode, 'display', logicalColIndex < centerCols.length ? 'flex' : 'none');

        if (logicalColIndex < centerCols.length) populateDOMHeader(headerNode, centerCols[logicalColIndex]);
    }

    for (let c = 0; c < leftCols.length; c++) {
        const headerNode = headerLeftRefs.current[c];
        if (headerNode) {
            setStyle(headerNode, 'transform', `translate3d(${leftLayoutRef.current.positions[c]}px, 0, 0)`);
            setStyle(headerNode, 'width', `${colWidthsRef.current[leftCols[c]] || DEFAULT_COL_WIDTH}px`);
            populateDOMHeader(headerNode, leftCols[c]);
        }
    }

    for (let c = 0; c < rightCols.length; c++) {
        const headerNode = headerRightRefs.current[c];
        if (headerNode) {
            setStyle(headerNode, 'transform', `translate3d(${rightLayoutRef.current.positions[c]}px, 0, 0)`);
            setStyle(headerNode, 'width', `${colWidthsRef.current[rightCols[c]] || DEFAULT_COL_WIDTH}px`);
            populateDOMHeader(headerNode, rightCols[c]);
        }
    }
  }, [rowPoolSize, colPoolSize, centerCols, leftCols, rightCols, populateDOMCell, populateDOMHeader]);

  useEffect(() => {
      recalcLayouts();
      updateShellDimensions();
      [cellCenterRefs, cellLeftRefs, cellRightRefs].forEach(ref => Object.values(ref.current).forEach(n => { if (n) n.dataset.coord = 'INVALID'; }));
      [headerCenterRefs, headerLeftRefs, headerRightRefs].forEach(ref => Object.values(ref.current).forEach(n => { if (n) n.dataset.col = 'INVALID'; }));
      
      if (rowPoolSize > 0 && colPoolSize > 0 && scrollContainerRef.current) {
          redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
      }
  }, [isPinned, rowPoolSize, colPoolSize, recalcLayouts, updateShellDimensions, redrawVanillaDOM]);

  // --- MOUSE DOWN (ONLY FOR DRAGGING COLUMNS) ---
  const handleResizeMouseDown = useCallback((e) => {
      if (e.target.classList.contains('resize-handle')) {
          e.stopPropagation();
          e.preventDefault();
          const colId = parseInt(e.target.dataset.col);
          dragRef.current = { isDragging: true, colId, startX: e.clientX, startWidth: colWidthsRef.current[colId] || DEFAULT_COL_WIDTH };
          document.body.style.cursor = 'col-resize';
          document.body.classList.add('is-resizing-col');
      }
  }, []);

  useEffect(() => {
      let rafId;
      const handleMouseMove = (e) => {
          if (!dragRef.current.isDragging) return;
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
              const { colId, startX, startWidth } = dragRef.current;
              const newWidth = Math.max(MIN_COL_WIDTH, Math.round(startWidth + (e.clientX - startX)));
              colWidthsRef.current[colId] = newWidth;
              recalcLayouts();
              updateShellDimensions();
              if (scrollContainerRef.current) redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
          });
      };

      const handleMouseUp = () => {
          if (dragRef.current.isDragging) {
              dragRef.current.isDragging = false;
              document.body.style.cursor = '';
              document.body.classList.remove('is-resizing-col');
              forceRender({}); 
          }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      }
  }, [recalcLayouts, updateShellDimensions, redrawVanillaDOM]);


  // --- NATIVE SCROLL WITH DEBOUNCED EDITOR CLOSING ---
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    let isScrolling = false;
    let scrollTimeout;

    const onScroll = () => {
        if (!isScrolling) {
            isScrolling = true;
            
            // FIX: If the editor was opened within the last 150ms, this scroll event 
            // is likely a browser focus-shift. We IGNORE it to prevent instant closing.
            if (Date.now() - editorOpenedAtRef.current > 150) {
                setActiveCell(null); 
            }

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

  const executeSort = () => {
    startTransition(() => {
      const pointers = Array.from({ length: TOTAL_ROWS }, (_, i) => i);
      if (sortRulesRef.current.length > 0) {
        pointers.sort((rowA, rowB) => {
          for (let rule of sortRulesRef.current) {
            const valA = getCellData(rowA, rule.colIndex, editsRef);
            const valB = getCellData(rowB, rule.colIndex, editsRef);
            if (valA === valB) continue; 
            if (typeof valA === 'boolean' && typeof valB === 'boolean') return rule.dir === 'asc' ? (valA === valB ? 0 : valA ? 1 : -1) : (valA === valB ? 0 : valA ? -1 : 1);
            if (typeof valA === 'number' && typeof valB === 'number') return rule.dir === 'asc' ? valA - valB : valB - valA;
            return rule.dir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
          }
          return 0;
        });
      }
      rowOrderMapRef.current = pointers;
      
      if (scrollContainerRef.current) {
          [cellCenterRefs, cellLeftRefs, cellRightRefs].forEach(ref => Object.values(ref.current).forEach(n => { if (n) n.dataset.coord = 'INVALID'; }));
          [headerCenterRefs, headerLeftRefs, headerRightRefs].forEach(ref => Object.values(ref.current).forEach(n => { if (n) n.dataset.col = 'INVALID'; }));
          redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
      }
      forceRender({}); 
    });
  };

  // --- ON CLICK (FOR CELL SELECTION & EDITING) ---
  const handleTableClick = useCallback((e) => {
      const cellNode = e.target.closest('.ag-cell');
      if (cellNode) {
          const rowId = parseInt(cellNode.dataset.row);
          const colId = parseInt(cellNode.dataset.col);
          const type = getColumnType(colId);

          if (type === 'action') {
              const actionBtn = e.target.closest('[data-action]');
              if (actionBtn) {
                  const msg = document.createElement('div');
                  msg.className = "fixed bottom-10 right-10 bg-indigo-900 text-white px-6 py-3 rounded-lg shadow-2xl font-bold z-[100] animate-bounce";
                  msg.innerText = `${actionBtn.dataset.action.toUpperCase()} triggered for Record ID: ${rowId}`;
                  document.body.appendChild(msg);
                  setTimeout(() => document.body.removeChild(msg), 2000);
              }
              return;
          }
          if (type === 'checkbox') {
              editsRef.current[`${rowId}-${colId}`] = !getCellData(rowId, colId, editsRef);
              cellNode.dataset.coord = 'INVALID'; 
              redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
              if (sortRulesRef.current.some(r => r.colIndex === colId)) executeSort();
              return;
          }
          if (type === 'editable-text' || type === 'dropdown') {
              const rect = cellNode.getBoundingClientRect();
              editorOpenedAtRef.current = Date.now(); // Log the exact millisecond we opened it
              setActiveCell({ 
                  rowId, colIndex: colId, type, 
                  rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } 
              });
          }
      }

      const headerNode = e.target.closest('.border-b');
      if (headerNode && headerNode.dataset.col) {
          // If they clicked the resize handle, ignore the sort trigger
          if (e.target.classList.contains('resize-handle')) return;

          const colIndex = parseInt(headerNode.dataset.col);
          if (getColumnType(colIndex) === 'chart' || getColumnType(colIndex) === 'tags' || getColumnType(colIndex) === 'action') return;

          const existingIdx = sortRulesRef.current.findIndex(r => r.colIndex === colIndex);
          if (!isMultiSortRef.current) {
             sortRulesRef.current = existingIdx >= 0 && sortRulesRef.current[existingIdx].dir === 'asc' ? [{ colIndex, dir: 'desc' }] : [{ colIndex, dir: 'asc' }];
          } else {
             if (existingIdx >= 0) {
                if (sortRulesRef.current[existingIdx].dir === 'asc') sortRulesRef.current[existingIdx].dir = 'desc';
                else sortRulesRef.current.splice(existingIdx, 1);
             } else sortRulesRef.current.push({ colIndex, dir: 'asc' });
          }
          executeSort();
      }
  }, [redrawVanillaDOM]);

  const handleEditorCommit = (value) => {
      if (!activeCell) return;
      editsRef.current[`${activeCell.rowId}-${activeCell.colIndex}`] = value;
      
      [cellCenterRefs.current, cellLeftRefs.current, cellRightRefs.current].forEach(pane => {
          const nodeKey = Object.keys(pane).find(k => pane[k]?.dataset?.coord === `${activeCell.rowId}-${activeCell.colIndex}`);
          if (nodeKey && pane[nodeKey]) pane[nodeKey].dataset.coord = 'INVALID'; 
      });
      
      setActiveCell(null);
      if (scrollContainerRef.current) redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
      if (sortRulesRef.current.some(r => r.colIndex === activeCell.colIndex)) executeSort();
  };

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col p-6 font-sans box-border overflow-hidden">
      
      <style>{`
        .is-resizing-col * { user-select: none !important; }
      `}</style>

      <div className="w-full flex-shrink-0 mb-4 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { isMultiSortRef.current = !isMultiSortRef.current; sortRulesRef.current = []; executeSort(); }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${isMultiSortRef.current ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            {isMultiSortRef.current ? '✓ Multi-Sort Enabled' : 'Single Sort Mode'}
          </button>
          
          <button 
            onClick={() => setIsPinned(!isPinned)}
            className={`px-4 py-2 rounded-lg font-bold transition-all shadow-sm ${isPinned ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50'}`}
          >
            📌 {isPinned ? 'Unpin Columns' : 'Pin Columns (ID, Role, Action)'}
          </button>
          
          <span className="text-sm text-gray-500 ml-4 border-l-2 pl-4 border-gray-300">
             Click cells to edit smoothly. Resize handles work natively.
          </span>
        </div>
        {isPending && <span className="text-sm text-blue-600 font-medium animate-pulse">Processing...</span>}
      </div>

      <div className={`flex-1 bg-white rounded-xl shadow-xl border border-gray-300 flex flex-col overflow-hidden relative transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        
        {activeCell && (
            <div 
                className="fixed z-50 bg-blue-50 flex items-center px-2"
                style={{ top: activeCell.rect.top, left: activeCell.rect.left, width: activeCell.rect.width, height: activeCell.rect.height, boxShadow: 'inset 0 0 0 2px #3b82f6', outline: 'none' }}
            >
                 <EditorInput activeCell={activeCell} getCellData={getCellData} editsRef={editsRef} handleEditorCommit={handleEditorCommit} />
            </div>
        )}

        <div ref={scrollContainerRef} className="overflow-auto relative bg-white flex-1 select-none">
          
          <div ref={scrollEnforcerRef} style={{ height: `${(TOTAL_ROWS * ROW_HEIGHT) + 48}px`, position: 'absolute', top: 0, left: 0 }} />

          {/* FIX: Seperated onMouseDown (for resizing) and onClick (for editing) completely */}
          <div className="sticky top-0 left-0 overflow-hidden" style={{ width: '100%', height: '100%', zIndex: 10 }} onMouseDown={handleResizeMouseDown} onClick={handleTableClick}>
             
             <div className="absolute top-0 left-0 right-0 h-[48px] z-20 shadow-md bg-gray-900">
               <div ref={leftPaneHeaderRef} className={`absolute left-0 top-0 h-full bg-gray-900 z-30 transition-shadow transition-none ${isPinned ? 'shadow-[4px_0_10px_rgba(0,0,0,0.5)] border-r-2 border-indigo-500' : ''}`} style={{ display: isPinned ? 'block' : 'none' }}>
                   {leftCols.map((_, i) => <div key={i} ref={el => headerLeftRefs.current[i] = el} className="hidden transition-none" style={{ height: '100%' }} />)}
               </div>
               
               <div ref={centerPaneHeaderRef} className="absolute top-0 h-full bg-gray-900 overflow-hidden transition-none">
                   <div ref={headerCenterWrapperRef} className="relative w-full h-full transition-none" style={{ willChange: 'transform' }}>
                       {Array.from({ length: colPoolSize }).map((_, c) => <div key={c} ref={el => headerCenterRefs.current[c] = el} className="hidden transition-none" style={{ height: '100%' }} />)}
                   </div>
               </div>

               <div ref={rightPaneHeaderRef} className={`absolute right-0 top-0 h-full bg-gray-900 z-30 transition-shadow transition-none ${isPinned ? 'shadow-[-4px_0_10px_rgba(0,0,0,0.5)] border-l-2 border-indigo-500' : ''}`} style={{ display: isPinned ? 'block' : 'none' }}>
                   {rightCols.map((_, i) => <div key={i} ref={el => headerRightRefs.current[i] = el} className="hidden transition-none" style={{ height: '100%' }} />)}
               </div>
             </div>

             <div className="absolute top-[48px] left-0 right-0 bottom-0 z-10 transition-none">
               <div ref={leftPaneBodyRef} className={`absolute left-0 top-0 h-full bg-white z-30 transition-shadow transition-none ${isPinned ? 'shadow-[4px_0_10px_rgba(0,0,0,0.05)] border-r-2 border-indigo-500' : ''}`} style={{ display: isPinned ? 'block' : 'none' }}>
                   <div ref={bodyLeftWrapperRef} className="relative w-full h-full transition-none" style={{ willChange: 'transform' }}>
                       {Array.from({ length: rowPoolSize }).map((_, r) => (
                           <div key={r} ref={el => rowLeftRefs.current[r] = el} className="hidden h-[44px] transition-none">
                               {leftCols.map((_, c) => <div key={`${r}-${c}`} ref={el => cellLeftRefs.current[`${r}-${c}`] = el} className="hidden transition-none" />)}
                           </div>
                       ))}
                   </div>
               </div>

               <div ref={centerPaneBodyRef} className="absolute top-0 h-full bg-white overflow-hidden transition-none">
                   <div ref={bodyCenterWrapperRef} className="relative w-full h-full transition-none" style={{ willChange: 'transform' }}>
                       {Array.from({ length: rowPoolSize }).map((_, r) => (
                           <div key={r} ref={el => rowCenterRefs.current[r] = el} className="hidden h-[44px] transition-none">
                               {Array.from({ length: colPoolSize }).map((_, c) => <div key={`${r}-${c}`} ref={el => cellCenterRefs.current[`${r}-${c}`] = el} className="hidden transition-none" />)}
                           </div>
                       ))}
                   </div>
               </div>

               <div ref={rightPaneBodyRef} className={`absolute right-0 top-0 h-full bg-white z-30 transition-shadow transition-none ${isPinned ? 'shadow-[-4px_0_10px_rgba(0,0,0,0.05)] border-l-2 border-indigo-500' : ''}`} style={{ display: isPinned ? 'block' : 'none' }}>
                   <div ref={bodyRightWrapperRef} className="relative w-full h-full transition-none" style={{ willChange: 'transform' }}>
                       {Array.from({ length: rowPoolSize }).map((_, r) => (
                           <div key={r} ref={el => rowRightRefs.current[r] = el} className="hidden h-[44px] transition-none">
                               {rightCols.map((_, c) => <div key={`${r}-${c}`} ref={el => cellRightRefs.current[`${r}-${c}`] = el} className="hidden transition-none" />)}
                           </div>
                       ))}
                   </div>
               </div>
             </div>

          </div>
        </div>
        
        <div className="bg-gray-50 border-t border-gray-200 p-3 text-xs text-gray-500 flex justify-between z-30 shrink-0">
          <span>Matrix: {TOTAL_ROWS.toLocaleString()} Rows × {TOTAL_COLS + 1} Cols</span>
          <span>Performance: Fully Separated Interaction Lifecycle (Crash-Proof)</span>
        </div>
      </div>
    </div>
  );
}