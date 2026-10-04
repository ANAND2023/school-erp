import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Skeleton } from 'primereact/skeleton';
import { inventoryApi } from '../api';

export const InventoryDashboardPage = () => {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getSummary();
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load inventory summary',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const getStockStatusTag = (stock, reorder) => {
    if (stock <= 0) {
      return <Tag severity="danger" value="Out of Stock" />;
    }
    if (stock <= reorder) {
      return <Tag severity="warning" value="Low Stock" />;
    }
    return <Tag severity="success" value="In Stock" />;
  };

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

  return (
    <div className="p-3">
      <Toast ref={toast} />

      {/* Header & Quick Action Row */}
      <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between mb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold m-0 text-800 flex align-items-center gap-2">
            <i className="pi pi-box text-primary text-2xl" />
            Inventory & Stock Management
          </h2>
          <span className="text-500 text-xs">
            Manage school stock items, vendors, purchases, student/staff issue distribution, and stock ledger.
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            label="Items Master"
            icon="pi pi-list"
            className="p-button-outlined p-button-sm"
            onClick={() => navigate('/inventory/items')}
          />
          <Button
            label="Record Purchase (Inward)"
            icon="pi pi-plus"
            className="p-button-success p-button-sm font-semibold"
            onClick={() => navigate('/inventory/purchases')}
          />
          <Button
            label="Issue Items (Outward)"
            icon="pi pi-send"
            className="p-button-info p-button-sm font-semibold"
            onClick={() => navigate('/inventory/issues')}
          />
          <Button
            icon="pi pi-refresh"
            className="p-button-text p-button-sm"
            onClick={fetchSummary}
            tooltip="Refresh Dashboard"
          />
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid mb-4">
        {/* Total Items */}
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card shadow-1 p-3 border-round border-left-3 border-blue-500 flex justify-content-between align-items-center">
            <div>
              <span className="block text-500 font-medium text-xs mb-1 uppercase">Total Items</span>
              <div className="text-900 font-bold text-2xl">
                {loading ? <Skeleton width="3rem" height="1.8rem" /> : summary?.totalItems || 0}
              </div>
              <span className="text-xs text-blue-500 font-medium">
                {summary?.totalCategories || 0} Active Categories
              </span>
            </div>
            <div
              className="flex align-items-center justify-content-center bg-blue-100 border-round"
              style={{ width: '42px', height: '42px' }}
            >
              <i className="pi pi-box text-blue-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Total Stock Valuation */}
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card shadow-1 p-3 border-round border-left-3 border-green-500 flex justify-content-between align-items-center">
            <div>
              <span className="block text-500 font-medium text-xs mb-1 uppercase">Total Stock Value</span>
              <div className="text-900 font-bold text-xl text-green-700">
                {loading ? <Skeleton width="5rem" height="1.8rem" /> : formatCurrency(summary?.totalStockValue)}
              </div>
              <span className="text-xs text-green-600 font-medium">At current unit cost</span>
            </div>
            <div
              className="flex align-items-center justify-content-center bg-green-100 border-round"
              style={{ width: '42px', height: '42px' }}
            >
              <i className="pi pi-wallet text-green-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card shadow-1 p-3 border-round border-left-3 border-orange-500 flex justify-content-between align-items-center">
            <div>
              <span className="block text-500 font-medium text-xs mb-1 uppercase">Low Stock Alerts</span>
              <div className="text-900 font-bold text-2xl text-orange-600">
                {loading ? <Skeleton width="3rem" height="1.8rem" /> : summary?.lowStockItems || 0}
              </div>
              <span className="text-xs text-orange-500 font-medium">Needs Reordering</span>
            </div>
            <div
              className="flex align-items-center justify-content-center bg-orange-100 border-round"
              style={{ width: '42px', height: '42px' }}
            >
              <i className="pi pi-exclamation-triangle text-orange-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card shadow-1 p-3 border-round border-left-3 border-red-500 flex justify-content-between align-items-center">
            <div>
              <span className="block text-500 font-medium text-xs mb-1 uppercase">Out of Stock</span>
              <div className="text-900 font-bold text-2xl text-red-600">
                {loading ? <Skeleton width="3rem" height="1.8rem" /> : summary?.outOfStockItems || 0}
              </div>
              <span className="text-xs text-red-500 font-medium">Quantity is 0</span>
            </div>
            <div
              className="flex align-items-center justify-content-center bg-red-100 border-round"
              style={{ width: '42px', height: '42px' }}
            >
              <i className="pi pi-times-circle text-red-500 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Activity Quick Stats */}
      <div className="grid mb-4">
        <div className="col-12 md:col-6">
          <div className="surface-card shadow-1 p-3 border-round flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-3">
              <div className="p-3 bg-teal-50 border-round text-teal-600">
                <i className="pi pi-shopping-cart text-2xl" />
              </div>
              <div>
                <span className="text-xs text-500 font-semibold uppercase block">Purchases This Month</span>
                <span className="text-xl font-bold text-900">{summary?.totalPurchasesThisMonth || 0} Inward Receipts</span>
              </div>
            </div>
            <Button
              label="View Inwards"
              icon="pi pi-arrow-right"
              className="p-button-text p-button-sm text-teal-600"
              onClick={() => navigate('/inventory/purchases')}
            />
          </div>
        </div>

        <div className="col-12 md:col-6">
          <div className="surface-card shadow-1 p-3 border-round flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-3">
              <div className="p-3 bg-indigo-50 border-round text-indigo-600">
                <i className="pi pi-send text-2xl" />
              </div>
              <div>
                <span className="text-xs text-500 font-semibold uppercase block">Issues This Month</span>
                <span className="text-xl font-bold text-900">{summary?.totalIssuesThisMonth || 0} Outward Issues</span>
              </div>
            </div>
            <Button
              label="View Issues"
              icon="pi pi-arrow-right"
              className="p-button-text p-button-sm text-indigo-600"
              onClick={() => navigate('/inventory/issues')}
            />
          </div>
        </div>
      </div>

      {/* Main Tables Grid: Low Stock Alert Items & Recent Activity Ledger */}
      <div className="grid">
        {/* Low Stock Warning Table */}
        <div className="col-12 lg:col-6">
          <Card
            title={
              <div className="flex align-items-center justify-content-between text-base">
                <span className="font-bold text-red-600 flex align-items-center gap-2">
                  <i className="pi pi-bell text-red-500" />
                  Low Stock & Reorder Alerts
                </span>
                <Button
                  label="All Items"
                  icon="pi pi-external-link"
                  className="p-button-text p-button-sm"
                  onClick={() => navigate('/inventory/items')}
                />
              </div>
            }
            className="shadow-1 h-full"
          >
            <DataTable
              value={summary?.lowStockAlerts || []}
              loading={loading}
              emptyMessage="No low stock items! Stock levels are healthy."
              className="p-datatable-sm"
              responsiveLayout="scroll"
            >
              <Column field="itemCode" header="Code" style={{ width: '85px' }} />
              <Column field="itemName" header="Item Name" className="font-semibold" />
              <Column field="categoryName" header="Category" />
              <Column
                field="currentStock"
                header="Current / Min"
                body={(row) => (
                  <span className="font-bold text-red-600">
                    {row.currentStock} / {row.reorderLevel} {row.unit}
                  </span>
                )}
              />
              <Column
                header="Status"
                body={(row) => getStockStatusTag(row.currentStock, row.reorderLevel)}
                style={{ width: '100px' }}
              />
              <Column
                body={(row) => (
                  <Button
                    icon="pi pi-plus"
                    className="p-button-rounded p-button-text p-button-sm p-button-success"
                    tooltip="Purchase Stock"
                    onClick={() => navigate(`/inventory/purchases?itemId=${row.id}`)}
                  />
                )}
                style={{ width: '40px' }}
              />
            </DataTable>
          </Card>
        </div>

        {/* Recent Stock Movement Ledger */}
        <div className="col-12 lg:col-6">
          <Card
            title={
              <div className="flex align-items-center justify-content-between text-base">
                <span className="font-bold text-800 flex align-items-center gap-2">
                  <i className="pi pi-history text-primary" />
                  Recent Stock Movements
                </span>
                <Button
                  label="Full Ledger"
                  icon="pi pi-external-link"
                  className="p-button-text p-button-sm"
                  onClick={() => navigate('/inventory/ledger')}
                />
              </div>
            }
            className="shadow-1 h-full"
          >
            <DataTable
              value={summary?.recentActivities || []}
              loading={loading}
              emptyMessage="No recent stock transactions recorded."
              className="p-datatable-sm"
              responsiveLayout="scroll"
            >
              <Column
                field="transactionDate"
                header="Date"
                body={(row) => new Date(row.transactionDate).toLocaleDateString('en-GB')}
                style={{ width: '90px' }}
              />
              <Column field="itemName" header="Item" className="font-semibold" />
              <Column
                field="transactionType"
                header="Type"
                body={(row) => getTransactionTypeTag(row.transactionType)}
                style={{ width: '110px' }}
              />
              <Column
                field="quantity"
                header="Qty"
                body={(row) => (
                  <span className={row.quantity > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                  </span>
                )}
                style={{ width: '60px' }}
              />
              <Column field="balanceAfter" header="Balance" style={{ width: '70px' }} />
            </DataTable>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboardPage;
