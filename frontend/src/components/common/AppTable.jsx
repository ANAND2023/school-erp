import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { FilterMatchMode } from 'primereact/api';
import { AppButton } from './AppButton';
import { usePermission } from '../../hooks/usePermission';

/**
 * Enterprise AppTable component wrapping PrimeReact DataTable
 * 
 * Features:
 * - Header toolbar with Title, Global Search, Add Button, Export to CSV, Refresh
 * - Supports both PrimeReact column format ({ field, header, body }) 
 *   and MUI DataGrid format ({ field, headerName, renderCell }) for seamless compatibility
 * - Built-in sorting, filtering, responsive pagination
 * - Striped rows, loading overlay, customizable empty state
 */
export const AppTable = ({
  title,
  subTitle,
  columns = [],
  data = [],
  rows: rowsProp, // Compatibility alias for data
  loading = false,
  menuKey,
  onAddClick,
  addLabel = 'Add New',
  canAdd: canAddProp,
  onExportClick,
  canExport: canExportProp,
  showExport,
  showSearch,
  showHeader = true,
  autoScrollOnEdges = true,
  onRefresh,
  extraHeaderActions,
  paginator = true,
  rowsPerPage = 10,
  rowsPerPageOptions = [10, 25, 50, 100],
  selection,
  onSelectionChange,
  selectionMode,
  dataKey = 'id',
  emptyMessage = 'No records found.',
  className = '',
  style,
  stripedRows = true,
  showGridlines = false,
  size = 'small',
  sortField,
  sortOrder,
  headerContent,
  footerContent,
  rowClassName,
  onRowClick,
  // Server-side pagination & MUI DataGrid compatibility
  rowCount,
  totalRecords: totalRecordsProp,
  paginationMode,
  paginationModel,
  onPaginationModelChange,
  pageSizeOptions,
  lazy: lazyProp,
  onPage: onPageProp,
  first: firstProp,
  ...rest
}) => {
  const { hasPermission } = usePermission();
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });
  const [clientFirst, setClientFirst] = useState(firstProp || 0);
  const [clientRows, setClientRows] = useState(rowsPerPage || 10);

  const tableData = data && data.length > 0 ? data : (rowsProp || []);

  useEffect(() => {
    setClientFirst(0);
  }, [globalFilterValue, tableData.length]);

  const canAdd = canAddProp !== undefined ? canAddProp : (!menuKey || hasPermission(menuKey, 'Add'));
  const canExport = canExportProp !== undefined ? canExportProp : (!menuKey || hasPermission(menuKey, 'Export'));

  // Standardize columns (accepts both PrimeReact and MUI formats)
  const normalizedColumns = useMemo(() => {
    return columns.map((col) => {
      const header = col.header || col.headerName || col.field;
      const field = col.field;
      const sortable = col.sortable !== undefined ? col.sortable : true;

      // Calculate width style
      const colWidth = col.width !== undefined ? (typeof col.width === 'number' ? `${col.width}px` : col.width) : undefined;
      const colMinWidth = col.minWidth !== undefined ? (typeof col.minWidth === 'number' ? `${col.minWidth}px` : col.minWidth) : undefined;
      const colFlex = col.flex ? `${col.flex} ${col.flex} 0px` : undefined;

      const mergedStyle = {
        ...(colWidth ? { width: colWidth, minWidth: colWidth } : {}),
        ...(colMinWidth ? { minWidth: colMinWidth } : {}),
        ...(colFlex ? { flex: colFlex } : {}),
        ...(col.style || {}),
      };

      // Handle renderCell & valueGetter from MUI DataGrid
      let body = col.body;
      if (!body) {
        if (col.renderCell) {
          body = (rowData) => {
            let cellValue = rowData[field];
            if (typeof col.valueGetter === 'function') {
              try {
                // MUI DataGrid v6: (value, row) => ...
                const computed = col.valueGetter(cellValue, rowData);
                if (computed !== undefined) cellValue = computed;
              } catch (e) {
                try {
                  // MUI DataGrid v5: (params) => ...
                  cellValue = col.valueGetter({ value: cellValue, row: rowData, field });
                } catch (e2) {}
              }
            }
            return col.renderCell({
              row: rowData,
              value: cellValue,
              field,
            });
          };
        } else if (typeof col.valueGetter === 'function') {
          body = (rowData) => {
            try {
              const computed = col.valueGetter(rowData[field], rowData);
              if (computed !== undefined) return computed;
            } catch (e) {
              try {
                return col.valueGetter({ value: rowData[field], row: rowData, field });
              } catch (e2) {}
            }
            return rowData[field];
          };
        }
      }

      return {
        ...col,
        field,
        header,
        sortable,
        body,
        style: mergedStyle,
      };
    });
  }, [columns]);

  const rightFrozenCol = useMemo(() => {
    return normalizedColumns.find((c) => c.frozen && (c.alignFrozen === 'right' || !c.alignFrozen));
  }, [normalizedColumns]);

  const rightFrozenWidth = useMemo(() => {
    if (!rightFrozenCol) return 0;
    const w = rightFrozenCol.width || rightFrozenCol.minWidth || 0;
    return typeof w === 'number' ? w : parseInt(w, 10) || 0;
  }, [rightFrozenCol]);

  // Edge Auto-scroll & Overflow Indicators
  const containerRef = useRef(null);
  const animIdRef = useRef(null);
  const currentSpeedRef = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const getScrollWrapper = useCallback(() => {
    if (containerRef.current) {
      return containerRef.current.querySelector('.p-datatable-wrapper');
    }
    return null;
  }, []);

  const updateScrollIndicators = useCallback(() => {
    const wrapper = getScrollWrapper();
    if (!wrapper) return;
    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
    if (maxScroll <= 2) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
    } else {
      setCanScrollLeft(wrapper.scrollLeft > 6);
      setCanScrollRight(wrapper.scrollLeft < maxScroll - 6);
    }
  }, [getScrollWrapper]);

  const stopAutoScroll = useCallback(() => {
    if (animIdRef.current) {
      cancelAnimationFrame(animIdRef.current);
      animIdRef.current = null;
    }
    currentSpeedRef.current = 0;
  }, []);

  const startAutoScroll = useCallback((wrapper) => {
    if (animIdRef.current) return;

    const step = () => {
      if (!currentSpeedRef.current || !wrapper) {
        stopAutoScroll();
        return;
      }

      const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
      const nextScroll = wrapper.scrollLeft + currentSpeedRef.current;

      if (currentSpeedRef.current < 0) {
        if (wrapper.scrollLeft <= 0) {
          wrapper.scrollLeft = 0;
          updateScrollIndicators();
          stopAutoScroll();
          return;
        }
        wrapper.scrollLeft = Math.max(0, nextScroll);
      } else {
        if (wrapper.scrollLeft >= maxScroll) {
          wrapper.scrollLeft = maxScroll;
          updateScrollIndicators();
          stopAutoScroll();
          return;
        }
        wrapper.scrollLeft = Math.min(maxScroll, nextScroll);
      }

      updateScrollIndicators();
      animIdRef.current = requestAnimationFrame(step);
    };

    animIdRef.current = requestAnimationFrame(step);
  }, [stopAutoScroll, updateScrollIndicators]);

  const handleMouseMove = useCallback((e) => {
    if (!autoScrollOnEdges) return;
    const wrapper = getScrollWrapper();
    if (!wrapper) return;

    // Do not scroll if hovering directly on interactive action buttons or form controls or frozen column
    if (e.target.closest('button:not(.app-table-scroll-btn), a, input, select, .MuiIconButton-root, .p-inputtext, .p-dropdown, .p-frozen-column')) {
      stopAutoScroll();
      return;
    }

    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
    if (maxScroll <= 2) {
      stopAutoScroll();
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    if (mouseY < rect.top || mouseY > rect.bottom) {
      stopAutoScroll();
      return;
    }

    const EDGE_THRESHOLD = 80;
    const MAX_SPEED = 14;

    const distFromLeft = mouseX - rect.left;
    const distFromRight = rect.right - mouseX;

    if (distFromLeft >= 0 && distFromLeft <= EDGE_THRESHOLD) {
      if (wrapper.scrollLeft > 0) {
        const ratio = 1 - (distFromLeft / EDGE_THRESHOLD);
        currentSpeedRef.current = -Math.max(3, Math.round(ratio * MAX_SPEED));
        startAutoScroll(wrapper);
        return;
      }
    } else if (distFromRight >= 0 && distFromRight <= EDGE_THRESHOLD) {
      if (wrapper.scrollLeft < maxScroll - 1) {
        const ratio = 1 - (distFromRight / EDGE_THRESHOLD);
        currentSpeedRef.current = Math.max(3, Math.round(ratio * MAX_SPEED));
        startAutoScroll(wrapper);
        return;
      }
    }

    stopAutoScroll();
  }, [autoScrollOnEdges, getScrollWrapper, startAutoScroll, stopAutoScroll]);

  const handleMouseLeave = useCallback(() => {
    stopAutoScroll();
  }, [stopAutoScroll]);

  useEffect(() => {
    let cleanup = null;
    const init = () => {
      const wrapper = getScrollWrapper();
      if (!wrapper) return;

      updateScrollIndicators();

      const onScroll = () => updateScrollIndicators();
      wrapper.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', updateScrollIndicators);

      cleanup = () => {
        wrapper.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', updateScrollIndicators);
        stopAutoScroll();
      };
    };

    init();
    const timer = setTimeout(init, 100);

    return () => {
      clearTimeout(timer);
      if (cleanup) cleanup();
      stopAutoScroll();
    };
  }, [getScrollWrapper, updateScrollIndicators, stopAutoScroll, tableData, normalizedColumns]);

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const clearFilter = () => {
    const _filters = { ...filters };
    _filters['global'].value = null;
    setFilters(_filters);
    setGlobalFilterValue('');
  };

  // Default CSV export handler if not custom
  const dtRef = React.useRef(null);
  const handleExport = () => {
    if (onExportClick) {
      onExportClick();
    } else if (dtRef.current) {
      dtRef.current.exportCSV();
    }
  };

  const renderHeader = () => {
    if (showHeader === false || headerContent === false || headerContent === null) {
      return null;
    }
    if (headerContent) return headerContent;

    const hasTitle = Boolean(title || subTitle);
    const hasSearch = showSearch !== undefined ? showSearch : (hasTitle || Boolean(menuKey));
    const exportAllowed = showExport !== undefined
      ? showExport
      : (Boolean(onExportClick) || (Boolean(menuKey) && hasPermission(menuKey, 'Export')));

    // If there is no title, no add, no refresh, no extra actions, no export, and no search, don't render an empty bar
    const hasHeaderContent = hasTitle || Boolean(onAddClick && canAdd) || Boolean(onRefresh) || Boolean(extraHeaderActions) || exportAllowed || hasSearch;
    if (!hasHeaderContent) {
      return null;
    }

    return (
      <div className="flex flex-wrap align-items-center justify-content-between gap-2 p-2">
        <div className="flex flex-column">
          {title && <h2 className="text-xl font-bold m-0 text-800">{title}</h2>}
          {subTitle && <span className="text-sm text-500 mt-1">{subTitle}</span>}
        </div>

        <div className="flex flex-wrap align-items-center gap-1 sm:gap-2">
          {/* Global Search Box */}
          {hasSearch && (
            <div className="relative flex align-items-center">
              <i
                className="pi pi-search text-400 pointer-events-none"
                style={{ left: '0.5rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)', fontSize: '10px' }}
              />
              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder="Search..."
                className="p-inputtext-sm"
                style={{
                  width: '110px',
                  height: '28px',
                  fontSize: '11px',
                  paddingLeft: '1.5rem',
                  paddingRight: globalFilterValue ? '1.4rem' : '0.5rem',
                  borderRadius: '4px',
                }}
              />
              {globalFilterValue && (
                <i
                  className="pi pi-times cursor-pointer text-400 hover:text-600"
                  style={{ right: '0.45rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)', fontSize: '10px' }}
                  onClick={clearFilter}
                />
              )}
            </div>
          )}

          {/* Extra header actions */}
          {extraHeaderActions}

          {/* Refresh Button */}
          {onRefresh && (
            <AppButton
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              size="small"
              tooltip="Refresh"
              onClick={onRefresh}
            />
          )}

          {/* Export Button */}
          {exportAllowed && (
            <AppButton
              label="Export"
              icon="pi pi-file-export"
              severity="secondary"
              outlined
              size="small"
              onClick={handleExport}
            />
          )}

          {/* Add New Button */}
          {onAddClick && canAdd && (
            <AppButton
              label={addLabel}
              icon="pi pi-plus"
              severity="primary"
              size="small"
              onClick={onAddClick}
            />
          )}
        </div>
      </div>
    );
  };

  const isLazy = lazyProp !== undefined ? !!lazyProp : (paginationMode === 'server' || (rowCount !== undefined && paginationModel !== undefined));
  const effectiveTotal = isLazy ? (rowCount !== undefined ? rowCount : totalRecordsProp) : (tableData ? tableData.length : 0);
  const effectiveFirst = isLazy
    ? (paginationModel ? (paginationModel.page || 0) * (paginationModel.pageSize || rowsPerPage) : (firstProp || 0))
    : clientFirst;
  const effectiveRows = isLazy
    ? (paginationModel ? (paginationModel.pageSize || rowsPerPage) : (rowsPerPage || 10))
    : clientRows;

  return (
    <div
      ref={containerRef}
      className={`surface-card p-2 shadow-1 border-round-lg mb-2 app-table-root ${className} ${canScrollLeft ? 'app-table-has-left-shadow' : ''} ${canScrollRight ? 'app-table-has-right-shadow' : ''}`}
      style={{ position: 'relative', ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Floating Left Scroll Button */}
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          className="app-table-scroll-btn app-table-scroll-btn-left"
          onClick={() => {
            const wrapper = getScrollWrapper();
            if (wrapper) wrapper.scrollBy({ left: -220, behavior: 'smooth' });
          }}
          onMouseEnter={() => {
            const wrapper = getScrollWrapper();
            if (wrapper) {
              currentSpeedRef.current = -14;
              startAutoScroll(wrapper);
            }
          }}
          onMouseLeave={stopAutoScroll}
        >
          <i className="pi pi-chevron-left" />
        </button>
      )}

      {/* Floating Right Scroll Button */}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll right"
          className="app-table-scroll-btn app-table-scroll-btn-right"
          style={rightFrozenWidth > 0 ? { right: `${rightFrozenWidth + 8}px` } : undefined}
          onClick={() => {
            const wrapper = getScrollWrapper();
            if (wrapper) wrapper.scrollBy({ left: 220, behavior: 'smooth' });
          }}
          onMouseEnter={() => {
            const wrapper = getScrollWrapper();
            if (wrapper) {
              currentSpeedRef.current = 14;
              startAutoScroll(wrapper);
            }
          }}
          onMouseLeave={stopAutoScroll}
        >
          <i className="pi pi-chevron-right" />
        </button>
      )}

      <DataTable
        ref={dtRef}
        value={tableData}
        loading={loading}
        header={renderHeader()}
        footer={footerContent}
        filters={filters}
        globalFilterFields={normalizedColumns.map((c) => c.field).filter(Boolean)}
        paginator={paginator}
        lazy={isLazy}
        totalRecords={effectiveTotal}
        first={effectiveFirst}
        rows={effectiveRows}
        rowsPerPageOptions={pageSizeOptions || rowsPerPageOptions}
        onPage={(e) => {
          if (!isLazy) {
            setClientFirst(e.first);
            setClientRows(e.rows);
          }
          if (onPaginationModelChange) {
            onPaginationModelChange({ page: e.page, pageSize: e.rows });
          }
          if (onPageProp) {
            onPageProp(e);
          }
        }}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
        stripedRows={stripedRows}
        showGridlines={showGridlines}
        size={size}
        sortField={sortField}
        sortOrder={sortOrder}
        selection={selection}
        onSelectionChange={onSelectionChange}
        selectionMode={selectionMode}
        dataKey={dataKey}
        emptyMessage={
          <div className="text-center p-4 text-500">
            <i className="pi pi-folder-open text-4xl mb-2 block text-300" />
            <span>{emptyMessage}</span>
          </div>
        }
        rowClassName={rowClassName}
        onRowClick={onRowClick}
        responsiveLayout="scroll"
        scrollable={rest.scrollable !== undefined ? rest.scrollable : normalizedColumns.some((c) => c.frozen)}
        {...rest}
      >
        {selectionMode === 'checkbox' && (
          <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
        )}

        {normalizedColumns.map((col, index) => (
          <Column
            key={col.field || index}
            field={col.field}
            header={col.header}
            sortable={col.sortable}
            body={col.body}
            style={col.style}
            headerStyle={col.headerStyle || col.style}
            bodyStyle={col.bodyStyle || col.style}
            align={col.align}
            alignHeader={col.alignHeader || col.align}
            frozen={col.frozen}
            alignFrozen={col.alignFrozen || (col.frozen ? 'right' : undefined)}
          />
        ))}
      </DataTable>
    </div>
  );
};

export default AppTable;
