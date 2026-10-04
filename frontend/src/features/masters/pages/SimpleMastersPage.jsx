import React, { useState, useEffect } from 'react';
import { TabMenu } from 'primereact/tabmenu';
import {
  AppTable,
  AppModal,
  AppInput,
  AppButton,
  AppConfirmDialog,
} from '../../../components/common';
import { simpleMasterApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';

const MASTER_TYPES = [
  { value: 1, label: 'Student Categories', icon: 'pi pi-users' },
  { value: 2, label: 'Religions', icon: 'pi pi-bookmark' },
  { value: 3, label: 'School Houses', icon: 'pi pi-home' },
  { value: 4, label: 'Document Types', icon: 'pi pi-file' },
  { value: 5, label: 'Designations', icon: 'pi pi-briefcase' },
  { value: 6, label: 'Departments', icon: 'pi pi-sitemap' },
  { value: 7, label: 'Payment Modes', icon: 'pi pi-credit-card' },
  { value: 8, label: 'Banks', icon: 'pi pi-building' },
];

export const SimpleMastersPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();

  const [currentTab, setCurrentTab] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState(null);

  const fetchItems = async (type) => {
    try {
      setLoading(true);
      const res = await simpleMasterApi.getMasters(type);
      if (res.data.success) {
        setItems(res.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load master entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(currentTab);
  }, [currentTab]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setCode('');
    setDisplayOrder(items.length + 1);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code || '');
    setDisplayOrder(item.displayOrder);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!name.trim()) {
      showSnackbar('Name is required', 'warning');
      return;
    }
    try {
      setSaving(true);
      if (editingItem) {
        await simpleMasterApi.updateMaster(editingItem.id, {
          type: currentTab,
          name,
          code,
          displayOrder,
        });
        showSnackbar('Record updated successfully', 'success');
      } else {
        await simpleMasterApi.createMaster({
          type: currentTab,
          name,
          code,
          displayOrder,
        });
        showSnackbar('Record added successfully', 'success');
      }
      setModalOpen(false);
      fetchItems(currentTab);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!targetId) return;
    try {
      await simpleMasterApi.deleteMaster(targetId);
      showSnackbar('Record deleted successfully', 'success');
      setDeleteConfirmOpen(false);
      fetchItems(currentTab);
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to delete record', 'error');
    }
  };

  const currentTabLabel = MASTER_TYPES.find((m) => m.value === currentTab)?.label || 'Master';

  const tabItems = MASTER_TYPES.map((t) => ({
    label: t.label,
    icon: t.icon,
    command: () => setCurrentTab(t.value),
  }));

  const activeTabIndex = MASTER_TYPES.findIndex((t) => t.value === currentTab);

  const columns = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'code', header: 'Code / Shortcut', sortable: true },
    { field: 'displayOrder', header: 'Display Order', sortable: true, width: '130px' },
    {
      field: 'actions',
      header: 'Actions',
      sortable: false,
      width: '120px',
      body: (rowData) => {
        const canEdit = hasPermission('SimpleMasters', 'Edit');
        const canDelete = hasPermission('SimpleMasters', 'Delete');

        return (
          <div className="flex gap-1 align-items-center">
            {canEdit && (
              <AppButton
                icon="pi pi-pencil"
                severity="primary"
                variant="text"
                rounded
                size="small"
                tooltip="Edit"
                onClick={() => handleOpenEdit(rowData)}
              />
            )}
            {canDelete && (
              <AppButton
                icon="pi pi-trash"
                severity="danger"
                variant="text"
                rounded
                size="small"
                tooltip="Delete"
                onClick={() => {
                  setTargetId(rowData.id);
                  setDeleteConfirmOpen(true);
                }}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-2">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-900 m-0">Simple Masters</h1>
        <p className="text-500 text-sm mt-1 mb-0">
          Reusable lookup masters for categories, religions, houses, documents, designations, and payment modes
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="surface-card border-round-lg shadow-1 mb-3 overflow-hidden">
        <TabMenu
          model={tabItems}
          activeIndex={activeTabIndex >= 0 ? activeTabIndex : 0}
          className="app-tabmenu"
        />
      </div>

      {/* PrimeReact Data Table */}
      <AppTable
        menuKey="SimpleMasters"
        title={currentTabLabel}
        columns={columns}
        data={items}
        loading={loading}
        onAddClick={handleOpenAdd}
        addLabel={`Add ${currentTabLabel.slice(0, -1)}`}
        onRefresh={() => fetchItems(currentTab)}
      />

      {/* Modal Dialog using AppModal */}
      <AppModal
        visible={modalOpen}
        onHide={() => setModalOpen(false)}
        header={editingItem ? `Edit ${currentTabLabel.slice(0, -1)}` : `New ${currentTabLabel.slice(0, -1)}`}
        width="480px"
        onSubmit={handleSave}
        submitLabel="Save Entry"
        loading={saving}
      >
        <form onSubmit={handleSave} className="flex flex-column gap-3 pt-2">
          <AppInput
            required
            label="Name / Title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Enter ${currentTabLabel.slice(0, -1)} name`}
          />

          <AppInput
            label="Code (Optional)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. GEN, OBC, ADM"
          />

          <AppInput
            type="number"
            required
            label="Display Order"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            min={1}
            max={999}
          />
        </form>
      </AppModal>

      {/* Delete Confirmation Dialog */}
      <AppConfirmDialog
        visible={deleteConfirmOpen}
        title="Delete Record"
        message="Are you sure you want to delete this master record?"
        confirmSeverity="danger"
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};

export default SimpleMastersPage;
