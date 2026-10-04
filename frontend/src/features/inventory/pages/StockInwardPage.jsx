import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { inventoryApi } from '../api';

const PAYMENT_MODES = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Bank Transfer / NEFT', value: 'Bank Transfer' },
  { label: 'UPI / Online', value: 'Online' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Credit / Pay Later', value: 'Credit' },
];

const PAYMENT_STATUSES = [
  { label: 'Paid', value: 'Paid' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Partial', value: 'Partial' },
];

export const StockInwardPage = () => {
  const toast = useRef(null);
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  // View Details Modal
  const [viewDialogVisible, setViewDialogVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // New Purchase Dialog State
  const [dialogVisible, setDialogVisible] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: null,
    invoiceNumber: '',
    purchaseDate: new Date(),
    paymentMode: 'Cash',
    paymentStatus: 'Paid',
    remarks: '',
    items: [{ itemId: null, quantity: 1, unitCost: 0, batchNo: '', remarks: '' }],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getPurchases();
      if (res.data?.success) {
        setPurchases(res.data.data);
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load stock purchases',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliersAndItems = async () => {
    try {
      const [supRes, itmRes] = await Promise.all([
        inventoryApi.getSuppliers(),
        inventoryApi.getItems(),
      ]);
      if (supRes.data?.success) setSuppliers(supRes.data.data);
      if (itmRes.data?.success) setItems(itmRes.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchPurchases();
    fetchSuppliersAndItems();
  }, []);

  const openNew = () => {
    setFormData({
      supplierId: suppliers.length > 0 ? suppliers[0].id : null,
      invoiceNumber: '',
      purchaseDate: new Date(),
      paymentMode: 'Cash',
      paymentStatus: 'Paid',
      remarks: '',
      items: [{ itemId: items.length > 0 ? items[0].id : null, quantity: 1, unitCost: 0, batchNo: '', remarks: '' }],
    });
    setDialogVisible(true);
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { itemId: items.length > 0 ? items[0].id : null, quantity: 1, unitCost: 0, batchNo: '', remarks: '' },
      ],
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItemRow = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };

      // If user changes item selection, prefill its unit price
      if (field === 'itemId') {
        const selItem = items.find((it) => it.id === value);
        if (selItem && selItem.unitPrice > 0) {
          updated[index].unitCost = selItem.unitPrice;
        }
      }

      return { ...prev, items: updated };
    });
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitCost || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validItems = formData.items.filter((it) => it.itemId && it.quantity > 0);
    if (validItems.length === 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please add at least one valid stock item with quantity',
        life: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        purchaseDate: formData.purchaseDate.toISOString(),
        items: validItems,
      };

      const res = await inventoryApi.createPurchase(payload);
      if (res.data?.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Stock purchase inward recorded and item inventory updated!',
          life: 3500,
        });
        setDialogVisible(false);
        fetchPurchases();
        fetchSuppliersAndItems();
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'Failed to record purchase',
        life: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const header = (
    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
      <div className="flex align-items-center gap-2">
        <i className="pi pi-shopping-cart text-primary text-xl" />
        <span className="font-bold text-base text-800">Stock Purchases & Inward Receipts</span>
        <Tag value={`${purchases.length} Receipts`} severity="info" className="ml-2" />
      </div>

      <div className="flex align-items-center gap-2">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search purchase / invoice..."
            className="p-inputtext-sm"
          />
        </span>
        <Button
          label="New Purchase (Stock In)"
          icon="pi pi-plus"
          className="p-button-success p-button-sm font-semibold"
          onClick={openNew}
        />
        <Button
          icon="pi pi-refresh"
          className="p-button-outlined p-button-sm"
          onClick={fetchPurchases}
          tooltip="Refresh"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <Toast ref={toast} />

      <div className="surface-card shadow-1 border-round p-3">
        <DataTable
          value={purchases}
          loading={loading}
          globalFilter={globalFilter}
          header={header}
          emptyMessage="No stock purchases recorded yet."
          className="p-datatable-sm"
          paginator
          rows={15}
          rowsPerPageOptions={[10, 15, 25, 50]}
          responsiveLayout="scroll"
        >
          <Column field="purchaseNumber" header="Purchase No" sortable className="font-bold text-primary" style={{ width: '130px' }} />
          <Column
            field="purchaseDate"
            header="Date"
            body={(row) => new Date(row.purchaseDate).toLocaleDateString('en-GB')}
            sortable
            style={{ width: '100px' }}
          />
          <Column field="supplierName" header="Vendor / Supplier" sortable className="font-semibold text-800" />
          <Column
            field="invoiceNumber"
            header="Invoice Ref"
            body={(row) => (row.invoiceNumber ? <Tag value={row.invoiceNumber} severity="secondary" /> : '-')}
            style={{ width: '120px' }}
          />
          <Column
            field="itemCount"
            header="Items"
            body={(row) => (
              <span className="font-semibold">
                {row.itemCount || (row.items ? row.items.length : 0)} Types
              </span>
            )}
            style={{ width: '90px' }}
          />
          <Column
            field="totalAmount"
            header="Total Amount"
            body={(row) => <span className="font-bold text-green-700">{formatCurrency(row.totalAmount)}</span>}
            sortable
            style={{ width: '130px' }}
          />
          <Column
            field="paymentMode"
            header="Pay Mode"
            body={(row) => <Tag value={row.paymentMode} severity="info" />}
            style={{ width: '100px' }}
          />
          <Column
            field="paymentStatus"
            header="Status"
            body={(row) => (
              <Tag
                value={row.paymentStatus}
                severity={row.paymentStatus === 'Paid' ? 'success' : 'warning'}
              />
            )}
            style={{ width: '90px' }}
          />
          <Column
            header="Action"
            body={(row) => (
              <Button
                icon="pi pi-eye"
                label="View"
                className="p-button-text p-button-sm font-semibold"
                onClick={() => {
                  setSelectedPurchase(row);
                  setViewDialogVisible(true);
                }}
              />
            )}
            style={{ width: '90px' }}
          />
        </DataTable>
      </div>

      {/* Record New Purchase Modal */}
      <Dialog
        header="Record Stock Inward / Purchase Receipt"
        visible={dialogVisible}
        style={{ width: '820px', maxWidth: '95vw' }}
        modal
        onHide={() => setDialogVisible(false)}
        footer={
          <div className="flex align-items-center justify-content-between w-full">
            <div className="text-left font-bold text-lg text-green-700">
              Grand Total: {formatCurrency(calculateTotalAmount())}
            </div>
            <div className="flex gap-2">
              <Button
                label="Cancel"
                icon="pi pi-times"
                className="p-button-text p-button-sm"
                onClick={() => setDialogVisible(false)}
                disabled={submitting}
              />
              <Button
                label="Save & Inward Stock"
                icon="pi pi-check"
                className="p-button-success p-button-sm font-bold"
                onClick={handleSubmit}
                loading={submitting}
              />
            </div>
          </div>
        }
      >
        <div className="grid p-fluid pt-2">
          {/* Supplier */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Vendor / Supplier</label>
            <Dropdown
              value={formData.supplierId}
              options={suppliers.map((s) => ({ label: s.supplierName, value: s.id }))}
              onChange={(e) => setFormData({ ...formData, supplierId: e.value })}
              placeholder="Select Vendor"
              className="p-inputtext-sm"
            />
          </div>

          {/* Invoice No */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Invoice / Bill Number</label>
            <InputText
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder="e.g. INV-2026-981"
              className="p-inputtext-sm"
            />
          </div>

          {/* Purchase Date */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Purchase Date</label>
            <Calendar
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.value })}
              dateFormat="dd/mm/yy"
              showIcon
              className="p-inputtext-sm"
            />
          </div>

          {/* Payment Mode */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Payment Mode</label>
            <Dropdown
              value={formData.paymentMode}
              options={PAYMENT_MODES}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.value })}
              className="p-inputtext-sm"
            />
          </div>

          {/* Payment Status */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Payment Status</label>
            <Dropdown
              value={formData.paymentStatus}
              options={PAYMENT_STATUSES}
              onChange={(e) => setFormData({ ...formData, paymentStatus: e.value })}
              className="p-inputtext-sm"
            />
          </div>

          {/* Remarks */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Remarks</label>
            <InputText
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Optional remarks"
              className="p-inputtext-sm"
            />
          </div>

          {/* Items Section Header */}
          <div className="col-12 flex align-items-center justify-content-between pt-3 pb-1 border-bottom-1 surface-border">
            <span className="font-bold text-800 text-sm flex align-items-center gap-2">
              <i className="pi pi-list text-primary" />
              Stock Items to Inward
            </span>
            <Button
              type="button"
              label="Add Another Item"
              icon="pi pi-plus"
              className="p-button-outlined p-button-sm p-button-secondary"
              onClick={addItemRow}
            />
          </div>

          {/* Items List Rows */}
          <div className="col-12">
            {formData.items.map((row, idx) => {
              const selectedItm = items.find((i) => i.id === row.itemId);
              const rowTotal = (row.quantity || 0) * (row.unitCost || 0);

              return (
                <div
                  key={idx}
                  className="grid align-items-center p-2 mb-2 border-round surface-50 border-1 surface-border"
                >
                  <div className="col-12 sm:col-4">
                    <label className="text-xs text-500 block mb-1 font-semibold">
                      Item #{idx + 1} <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      value={row.itemId}
                      options={items.map((it) => ({
                        label: `${it.itemName} (${it.itemCode}) [Stock: ${it.currentStock}]`,
                        value: it.id,
                      }))}
                      onChange={(e) => updateItemRow(idx, 'itemId', e.value)}
                      placeholder="Select Stock Item"
                      filter
                      className="p-inputtext-sm w-full"
                    />
                  </div>

                  <div className="col-6 sm:col-2">
                    <label className="text-xs text-500 block mb-1 font-semibold">
                      Qty ({selectedItm?.unit || 'Pcs'})
                    </label>
                    <InputNumber
                      value={row.quantity}
                      onValueChange={(e) => updateItemRow(idx, 'quantity', e.value || 1)}
                      min={1}
                      className="p-inputtext-sm w-full"
                    />
                  </div>

                  <div className="col-6 sm:col-2">
                    <label className="text-xs text-500 block mb-1 font-semibold">Unit Cost (₹)</label>
                    <InputNumber
                      value={row.unitCost}
                      onValueChange={(e) => updateItemRow(idx, 'unitCost', e.value || 0)}
                      mode="currency"
                      currency="INR"
                      locale="en-IN"
                      className="p-inputtext-sm w-full"
                    />
                  </div>

                  <div className="col-6 sm:col-3">
                    <label className="text-xs text-500 block mb-1 font-semibold">Total Amount</label>
                    <div className="font-bold text-sm text-green-700 pt-2">
                      {formatCurrency(rowTotal)}
                    </div>
                  </div>

                  <div className="col-6 sm:col-1 text-right">
                    <Button
                      type="button"
                      icon="pi pi-trash"
                      className="p-button-rounded p-button-text p-button-danger p-button-sm"
                      disabled={formData.items.length <= 1}
                      onClick={() => removeItemRow(idx)}
                      tooltip="Remove Row"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Dialog>

      {/* View Purchase Details Modal */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-file-o text-primary" />
            <span>Purchase Details: {selectedPurchase?.purchaseNumber}</span>
          </div>
        }
        visible={viewDialogVisible}
        style={{ width: '680px', maxWidth: '95vw' }}
        modal
        onHide={() => setViewDialogVisible(false)}
      >
        {selectedPurchase && (
          <div className="flex flex-column gap-3">
            <div className="grid p-2 surface-50 border-round">
              <div className="col-6 sm:col-3">
                <span className="text-xs text-500 block">Date</span>
                <span className="font-bold">{new Date(selectedPurchase.purchaseDate).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="col-6 sm:col-3">
                <span className="text-xs text-500 block">Vendor</span>
                <span className="font-bold">{selectedPurchase.supplierName}</span>
              </div>
              <div className="col-6 sm:col-3">
                <span className="text-xs text-500 block">Invoice Ref</span>
                <span className="font-bold">{selectedPurchase.invoiceNumber || 'N/A'}</span>
              </div>
              <div className="col-6 sm:col-3">
                <span className="text-xs text-500 block">Payment Mode</span>
                <span className="font-bold">{selectedPurchase.paymentMode} ({selectedPurchase.paymentStatus})</span>
              </div>
            </div>

            <DataTable
              value={selectedPurchase.items || []}
              className="p-datatable-sm"
              emptyMessage="No item breakdown available"
            >
              <Column field="itemCode" header="Code" style={{ width: '90px' }} />
              <Column field="itemName" header="Item Name" className="font-semibold" />
              <Column field="quantity" header="Qty" body={(r) => `${r.quantity} ${r.unit || 'Pcs'}`} style={{ width: '90px' }} />
              <Column field="unitCost" header="Unit Cost" body={(r) => formatCurrency(r.unitCost)} style={{ width: '100px' }} />
              <Column field="totalCost" header="Total" body={(r) => formatCurrency(r.totalCost)} className="font-bold text-green-700" style={{ width: '110px' }} />
            </DataTable>

            <div className="text-right font-bold text-lg text-green-700 border-top-1 surface-border pt-2">
              Total Amount: {formatCurrency(selectedPurchase.totalAmount)}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default StockInwardPage;
