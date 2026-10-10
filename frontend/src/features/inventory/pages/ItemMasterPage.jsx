import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { inventoryApi } from '../api';

const UOM_OPTIONS = [
  { label: 'Pieces (Pcs)', value: 'Pcs' },
  { label: 'Units (Unit)', value: 'Unit' },
  { label: 'Boxes (Box)', value: 'Box' },
  { label: 'Sets (Set)', value: 'Set' },
  { label: 'Kilograms (Kg)', value: 'Kg' },
  { label: 'Meters (Mtr)', value: 'Mtr' },
  { label: 'Packets (Pkt)', value: 'Pkt' },
  { label: 'Pairs (Pair)', value: 'Pair' },
  { label: 'Dozens (Doz)', value: 'Doz' },
  { label: 'Bundles (Bndl)', value: 'Bndl' },
];

export const ItemMasterPage = () => {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Dialog State
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    categoryId: null,
    itemCode: '',
    itemName: '',
    unit: 'Pcs',
    unitPrice: 0,
    sellingPrice: 0,
    reorderLevel: 5,
    openingStock: 0,
    rackNumber: '',
    description: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await inventoryApi.getCategories();
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (err) {}
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getItems({
        categoryId: selectedCategory || undefined,
        lowStockOnly: filterLowStock || undefined,
      });
      if (res.data?.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load stock items',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, filterLowStock]);

  const openNew = () => {
    setFormData({
      id: 0,
      categoryId: categories.length > 0 ? categories[0].id : null,
      itemCode: '',
      itemName: '',
      unit: 'Pcs',
      unitPrice: 0,
      sellingPrice: 0,
      reorderLevel: 5,
      openingStock: 0,
      rackNumber: '',
      description: '',
      isActive: true,
    });
    setIsEdit(false);
    setDialogVisible(true);
  };

  const openEdit = (item) => {
    setFormData({
      id: item.id,
      categoryId: item.categoryId,
      itemCode: item.itemCode || '',
      itemName: item.itemName,
      unit: item.unit || 'Pcs',
      unitPrice: item.unitPrice || 0,
      sellingPrice: item.sellingPrice || 0,
      reorderLevel: item.reorderLevel || 5,
      openingStock: item.openingStock || 0,
      rackNumber: item.rackNumber || '',
      description: item.description || '',
      isActive: item.isActive !== false,
    });
    setIsEdit(true);
    setDialogVisible(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Item Name is required',
        life: 3000,
      });
      return;
    }
    if (!formData.categoryId) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please select an Item Category',
        life: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await inventoryApi.updateItem(formData.id, formData);
        if (res.data?.success) {
          toast.current?.show({
            severity: 'success',
            summary: 'Updated',
            detail: 'Item updated successfully',
            life: 3000,
          });
          setDialogVisible(false);
          fetchItems();
        }
      } else {
        const res = await inventoryApi.createItem(formData);
        if (res.data?.success) {
          toast.current?.show({
            severity: 'success',
            summary: 'Created',
            detail: 'Stock item added successfully',
            life: 3000,
          });
          setDialogVisible(false);
          fetchItems();
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

  const confirmDelete = (item) => {
    confirmDialog({
      message: `Are you sure you want to delete item "${item.itemName}" (${item.itemCode})?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          const res = await inventoryApi.deleteItem(item.id);
          if (res.data?.success) {
            toast.current?.show({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Item deleted',
              life: 3000,
            });
            fetchItems();
          }
        } catch (err) {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: err.response?.data?.message || 'Failed to delete item',
            life: 3000,
          });
        }
      },
    });
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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const categoryOptions = [
    { label: 'All Categories', value: null },
    ...categories.map((c) => ({ label: c.name, value: c.id })),
  ];

  const header = (
    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
      <div className="flex align-items-center gap-2">
        <i className="pi pi-box text-primary text-xl" />
        <span className="font-bold text-base text-800">Inventory Items Master</span>
        <Tag value={`${items.length} Items`} severity="info" className="ml-2" />
      </div>

      <div className="flex flex-wrap align-items-center gap-2">
        {/* Category Filter */}
        <Dropdown
          value={selectedCategory}
          options={categoryOptions}
          onChange={(e) => setSelectedCategory(e.value)}
          placeholder="Filter by Category"
          className="p-inputtext-sm"
          style={{ minWidth: '160px' }}
        />

        {/* Low Stock Filter Button */}
        <Button
          label={filterLowStock ? 'Showing Low Stock' : 'Low Stock Only'}
          icon="pi pi-exclamation-triangle"
          className={`p-button-sm ${filterLowStock ? 'p-button-warning' : 'p-button-outlined'}`}
          onClick={() => setFilterLowStock(!filterLowStock)}
        />

        {/* Search */}
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search items / code..."
            className="p-inputtext-sm"
          />
        </span>

        {/* Add Item Button */}
        <Button
          label="Add Item"
          icon="pi pi-plus"
          className="p-button-primary p-button-sm font-semibold"
          onClick={openNew}
        />

        {/* Refresh */}
        <Button
          icon="pi pi-refresh"
          className="p-button-outlined p-button-sm"
          onClick={fetchItems}
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
          value={items}
          loading={loading}
          globalFilter={globalFilter}
          header={header}
          emptyMessage="No inventory items found."
          className="p-datatable-sm"
          paginator
          rows={15}
          rowsPerPageOptions={[10, 15, 25, 50]}
          responsiveLayout="scroll"
        >
          <Column field="itemCode" header="Item Code" sortable style={{ minWidth: '120px' }} className="font-semibold" />
          <Column field="itemName" header="Item Name" sortable className="font-bold text-800" />
          <Column field="categoryName" header="Category" sortable />
          <Column field="manufacturedBy" header="Manufactured By" sortable />
          <Column field="unit" header="Unit" style={{ width: '80px' }} />
          <Column
            field="unitPrice"
            header="Cost Price"
            body={(row) => formatCurrency(row.unitPrice)}
            style={{ minWidth: '120px' }}
            sortable
          />
          <Column
            field="sellingPrice"
            header="Sale Price"
            body={(row) => (row.sellingPrice ? formatCurrency(row.sellingPrice) : '-')}
            style={{ minWidth: '120px' }}
          />
          <Column
            field="currentStock"
            header="Current Stock"
            body={(row) => (
              <span
                className={`font-bold ${
                  row.currentStock <= 0
                    ? 'text-red-600'
                    : row.currentStock <= row.reorderLevel
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}
              >
                {row.currentStock} {row.unit}
              </span>
            )}
            style={{ width: '120px' }}
            sortable
          />
          <Column field="reorderLevel" header="Min Alert" style={{ width: '90px' }} />
          <Column field="rackNumber" header="Rack / Location" style={{ minWidth: '120px' }} />
          <Column
            header="Status"
            body={(row) => getStockStatusTag(row.currentStock, row.reorderLevel)}
            style={{ minWidth: '120px' }}
          />
          <Column
            header="Actions"
            body={(row) => (
              <div className="flex gap-1">
                <Button
                  icon="pi pi-pencil"
                  className="p-button-rounded p-button-text p-button-sm p-button-warning"
                  tooltip="Edit Item"
                  onClick={() => openEdit(row)}
                />
                <Button
                  icon="pi pi-history"
                  className="p-button-rounded p-button-text p-button-sm p-button-info"
                  tooltip="Item Movement History"
                  onClick={() => navigate(`/inventory/ledger?itemId=${row.id}`)}
                />
                <Button
                  icon="pi pi-trash"
                  className="p-button-rounded p-button-text p-button-sm p-button-danger"
                  tooltip="Delete Item"
                  onClick={() => confirmDelete(row)}
                />
              </div>
            )}
            style={{ width: '120px' }}
          />
        </DataTable>
      </div>

      {/* Add / Edit Item Dialog */}
      <Dialog
        header={isEdit ? 'Edit Stock Item' : 'Add New Inventory Item'}
        visible={dialogVisible}
        style={{ width: '560px' }}
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
              label={isEdit ? 'Update Item' : 'Save Item'}
              icon="pi pi-check"
              className="p-button-primary p-button-sm"
              onClick={handleSubmit}
              loading={submitting}
            />
          </div>
        }
      >
        <div className="grid p-fluid pt-2">
          {/* Category */}
          <div className="col-12 sm:col-6">
            <label className="text-xs font-bold text-700 block mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <Dropdown
              value={formData.categoryId}
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
              onChange={(e) => setFormData({ ...formData, categoryId: e.value })}
              placeholder="Select Category"
              className="p-inputtext-sm"
            />
          </div>

          {/* Item Code */}
          <div className="col-12 sm:col-6">
            <label className="text-xs font-bold text-700 block mb-1">Item Code (Optional)</label>
            <InputText
              value={formData.itemCode}
              onChange={(e) => setFormData({ ...formData, itemCode: e.target.value.toUpperCase() })}
              placeholder="Auto-generated if blank (e.g. ITM-0001)"
              className="p-inputtext-sm"
            />
          </div>

          {/* Item Name */}
          <div className="col-12">
            <label className="text-xs font-bold text-700 block mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <InputText
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              placeholder="e.g. School Blazer (Navy Blue - Size 32), A4 Notebook 120 Pages"
              className="p-inputtext-sm"
              autoFocus
            />
          </div>

          {/* Unit of Measure */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Unit of Measure</label>
            <Dropdown
              value={formData.unit}
              options={UOM_OPTIONS}
              onChange={(e) => setFormData({ ...formData, unit: e.value })}
              className="p-inputtext-sm"
            />
          </div>

          {/* Unit Cost Price */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Cost Price (₹)</label>
            <InputNumber
              value={formData.unitPrice}
              onValueChange={(e) => setFormData({ ...formData, unitPrice: e.value || 0 })}
              mode="currency"
              currency="INR"
              locale="en-IN"
              className="p-inputtext-sm"
            />
          </div>

          {/* Selling Price (Optional) */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Sale Price (₹)</label>
            <InputNumber
              value={formData.sellingPrice}
              onValueChange={(e) => setFormData({ ...formData, sellingPrice: e.value || 0 })}
              mode="currency"
              currency="INR"
              locale="en-IN"
              className="p-inputtext-sm"
            />
          </div>

          {/* Opening Stock (Only for New Item) */}
          {!isEdit && (
            <div className="col-12 sm:col-4">
              <label className="text-xs font-bold text-700 block mb-1">Opening Stock</label>
              <InputNumber
                value={formData.openingStock}
                onValueChange={(e) => setFormData({ ...formData, openingStock: e.value || 0 })}
                min={0}
                className="p-inputtext-sm"
              />
            </div>
          )}

          {/* Manufactured By */}
          <div className="col-12 sm:col-4">
            <label className="text-xs font-bold text-700 block mb-1">Manufactured By</label>
            <Dropdown
              value={formData.manufacturedBy || ''}
              options={[
                { label: 'Cipla', value: 'Cipla' },
                { label: 'Sun Pharma', value: 'Sun Pharma' },
                { label: 'Abbott', value: 'Abbott' },
                { label: 'GSK', value: 'GSK' },
                { label: 'Mankind', value: 'Mankind' },
                { label: 'Glenmark', value: 'Glenmark' }
              ]}
              onChange={(e) => setFormData({ ...formData, manufacturedBy: e.value })}
              placeholder="Select or Type Manufacturer"
              editable
              className="p-inputtext-sm w-full"
            />
          </div>

          {/* Reorder / Min Level */}
          <div className={`col-12 sm:col-${isEdit ? '6' : '4'}`}>
            <label className="text-xs font-bold text-700 block mb-1">Reorder / Min Alert</label>
            <InputNumber
              value={formData.reorderLevel}
              onValueChange={(e) => setFormData({ ...formData, reorderLevel: e.value || 0 })}
              min={0}
              className="p-inputtext-sm"
            />
          </div>

          {/* Rack / Location */}
          <div className={`col-12 sm:col-${isEdit ? '6' : '4'}`}>
            <label className="text-xs font-bold text-700 block mb-1">Rack / Shelf No.</label>
            <InputText
              value={formData.rackNumber}
              onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
              placeholder="e.g. Rack A-3, Shelf 2"
              className="p-inputtext-sm"
            />
          </div>

          {/* Description */}
          <div className="col-12">
            <label className="text-xs font-bold text-700 block mb-1">Description / Notes</label>
            <InputTextarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Optional item details, size specifications..."
              className="p-inputtext-sm"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ItemMasterPage;
