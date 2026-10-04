import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { superAdminApi } from '../api/superAdminApi';

export const GlobalAuditLogsPage = () => {
  const toastRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getAuditLogs(null, 100);
      if (res.success) setLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const actionBodyTemplate = (rowData) => {
    let sev = 'info';
    if (rowData.action.includes('CREATED')) sev = 'success';
    if (rowData.action.includes('UPDATED') || rowData.action.includes('RENEWED')) sev = 'warning';
    if (rowData.action.includes('IMPERSONAT')) sev = 'danger';

    return <Tag value={rowData.action} severity={sev} style={{ fontSize: '11px' }} />;
  };

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toastRef} />

      <div className="flex align-items-center justify-content-between bg-white p-4 border-round-lg shadow-1 border-1 surface-border">
        <div>
          <h2 className="text-xl font-bold text-slate-800 m-0">Cross-Tenant Global Audit Trail</h2>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Immutable log of all school onboarding, module configuration updates, subscription extensions, and impersonation sessions.
          </p>
        </div>
        <Button label="Refresh Trail" icon="pi pi-refresh" size="small" outlined severity="secondary" onClick={loadLogs} />
      </div>

      <div className="bg-white border-round-lg shadow-1 border-1 surface-border overflow-hidden">
        <DataTable
          value={logs}
          loading={loading}
          paginator
          rows={15}
          rowsPerPageOptions={[15, 30, 50]}
          emptyMessage="No audit logs recorded yet."
          className="p-datatable-sm"
          stripedRows
        >
          <Column
            header="Timestamp"
            body={(row) => (
              <span className="text-xs font-mono text-slate-600">
                {new Date(row.createdOn).toLocaleString()}
              </span>
            )}
            style={{ width: '180px' }}
          />
          <Column header="Action" body={actionBodyTemplate} style={{ width: '180px' }} />
          <Column
            header="Tenant / School"
            body={(row) => (
              <span className="font-semibold text-xs text-slate-800">
                {row.schoolName || 'Platform Wide'}
              </span>
            )}
            style={{ width: '200px' }}
          />
          <Column
            header="Actor (Admin)"
            body={(row) => (
              <div className="flex align-items-center gap-1">
                <span className="font-mono text-xs text-indigo-700">{row.actorUsername}</span>
                {row.wasImpersonated && (
                  <Tag value="Impersonated" severity="warning" style={{ fontSize: '9px', padding: '0 4px' }} />
                )}
              </div>
            )}
            style={{ width: '160px' }}
          />
          <Column field="entityName" header="Entity" style={{ width: '130px' }} />
          <Column
            header="Record Ref"
            body={(row) => <span className="font-mono text-xs text-slate-500">{row.recordId || '—'}</span>}
            style={{ width: '110px' }}
          />
          <Column
            header="IP Address"
            body={(row) => <span className="font-mono text-xs text-slate-400">{row.ipAddress || '—'}</span>}
            style={{ width: '120px' }}
          />
        </DataTable>
      </div>
    </div>
  );
};
