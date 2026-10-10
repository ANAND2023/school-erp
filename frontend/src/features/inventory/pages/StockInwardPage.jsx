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

  const [viewDialogVisible, setViewDialogVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  
  // Manufacture Master State
  const [manuDialogVisible, setManuDialogVisible] = useState(false);
  const [manuFormData, setManuFormData] = useState({
    name: '', code: '', address1: '', address2: '', address3: '', postalCode: '',
    country: '', state: '', district: '', contactPerson: '', contactNumber: '', email: '',
    isAsset: 'No', isActive: 'Yes'
  });

  // Supplier Master State
  const [supplierDialogVisible, setSupplierDialogVisible] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    supplierCode: '', name: '', address1: '', postalCode: '', city: '',
    country: '', state: '', creditDays: '', contactPerson: '', telephoneNo: '',
    email: '', bankName: '', accountNo: '', paymentType: 'CASH', shipmentDetail: '',
    tinNo: '', dlNo: '', panNo: '', gstinNo: '', supplierCurrency: '',
    termsAndConditions: '', isAsset: 'No', isInsuranceProvider: 'No'
  });

  // Item Master State
  const [itemMasterDialogVisible, setItemMasterDialogVisible] = useState(false);
  const [itemMasterFormData, setItemMasterFormData] = useState({
    category: '', itemName: '', itemCode: '', description: '', manufacturedBy: '',
    minLevel: '', maxLevel: '', tagDepartment: '', reorderQty: '', purchaseUnit: '',
    saleUnit: '', expirable: 'No', itemHsnCode: '', active: 'Yes', itemGroup: '',
    purchaseTaxName: '', purchaseTaxPercent: '', saleTaxName: '', saleTaxPercent: '',
    fixedSellingPrice: ''
  });

  // New Purchase Dialog State
  const [dialogVisible, setDialogVisible] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: null,
    paymentMode: 'Cash',
    invoiceNumber: '',
    purchaseDate: new Date(), // Invoice Date
    deliveryDate: new Date(),
    deliveryNo: '',
    narration: '',
    freightCharges: 0,
    creditNoteAmount: 0,
    roundOff: 0,
    items: [{ itemId: null, unitCost: 0, mrp: 0, quantity: 1, batchNo: '', discPercent: 0, discAmt: 0, hsnCode: '', taxPercent: 0, taxAmt: 0, netAmt: 0, expDate: null }],
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

  const getEmptyItem = () => ({ itemId: null, unitCost: 0, mrp: 0, quantity: 1, batchNo: '', discPercent: 0, discAmt: 0, hsnCode: '', taxPercent: 0, taxAmt: 0, netAmt: 0, expDate: null });

  const openNew = () => {
    setFormData({
      supplierId: suppliers.length > 0 ? suppliers[0].id : null,
      paymentMode: 'Cash',
      invoiceNumber: '',
      purchaseDate: new Date(),
      deliveryDate: new Date(),
      deliveryNo: '',
      narration: '',
      freightCharges: 0,
      creditNoteAmount: 0,
      roundOff: 0,
      items: [getEmptyItem()],
    });
    setDialogVisible(true);
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, getEmptyItem()],
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

      if (field === 'itemId') {
        const selItem = items.find((it) => it.id === value);
        if (selItem && selItem.unitPrice > 0) {
          updated[index].unitCost = selItem.unitPrice;
          updated[index].mrp = selItem.unitPrice;
        }
      }

      // Auto compute net amount
      const row = updated[index];
      const rate = row.unitCost || 0;
      const qty = row.quantity || 0;
      let gross = rate * qty;
      let discAmt = row.discAmt || 0;
      if (field === 'discPercent') {
        discAmt = gross * ((row.discPercent || 0) / 100);
        updated[index].discAmt = discAmt;
      } else if (field === 'discAmt') {
        updated[index].discPercent = gross > 0 ? (discAmt / gross) * 100 : 0;
      } else if (field === 'unitCost' || field === 'quantity') {
        discAmt = gross * ((row.discPercent || 0) / 100);
        updated[index].discAmt = discAmt;
      }
      
      let afterDisc = gross - discAmt;
      let taxAmt = afterDisc * ((row.taxPercent || 0) / 100);
      updated[index].taxAmt = taxAmt;
      updated[index].netAmt = afterDisc + taxAmt;

      return { ...prev, items: updated };
    });
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce((sum, it) => sum + (it.netAmt || 0), 0);
  };

  const calculateSummary = () => {
    const grossAmount = formData.items.reduce((sum, it) => sum + ((it.unitCost || 0) * (it.quantity || 0)), 0);
    const billDiscAmt = formData.items.reduce((sum, it) => sum + (it.discAmt || 0), 0);
    const totalTax = formData.items.reduce((sum, it) => sum + (it.taxAmt || 0), 0);
    const grnAmt = grossAmount - billDiscAmt + totalTax + (formData.freightCharges || 0) - (formData.creditNoteAmount || 0) + (formData.roundOff || 0);
    return { grossAmount, billDiscAmt, totalTax, grnAmt };
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
        style={{ width: '98vw', maxWidth: '100vw', height: '95vh' }}
        modal
        onHide={() => setDialogVisible(false)}
        footer={
          <div className="flex align-items-center justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" className="p-button-text p-button-sm" onClick={() => setDialogVisible(false)} disabled={submitting} />
            <Button label="Save & Inward Stock" icon="pi pi-check" className="p-button-success p-button-sm font-bold" onClick={handleSubmit} loading={submitting} />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          {/* Top Header Section */}
          <div className="grid p-fluid">
            <div className="col-12 sm:col-2">
              <label className="text-xs font-bold text-700 block mb-1">Supplier</label>
              <Dropdown value={formData.supplierId} options={suppliers.map((s) => ({ label: s.supplierName, value: s.id }))} onChange={(e) => setFormData({ ...formData, supplierId: e.value })} placeholder="Select Vendor" className="p-inputtext-sm" />
            </div>
            <div className="col-12 sm:col-2">
              <label className="text-xs font-bold text-700 block mb-1">Payment Type</label>
              <Dropdown value={formData.paymentMode} options={PAYMENT_MODES} onChange={(e) => setFormData({ ...formData, paymentMode: e.value })} className="p-inputtext-sm" />
            </div>
            <div className="col-12 sm:col-2">
              <label className="text-xs font-bold text-700 block mb-1">Invoice No</label>
              <InputText value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} className="p-inputtext-sm" />
            </div>
            <div className="col-12 sm:col-2">
              <label className="text-xs font-bold text-700 block mb-1">Invoice Date</label>
              <Calendar value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.value })} dateFormat="dd/mm/yy" showIcon className="p-inputtext-sm" />
            </div>
            <div className="col-12 sm:col-2">
              <label className="text-xs font-bold text-700 block mb-1">Delivery Date</label>
              <Calendar value={formData.deliveryDate} onChange={(e) => setFormData({ ...formData, deliveryDate: e.value })} dateFormat="dd/mm/yy" showIcon className="p-inputtext-sm" />
            </div>
            <div className="col-12 sm:col-2">
              <label className="text-xs font-bold text-700 block mb-1">Delivery No</label>
              <InputText value={formData.deliveryNo} onChange={(e) => setFormData({ ...formData, deliveryNo: e.target.value })} className="p-inputtext-sm" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-content-end gap-2">
            <Button label="CREATE ITEM STORE" type="button" className="p-button-outlined p-button-sm p-button-help" />
            <Button label="CREATE MANUFACTURE MASTER" type="button" className="p-button-outlined p-button-sm p-button-help" onClick={() => setManuDialogVisible(true)} />
            <Button label="CREATE SUPPLIER MASTER" type="button" className="p-button-outlined p-button-sm p-button-help" />
            <Button label="CREATE GENERIC MASTER" type="button" className="p-button-outlined p-button-sm p-button-help" />
          </div>

          {/* Items Section */}
          <div className="overflow-x-auto border-1 surface-border border-round" style={{ minHeight: '200px' }}>
            <div style={{ minWidth: '1500px' }} className="p-2">
              <div className="flex gap-2 mb-2 font-bold text-xs surface-200 p-2 border-round">
                <div style={{ width: '200px' }}>Item Name</div>
                <div style={{ width: '100px' }}>Rate</div>
                <div style={{ width: '100px' }}>MRP</div>
                <div style={{ width: '80px' }}>Qty</div>
                <div style={{ width: '100px' }}>Batch</div>
                <div style={{ width: '80px' }}>DISC(%)</div>
                <div style={{ width: '100px' }}>Disc Amt</div>
                <div style={{ width: '100px' }}>HSN CODE</div>
                <div style={{ width: '80px' }}>Tax %</div>
                <div style={{ width: '100px' }}>TAX AMT</div>
                <div style={{ width: '120px' }}>Net Amt</div>
                <div style={{ width: '120px' }}>Exp Date</div>
                <div style={{ width: '50px' }}></div>
              </div>
              
              {formData.items.map((row, idx) => (
                <div key={idx} className="flex gap-2 mb-2 align-items-center">
                  <div style={{ width: '200px' }}>
                    <Dropdown value={row.itemId} options={items.map((it) => ({ label: it.itemName, value: it.id }))} onChange={(e) => updateItemRow(idx, 'itemId', e.value)} placeholder="Select Item" filter className="p-inputtext-sm w-full" />
                  </div>
                  <div style={{ width: '100px' }}>
                    <InputNumber value={row.unitCost} onValueChange={(e) => updateItemRow(idx, 'unitCost', e.value)} className="p-inputtext-sm w-full" mode="decimal" minFractionDigits={2} />
                  </div>
                  <div style={{ width: '100px' }}>
                    <InputNumber value={row.mrp} onValueChange={(e) => updateItemRow(idx, 'mrp', e.value)} className="p-inputtext-sm w-full" mode="decimal" minFractionDigits={2} />
                  </div>
                  <div style={{ width: '80px' }}>
                    <InputNumber value={row.quantity} onValueChange={(e) => updateItemRow(idx, 'quantity', e.value)} className="p-inputtext-sm w-full" />
                  </div>
                  <div style={{ width: '100px' }}>
                    <InputText value={row.batchNo} onChange={(e) => updateItemRow(idx, 'batchNo', e.target.value)} className="p-inputtext-sm w-full" />
                  </div>
                  <div style={{ width: '80px' }}>
                    <InputNumber value={row.discPercent} onValueChange={(e) => updateItemRow(idx, 'discPercent', e.value)} className="p-inputtext-sm w-full" />
                  </div>
                  <div style={{ width: '100px' }}>
                    <InputNumber value={row.discAmt} onValueChange={(e) => updateItemRow(idx, 'discAmt', e.value)} className="p-inputtext-sm w-full" mode="decimal" minFractionDigits={2} />
                  </div>
                  <div style={{ width: '100px' }}>
                    <InputText value={row.hsnCode} onChange={(e) => updateItemRow(idx, 'hsnCode', e.target.value)} className="p-inputtext-sm w-full" />
                  </div>
                  <div style={{ width: '80px' }}>
                    <Dropdown value={row.taxPercent} options={[{label:'0',value:0},{label:'5',value:5},{label:'12',value:12},{label:'18',value:18},{label:'28',value:28}]} onChange={(e) => updateItemRow(idx, 'taxPercent', e.value)} className="p-inputtext-sm w-full" />
                  </div>
                  <div style={{ width: '100px' }}>
                    <InputNumber value={row.taxAmt} disabled className="p-inputtext-sm w-full" mode="decimal" minFractionDigits={2} />
                  </div>
                  <div style={{ width: '120px' }}>
                    <InputNumber value={row.netAmt} disabled className="p-inputtext-sm w-full font-bold text-green-600" mode="decimal" minFractionDigits={2} />
                  </div>
                  <div style={{ width: '120px' }}>
                    <Calendar value={row.expDate} onChange={(e) => updateItemRow(idx, 'expDate', e.value)} dateFormat="dd/mm/yy" className="p-inputtext-sm w-full" />
                  </div>
                  <div style={{ width: '50px' }} className="text-center">
                    <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger p-button-sm" onClick={() => removeItemRow(idx)} disabled={formData.items.length <= 1} />
                  </div>
                </div>
              ))}
              <div className="mt-2">
                <Button label="Add Row" icon="pi pi-plus" className="p-button-sm p-button-text" onClick={addItemRow} />
              </div>
            </div>
          </div>

          {/* Bottom Summary Section */}
          <div className="grid p-fluid mt-2 surface-100 p-3 border-round">
            <div className="col-12 sm:col-8">
              <label className="text-xs font-bold text-700 block mb-1">Narration</label>
              <InputTextarea value={formData.narration} onChange={(e) => setFormData({...formData, narration: e.target.value})} rows={3} className="w-full p-inputtext-sm" />
            </div>
            <div className="col-12 sm:col-4">
              <div className="grid">
                <div className="col-6 text-right font-semibold text-sm">Gross Amount:</div>
                <div className="col-6"><InputNumber value={calculateSummary().grossAmount} disabled className="p-inputtext-sm w-full" mode="decimal" minFractionDigits={2} /></div>
                
                <div className="col-6 text-right font-semibold text-sm">Bill Disc Amt:</div>
                <div className="col-6"><InputNumber value={calculateSummary().billDiscAmt} disabled className="p-inputtext-sm w-full" mode="decimal" minFractionDigits={2} /></div>
                
                <div className="col-6 text-right font-semibold text-sm align-self-center">Round Off:</div>
                <div className="col-6"><InputNumber value={formData.roundOff} onValueChange={(e) => setFormData({...formData, roundOff: e.value})} className="p-inputtext-sm w-full" mode="decimal" minFractionDigits={2} /></div>
                
                <div className="col-6 text-right font-semibold text-sm align-self-center">Freight Charges:</div>
                <div className="col-6"><InputNumber value={formData.freightCharges} onValueChange={(e) => setFormData({...formData, freightCharges: e.value})} className="p-inputtext-sm w-full" mode="decimal" minFractionDigits={2} /></div>
                
                <div className="col-6 text-right font-semibold text-sm align-self-center">CREDIT NOTE AMOUNT:</div>
                <div className="col-6"><InputNumber value={formData.creditNoteAmount} onValueChange={(e) => setFormData({...formData, creditNoteAmount: e.value})} className="p-inputtext-sm w-full" mode="decimal" minFractionDigits={2} /></div>
                
                <div className="col-6 text-right font-bold text-lg text-primary mt-2">GRN Amt:</div>
                <div className="col-6 mt-2"><InputNumber value={calculateSummary().grnAmt} disabled className="p-inputtext-sm w-full font-bold" mode="decimal" minFractionDigits={2} /></div>
              </div>
            </div>
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
      {/* Manufacture Master Modal */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-building text-primary" />
            <span style={{color: '#902c6c'}}>Manufacture Master</span>
          </div>
        }
        visible={manuDialogVisible}
        style={{ width: '900px', maxWidth: '95vw' }}
        modal
        onHide={() => setManuDialogVisible(false)}
        footer={
          <div className="text-left">
            <Button label="Save" icon="pi pi-check" className="p-button-sm mr-2" style={{ backgroundColor: '#a62e7f', borderColor: '#a62e7f' }} onClick={() => setManuDialogVisible(false)} />
            <Button label="Cancel" icon="pi pi-times" className="p-button-sm" style={{ backgroundColor: '#a62e7f', borderColor: '#a62e7f' }} onClick={() => setManuDialogVisible(false)} />
          </div>
        }
      >
        <div className="surface-100 p-2 border-round mb-3">
          <span className="text-pink-600 font-bold"><i className="pi pi-home mr-1"></i>/GRN/GRN</span>
        </div>
        
        <div className="grid p-fluid">
          <div className="col-12 sm:col-3"><InputText placeholder="Name" className="p-inputtext-sm border-pink-200" /></div>
          <div className="col-12 sm:col-3"><InputText placeholder="Code" className="p-inputtext-sm" /></div>
          <div className="col-12 sm:col-3"><InputText placeholder="Address1" className="p-inputtext-sm" /></div>
          <div className="col-12 sm:col-3"><InputText placeholder="Address2" className="p-inputtext-sm" /></div>
          
          <div className="col-12 sm:col-3"><InputText placeholder="Address3" className="p-inputtext-sm" /></div>
          <div className="col-12 sm:col-3"><InputText placeholder="Postal Code" className="p-inputtext-sm" /></div>
          <div className="col-12 sm:col-3"><Dropdown placeholder="Country" options={[{label:'India',value:'IN'}]} className="p-inputtext-sm" /></div>
          <div className="col-12 sm:col-3"><InputText placeholder="State" className="p-inputtext-sm border-pink-200" /></div>
          
          <div className="col-12 sm:col-3"><InputText placeholder="District" className="p-inputtext-sm border-pink-200" /></div>
          <div className="col-12 sm:col-3"><InputText placeholder="Contact Person" className="p-inputtext-sm" /></div>
          <div className="col-12 sm:col-3"><InputText placeholder="Contact Number" className="p-inputtext-sm border-pink-200" /></div>
          <div className="col-12 sm:col-3"><InputText placeholder="EMAIL" className="p-inputtext-sm" /></div>
          
          <div className="col-12 sm:col-3">
            <span className="text-xs text-600 block mb-1">Is Asset</span>
            <Dropdown value="No" options={[{label:'Yes',value:'Yes'},{label:'No',value:'No'}]} className="p-inputtext-sm" />
          </div>
          <div className="col-12 sm:col-3">
            <span className="text-xs text-600 block mb-1">Is Active</span>
            <Dropdown value="Yes" options={[{label:'Yes',value:'Yes'},{label:'No',value:'No'}]} className="p-inputtext-sm" />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default StockInwardPage;
