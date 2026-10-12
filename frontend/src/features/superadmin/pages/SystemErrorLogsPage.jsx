import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { superAdminApi } from '../api/superAdminApi';

export const SystemErrorLogsPage = () => {
  const toastRef = useRef(null);

  // Data states
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ totalErrors: 0, todayErrors: 0, unresolvedCount: 0, count500: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusCode, setStatusCode] = useState(null);
  const [isResolved, setIsResolved] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Selected Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [page, pageSize, statusCode, isResolved]);

  const loadLogs = async (customSearch = search) => {
    try {
      setLoading(true);
      const params = {
        page,
        pageSize,
        search: customSearch || undefined,
        statusCode: statusCode || undefined,
        isResolved: isResolved !== null ? isResolved : undefined,
      };
      const res = await superAdminApi.getErrorLogs(params);
      if (res.success && res.data) {
        setLogs(res.data.items || []);
        setTotalCount(res.data.totalCount || 0);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (e) {
      console.error(e);
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load system error logs.',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs(search);
  };

  const openLogDetail = async (id) => {
    try {
      const res = await superAdminApi.getErrorLogById(id);
      if (res.success && res.data) {
        setSelectedLog(res.data);
        setResolutionNotes(res.data.resolutionNotes || '');
        setDetailModalOpen(true);
      }
    } catch (e) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to fetch error details.',
        life: 3000,
      });
    }
  };

  const handleToggleResolve = async (log) => {
    try {
      if (log.isResolved) {
        await superAdminApi.unresolveErrorLog(log.id);
        toastRef.current?.show({ severity: 'info', summary: 'Updated', detail: 'Marked as unresolved.', life: 2500 });
      } else {
        await superAdminApi.resolveErrorLog(log.id, { resolutionNotes: resolutionNotes || 'Resolved by Super Admin' });
        toastRef.current?.show({ severity: 'success', summary: 'Resolved', detail: 'Marked as resolved.', life: 2500 });
      }
      loadLogs();
      if (detailModalOpen && selectedLog?.id === log.id) {
        setDetailModalOpen(false);
      }
    } catch (e) {
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to update resolution status.', life: 3000 });
    }
  };

  const handleDelete = (id) => {
    confirmDialog({
      message: 'Are you sure you want to delete this error log entry?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await superAdminApi.deleteErrorLog(id);
          toastRef.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Log entry removed.', life: 2500 });
          loadLogs();
          if (detailModalOpen && selectedLog?.id === id) {
            setDetailModalOpen(false);
          }
        } catch (e) {
          toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to delete log entry.', life: 3000 });
        }
      },
    });
  };

  const handleClearResolved = () => {
    confirmDialog({
      message: 'Are you sure you want to permanently clear all resolved error logs?',
      header: 'Clear Resolved Logs',
      icon: 'pi pi-trash',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          const res = await superAdminApi.clearResolvedLogs();
          toastRef.current?.show({ severity: 'success', summary: 'Cleared', detail: res.message || 'Resolved logs cleared.', life: 3000 });
          loadLogs();
        } catch (e) {
          toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to clear resolved logs.', life: 3000 });
        }
      },
    });
  };

  const copyToClipboard = (text, label = 'Text') => {
    navigator.clipboard.writeText(text);
    toastRef.current?.show({ severity: 'success', summary: 'Copied', detail: `${label} copied to clipboard!`, life: 2000 });
  };

  // Method tag
  const methodTemplate = (row) => {
    const colors = {
      GET: '#0284c7',
      POST: '#16a34a',
      PUT: '#ea580c',
      DELETE: '#dc2626',
      PATCH: '#7c3aed',
    };
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: '11px',
          color: '#ffffff',
          backgroundColor: colors[row.httpMethod] || '#475569',
        }}
      >
        {row.httpMethod}
      </span>
    );
  };

  // Status tag
  const statusTemplate = (row) => {
    let sev = 'info';
    if (row.statusCode >= 500) sev = 'danger';
    else if (row.statusCode >= 400) sev = 'warning';
    return <Tag value={`${row.statusCode}`} severity={sev} style={{ fontSize: '11px', fontWeight: 700 }} />;
  };

  const statusFilterOptions = [
    { label: 'All Status Codes', value: null },
    { label: '500 Server Error', value: 500 },
    { label: '400 Bad Request', value: 400 },
    { label: '404 Not Found', value: 404 },
    { label: '401 Unauthorized', value: 401 },
  ];

  const resolvedFilterOptions = [
    { label: 'All Logs', value: null },
    { label: 'Unresolved Only', value: false },
    { label: 'Resolved Only', value: true },
  ];

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toastRef} />
      <ConfirmDialog />

      {/* Header Banner */}
      <div className="flex flex-column md:flex-row align-items-start md:align-items-center justify-content-between bg-white p-4 border-round-lg shadow-1 border-1 surface-border gap-3">
        <div>
          <div className="flex align-items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 m-0">System Error Logs & Diagnostics</h2>
            <Tag value="SuperAdmin Live" severity="danger" style={{ fontSize: '10px' }} />
          </div>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Real-time server exception tracking across all schools, modules, and API endpoints (Kya error aaya, Kb aaya, Kyu aaya).
          </p>
        </div>
        <div className="flex align-items-center gap-2">
          <Button
            label="Refresh"
            icon="pi pi-refresh"
            size="small"
            outlined
            severity="secondary"
            loading={loading}
            onClick={() => loadLogs()}
          />
          <Button
            label="Clear Resolved"
            icon="pi pi-check"
            size="small"
            severity="warning"
            outlined
            onClick={handleClearResolved}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid">
        <div className="col-12 sm:col-6 md:col-3">
          <div className="bg-white p-3 border-round-lg shadow-1 border-1 surface-border flex align-items-center justify-content-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Errors</span>
              <span className="text-2xl font-bold text-slate-800 mt-1 block">{summary.totalErrors}</span>
            </div>
            <div className="border-circle w-3rem h-3rem flex align-items-center justify-content-center bg-indigo-50 text-indigo-600">
              <i className="pi pi-database text-xl"></i>
            </div>
          </div>
        </div>

        <div className="col-12 sm:col-6 md:col-3">
          <div className="bg-white p-3 border-round-lg shadow-1 border-1 surface-border flex align-items-center justify-content-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Today's Errors</span>
              <span className="text-2xl font-bold text-orange-600 mt-1 block">{summary.todayErrors}</span>
            </div>
            <div className="border-circle w-3rem h-3rem flex align-items-center justify-content-center bg-orange-50 text-orange-600">
              <i className="pi pi-calendar text-xl"></i>
            </div>
          </div>
        </div>

        <div className="col-12 sm:col-6 md:col-3">
          <div className="bg-white p-3 border-round-lg shadow-1 border-1 surface-border flex align-items-center justify-content-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Unresolved</span>
              <span className="text-2xl font-bold text-red-600 mt-1 block">{summary.unresolvedCount}</span>
            </div>
            <div className="border-circle w-3rem h-3rem flex align-items-center justify-content-center bg-red-50 text-red-600">
              <i className="pi pi-exclamation-circle text-xl"></i>
            </div>
          </div>
        </div>

        <div className="col-12 sm:col-6 md:col-3">
          <div className="bg-white p-3 border-round-lg shadow-1 border-1 surface-border flex align-items-center justify-content-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">500 Server Errors</span>
              <span className="text-2xl font-bold text-pink-600 mt-1 block">{summary.count500}</span>
            </div>
            <div className="border-circle w-3rem h-3rem flex align-items-center justify-content-center bg-pink-50 text-pink-600">
              <i className="pi pi-bolt text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3 border-round-lg shadow-1 border-1 surface-border flex flex-column md:flex-row align-items-stretch md:align-items-center justify-content-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex align-items-center gap-2 flex-1">
          <span className="p-input-icon-left flex-1">
            <i className="pi pi-search" />
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by URL, error message, root cause, user, Error ID..."
              className="w-full p-inputtext-sm"
              style={{ fontSize: '13px' }}
            />
          </span>
          <Button label="Search" icon="pi pi-filter" size="small" type="submit" />
          {search && (
            <Button
              icon="pi pi-times"
              size="small"
              text
              severity="secondary"
              onClick={() => {
                setSearch('');
                setPage(1);
                loadLogs('');
              }}
            />
          )}
        </form>

        <div className="flex align-items-center gap-2 flex-wrap">
          <Dropdown
            value={statusCode}
            options={statusFilterOptions}
            onChange={(e) => {
              setStatusCode(e.value);
              setPage(1);
            }}
            placeholder="Status"
            className="p-inputtext-sm"
            style={{ width: '160px', fontSize: '12.5px' }}
          />

          <Dropdown
            value={isResolved}
            options={resolvedFilterOptions}
            onChange={(e) => {
              setIsResolved(e.value);
              setPage(1);
            }}
            placeholder="Resolution"
            className="p-inputtext-sm"
            style={{ width: '150px', fontSize: '12.5px' }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border-round-lg shadow-1 border-1 surface-border overflow-hidden">
        <DataTable
          value={logs}
          loading={loading}
          paginator
          rows={pageSize}
          totalRecords={totalCount}
          lazy
          first={(page - 1) * pageSize}
          onPage={(e) => {
            setPage(Math.floor(e.first / e.rows) + 1);
            setPageSize(e.rows);
          }}
          rowsPerPageOptions={[10, 15, 25, 50]}
          emptyMessage="No system errors matching your criteria."
          className="p-datatable-sm"
          stripedRows
        >
          {/* Timestamp */}
          <Column
            header="Kb Aaya (Time)"
            body={(row) => (
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-xs text-slate-500 font-mono block" style={{ fontSize: '10.5px' }}>
                  {new Date(row.timestamp).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            style={{ width: '135px' }}
          />

          {/* Status & Method */}
          <Column
            header="Status"
            body={(row) => (
              <div className="flex align-items-center gap-1">
                {statusTemplate(row)}
                {methodTemplate(row)}
              </div>
            )}
            style={{ width: '125px' }}
          />

          {/* Request Path */}
          <Column
            header="Kahan Aaya (Endpoint URL)"
            body={(row) => (
              <div>
                <span className="font-mono text-xs font-bold text-slate-800 block" style={{ wordBreak: 'break-all' }}>
                  {row.requestPath}
                </span>
                <span className="font-mono text-xs text-indigo-600 block" style={{ fontSize: '10px' }}>
                  {row.errorId}
                </span>
              </div>
            )}
            style={{ width: '230px' }}
          />

          {/* Error Message & Root Cause */}
          <Column
            header="Kya Error Aaya (Message & Root Cause)"
            body={(row) => (
              <div>
                <span className="text-xs font-semibold text-red-700 block" style={{ lineHeight: 1.3 }}>
                  {row.message}
                </span>
                {row.rootCause && row.rootCause !== row.message && (
                  <span className="text-xs text-slate-600 block mt-1 bg-red-50 p-1 border-round" style={{ fontSize: '11px' }}>
                    <b className="text-red-800">Kyu Aaya:</b> {row.rootCause}
                  </span>
                )}
              </div>
            )}
          />

          {/* User / Actor */}
          <Column
            header="User / Branch"
            body={(row) => (
              <div>
                {row.username ? (
                  <span className="text-xs font-bold text-slate-800 block">{row.username}</span>
                ) : (
                  <span className="text-xs text-slate-400 italic block">Anonymous / Public</span>
                )}
                <span className="text-xs text-slate-500 block" style={{ fontSize: '10px' }}>
                  {row.userRole || 'No Role'} {row.branchId ? `• Branch #${row.branchId}` : ''}
                </span>
              </div>
            )}
            style={{ width: '140px' }}
          />

          {/* Resolved Status */}
          <Column
            header="Resolved"
            body={(row) => (
              <div>
                {row.isResolved ? (
                  <Tag value="Resolved" severity="success" style={{ fontSize: '10.5px' }} />
                ) : (
                  <Tag value="Unresolved" severity="danger" style={{ fontSize: '10.5px' }} />
                )}
              </div>
            )}
            style={{ width: '100px' }}
          />

          {/* Actions */}
          <Column
            header="Action"
            body={(row) => (
              <div className="flex align-items-center gap-1">
                <Button
                  icon="pi pi-eye"
                  size="small"
                  text
                  rounded
                  severity="info"
                  tooltip="View Full Details"
                  onClick={() => openLogDetail(row.id)}
                />
                <Button
                  icon={row.isResolved ? 'pi pi-undo' : 'pi pi-check'}
                  size="small"
                  text
                  rounded
                  severity={row.isResolved ? 'secondary' : 'success'}
                  tooltip={row.isResolved ? 'Mark as Unresolved' : 'Mark as Resolved'}
                  onClick={() => handleToggleResolve(row)}
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  text
                  rounded
                  severity="danger"
                  tooltip="Delete Log"
                  onClick={() => handleDelete(row.id)}
                />
              </div>
            )}
            style={{ width: '120px' }}
          />
        </DataTable>
      </div>

      {/* Detailed Modal */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-exclamation-triangle text-red-600 text-lg"></i>
            <span className="font-bold text-base text-slate-800">
              Error Investigation: {selectedLog?.errorId}
            </span>
          </div>
        }
        visible={detailModalOpen}
        onHide={() => setDetailModalOpen(false)}
        style={{ width: '850px', maxWidth: '95vw' }}
        modal
        className="p-fluid"
      >
        {selectedLog && (
          <div className="flex flex-column gap-3 pt-2">
            {/* Top Quick Status Strip */}
            <div className="flex align-items-center justify-content-between p-3 border-round-lg bg-slate-900 text-white">
              <div className="flex align-items-center gap-2">
                {methodTemplate(selectedLog)}
                {statusTemplate(selectedLog)}
                <span className="font-mono text-sm font-bold text-slate-100">{selectedLog.requestPath}</span>
              </div>
              <Button
                label="Copy Details"
                icon="pi pi-copy"
                size="small"
                outlined
                severity="secondary"
                style={{ color: '#ffffff', borderColor: '#475569' }}
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(selectedLog, null, 2),
                    'Full error JSON'
                  )
                }
              />
            </div>

            {/* Box 1: Kya Error Aaya */}
            <div className="p-3 border-round-lg bg-red-50 border-1 border-red-200">
              <div className="flex align-items-center justify-content-between mb-1">
                <span className="text-xs font-bold text-red-900 uppercase tracking-wide">1. Kya Error Aaya (Exception)</span>
                <span className="text-xs font-mono text-slate-600">{selectedLog.exceptionType}</span>
              </div>
              <p className="text-sm font-semibold text-red-800 m-0" style={{ lineHeight: 1.4 }}>
                {selectedLog.message}
              </p>

              {/* Kyu Aaya / Root Cause */}
              {selectedLog.rootCause && (
                <div className="mt-2 pt-2 border-top-1 border-red-200">
                  <span className="text-xs font-bold text-red-950 uppercase tracking-wide block mb-0.5">
                    Kyu Aaya (Deepest Root Cause):
                  </span>
                  <span className="text-xs font-mono text-red-900 font-bold block bg-white p-2 border-round border-1 border-red-300">
                    {selectedLog.rootCause}
                  </span>
                </div>
              )}
            </div>

            {/* Box 2: Kb Aaya & Request Context */}
            <div className="grid">
              <div className="col-12 sm:col-6">
                <div className="p-3 border-round-lg bg-slate-50 border-1 surface-border h-full">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                    2. Kb Aaya (Timestamp)
                  </span>
                  <div className="flex flex-column gap-1 text-xs">
                    <div><b>Local Time:</b> {new Date(selectedLog.timestamp).toLocaleString()}</div>
                    <div><b>UTC Time:</b> {new Date(selectedLog.timestamp).toUTCString()}</div>
                    <div><b>Error Ref ID:</b> <code className="text-indigo-700 font-bold">{selectedLog.errorId}</code></div>
                  </div>
                </div>
              </div>

              <div className="col-12 sm:col-6">
                <div className="p-3 border-round-lg bg-slate-50 border-1 surface-border h-full">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                    User & Network Context
                  </span>
                  <div className="flex flex-column gap-1 text-xs">
                    <div><b>User:</b> {selectedLog.username || 'Anonymous'} (ID: {selectedLog.userId || '—'})</div>
                    <div><b>Role:</b> {selectedLog.userRole || 'N/A'} • Branch #{selectedLog.branchId || '—'}</div>
                    <div><b>IP Address:</b> {selectedLog.ipAddress || '127.0.0.1'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Query String if present */}
            {selectedLog.queryString && (
              <div className="p-2 border-round bg-slate-100 text-xs font-mono">
                <b>Query:</b> {selectedLog.queryString}
              </div>
            )}

            {/* Box 3: Stack Trace */}
            {selectedLog.stackTrace && (
              <div className="border-round-lg overflow-hidden border-1 surface-border">
                <div className="flex align-items-center justify-content-between p-2 bg-slate-800 text-white text-xs px-3">
                  <span className="font-bold">3. Technical Stack Trace</span>
                  <Button
                    label="Copy Stack"
                    icon="pi pi-copy"
                    text
                    size="small"
                    style={{ color: '#93c5fd', padding: '2px 6px', fontSize: '11px' }}
                    onClick={() => copyToClipboard(selectedLog.stackTrace, 'Stack trace')}
                  />
                </div>
                <pre
                  className="m-0 p-3 bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto"
                  style={{ maxHeight: '220px', lineHeight: 1.4, fontSize: '11px' }}
                >
                  {selectedLog.stackTrace}
                </pre>
              </div>
            )}

            {/* Box 4: Resolution Status & Notes */}
            <div className="p-3 border-round-lg bg-slate-50 border-1 surface-border">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                Resolution Management
              </span>
              <div className="flex align-items-center gap-2 mb-2">
                <Tag
                  value={selectedLog.isResolved ? 'Resolved' : 'Unresolved'}
                  severity={selectedLog.isResolved ? 'success' : 'danger'}
                />
                {selectedLog.isResolved && (
                  <span className="text-xs text-slate-500">
                    by <b>{selectedLog.resolvedBy}</b> on {new Date(selectedLog.resolvedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex flex-column gap-1 mb-2">
                <label className="text-xs font-semibold text-slate-600">Resolution Notes (Optional):</label>
                <InputTextarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Fixed database constraint, migrated data, updated API validation..."
                  className="p-inputtext-sm text-xs"
                />
              </div>

              <div className="flex align-items-center justify-content-end gap-2">
                <Button
                  label={selectedLog.isResolved ? 'Mark as Unresolved' : 'Mark as Resolved'}
                  icon={selectedLog.isResolved ? 'pi pi-undo' : 'pi pi-check'}
                  size="small"
                  severity={selectedLog.isResolved ? 'secondary' : 'success'}
                  onClick={() => handleToggleResolve(selectedLog)}
                />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default SystemErrorLogsPage;
