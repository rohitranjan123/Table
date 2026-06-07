import React, { useState, useMemo, useRef, useCallback, useTransition, useEffect } from 'react';
import './HaTableCustomRowHeight10.css';

// --- CONFIGURATION ---
const DEFAULT_ROW_HEIGHT = 44;
const HEADER_HEIGHT = 60;
const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WIDTH = 50;
const TOTAL_ROWS = 10000;
const TOTAL_COLS = 200;
const OVERSCAN = 2;

// Initial Dynamic Widths
const getInitialWidth = (col: number) => {
    if (col === 0) return 60;
    if (col >= 6 && col <= 8) return 200;
    if (col === TOTAL_COLS) return 150;
    return DEFAULT_COL_WIDTH;
};

// --- MOCK DATA GENERATORS ---
const getColumnType = (colIndex: number) => {
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

const getColTitle = (colIndex: number) => {
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

const getColGroup = (colId: number) => {
  if (colId >= 10 && colId <= 12) return 'Sports Results';
  if (colId >= 50 && colId <= 53) return 'Financials';
  if (colId >= 80 && colId <= 81) return 'Metadata';
  if (colId >= 100 && colId <= 109) return 'Detailed Analytics';
  return null;
};

const getCellData = (
  rowIndex: number,
  colIndex: number,
  edits: React.RefObject<Record<string, unknown>> | undefined,
  selectedSet: React.RefObject<Set<number>> | undefined,
) => {
  if (colIndex === TOTAL_COLS) return null;
  if (colIndex === 0) return selectedSet ? selectedSet.current.has(rowIndex) : false;

  const editKey = `${rowIndex}-${colIndex}`;
  if (edits && edits.current && edits.current[editKey] !== undefined) return edits.current[editKey];

  if (colIndex === 1) return rowIndex;
  if (colIndex === 2) return `https://i.pravatar.cc/32?u=${rowIndex}`;
  if (colIndex === 3) return ['Active', 'Pending', 'Suspended', 'Banned'][rowIndex % 4];
  if (colIndex === 4) return rowIndex % 3 === 0;

  if (colIndex >= 6 && colIndex <= 8) {
      const base = `Detailed analysis and extended reporting metrics for record entry ${rowIndex} mapped precisely at coordinate bounds ${colIndex}.`;
      const repeat = (rowIndex % 5) + 1;
      return new Array(repeat).fill(base).join(' ') + (rowIndex % 3 === 0 ? ' This adds even more vertical depth to test the scroll stability.' : '');
  }

  const type = getColumnType(colIndex);
  if (type === 'dropdown') return ['Admin', 'Editor', 'Viewer'][rowIndex % 3];
  if (type === 'tags') return ['React', 'UI/UX', 'Perf', 'Data'].slice(0, (rowIndex % 3) + 2);
  if (type === 'chart') return Array.from({ length: 10 }, (_, i) => 10 + Math.sin(rowIndex + i) * 8);

  return `Row ${rowIndex} - Col ${colIndex}`;
};

const STATUS_CLASS: Record<string, string> = {
  Active: 'cr10-cell-status--active',
  Pending: 'cr10-cell-status--pending',
  Suspended: 'cr10-cell-status--suspended',
  Banned: 'cr10-cell-status--banned',
};

// --- AG GRID STRATEGY: VANILLA HTML STRING RENDERERS ---
const generateCellHTML = (type: string, value: unknown) => {
  if (type === 'row-select') {
    return `<div class="cr10-cell-checkbox-wrap"><input type="checkbox" class="cr10-cell-checkbox" ${value ? 'checked' : ''} /></div>`;
  }
  if (type === 'action') {
    return `<div class="cr10-cell-actions"><span class="cr10-cell-action-btn" data-action="preview">👁️</span><span class="cr10-cell-action-btn" data-action="save">💾</span><span class="cr10-cell-action-btn cr10-cell-action-btn--muted" data-action="delete">🗑️</span></div>`;
  }
  if (type === 'avatar') {
    return `<img src="${value}" alt="avatar" class="cr10-cell-avatar" />`;
  }
  if (type === 'status') {
    const statusClass = STATUS_CLASS[String(value)] || 'cr10-cell-status--default';
    return `<span class="cr10-cell-status ${statusClass}">${value}</span>`;
  }
  if (type === 'checkbox') {
    return `<input type="checkbox" class="cr10-cell-checkbox cr10-cell-checkbox--blue" ${value ? 'checked' : ''} />`;
  }
  if (type === 'tags' && Array.isArray(value)) {
    return `<div class="cr10-cell-tags">${value.map(t => `<span class="cr10-cell-tag">${t}</span>`).join('')}</div>`;
  }
  if (type === 'chart' && Array.isArray(value)) {
    return `<svg width="100%" height="24px" viewBox="0 0 90 24" class="cr10-cell-chart"><polyline class="cr10-cell-chart-line" points="${value.map((val, i) => `${i * 10},${24 - val}`).join(' ')}" /></svg>`;
  }
  if (type === 'dropdown') {
    return `<div class="cr10-cell-dropdown-wrap"><select class="cr10-cell-dropdown"><option>${value}</option></select><span class="cr10-cell-dropdown-arrow">▼</span></div>`;
  }
  if (type === 'text-wrap') {
    return `<div class="cr10-cell-text-wrap">${value}</div>`;
  }
  if (type === 'text-ellipsis') {
    return `<div class="cr10-cell-text-ellipsis">${value}</div>`;
  }
  if (type === 'text-clip') {
    return `<div class="cr10-cell-text-clip">${value}</div>`;
  }
  if (type === 'editable-text') {
    return `<div class="cr10-cell-input-wrap"><input type="text" class="cr10-cell-input" value="${value}" readonly /></div>`;
  }
  return `<span class="cr10-cell-fallback">${value}</span>`;
};

// DOM CACHE HELPER
const setStyle = (node: HTMLElement | null, prop: string, value: string) => {
  if (!node) return;
  const cache = node as HTMLElement & Record<string, string>;
  if (cache[`_${prop}`] !== value) {
    (node.style as unknown as Record<string, string>)[prop] = value;
    cache[`_${prop}`] = value;
  }
};
const setClass = (node: HTMLElement | null, value: string) => {
  if (!node) return;
  const cache = node as HTMLElement & { _class?: string };
  if (cache._class !== value) {
    node.className = value;
    cache._class = value;
  }
};

type ActiveCell = { rowId: number; colIndex: number; type: string; rect: DOMRect };

const EditorInput = ({
  activeCell,
  getCellData: getData,
  editsRef,
  selectedRowsRef,
  handleEditorCommit,
}: {
  activeCell: ActiveCell;
  getCellData: typeof getCellData;
  editsRef: React.RefObject<Record<string, unknown>>;
  selectedRowsRef: React.RefObject<Set<number>>;
  handleEditorCommit: (value: string) => void;
}) => {
    const inputRef = useRef<HTMLInputElement & HTMLSelectElement>(null);
    useEffect(() => { if (inputRef.current) inputRef.current.focus({ preventScroll: true }); }, []);
    const rawData = getData(activeCell.rowId, activeCell.colIndex, editsRef, selectedRowsRef);
    const safeStringValue = typeof rawData === 'object' && rawData !== null ? JSON.stringify(rawData) : String(rawData || '');

    if (activeCell.type === 'dropdown') {
        return (
            <select
              ref={inputRef}
              onChange={(e) => handleEditorCommit(e.target.value)}
              onBlur={(e) => handleEditorCommit(e.target.value)}
              defaultValue={safeStringValue}
              className="cr10-editor-input cr10-editor-input--select"
            >
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
            </select>
        );
    }
    return (
      <input
        ref={inputRef}
        onBlur={(e) => handleEditorCommit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        defaultValue={safeStringValue}
        className="cr10-editor-input"
      />
    );
};

const ColumnFilterPopup = ({
  activeFilter,
  closeFilter,
  filterRulesRef,
  executeDataPipeline,
  editsRef,
  selectedRowsRef,
}: {
  activeFilter: { colId: number; rect: DOMRect };
  closeFilter: () => void;
  filterRulesRef: React.RefObject<Record<number, { text: string; values: Set<string> }>>;
  executeDataPipeline: () => void;
  editsRef: React.RefObject<Record<string, unknown>>;
  selectedRowsRef: React.RefObject<Set<number>>;
}) => {
    const { colId, rect } = activeFilter;
    const existingRule = filterRulesRef.current[colId];
    const [searchText, setSearchText] = useState(existingRule?.text || '');

    const uniqueValues = useMemo(() => {
        const vals = new Set<string>();
        for (let i = 0; i < Math.min(TOTAL_ROWS, 2000); i++) {
             const val = getCellData(i, colId, editsRef, selectedRowsRef);
             if (val !== null && val !== undefined) vals.add(String(val));
        }
        return Array.from(vals).sort().slice(0, 100);
    }, [colId, editsRef, selectedRowsRef]);

    const [selectedVals, setSelectedVals] = useState(
      existingRule?.values ? new Set(existingRule.values) : new Set(uniqueValues),
    );

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
            <div className="cr10-filter-backdrop" onClick={closeFilter} />
            <div
              className="cr10-filter-popup"
              style={{ top: rect.bottom + 8, left: rect.left, width: 260 }}
            >
                <div className="cr10-filter-header">
                    Text Filter
                    <button type="button" onClick={handleClear} className="cr10-filter-clear">Clear</button>
                </div>

                <div className="cr10-filter-body">
                    <div className="cr10-filter-search-wrap">
                        <span className="cr10-filter-search-icon">🔍</span>
                        <input
                            autoFocus
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            placeholder="Contains..."
                            className="cr10-filter-search"
                        />
                    </div>

                    <div className="cr10-filter-list">
                        <label className="cr10-filter-option">
                            <input
                              type="checkbox"
                              className="cr10-filter-checkbox"
                              checked={selectedVals.size === uniqueValues.length}
                              onChange={(e) => setSelectedVals(e.target.checked ? new Set(uniqueValues) : new Set())}
                            />
                            (Select All)
                        </label>
                        {uniqueValues.map(v => (
                            <label key={v} className="cr10-filter-option cr10-filter-option--nested">
                                <input
                                  type="checkbox"
                                  className="cr10-filter-checkbox"
                                  checked={selectedVals.has(v)}
                                  onChange={(e) => {
                                    const next = new Set(selectedVals);
                                    if (e.target.checked) next.add(v); else next.delete(v);
                                    setSelectedVals(next);
                                }}
                                />
                                <span className="cr10-filter-option-text">{v}</span>
                            </label>
                        ))}
                    </div>

                    <button type="button" onClick={handleApply} className="cr10-filter-apply">
                        Apply Filter
                    </button>
                </div>
            </div>
        </>
    );
};

// --- REACT PAGINATION COMPONENT ---
const PaginationUI = ({
  current,
  pageSize,
  total,
  onChange,
}: {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, size: number) => void;
}) => {
    const totalPages = Math.ceil(total / pageSize) || 1;
    const [jumpPage, setJumpPage] = useState('');

    const getPages = (): (number | string)[] => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (current <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...'); pages.push(totalPages);
            } else if (current >= totalPages - 3) {
                pages.push(1); pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1); pages.push('...');
                pages.push(current - 1); pages.push(current); pages.push(current + 1);
                pages.push('...'); pages.push(totalPages);
            }
        }
        return pages;
    };

    const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        <div className="cr10-pagination">
            <div className="cr10-pagination__total">Total {total} items</div>

            <div className="cr10-pagination__pages">
                <button
                  type="button"
                  disabled={current === 1}
                  onClick={() => onChange(current - 1, pageSize)}
                  className="cr10-page-btn cr10-page-btn--nav"
                >
                  &lt;
                </button>
                {getPages().map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={p === '...'}
                      onClick={() => p !== '...' && onChange(p as number, pageSize)}
                      className={`cr10-page-btn ${p === current ? 'cr10-page-btn--current' : p === '...' ? 'cr10-page-btn--ellipsis' : ''}`}
                    >
                        {p}
                    </button>
                ))}
                <button
                  type="button"
                  disabled={current === totalPages}
                  onClick={() => onChange(current + 1, pageSize)}
                  className="cr10-page-btn cr10-page-btn--nav"
                >
                  &gt;
                </button>
            </div>

            <div className="cr10-page-size-wrap">
                <select
                  value={pageSize}
                  onChange={(e) => onChange(1, parseInt(e.target.value, 10))}
                  className="cr10-page-size-select"
                >
                    {[25, 50, 100, 500, 2000, 5000, 10000].map(sz => (
                      <option key={sz} value={sz}>{sz} / page</option>
                    ))}
                </select>
                <span className="cr10-page-size-arrow">▼</span>
            </div>

            <div className="cr10-page-jump">
                Go to{' '}
                <input
                  type="text"
                  value={jumpPage}
                  onChange={e => setJumpPage(e.target.value)}
                  onKeyDown={handleJump}
                  className="cr10-page-jump-input"
                />{' '}
                Page
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function HaTableCustomRowHeight10() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ colId: number; rect: DOMRect } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, setRenderTick] = useState(0);

  const scrollEnforcerRef = useRef<HTMLDivElement>(null);
  const headerCenterWrapperRef = useRef<HTMLDivElement>(null);
  const bodyCenterWrapperRef = useRef<HTMLDivElement>(null);
  const leftPaneHeaderRef = useRef<HTMLDivElement>(null);
  const leftPaneBodyRef = useRef<HTMLDivElement>(null);
  const bodyLeftWrapperRef = useRef<HTMLDivElement>(null);
  const centerPaneHeaderRef = useRef<HTMLDivElement>(null);
  const centerPaneBodyRef = useRef<HTMLDivElement>(null);
  const rightPaneHeaderRef = useRef<HTMLDivElement>(null);
  const rightPaneBodyRef = useRef<HTMLDivElement>(null);
  const bodyRightWrapperRef = useRef<HTMLDivElement>(null);

  const rowCenterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cellCenterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const headerCenterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const groupCenterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowLeftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cellLeftRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const headerLeftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const groupLeftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cellRightRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const headerRightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const groupRightRefs = useRef<(HTMLDivElement | null)[]>([]);

  const editsRef = useRef<Record<string, unknown>>({});
  const sortRulesRef = useRef<{ colIndex: number; dir: 'asc' | 'desc' }[]>([]);
  const filterRulesRef = useRef<Record<number, { text: string; values: Set<string> }>>({});
  const isMultiSortRef = useRef(false);
  const selectedRowsRef = useRef(new Set<number>());

  const rowHeightsRef = useRef(new Float64Array(TOTAL_ROWS).fill(DEFAULT_ROW_HEIGHT));
  const rowLayoutRef = useRef<{ positions: Float64Array; totalHeight: number }>({
    positions: new Float64Array(0),
    totalHeight: 0,
  });
  const requestRowRecalcRef = useRef(false);

  const fullDataMapRef = useRef(Array.from({ length: TOTAL_ROWS }, (_, i) => i));
  const rowOrderMapRef = useRef(Array.from({ length: 50 }, (_, i) => i));
  const paginationRef = useRef({ current: 1, pageSize: 50, total: TOTAL_ROWS });

  const [colOrder, setColOrder] = useState(() => Array.from({ length: TOTAL_COLS + 1 }, (_, i) => i));
  const collapsedGroupsRef = useRef<Record<string, boolean>>({});
  const groupCountsRef = useRef<Record<string, number>>({});
  const [collapsedGroupsTick, setCollapsedGroupsTick] = useState(0);
  const editorOpenedAtRef = useRef(0);

  const colWidthsRef = useRef<Record<number, number>>({});
  const leftLayoutRef = useRef<{ positions: number[]; totalWidth: number; groups: { name: string; left: number; width: number }[] }>({ positions: [], totalWidth: 0, groups: [] });
  const centerLayoutRef = useRef<{ positions: number[]; totalWidth: number; groups: { name: string; left: number; width: number }[] }>({ positions: [], totalWidth: 0, groups: [] });
  const rightLayoutRef = useRef<{ positions: number[]; totalWidth: number; groups: { name: string; left: number; width: number }[] }>({ positions: [], totalWidth: 0, groups: [] });
  const dragRef = useRef({ isDragging: false, colId: null as number | null, startX: 0, startWidth: 0 });

  const [isPinned, setIsPinned] = useState(false);

  const wrapCols = useMemo(() => {
    return colOrder.filter(c => getColumnType(c) === 'text-wrap');
  }, [colOrder]);

  const measuredRowsRef = useRef(new Uint8Array(TOTAL_ROWS));
  const measurerRef = useRef<HTMLDivElement>(null);

  const measureRowHeight = useCallback((rowId: number) => {
    if (measuredRowsRef.current[rowId]) return rowHeightsRef.current[rowId];

    let maxH = DEFAULT_ROW_HEIGHT;
    const measurer = measurerRef.current;
    if (!measurer) return maxH;

    wrapCols.forEach(colId => {
      const data = getCellData(rowId, colId, editsRef, selectedRowsRef);
      const colWidth = colWidthsRef.current[colId] || getInitialWidth(colId);

      measurer.style.width = `${colWidth}px`;
      measurer.innerHTML = generateCellHTML('text-wrap', data);

      const h = Math.max(DEFAULT_ROW_HEIGHT, measurer.scrollHeight);
      if (h > maxH) maxH = h;
    });

    measuredRowsRef.current[rowId] = 1;
    if (Math.abs(maxH - rowHeightsRef.current[rowId]) > 1) {
      rowHeightsRef.current[rowId] = maxH;
      requestRowRecalcRef.current = true;
    }
    return maxH;
  }, [wrapCols]);

  const { visibleColOrder } = useMemo(() => {
    const counts: Record<string, number> = {};
    colOrder.forEach(c => { const g = getColGroup(c); if (g) counts[g] = (counts[g] || 0) + 1; });
    groupCountsRef.current = counts;
    const visible: number[] = [];
    const seen = new Set<string>();
    colOrder.forEach(c => {
        const g = getColGroup(c);
        if (g && collapsedGroupsRef.current[g]) {
          if (!seen.has(g)) { visible.push(c); seen.add(g); }
        } else visible.push(c);
    });
    return { visibleColOrder: visible };
  }, [colOrder, collapsedGroupsTick]);

  const { leftCols, rightCols, centerCols } = useMemo(() => {
    if (isPinned) {
        return {
            leftCols: visibleColOrder.filter(c => c === 0 || c === 1 || c === 5),
            rightCols: visibleColOrder.filter(c => c === TOTAL_COLS),
            centerCols: visibleColOrder.filter(c => c !== 0 && c !== 1 && c !== 5 && c !== TOTAL_COLS),
        };
    }
    return { leftCols: [] as number[], rightCols: [] as number[], centerCols: visibleColOrder };
  }, [isPinned, visibleColOrder]);

  const buildLayout = useCallback((cols: number[]) => {
      let total = 0;
      const pos: number[] = [];
      let currentGroup: string | null = null;
      let groupStartX = 0;
      let groupWidth = 0;
      const groups: { name: string; left: number; width: number }[] = [];
      for (let i = 0; i < cols.length; i++) {
          const c = cols[i];
          pos.push(total);
          const w = colWidthsRef.current[c] || getInitialWidth(c);
          const gName = getColGroup(c);
          if (gName !== currentGroup) {
              if (currentGroup) groups.push({ name: currentGroup, left: groupStartX, width: groupWidth });
              currentGroup = gName;
              groupStartX = total;
              groupWidth = w;
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
      const leftW = leftLayoutRef.current.totalWidth;
      const centerW = centerLayoutRef.current.totalWidth;
      const rightW = rightLayoutRef.current.totalWidth;

      const totalH = rowLayoutRef.current.totalHeight + HEADER_HEIGHT;
      setStyle(scrollEnforcerRef.current, 'width', `${leftW + centerW + rightW}px`);
      setStyle(scrollEnforcerRef.current, 'height', `${totalH}px`);

      setStyle(leftPaneHeaderRef.current, 'width', `${leftW}px`);
      setStyle(leftPaneBodyRef.current, 'width', `${leftW}px`);
      setStyle(rightPaneHeaderRef.current, 'width', `${rightW}px`);
      setStyle(rightPaneBodyRef.current, 'width', `${rightW}px`);
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
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) setViewport({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const rowPoolSize = viewport.height > 0 ? Math.ceil(viewport.height / DEFAULT_ROW_HEIGHT) + OVERSCAN : 0;
  const colPoolSize = viewport.width > 0 ? Math.ceil(viewport.width / MIN_COL_WIDTH) + OVERSCAN : 0;

  const populateDOMCell = useCallback((cellNode: HTMLDivElement, actualRowId: number, actualColId: number) => {
      const type = getColumnType(actualColId);
      const isSel = selectedRowsRef.current.has(actualRowId);
      const dataCoord = type === 'row-select' ? `${actualRowId}-${actualColId}-${isSel}` : `${actualRowId}-${actualColId}`;
      if (cellNode.dataset.coord === dataCoord) return;

      cellNode.dataset.coord = dataCoord;
      cellNode.dataset.row = String(actualRowId);
      cellNode.dataset.col = String(actualColId);
      cellNode.innerHTML = generateCellHTML(type, getCellData(actualRowId, actualColId, editsRef, selectedRowsRef));

      const isWrap = type === 'text-wrap';
      const isInteractive = ['editable-text', 'dropdown', 'checkbox', 'row-select'].includes(type);
      const cellClasses = [
        'ag-cell',
        isWrap ? '' : 'ag-cell--nowrap',
        actualColId === 1 ? 'ag-cell--id' : '',
        isInteractive ? 'ag-cell--interactive' : '',
      ].filter(Boolean).join(' ');

      setClass(cellNode, cellClasses);

      if (isWrap) {
          cellNode.style.height = 'auto';
          const requiredHeight = Math.max(DEFAULT_ROW_HEIGHT, cellNode.scrollHeight);
          cellNode.style.height = '100%';

          measuredRowsRef.current[actualRowId] = 1;

          if (Math.abs(requiredHeight - rowHeightsRef.current[actualRowId]) > 1) {
              rowHeightsRef.current[actualRowId] = requiredHeight;
              requestRowRecalcRef.current = true;
          }
      }
  }, [measureRowHeight]);

  const populateDOMHeader = useCallback((headerNode: HTMLDivElement, actualColId: number) => {
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
              ? '<div class="cr10-header-checkbox-indeterminate"><div class="cr10-header-checkbox-indeterminate-bar"></div></div>'
              : `<input type="checkbox" class="cr10-cell-checkbox" ${isAll ? 'checked' : ''} />`;
          headerContentHTML = `<div class="cr10-header-inner cr10-header-inner--center">${checkboxHtml}</div>`;
      } else {
          let sortIcon = '';
          if (ruleIndex >= 0) {
            sortIcon = `<span class="cr10-sort-icon">${sortRulesRef.current[ruleIndex].dir === 'asc' ? '▲' : '▼'}</span>`;
          } else if (isSortable) {
            sortIcon = '<span class="cr10-sort-icon cr10-sort-icon--idle">↕</span>';
          }

          let filterIcon = '';
          if (isSortable || colType === 'tags') {
              filterIcon = `<svg class="filter-icon ${hasFilter ? 'filter-icon--active' : ''}" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V6.58579C21 6.851 20.8946 7.10536 20.7071 7.29289L14 14V20.5C14 20.8978 13.5826 21.1447 13.2361 20.9715L10.2361 19.4715C10.0911 19.399 10 19.2536 10 19V14L3.29289 7.29289C3.10536 7.10536 3 6.851 3 6.58579V4Z"/></svg>`;
          }

          headerContentHTML = `<div class="cr10-header-inner cr10-header-inner--between"><span class="cr10-header-title">${getColTitle(actualColId)}</span><div class="cr10-header-icons">${filterIcon}${sortIcon}</div></div>`;
      }

      headerNode.innerHTML = `${headerContentHTML}<div class="cr10-resize-handle" data-col="${actualColId}"></div>`;
      setStyle(headerNode, 'top', hasGroup ? '24px' : '0px');
      setStyle(headerNode, 'height', hasGroup ? '36px' : '60px');

      const headerClasses = [
        'ag-header-cell',
        colType === 'row-select' ? 'ag-header-cell--select' : 'ag-header-cell--default',
        actualColId === TOTAL_COLS ? 'ag-header-cell--action' : '',
        isSortable ? 'ag-header-cell--sortable' : '',
      ].filter(Boolean).join(' ');
      setClass(headerNode, headerClasses);
  }, []);

  const redrawVanillaDOM = useCallback((scrollTop: number, scrollLeft: number) => {
    if (!rowPoolSize || !colPoolSize) return;

    const roundedScrollTop = Math.max(0, Math.round(scrollTop));
    const roundedScrollLeft = Math.max(0, Math.round(scrollLeft));

    const rowPosArr = rowLayoutRef.current.positions;
    let startRow = 0;
    for (let i = 0; i < rowPosArr.length; i++) { if (rowPosArr[i] > roundedScrollTop) break; startRow = i; }

    const centerPosArr = centerLayoutRef.current.positions;
    let startCol = 0;
    for (let i = 0; i < centerPosArr.length; i++) { if (centerPosArr[i] > roundedScrollLeft) break; startCol = i; }

    setStyle(bodyCenterWrapperRef.current, 'transform', `translate3d(-${roundedScrollLeft}px, -${roundedScrollTop}px, 0)`);
    setStyle(headerCenterWrapperRef.current, 'transform', `translate3d(-${roundedScrollLeft}px, 0px, 0)`);
    setStyle(bodyLeftWrapperRef.current, 'transform', `translate3d(0, -${roundedScrollTop}px, 0)`);
    setStyle(bodyRightWrapperRef.current, 'transform', `translate3d(0, -${roundedScrollTop}px, 0)`);

    for (let r = 0; r < rowPoolSize; r++) {
      let offsetRow = r - (startRow % rowPoolSize);
      if (offsetRow < 0) offsetRow += rowPoolSize;
      const logicalRowIndex = startRow + offsetRow;
      const actualRowId = rowOrderMapRef.current[logicalRowIndex];
      const isVisibleRow = logicalRowIndex < rowOrderMapRef.current.length;

      if (isVisibleRow && !measuredRowsRef.current[actualRowId]) {
        measureRowHeight(actualRowId);
      }

      const absoluteRowY = rowPosArr[logicalRowIndex] || 0;
      const rowHeight = rowHeightsRef.current[actualRowId] || DEFAULT_ROW_HEIGHT;
      const rowYTransform = `translate3d(0, ${absoluteRowY}px, 0)`;

      const rowVariant = selectedRowsRef.current.has(actualRowId)
        ? 'cr10-row--selected'
        : logicalRowIndex % 2 === 0 ? 'cr10-row--even' : 'cr10-row--odd';
      const rowClass = `cr10-row ${rowVariant}`;
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
        let offsetCol = c - (startCol % colPoolSize);
        if (offsetCol < 0) offsetCol += colPoolSize;
        const logicalColIndex = startCol + offsetCol;
        const isVisibleCol = logicalColIndex < centerCols.length;
        const cellNode = cellCenterRefs.current[`${r}-${c}`];
        if (!cellNode) continue;
        setStyle(cellNode, 'transform', `translate3d(${centerPosArr[logicalColIndex] || 0}px, 0, 0)`);
        setStyle(cellNode, 'width', `${colWidthsRef.current[centerCols[logicalColIndex]] || getInitialWidth(centerCols[logicalColIndex])}px`);
        setStyle(cellNode, 'display', isVisibleCol ? 'flex' : 'none');
        if (isVisibleCol) populateDOMCell(cellNode, actualRowId, centerCols[logicalColIndex]);
      }
      for (let c = 0; c < leftCols.length; c++) {
          const cellNode = cellLeftRefs.current[`${r}-${c}`];
          if (!cellNode) continue;
          setStyle(cellNode, 'transform', `translate3d(${leftLayoutRef.current.positions[c]}px, 0, 0)`);
          setStyle(cellNode, 'width', `${colWidthsRef.current[leftCols[c]] || getInitialWidth(leftCols[c])}px`);
          populateDOMCell(cellNode, actualRowId, leftCols[c]);
      }
      for (let c = 0; c < rightCols.length; c++) {
          const cellNode = cellRightRefs.current[`${r}-${c}`];
          if (!cellNode) continue;
          setStyle(cellNode, 'transform', `translate3d(${rightLayoutRef.current.positions[c]}px, 0, 0)`);
          setStyle(cellNode, 'width', `${colWidthsRef.current[rightCols[c]] || getInitialWidth(rightCols[c])}px`);
          populateDOMCell(cellNode, actualRowId, rightCols[c]);
      }
    }

    for (let c = 0; c < colPoolSize; c++) {
        let offsetCol = c - (startCol % colPoolSize);
        if (offsetCol < 0) offsetCol += colPoolSize;
        const logicalColIndex = startCol + offsetCol;
        const headerNode = headerCenterRefs.current[c];
        if (!headerNode) continue;
        setStyle(headerNode, 'transform', `translate3d(${centerPosArr[logicalColIndex] || 0}px, 0, 0)`);
        setStyle(headerNode, 'width', `${colWidthsRef.current[centerCols[logicalColIndex]] || getInitialWidth(centerCols[logicalColIndex])}px`);
        setStyle(headerNode, 'display', logicalColIndex < centerCols.length ? 'flex' : 'none');
        if (logicalColIndex < centerCols.length) populateDOMHeader(headerNode, centerCols[logicalColIndex]);
    }
    for (let c = 0; c < leftCols.length; c++) {
        const headerNode = headerLeftRefs.current[c];
        if (!headerNode) continue;
        setStyle(headerNode, 'transform', `translate3d(${leftLayoutRef.current.positions[c]}px, 0, 0)`);
        setStyle(headerNode, 'width', `${colWidthsRef.current[leftCols[c]] || getInitialWidth(leftCols[c])}px`);
        populateDOMHeader(headerNode, leftCols[c]);
    }
    for (let c = 0; c < rightCols.length; c++) {
        const headerNode = headerRightRefs.current[c];
        if (!headerNode) continue;
        setStyle(headerNode, 'transform', `translate3d(${rightLayoutRef.current.positions[c]}px, 0, 0)`);
        setStyle(headerNode, 'width', `${colWidthsRef.current[rightCols[c]] || getInitialWidth(rightCols[c])}px`);
        populateDOMHeader(headerNode, rightCols[c]);
    }

    const updateGroups = (
      layout: typeof centerLayoutRef.current,
      refs: React.RefObject<(HTMLDivElement | null)[]>,
    ) => {
        const visibleGroups = layout.groups;
        for (let i = 0; i < 30; i++) {
            const node = refs.current[i];
            if (!node) continue;
            const g = visibleGroups[i];
            if (g) {
                setStyle(node, 'display', 'flex');
                setStyle(node, 'transform', `translate3d(${g.left}px, 0, 0)`);
                setStyle(node, 'width', `${g.width}px`);
                const isCollapsed = collapsedGroupsRef.current[g.name];
                const count = groupCountsRef.current[g.name] || 0;
                const newHtmlKey = `${g.name}-${isCollapsed}-${count}`;
                if (node.dataset.name !== newHtmlKey) {
                    node.dataset.name = newHtmlKey;
                    const icon = isCollapsed ? '➕' : '➖';
                    const extraHtml = isCollapsed && count > 1
                      ? `<span class="cr10-group-badge">+${count - 1}</span>`
                      : '';
                    node.innerHTML = `<div class="cr10-group-header"><div class="collapse-trigger" data-group="${g.name}"><span class="cr10-group-icon">${icon}</span><span>${g.name}</span>${extraHtml}</div></div>`;
                }
            } else {
              setStyle(node, 'display', 'none');
            }
        }
    };
    updateGroups(centerLayoutRef.current, groupCenterRefs);
    updateGroups(leftLayoutRef.current, groupLeftRefs);
    updateGroups(rightLayoutRef.current, groupRightRefs);

    if (requestRowRecalcRef.current) {
        requestRowRecalcRef.current = false;
        recalcRowLayout();
        updateShellDimensions();
        requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
            }
        });
    }
  }, [rowPoolSize, colPoolSize, centerCols, leftCols, rightCols, populateDOMCell, populateDOMHeader, recalcRowLayout, updateShellDimensions]);

  useEffect(() => {
      recalcRowLayout();
      recalcColLayouts();
      updateShellDimensions();
      [cellCenterRefs, cellLeftRefs, cellRightRefs].forEach(ref => {
        Object.values(ref.current).forEach(n => { if (n) n.dataset.coord = 'INVALID'; });
      });
      [headerCenterRefs, headerLeftRefs, headerRightRefs].forEach(ref => {
        Object.values(ref.current).forEach(n => { if (n) n.dataset.col = 'INVALID'; });
      });
      if (rowPoolSize > 0 && colPoolSize > 0 && scrollContainerRef.current) {
        redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
      }
  }, [isPinned, colOrder, collapsedGroupsTick, rowPoolSize, colPoolSize, recalcColLayouts, recalcRowLayout, updateShellDimensions, redrawVanillaDOM]);

  useEffect(() => {
      let rafId: number;
      const handleMouseMove = (e: MouseEvent) => {
          if (!dragRef.current.isDragging) return;
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
              const { colId, startX, startWidth } = dragRef.current;
              if (colId === null) return;
              colWidthsRef.current[colId] = Math.max(MIN_COL_WIDTH, Math.round(startWidth + (e.clientX - startX)));

              if (getColumnType(colId) === 'text-wrap') {
                  measuredRowsRef.current.fill(0);
              }

              recalcColLayouts();
              updateShellDimensions();
              if (scrollContainerRef.current) {
                redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
              }
          });
      };
      const handleMouseUp = () => {
          if (dragRef.current.isDragging) {
              dragRef.current.isDragging = false;
              document.body.style.cursor = '';
              document.body.classList.remove('is-resizing-col');

              measuredRowsRef.current.fill(0);

              [cellCenterRefs, cellLeftRefs, cellRightRefs].forEach(ref => {
                Object.values(ref.current).forEach(n => { if (n) n.dataset.coord = 'INVALID'; });
              });
              if (scrollContainerRef.current) {
                redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
              }

              setRenderTick(t => t + 1);
          }
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
  }, [recalcColLayouts, updateShellDimensions, redrawVanillaDOM]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    let isScrolling = false;
    let scrollTimeout: ReturnType<typeof setTimeout>;
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

  const applyPagination = useCallback((page: number, size: number, fullArray: number[]) => {
      const start = (page - 1) * size;
      const end = start + size;
      rowOrderMapRef.current = fullArray.slice(start, end);
      paginationRef.current = { current: page, pageSize: size, total: fullArray.length };

      recalcRowLayout();
      updateShellDimensions();

      if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
          [cellCenterRefs, cellLeftRefs, cellRightRefs].forEach(ref => {
            Object.values(ref.current).forEach(n => { if (n) n.dataset.coord = 'INVALID'; });
          });
          [headerCenterRefs, headerLeftRefs, headerRightRefs].forEach(ref => {
            Object.values(ref.current).forEach(n => { if (n) n.dataset.col = 'INVALID'; });
          });
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
                  const colId = parseInt(colIdStr, 10);
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
          for (const rule of sortRulesRef.current) {
            const valA = getCellData(rowA, rule.colIndex, editsRef, selectedRowsRef);
            const valB = getCellData(rowB, rule.colIndex, editsRef, selectedRowsRef);
            if (valA === valB) continue;
            if (typeof valA === 'boolean' && typeof valB === 'boolean') {
              return rule.dir === 'asc' ? (valA === valB ? 0 : valA ? 1 : -1) : (valA === valB ? 0 : valA ? -1 : 1);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
              return rule.dir === 'asc' ? valA - valB : valB - valA;
            }
            return rule.dir === 'asc'
              ? String(valA).localeCompare(String(valB))
              : String(valB).localeCompare(String(valA));
          }
          return 0;
        });
      }

      fullDataMapRef.current = pointers;
      applyPagination(1, paginationRef.current.pageSize, pointers);
    });
  }, [applyPagination]);

  const handleTableMouseDown = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('cr10-resize-handle')) {
          e.stopPropagation();
          e.preventDefault();
          const colId = parseInt(target.dataset.col || '', 10);
          dragRef.current = {
            isDragging: true,
            colId,
            startX: e.clientX,
            startWidth: colWidthsRef.current[colId] || getInitialWidth(colId),
          };
          document.body.style.cursor = 'col-resize';
          document.body.classList.add('is-resizing-col');
      }
  };

  const handleTableClick = useCallback((e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const collapseTrigger = target.closest('.collapse-trigger') as HTMLElement | null;
      if (collapseTrigger) {
          e.stopPropagation();
          const group = collapseTrigger.dataset.group;
          if (group) collapsedGroupsRef.current[group] = !collapsedGroupsRef.current[group];
          setCollapsedGroupsTick(t => t + 1);
          return;
      }

      const filterIcon = target.closest('.filter-icon');
      if (filterIcon) {
          e.stopPropagation();
          const headerNode = target.closest('.ag-header-cell') as HTMLElement | null;
          if (headerNode) {
              const rect = filterIcon.getBoundingClientRect();
              setActiveFilter({ colId: parseInt(headerNode.dataset.col || '', 10), rect });
          }
          return;
      }

      const cellNode = target.closest('.ag-cell') as HTMLElement | null;
      if (cellNode) {
          const rowId = parseInt(cellNode.dataset.row || '', 10);
          const colId = parseInt(cellNode.dataset.col || '', 10);
          const type = getColumnType(colId);
          if (type === 'row-select') {
              if (selectedRowsRef.current.has(rowId)) selectedRowsRef.current.delete(rowId);
              else selectedRowsRef.current.add(rowId);
              if (scrollContainerRef.current) {
                redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
              }
              setRenderTick(t => t + 1);
              return;
          }
          if (type === 'action') {
              const actionBtn = target.closest('[data-action]') as HTMLElement | null;
              if (actionBtn) {
                  const msg = document.createElement('div');
                  msg.className = 'cr10-toast';
                  msg.innerText = `${actionBtn.dataset.action?.toUpperCase()} triggered for Record ID: ${rowId}`;
                  document.body.appendChild(msg);
                  setTimeout(() => document.body.removeChild(msg), 2000);
              }
              return;
          }
          if (type === 'checkbox') {
              editsRef.current[`${rowId}-${colId}`] = !getCellData(rowId, colId, editsRef, selectedRowsRef);
              cellNode.dataset.coord = 'INVALID';
              if (scrollContainerRef.current) {
                redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
              }
              if (sortRulesRef.current.some(r => r.colIndex === colId)) executeDataPipeline();
              return;
          }
          if (type === 'editable-text' || type === 'dropdown') {
              editorOpenedAtRef.current = Date.now();
              setActiveCell({ rowId, colIndex: colId, type, rect: cellNode.getBoundingClientRect() });
          }
      }

      const headerNode = target.closest('.ag-header-cell') as HTMLElement | null;
      if (headerNode && headerNode.dataset.col) {
          if (target.classList.contains('cr10-resize-handle')) return;
          const colIndex = parseInt(headerNode.dataset.col, 10);
          const colType = getColumnType(colIndex);
          if (colType === 'row-select') {
              if (selectedRowsRef.current.size === fullDataMapRef.current.length) selectedRowsRef.current.clear();
              else { for (const i of fullDataMapRef.current) selectedRowsRef.current.add(i); }
              if (scrollContainerRef.current) {
                redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
              }
              setRenderTick(t => t + 1);
              return;
          }
          if (colType === 'chart' || colType === 'tags' || colType === 'action') return;

          const existingIdx = sortRulesRef.current.findIndex(r => r.colIndex === colIndex);
          if (!isMultiSortRef.current) {
            sortRulesRef.current = existingIdx >= 0 && sortRulesRef.current[existingIdx].dir === 'asc'
              ? [{ colIndex, dir: 'desc' }]
              : [{ colIndex, dir: 'asc' }];
          } else if (existingIdx >= 0) {
            if (sortRulesRef.current[existingIdx].dir === 'asc') sortRulesRef.current[existingIdx].dir = 'desc';
            else sortRulesRef.current.splice(existingIdx, 1);
          } else {
            sortRulesRef.current.push({ colIndex, dir: 'asc' });
          }
          executeDataPipeline();
      }
  }, [redrawVanillaDOM, executeDataPipeline]);

  const handleEditorCommit = (value: string) => {
      if (!activeCell) return;
      editsRef.current[`${activeCell.rowId}-${activeCell.colIndex}`] = value;
      measuredRowsRef.current[activeCell.rowId] = 0; 
      [cellCenterRefs.current, cellLeftRefs.current, cellRightRefs.current].forEach(pane => {
          const nodeKey = Object.keys(pane).find(
            k => pane[k]?.dataset?.coord === `${activeCell.rowId}-${activeCell.colIndex}`,
          );
          if (nodeKey && pane[nodeKey]) pane[nodeKey].dataset.coord = 'INVALID';
      });
      const committedCol = activeCell.colIndex;
      setActiveCell(null);
      if (scrollContainerRef.current) {
        redrawVanillaDOM(scrollContainerRef.current.scrollTop, scrollContainerRef.current.scrollLeft);
      }
      if (sortRulesRef.current.some(r => r.colIndex === committedCol)) executeDataPipeline();
  };

  const handleDragStart = (e: React.DragEvent) => {
      const headerNode = (e.target as HTMLElement).closest('.ag-header-cell') as HTMLElement | null;
      if (headerNode && headerNode.dataset.col) {
        e.dataTransfer.setData('text/plain', headerNode.dataset.col);
        e.dataTransfer.effectAllowed = 'move';
        headerNode.style.opacity = '0.5';
      }
  };
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const headerNode = (e.target as HTMLElement).closest('.ag-header-cell') as HTMLElement | null;
      if (headerNode) {
        document.querySelectorAll('.ag-header-cell').forEach(el => el.classList.remove('ag-header-cell--drag-target'));
        headerNode.classList.add('ag-header-cell--drag-target');
      }
  };
  const handleDragEnd = (e: React.DragEvent) => {
      const headerNode = (e.target as HTMLElement).closest('.ag-header-cell') as HTMLElement | null;
      if (headerNode) headerNode.style.opacity = '1';
      document.querySelectorAll('.ag-header-cell').forEach(el => el.classList.remove('ag-header-cell--drag-target'));
  };
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      document.querySelectorAll('.ag-header-cell').forEach(el => el.classList.remove('ag-header-cell--drag-target'));
      const sourceCol = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const targetNode = (e.target as HTMLElement).closest('.ag-header-cell') as HTMLElement | null;

      if (targetNode && targetNode.dataset.col) {
          const targetCol = parseInt(targetNode.dataset.col, 10);
          if (!isNaN(sourceCol) && sourceCol !== targetCol) {
              setColOrder(prev => {
                  const newOrder = [...prev];
                  const idxA = newOrder.indexOf(sourceCol);
                  const idxB = newOrder.indexOf(targetCol);
                  if (idxA !== -1 && idxB !== -1) { newOrder[idxA] = targetCol; newOrder[idxB] = sourceCol; }
                  measuredRowsRef.current.fill(0);
                  return newOrder;
              });
          }
      }
  };

  const leftPanePinnedClass = isPinned ? 'cr10-pane--pinned-left' : '';
  const rightPanePinnedClass = isPinned ? 'cr10-pane--pinned-right' : '';
  const leftBodyPinnedClass = isPinned ? 'cr10-pane--pinned-body-left' : '';
  const rightBodyPinnedClass = isPinned ? 'cr10-pane--pinned-body-right' : '';

  return (
    <div className="cr10 cr10-app">
      <div className="cr10-toolbar">
        <div className="cr10-toolbar__actions">
          <button
            type="button"
            onClick={() => {
              isMultiSortRef.current = !isMultiSortRef.current;
              sortRulesRef.current = [];
              executeDataPipeline();
            }}
            className={`cr10-btn ${isMultiSortRef.current ? 'cr10-btn--sort-active' : 'cr10-btn--sort-inactive'}`}
          >
            {isMultiSortRef.current ? '✓ Multi-Sort Enabled' : 'Single Sort Mode'}
          </button>
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`cr10-btn ${isPinned ? 'cr10-btn--pin-active' : 'cr10-btn--pin-inactive'}`}
          >
            📌 {isPinned ? 'Unpin Columns' : 'Pin Columns'}
          </button>
          <span className="cr10-toolbar__hint">
             Scrollbar adjusts flawlessly when changing the pagination size below!
          </span>
        </div>
        {isPending && <span className="cr10-toolbar__pending">Running Data Pipeline...</span>}
      </div>

      <div className={`cr10-table-shell ${isPending ? 'cr10-table-shell--pending' : 'cr10-table-shell--ready'}`}>
        {activeCell && (
            <div
              className="cr10-editor-overlay"
              style={{
                top: activeCell.rect.top,
                left: activeCell.rect.left,
                width: activeCell.rect.width,
                height: activeCell.rect.height,
              }}
            >
                 <EditorInput
                   activeCell={activeCell}
                   getCellData={getCellData}
                   editsRef={editsRef}
                   selectedRowsRef={selectedRowsRef}
                   handleEditorCommit={handleEditorCommit}
                 />
            </div>
        )}

        {activeFilter && (
            <ColumnFilterPopup
                activeFilter={activeFilter}
                closeFilter={() => setActiveFilter(null)}
                filterRulesRef={filterRulesRef}
                executeDataPipeline={executeDataPipeline}
                editsRef={editsRef}
                selectedRowsRef={selectedRowsRef}
            />
        )}

        <div ref={scrollContainerRef} className="cr10-scroll">
          <div ref={scrollEnforcerRef} className="cr10-scroll-enforcer" />

          <div
            className="cr10-sticky-layer"
            onMouseDown={handleTableMouseDown}
            onClick={handleTableClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
             <div className="cr10-header-band">
               <div
                 ref={leftPaneHeaderRef}
                 className={`cr10-pane cr10-pane--left ${leftPanePinnedClass}`}
                 style={{ display: isPinned ? 'block' : 'none' }}
               >
                   {Array.from({ length: 10 }).map((_, g) => (
                     <div key={`g-${g}`} ref={el => { groupLeftRefs.current[g] = el; }} className="cr10-pool-node cr10-pool-node--group" />
                   ))}
                   {leftCols.map((_, i) => (
                     <div key={i} ref={el => { headerLeftRefs.current[i] = el; }} className="cr10-pool-node" style={{ height: '100%' }} />
                   ))}
               </div>

               <div ref={centerPaneHeaderRef} className="cr10-pane cr10-pane--center-header">
                   <div ref={headerCenterWrapperRef} className="cr10-pane-wrapper">
                       {Array.from({ length: 30 }).map((_, g) => (
                         <div key={`g-${g}`} ref={el => { groupCenterRefs.current[g] = el; }} className="cr10-pool-node cr10-pool-node--group" />
                       ))}
                       {Array.from({ length: colPoolSize }).map((_, c) => (
                         <div key={c} ref={el => { headerCenterRefs.current[c] = el; }} className="cr10-pool-node" style={{ height: '100%' }} />
                       ))}
                   </div>
               </div>

               <div
                 ref={rightPaneHeaderRef}
                 className={`cr10-pane cr10-pane--right ${rightPanePinnedClass}`}
                 style={{ display: isPinned ? 'block' : 'none' }}
               >
                   {Array.from({ length: 10 }).map((_, g) => (
                     <div key={`g-${g}`} ref={el => { groupRightRefs.current[g] = el; }} className="cr10-pool-node cr10-pool-node--group" />
                   ))}
                   {rightCols.map((_, i) => (
                     <div key={i} ref={el => { headerRightRefs.current[i] = el; }} className="cr10-pool-node" style={{ height: '100%' }} />
                   ))}
               </div>
             </div>

             <div className="cr10-body-band">
               <div
                 ref={leftPaneBodyRef}
                 className={`cr10-pane cr10-pane--body-left ${leftBodyPinnedClass}`}
                 style={{ display: isPinned ? 'block' : 'none' }}
               >
                   <div ref={bodyLeftWrapperRef} className="cr10-pane-wrapper">
                       {Array.from({ length: rowPoolSize }).map((_, r) => (
                           <div key={r} ref={el => { rowLeftRefs.current[r] = el; }} className="cr10-pool-node">
                               {leftCols.map((_, c) => (
                                 <div key={`${r}-${c}`} ref={el => { cellLeftRefs.current[`${r}-${c}`] = el; }} className="cr10-pool-node" />
                               ))}
                           </div>
                       ))}
                   </div>
               </div>

               <div ref={centerPaneBodyRef} className="cr10-pane cr10-pane--center-body">
                   <div ref={bodyCenterWrapperRef} className="cr10-pane-wrapper">
                       {Array.from({ length: rowPoolSize }).map((_, r) => (
                           <div key={r} ref={el => { rowCenterRefs.current[r] = el; }} className="cr10-pool-node">
                               {Array.from({ length: colPoolSize }).map((_, c) => (
                                 <div key={`${r}-${c}`} ref={el => { cellCenterRefs.current[`${r}-${c}`] = el; }} className="cr10-pool-node" />
                               ))}
                           </div>
                       ))}
                   </div>
               </div>

               <div
                 ref={rightPaneBodyRef}
                 className={`cr10-pane cr10-pane--body-right ${rightBodyPinnedClass}`}
                 style={{ display: isPinned ? 'block' : 'none' }}
               >
                   <div ref={bodyRightWrapperRef} className="cr10-pane-wrapper">
                       {Array.from({ length: rowPoolSize }).map((_, r) => (
                           <div key={r} ref={el => { rowRightRefs.current[r] = el; }} className="cr10-pool-node">
                               {rightCols.map((_, c) => (
                                 <div key={`${r}-${c}`} ref={el => { cellRightRefs.current[`${r}-${c}`] = el; }} className="cr10-pool-node" />
                               ))}
                           </div>
                       ))}
                   </div>
               </div>
             </div>
          </div>
        </div>

        <div
          ref={measurerRef}
          className="ag-cell"
          style={{ position: 'fixed', visibility: 'hidden', top: -9999, left: -9999, height: 'auto', pointerEvents: 'none' }}
        />

        <div className="cr10-footer">
          <div className="cr10-footer__left">
              <span className="cr10-selected-badge">
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
