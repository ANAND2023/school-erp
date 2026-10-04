import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { inventoryApi } from '../api';

const ISSUED_TO_TYPES = [
  { label: 'Student', value: 'Student' },
  { label: 'Staff / Teacher', value: 'Staff' },
  { label: 'Department / Lab', value: 'Department' },
  { label: 'Classroom / Section', value: 'Classroom' },
  { label: 'General / Other', value: 'Other' },
];

export const StockIssuePage = () => {
  const toast = useRef(null);
  const [issues, setIssues] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  // View / Return Dialog State
  const [viewDialogVisible, setViewDialogVisible] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Return Item Sub-dialog
  const [returnDialogVisible, setReturnDialogVisible] = useState(false);
  const [selectedIssueItem, setSelectedIssueItem] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // New Issue Dialog State
  const [dialogVisible, setDialogVisible] = useState(false);
  const [formData, setFormData] = useState({
    issuedToType: 'Student',
    issuedToName: '',
    department: '',
    issueDate: new Date(),
    isReturnable: false,
    returnDueDate: null,
    remarks: '',
    items: [{ itemId: null, quantity: 1, remarks: '' }],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getIssues();
      if (res.data?.success) {
        setIssues(res.data.data);
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load stock issue records',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await inventoryApi.getItems();
      if (res.data?.success) {
        setItems(res.data.data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchIssues();
    fetchItems();
  }, []);

  const openNew = () => {
    setFormData({
      issuedToType: 'Student',
      issuedToName: '',
      department: '',
      issueDate: new Date(),
      isReturnable: false,
      returnDueDate: null,
      remarks: '',
      items: [{ itemId: items.length > 0 ? items[0].id : null, quantity: 1, remarks: '' }],
    });
    setDialogVisible(true);
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { itemId: items.length > 0 ? items[0].id : null, quantity: 1, remarks: '' },
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
      return { ...prev, items: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.issuedToName.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Recipient / Issued To name is required',
        life: 3000,
      });
      return;
    }

    const validItems = formData.items.filter((it) => it.itemId && it.quantity > 0);
    if (validItems.length === 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select at least one stock item to issue',
        life: 3000,
      });
      return;
    }

    // Stock sufficiency check
    for (const it of validItems) {
      const stockItem = items.find((i) => i.id === it.itemId);
      if (stockItem && stockItem.currentStock < it.quantity) {
        toast.current?.show({
          severity: 'error',
          summary: 'Insufficient Stock',
          detail: `Only ${stockItem.currentStock} available for '${stockItem.itemName}' (Requested: ${it.quantity})`,
          life: 4000,
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        issueDate: formData.issueDate.toISOString(),
        returnDueDate: formData.returnDueDate ? formData.returnDueDate.toISOString() : null,
        items: validItems,
      };

      const res = await inventoryApi.createIssue(payload);
      if (res.data?.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Item issued successfully and stock deducted!',
          life: 3500,
        });
        setDialogVisible(false);
        fetchIssues();
        fetchItems();
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'Failed to issue items',
        life: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openReturnModal = (issueItem) => {
    setSelectedIssueItem(issueItem);
    setReturnQty(issueItem.quantity - issueItem.returnedQuantity);
    setReturnRemarks('');
    setReturnDialogVisible(true);
  };

  const handleReturnSubmit = async () => {
    if (!selectedIssueItem || returnQty <= 0) return;

    setReturnSubmitting(true);
    try {
      const res = await inventoryApi.returnIssueItem({
        issueItemId: selectedIssueItem.id,
        returnQuantity: returnQty,
        remarks: returnRemarks,
      });

      if (res.data?.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Returned',
          detail: 'Item quantity returned back to inventory stock!',
          life: 3500,
        });
        setReturnDialogVisible(false);
        setViewDialogVisible(false);
        fetchIssues();
        fetchItems();
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'Failed to process return',
        life: 3000,
      });
    } finally {
      setReturnSubmitting(false);
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case 'Returned':
        return <Tag severity="success" value="Returned" />;
      case 'Partially Returned':
        return <Tag severity="warning" value="Partial Return" />;
      case 'Issued':
      default:
        return <Tag severity="info" value="Issued" />;
    }
  };

  const header = (
    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
      <div className="flex align-items-center gap-2">
        <i className="pi pi-send text-primary text-xl" />
        <span className="font-bold text-base text-800">Item Issue & Distribution</span>
        <Tag value={`${issues.length} Issues`} severity="info" className="ml-2" />
      </div>

      <div className="flex align-items-center gap-2">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search issue / recipient..."
            className="p-inputtext-sm"
          />
        </span>
        <Button
          label="Issue Items"
          icon="pi pi-plus"
          className="p-button-primary p-button-sm font-semibold"
          onClick={openNew}
        />
        <Button
          icon="pi pi-refresh"
          className="p-button-outlined p-button-sm"
          onClick={fetchIssues}
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
          value={issues}
          loading={loading}
          globalFilter={globalFilter}
          header={header}
          emptyMessage="No item issues recorded yet."
          className="p-datatable-sm"
          paginator
          rows={15}
          rowsPerPageOptions={[10, 15, 25, 50]}
          responsiveLayout="scroll"
        >
          <Column field="issueNumber" header="Issue No" sortable className="font-bold text-primary" style={{ width: '130px' }} />
          <Column
            field="issueDate"
            header="Date"
            body={(row) => new Date(row.issueDate).toLocaleDateString('en-GB')}
            sortable
            style={{ width: '100px' }}
          />
          <Column field="issuedToName" header="Issued To" sortable className="font-semibold text-800" />
          <Column
            field="issuedToType"
            header="Recipient Type"
            body={(row) => <Tag value={row.issuedToType} severity="secondary" />}
            style={{ width: '130px' }}
          />
          <Column field="department" header="Dept / Class" style={{ width: '110px' }} />
          <Column
            field="isReturnable"
            header="Returnable"
            body={(row) => (
              <Tag
                value={row.isReturnable ? 'Returnable' : 'Non-Returnable'}
                severity={row.isReturnable ? 'warning' : 'secondary'}
              />
            )}
            style={{ width: '130px' }}
          />
          <Column
            field="status"
            header="Status"
            body={(row) => getStatusTag(row.status)}
            style={{ width: '110px' }}
          />
          <Column
            header="Action"
            body={(row) => (
              <Button
                icon="pi pi-eye"
                label="View / Return"
                className="p-button-text p-button-sm font-semibold"
                onClick={() => {
                  setSelectedIssue(row);
                  setViewDialogVisible(true);
                }}
              />
            )}
            style={{ width: '130px' }}
          />
        </DataTable>
      </div>

      {/* New Issue Dialog */}
      <Dialog
        header="Issue Stock Items to Student / Staff / Department"
        visible={dialogVisible}
        style={{ width: '820px', maxWidth: '95vw' }}
        modal
        onHide={() => setDialogVisible(false)}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text p-button-sm"
              onClick={() => setDialogVisible(false)}
              disabled={submitting}
            />
            <Button
              label="Issue Items & Deduct Stock"
              icon="pi pi-check"
              className="p-button-primary p-button-sm font-bold"
              onClick={handleSubmit}
              loading={submitting}
            />
          </div>
        }
      >
        <div className="grid p-fluid pt-2">
          {/* Recipient Type */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">
              Recipient Type <span className="text-red-500">*</span>
            </label>
            <Dropdown
              value={formData.issuedToType}
              options={ISSUED_TO_TYPES}
              onChange={(e) => setFormData({ ...formData, issuedToType: e.value })}
              className="p-inputtext-sm"
            />
          </div>

          {/* Issued To Name */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">
              Recipient / Person Name <span className="text-red-500">*</span>
            </label>
            <InputText
              value={formData.issuedToName}
              onChange={(e) => setFormData({ ...formData, issuedToName: e.target.value })}
              placeholder="e.g. Aman Sharma (Adm: 1042) or Physics Lab"
              className="p-inputtext-sm"
              autoFocus
            />
          </div>

          {/* Department / Class */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Department / Class (Optional)</label>
            <InputText
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g. Class 10-A, Science Dept"
              className="p-inputtext-sm"
            />
          </div>

          {/* Issue Date */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Issue Date</label>
            <Calendar
              value={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, issueDate: e.value })}
              dateFormat="dd/mm/yy"
              showIcon
              className="p-inputtext-sm"
            />
          </div>

          {/* Is Returnable Switch */}
          <div className="col-12 sm:col-4 flex flex-column justify-content-center">
            <label className="text-xs font-bold text-700 block mb-1">Is Returnable?</label>
            <div className="flex align-items-center gap-2 pt-1">
              <InputSwitch
                checked={formData.isReturnable}
                onChange={(e) => setFormData({ ...formData, isReturnable: e.value })}
              />
              <span className="text-xs text-600 font-semibold">
                {formData.isReturnable ? 'Yes (Equipment/Asset)' : 'No (Consumable item)'}
              </span>
            </div>
          </div>

          {/* Return Due Date */}
          {formData.isReturnable && (
            <div className="col-12 sm:col-4">
              <label className="text-xs font-bold text-700 block mb-1">Expected Return Date</label>
              <Calendar
                value={formData.returnDueDate}
                onChange={(e) => setFormData({ ...formData, returnDueDate: e.value })}
                dateFormat="dd/mm/yy"
                showIcon
                className="p-inputtext-sm"
              />
            </div>
          )}

          {/* Remarks */}
          <div className="col-12">
            <label className="text-xs font-bold text-700 block mb-1">Remarks / Purpose</label>
            <InputText
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. For Annual Sports Event, Lab practicals"
              className="p-inputtext-sm"
            />
          </div>

          {/* Items Section Header */}
          <div className="col-12 flex align-items-center justify-content-between pt-3 pb-1 border-bottom-1 surface-border">
            <span className="font-bold text-800 text-sm flex align-items-center gap-2">
              <i className="pi pi-list text-primary" />
              Stock Items to Issue
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

              return (
                <div
                  key={idx}
                  className="grid align-items-center p-2 mb-2 border-round surface-50 border-1 surface-border"
                >
                  <div className="col-12 sm:col-6">
                    <label className="text-xs text-500 block mb-1 font-semibold">
                      Stock Item #{idx + 1} <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      value={row.itemId}
                      options={items.map((it) => ({
                        label: `${it.itemName} (${it.itemCode}) [Avail: ${it.currentStock} ${it.unit}]`,
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
                      max={selectedItm ? selectedItm.currentStock : undefined}
                      className="p-inputtext-sm w-full"
                    />
                  </div>

                  <div className="col-6 sm:col-3">
                    <label className="text-xs text-500 block mb-1 font-semibold">Item Notes</label>
                    <InputText
                      value={row.remarks}
                      onChange={(e) => updateItemRow(idx, 'remarks', e.target.value)}
                      placeholder="e.g. Size 32, Item #2"
                      className="p-inputtext-sm w-full"
                    />
                  </div>

                  <div className="col-12 sm:col-1 text-right">
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

      {/* View Issue Details & Item Return Modal */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-file-o text-primary" />
            <span>Issue Details: {selectedIssue?.issueNumber}</span>
          </div>
        }
        visible={viewDialogVisible}
        style={{ width: '750px', maxWidth: '95vw' }}
        modal
        onHide={() => setViewDialogVisible(false)}
      >
        {selectedIssue && (
          <div className="flex flex-column gap-3">
            <div className="grid p-2 surface-50 border-round">
              <div className="col-6 sm:col-3">
                <span className="text-xs text-500 block">Date</span>
                <span className="font-bold">{new Date(selectedIssue.issueDate).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="col-6 sm:col-3">
                <span className="text-xs text-500 block">Issued To</span>
                <span className="font-bold">{selectedIssue.issuedToName} ({selectedIssue.issuedToType})</span>
              </div>
              <div className="col-6 sm:col-3">
                <span className="text-xs text-500 block">Type</span>
                <span className="font-bold">{selectedIssue.isReturnable ? 'Returnable Asset' : 'Consumable'}</span>
              </div>
              <div className="col-6 sm:col-3">
                <span className="text-xs text-500 block">Status</span>
                <span className="font-bold">{getStatusTag(selectedIssue.status)}</span>
              </div>
            </div>

            <DataTable
              value={selectedIssue.items || []}
              className="p-datatable-sm"
              emptyMessage="No items found"
            >
              <Column field="itemCode" header="Code" style={{ width: '90px' }} />
              <Column field="itemName" header="Item Name" className="font-semibold" />
              <Column field="quantity" header="Issued Qty" body={(r) => `${r.quantity} ${r.unit || 'Pcs'}`} style={{ width: '100px' }} />
              <Column
                field="returnedQuantity"
                header="Returned Qty"
                body={(r) => `${r.returnedQuantity || 0} ${r.unit || 'Pcs'}`}
                style={{ width: '110px' }}
              />
              <Column
                header="Status"
                body={(r) => (
                  <Tag
                    value={r.isReturned ? 'Returned' : r.returnedQuantity > 0 ? 'Partial' : 'Issued'}
                    severity={r.isReturned ? 'success' : r.returnedQuantity > 0 ? 'warning' : 'info'}
                  />
                )}
                style={{ width: '100px' }}
              />
              <Column
                header="Action"
                body={(r) => {
                  const remaining = r.quantity - (r.returnedQuantity || 0);
                  if (remaining <= 0 || !selectedIssue.isReturnable) return null;
                  return (
                    <Button
                      label="Return"
                      icon="pi pi-replay"
                      className="p-button-warning p-button-sm p-button-outlined"
                      onClick={() => openReturnModal(r)}
                    />
                  );
                }}
                style={{ width: '110px' }}
              />
            </DataTable>
          </div>
        )}
      </Dialog>

      {/* Return Item Quantity Sub-modal */}
      <Dialog
        header="Return Issued Item to Stock"
        visible={returnDialogVisible}
        style={{ width: '400px' }}
        modal
        onHide={() => setReturnDialogVisible(false)}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text p-button-sm"
              onClick={() => setReturnDialogVisible(false)}
              disabled={returnSubmitting}
            />
            <Button
              label="Confirm Return"
              icon="pi pi-check"
              className="p-button-warning p-button-sm font-bold"
              onClick={handleReturnSubmit}
              loading={returnSubmitting}
            />
          </div>
        }
      >
        {selectedIssueItem && (
          <div className="flex flex-column gap-3 pt-2">
            <div>
              <span className="text-xs text-500 block">Item</span>
              <span className="font-bold text-sm text-800">{selectedIssueItem.itemName} ({selectedIssueItem.itemCode})</span>
            </div>

            <div>
              <span className="text-xs text-500 block">Issued / Remaining</span>
              <span className="font-semibold text-xs">
                Issued: {selectedIssueItem.quantity} | Already Returned: {selectedIssueItem.returnedQuantity || 0}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-700 block mb-1">
                Return Quantity <span className="text-red-500">*</span>
              </label>
              <InputNumber
                value={returnQty}
                onValueChange={(e) => setReturnQty(e.value || 1)}
                min={1}
                max={selectedIssueItem.quantity - (selectedIssueItem.returnedQuantity || 0)}
                className="w-full p-inputtext-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-700 block mb-1">Return Remarks / Condition</label>
              <InputText
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                placeholder="e.g. Returned in good condition"
                className="w-full p-inputtext-sm"
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default StockIssuePage;
