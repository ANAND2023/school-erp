import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { inventoryApi } from '../api';

const TRANSACTION_TYPES = [
  { label: 'All Transactions', value: '' },
  { label: 'Stock Inward (Purchase)', value: 'PURCHASE' },
  { label: 'Stock Outward (Issue)', value: 'ISSUE' },
  { label: 'Item Returned', value: 'RETURN' },
  { label: 'Opening Stock', value: 'OPENING' },
];

export const StockLedgerPage = () => {
  const toast = useRef(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialItemId = searchParams.get('itemId') ? Number(searchParams.get('itemId')) : null;

  const [logs, setLogs] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(initialItemId);
  const [selectedType, setSelectedType] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await inventoryApi.getItems();
      if (res.data?.success) {
        setItems(res.data.data);
      }
    } catch (err) {}
  };

  const fetchStockLogs = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getStockLogs({
        itemId: selectedItemId || undefined,
        transactionType: selectedType || undefined,
      });
      if (res.data?.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load stock movement ledger',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    fetchStockLogs();
  }, [selectedItemId, selectedType]);

  const getTransactionTypeTag = (type) => {
    switch (type) {
      case 'PURCHASE':
        return <Tag severity="success" value="Stock In (+)" icon="pi pi-arrow-down-left" />;
      case 'ISSUE':
        return <Tag severity="danger" value="Issued (-)" icon="pi pi-arrow-up-right" />;
      case 'RETURN':
        return <Tag severity="info" value="Returned (+)" icon="pi pi-replay" />;
      case 'OPENING':
        return <Tag severity="secondary" value="Opening Stock" />;
      default:
        return <Tag value={type} />;
    }
  };

  const itemOptions = [
    { label: 'All Items', value: null },
    ...items.map((it) => ({ label: `${it.itemName} (${it.itemCode})`, value: it.id })),
  ];

  const header = (
    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
      <div className="flex align-items-center gap-2">
        <i className="pi pi-history text-primary text-xl" />
        <span className="font-bold text-base text-800">Stock Movement Ledger & Audit Trail</span>
        <Tag value={`${logs.length} Transactions`} severity="info" className="ml-2" />
      </div>

      <div className="flex flex-wrap align-items-center gap-2">
        <Dropdown
          value={selectedItemId}
          options={itemOptions}
          onChange={(e) => setSelectedItemId(e.value)}
          placeholder="Filter by Stock Item"
          filter
          className="p-inputtext-sm"
          style={{ minWidth: '200px' }}
        />

        <Dropdown
          value={selectedType}
          options={TRANSACTION_TYPES}
          onChange={(e) => setSelectedType(e.value)}
          placeholder="Transaction Type"
          className="p-inputtext-sm"
          style={{ minWidth: '170px' }}
        />

        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search ref / remarks..."
            className="p-inputtext-sm"
          />
        </span>

        <Button
          icon="pi pi-refresh"
          className="p-button-outlined p-button-sm"
          onClick={fetchStockLogs}
          tooltip="Refresh Ledger"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <Toast ref={toast} />

      <div className="surface-card shadow-1 border-round p-3">
        <DataTable
          value={logs}
          loading={loading}
          globalFilter={globalFilter}
          header={header}
          emptyMessage="No stock transactions found for the selected filters."
          className="p-datatable-sm"
          paginator
          rows={20}
          rowsPerPageOptions={[10, 20, 50, 100]}
          responsiveLayout="scroll"
        >
          <Column
            field="transactionDate"
            header="Date & Time"
            body={(row) => new Date(row.transactionDate).toLocaleString('en-GB')}
            sortable
            style={{ width: '160px' }}
          />
          <Column field="itemCode" header="Item Code" sortable style={{ width: '110px' }} />
          <Column field="itemName" header="Item Name" sortable className="font-bold text-800" />
          <Column field="categoryName" header="Category" />
          <Column
            field="transactionType"
            header="Type"
            body={(row) => getTransactionTypeTag(row.transactionType)}
            style={{ width: '140px' }}
            sortable
          />
          <Column
            field="referenceNumber"
            header="Reference No"
            body={(row) => (row.referenceNumber ? <Tag value={row.referenceNumber} severity="secondary" /> : '-')}
            style={{ width: '140px' }}
          />
          <Column
            field="quantity"
            header="Qty Change"
            body={(row) => (
              <span
                className={`font-bold text-sm ${
                  row.quantity > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
              </span>
            )}
            style={{ width: '110px' }}
            sortable
          />
          <Column
            field="balanceAfter"
            header="Stock Balance After"
            body={(row) => <span className="font-bold text-800">{row.balanceAfter}</span>}
            style={{ width: '140px' }}
            sortable
          />
          <Column field="remarks" header="Remarks & Notes" />
        </DataTable>
      </div>
    </div>
  );
};

export default StockLedgerPage;
