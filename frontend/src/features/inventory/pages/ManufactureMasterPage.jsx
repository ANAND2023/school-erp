import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

export const ManufactureMasterPage = () => {
  const [manufactures, setManufactures] = useState([
    { id: 1, name: 'Sample Manufacturer', code: 'MFG001', contactPerson: 'John Doe', contactNumber: '1234567890' }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  const header = (
    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
      <div className="flex align-items-center gap-2">
        <i className="pi pi-building text-primary text-xl" />
        <span className="font-bold text-base text-800">Manufacture Master</span>
      </div>
      <div className="flex align-items-center gap-2">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search manufacturers..."
            className="p-inputtext-sm"
          />
        </span>
        <Button
          label="New Manufacturer"
          icon="pi pi-plus"
          className="p-button-success p-button-sm font-semibold"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <div className="surface-card shadow-1 border-round p-3">
        <DataTable
          value={manufactures}
          globalFilter={globalFilter}
          header={header}
          emptyMessage="No manufacturers found."
          className="p-datatable-sm"
          paginator
          rows={15}
          rowsPerPageOptions={[10, 15, 25, 50]}
          responsiveLayout="scroll"
        >
          <Column field="name" header="Name" sortable className="font-bold text-primary" />
          <Column field="code" header="Code" sortable />
          <Column field="contactPerson" header="Contact Person" sortable />
          <Column field="contactNumber" header="Contact Number" sortable />
        </DataTable>
      </div>
    </div>
  );
};

export default ManufactureMasterPage;
