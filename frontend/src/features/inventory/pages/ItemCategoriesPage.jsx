import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Tag } from 'primereact/tag';
import { inventoryApi } from '../api';

export const ItemCategoriesPage = () => {
  const toast = useRef(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  // Dialog State
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    code: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getCategories();
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load item categories',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openNew = () => {
    setFormData({
      id: 0,
      name: '',
      code: '',
      description: '',
      displayOrder: (categories.length + 1) * 10,
      isActive: true,
    });
    setIsEdit(false);
    setDialogVisible(true);
  };

  const openEdit = (cat) => {
    setFormData({
      id: cat.id,
      name: cat.name,
      code: cat.code || '',
      description: cat.description || '',
      displayOrder: cat.displayOrder || 0,
      isActive: cat.isActive !== false,
    });
    setIsEdit(true);
    setDialogVisible(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Category Name is required',
        life: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await inventoryApi.updateCategory(formData.id, formData);
        if (res.data?.success) {
          toast.current?.show({
            severity: 'success',
            summary: 'Updated',
            detail: 'Category updated successfully',
            life: 3000,
          });
          setDialogVisible(false);
          fetchCategories();
        }
      } else {
        const res = await inventoryApi.createCategory(formData);
        if (res.data?.success) {
          toast.current?.show({
            severity: 'success',
            summary: 'Created',
            detail: 'Category created successfully',
            life: 3000,
          });
          setDialogVisible(false);
          fetchCategories();
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

  const confirmDelete = (cat) => {
    confirmDialog({
      message: `Are you sure you want to delete category "${cat.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          const res = await inventoryApi.deleteCategory(cat.id);
          if (res.data?.success) {
            toast.current?.show({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Category removed',
              life: 3000,
            });
            fetchCategories();
          }
        } catch (err) {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: err.response?.data?.message || 'Failed to delete category',
            life: 3000,
          });
        }
      },
    });
  };

  const header = (
    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
      <div className="flex align-items-center gap-2">
        <i className="pi pi-tags text-primary text-xl" />
        <span className="font-bold text-base text-800">Item Categories</span>
        <Tag value={`${categories.length} Categories`} severity="info" className="ml-2" />
      </div>

      <div className="flex align-items-center gap-2">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search categories..."
            className="p-inputtext-sm"
          />
        </span>
        <Button
          label="Add Category"
          icon="pi pi-plus"
          className="p-button-primary p-button-sm font-semibold"
          onClick={openNew}
        />
        <Button
          icon="pi pi-refresh"
          className="p-button-outlined p-button-sm"
          onClick={fetchCategories}
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
          value={categories}
          loading={loading}
          globalFilter={globalFilter}
          header={header}
          emptyMessage="No item categories found."
          className="p-datatable-sm"
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          responsiveLayout="scroll"
        >
          <Column field="displayOrder" header="#" style={{ width: '60px' }} sortable />
          <Column field="name" header="Category Name" sortable className="font-bold text-800" />
          <Column
            field="code"
            header="Code"
            body={(row) => (row.code ? <Tag value={row.code} severity="secondary" /> : '-')}
            style={{ width: '100px' }}
          />
          <Column field="description" header="Description" />
          <Column
            field="itemCount"
            header="Items Assigned"
            body={(row) => (
              <span className="font-semibold text-primary">
                {row.itemCount || 0} Items
              </span>
            )}
            style={{ width: '130px' }}
            sortable
          />
          <Column
            header="Actions"
            body={(row) => (
              <div className="flex gap-1">
                <Button
                  icon="pi pi-pencil"
                  className="p-button-rounded p-button-text p-button-sm p-button-warning"
                  tooltip="Edit Category"
                  onClick={() => openEdit(row)}
                />
                <Button
                  icon="pi pi-trash"
                  className="p-button-rounded p-button-text p-button-sm p-button-danger"
                  tooltip="Delete Category"
                  disabled={row.itemCount > 0}
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
        header={isEdit ? 'Edit Item Category' : 'Create New Item Category'}
        visible={dialogVisible}
        style={{ width: '420px' }}
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
              label={isEdit ? 'Update' : 'Save Category'}
              icon="pi pi-check"
              className="p-button-primary p-button-sm"
              onClick={handleSubmit}
              loading={submitting}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="text-xs font-bold text-700 block mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <InputText
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Uniforms, Stationery, Books, Sports"
              className="w-full p-inputtext-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-700 block mb-1">Short Code</label>
            <InputText
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. UNIF, STAT, BOOK"
              className="w-full p-inputtext-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-700 block mb-1">Display Order</label>
            <InputNumber
              value={formData.displayOrder}
              onValueChange={(e) => setFormData({ ...formData, displayOrder: e.value || 0 })}
              className="w-full p-inputtext-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-700 block mb-1">Description</label>
            <InputTextarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Optional description or notes..."
              className="w-full p-inputtext-sm"
            />
          </div>

          {isEdit && (
            <div className="flex align-items-center justify-content-between pt-2 border-top-1 surface-border">
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

export default ItemCategoriesPage;
