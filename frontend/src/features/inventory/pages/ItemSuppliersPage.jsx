import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Tag } from 'primereact/tag';
import { inventoryApi } from '../api';

export const ItemSuppliersPage = () => {
  const toast = useRef(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  // Dialog State
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    supplierName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    gstin: '',
    remarks: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getSuppliers();
      if (res.data?.success) {
        setSuppliers(res.data.data);
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load suppliers',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const openNew = () => {
    setFormData({
      id: 0,
      supplierName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      gstin: '',
      remarks: '',
      isActive: true,
    });
    setIsEdit(false);
    setDialogVisible(true);
  };

  const openEdit = (sup) => {
    setFormData({
      id: sup.id,
      supplierName: sup.supplierName,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      city: sup.city || '',
      state: sup.state || '',
      gstin: sup.gstin || '',
      remarks: sup.remarks || '',
      isActive: sup.isActive !== false,
    });
    setIsEdit(true);
    setDialogVisible(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierName.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Supplier/Vendor Name is required',
        life: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await inventoryApi.updateSupplier(formData.id, formData);
        if (res.data?.success) {
          toast.current?.show({
            severity: 'success',
            summary: 'Updated',
            detail: 'Supplier updated successfully',
            life: 3000,
          });
          setDialogVisible(false);
          fetchSuppliers();
        }
      } else {
        const res = await inventoryApi.createSupplier(formData);
        if (res.data?.success) {
          toast.current?.show({
            severity: 'success',
            summary: 'Created',
            detail: 'Supplier created successfully',
            life: 3000,
          });
          setDialogVisible(false);
          fetchSuppliers();
        }
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'Operation failed',
        life: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (sup) => {
    confirmDialog({
      message: `Are you sure you want to delete supplier "${sup.supplierName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          const res = await inventoryApi.deleteSupplier(sup.id);
          if (res.data?.success) {
            toast.current?.show({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Supplier removed',
              life: 3000,
            });
            fetchSuppliers();
          }
        } catch (err) {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: err.response?.data?.message || 'Failed to delete supplier',
            life: 3000,
          });
        }
      },
    });
  };

  const header = (
    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
      <div className="flex align-items-center gap-2">
        <i className="pi pi-truck text-primary text-xl" />
        <span className="font-bold text-base text-800">Vendors & Suppliers</span>
        <Tag value={`${suppliers.length} Vendors`} severity="info" className="ml-2" />
      </div>

      <div className="flex align-items-center gap-2">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search vendors..."
            className="p-inputtext-sm"
          />
        </span>
        <Button
          label="Add Vendor"
          icon="pi pi-plus"
          className="p-button-primary p-button-sm font-semibold"
          onClick={openNew}
        />
        <Button
          icon="pi pi-refresh"
          className="p-button-outlined p-button-sm"
          onClick={fetchSuppliers}
          tooltip="Refresh"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="surface-card shadow-1 border-round p-3">
        <DataTable
          value={suppliers}
          loading={loading}
          globalFilter={globalFilter}
          header={header}
          emptyMessage="No vendors or suppliers found."
          className="p-datatable-sm"
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          responsiveLayout="scroll"
        >
          <Column field="supplierName" header="Vendor / Supplier Name" sortable className="font-bold text-800" />
          <Column field="contactPerson" header="Contact Person" />
          <Column
            field="phone"
            header="Phone"
            body={(row) =>
              row.phone ? (
                <span className="flex align-items-center gap-1">
                  <i className="pi pi-phone text-xs text-green-500" />
                  {row.phone}
                </span>
              ) : (
                '-'
              )
            }
          />
          <Column field="email" header="Email" />
          <Column
            field="city"
            header="Location"
            body={(row) => [row.city, row.state].filter(Boolean).join(', ') || '-'}
          />
          <Column
            field="gstin"
            header="GSTIN"
            body={(row) => (row.gstin ? <Tag value={row.gstin} severity="secondary" /> : '-')}
          />
          <Column
            field="totalPurchases"
            header="Purchases"
            body={(row) => (
              <span className="font-semibold text-primary">
                {row.totalPurchases || 0} Orders
              </span>
            )}
            style={{ width: '110px' }}
            sortable
          />
          <Column
            header="Actions"
            body={(row) => (
              <div className="flex gap-1">
                <Button
                  icon="pi pi-pencil"
                  className="p-button-rounded p-button-text p-button-sm p-button-warning"
                  tooltip="Edit Vendor"
                  onClick={() => openEdit(row)}
                />
                <Button
                  icon="pi pi-trash"
                  className="p-button-rounded p-button-text p-button-sm p-button-danger"
                  tooltip="Delete Vendor"
                  onClick={() => confirmDelete(row)}
                />
              </div>
            )}
            style={{ width: '100px' }}
          />
        </DataTable>
      </div>

      {/* Add / Edit Modal */}
      <Dialog
        header={isEdit ? 'Edit Vendor / Supplier' : 'Add New Vendor / Supplier'}
        visible={dialogVisible}
        style={{ width: '520px' }}
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
              label={isEdit ? 'Update' : 'Save Vendor'}
              icon="pi pi-check"
              className="p-button-primary p-button-sm"
              onClick={handleSubmit}
              loading={submitting}
            />
          </div>
        }
      >
        <div className="grid p-fluid pt-2">
          <div className="col-12">
            <label className="text-xs font-bold text-700 block mb-1">
              Vendor / Company Name <span className="text-red-500">*</span>
            </label>
            <InputText
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              placeholder="e.g. ABC Uniforms & Stationery Ltd."
              className="p-inputtext-sm"
              autoFocus
            />
          </div>

          <div className="col-12 sm:col-6">
            <label className="text-xs font-bold text-700 block mb-1">Contact Person</label>
            <InputText
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g. Rajesh Sharma"
              className="p-inputtext-sm"
            />
          </div>

          <div className="col-12 sm:col-6">
            <label className="text-xs font-bold text-700 block mb-1">Phone / Mobile</label>
            <InputText
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9876543210"
              className="p-inputtext-sm"
            />
          </div>

          <div className="col-12 sm:col-6">
            <label className="text-xs font-bold text-700 block mb-1">Email</label>
            <InputText
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. vendor@example.com"
              className="p-inputtext-sm"
            />
          </div>

          <div className="col-12 sm:col-6">
            <label className="text-xs font-bold text-700 block mb-1">GSTIN / Tax No.</label>
            <InputText
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              placeholder="e.g. 07AAAAA0000A1Z5"
              className="p-inputtext-sm"
            />
          </div>

          <div className="col-12">
            <label className="text-xs font-bold text-700 block mb-1">Address</label>
            <InputText
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street / Market address"
              className="p-inputtext-sm"
            />
          </div>

          <div className="col-12 sm:col-6">
            <label className="text-xs font-bold text-700 block mb-1">City</label>
            <InputText
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Delhi, Mumbai"
              className="p-inputtext-sm"
            />
          </div>

          <div className="col-12 sm:col-6">
            <label className="text-xs font-bold text-700 block mb-1">State</label>
            <InputText
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="e.g. Delhi, UP, Maharashtra"
              className="p-inputtext-sm"
            />
          </div>

          <div className="col-12">
            <label className="text-xs font-bold text-700 block mb-1">Remarks / Notes</label>
            <InputTextarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={2}
              placeholder="Optional notes regarding supply terms..."
              className="p-inputtext-sm"
            />
          </div>

          {isEdit && (
            <div className="col-12 flex align-items-center justify-content-between pt-2 border-top-1 surface-border">
              <span className="text-xs font-bold text-700">Active Status</span>
              <InputSwitch
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.value })}
              />
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default ItemSuppliersPage;
