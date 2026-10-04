import React, { useState, useEffect } from 'react';
import { Tag } from 'primereact/tag';
import { superAdminApi } from '../api/superAdminApi';

export const ModuleCatalogPage = () => {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getModuleCatalog();
      if (res.success) setCatalog(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-column gap-4">
      <div className="bg-white p-4 border-round-lg shadow-1 border-1 surface-border">
        <h2 className="text-xl font-bold text-slate-800 m-0">System Module Catalog</h2>
        <p className="text-xs text-slate-500 m-0 mt-1">
          Catalog of all pluggable and core functional subsystems in the School ERP platform. Core modules are essential for system operation and cannot be switched off by tenants.
        </p>
      </div>

      <div className="grid">
        {catalog.map((m) => (
          <div key={m.code} className="col-12 sm:col-6 lg:col-4">
            <div className="p-4 bg-white border-round-xl shadow-1 border-1 surface-border h-full flex flex-column justify-content-between">
              <div>
                <div className="flex align-items-center justify-content-between mb-2">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 border-round">
                    {m.code}
                  </span>
                  {m.isCore ? (
                    <Tag value="Core (Mandatory)" severity="info" />
                  ) : (
                    <Tag value="Pluggable Feature" severity="success" />
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-800 m-0 mb-1">{m.name}</h3>
                <span className="text-xs text-slate-400 block mb-2">Category: {m.category}</span>
                <p className="text-xs text-slate-600 m-0">{m.description}</p>
              </div>

              <div className="mt-4 pt-2 border-top-1 surface-border flex align-items-center justify-content-between text-xs text-slate-500">
                <span>Display Order: #{m.displayOrder}</span>
                <span className="text-emerald-600 font-semibold">Active in Engine</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
