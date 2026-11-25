import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button as MuiButton,
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { classApi } from '../api';
import { useUiStore } from '../../../store/uiStore';
import { usePermission } from '../../../hooks/usePermission';
import { useThemeStore, shadeColor } from '../../../store/themeStore';
import { AppButton } from '../../../components/common/AppButton';

export const ClassesSectionsPage = () => {
  const { showSnackbar } = useUiStore();
  const { hasPermission } = usePermission();
  const { currentColorHex } = useThemeStore();
  const themeColor = currentColorHex || '#14b8a6';
  const themeDarker = shadeColor(themeColor, -20);

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState(null);

  // Class Modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [className, setClassName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);

  // Section Modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionCapacity, setSectionCapacity] = useState(40);

  // Delete Confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'class'|'section', id: number }

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await classApi.getClasses();
      if (res.data.success) {
        setClasses(res.data.data || []);
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to load classes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassName('');
    setDisplayOrder(classes.length + 1);
    setClassModalOpen(true);
  };

  const handleOpenEditClass = (cls) => {
    setEditingClass(cls);
    setClassName(cls.name);
    setDisplayOrder(cls.displayOrder);
    setClassModalOpen(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await classApi.updateClass(editingClass.id, { name: className, displayOrder });
        showSnackbar('Class updated successfully', 'success');
      } else {
        await classApi.createClass({ name: className, displayOrder });
        showSnackbar('Class created successfully', 'success');
      }
      setClassModalOpen(false);
      fetchClasses();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving class', 'error');
    }
  };

  const handleOpenAddSection = (classId) => {
    setSelectedClassId(classId);
    setEditingSection(null);
    setSectionName('A');
    setSectionCapacity(40);
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (classId, sec) => {
    setSelectedClassId(classId);
    setEditingSection(sec);
    setSectionName(sec.name);
    setSectionCapacity(sec.capacity);
    setSectionModalOpen(true);
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    try {
      if (editingSection) {
        await classApi.updateSection(editingSection.id, {
          name: sectionName,
          capacity: sectionCapacity,
        });
        showSnackbar('Section updated successfully', 'success');
      } else {
        await classApi.addSection(selectedClassId, {
          name: sectionName,
          capacity: sectionCapacity,
        });
        showSnackbar('Section added successfully', 'success');
      }
      setSectionModalOpen(false);
      fetchClasses();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Error saving section', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'class') {
        await classApi.deleteClass(deleteTarget.id);
        showSnackbar('Class deleted successfully', 'success');
      } else {
        await classApi.deleteSection(deleteTarget.id);
        showSnackbar('Section deleted successfully', 'success');
      }
      setDeleteConfirmOpen(false);
      fetchClasses();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Delete operation failed', 'error');
    }
  };

  const canAdd = hasPermission('Classes', 'Add');
  const canEdit = hasPermission('Classes', 'Edit');
  const canDelete = hasPermission('Classes', 'Delete');

  // Filtered classes by search term
  const filteredClasses = useMemo(() => {
    if (!search.trim()) return classes;
    const term = search.trim().toLowerCase();
    return classes.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.sections?.some((s) => s.name?.toLowerCase().includes(term))
    );
  }, [classes, search]);

  // Statistics calculation
  const totalClassesCount = classes.length;
  const totalSectionsCount = useMemo(
    () => classes.reduce((sum, c) => sum + (c.sections?.length || 0), 0),
    [classes]
  );
  const totalCapacityCount = useMemo(
    () =>
      classes.reduce(
        (sum, c) =>
          sum + (c.sections?.reduce((sSum, s) => sSum + (s.capacity || 0), 0) || 0),
        0
      ),
    [classes]
  );

  const toggleExpandAll = () => {
    if (expandedRows && Object.keys(expandedRows).length > 0) {
      setExpandedRows(null);
    } else {
      const all = {};
      classes.forEach((c) => {
        all[c.id] = true;
      });
      setExpandedRows(all);
    }
  };

  // Expanded row sub-table for sections
  const rowExpansionTemplate = (data) => {
    const sections = data.sections || [];
    return (
      <div className="p-3 surface-50 border-round-lg m-2 border-1 surface-border">
        <div className="flex align-items-center justify-content-between mb-2 pb-2 border-bottom-1 surface-border">
          <div className="flex align-items-center gap-2">
            <span className="text-base">🏫</span>
            <span className="font-bold text-sm text-900">
              Sections for Class: <span className="text-primary font-bold">{data.name}</span>
            </span>
            <Tag
              value={`${sections.length} ${sections.length === 1 ? 'Section' : 'Sections'}`}
              severity="info"
              style={{ fontSize: '10px' }}
            />
          </div>
          {canAdd && (
            <Button
              label="Add Section"
              icon="pi pi-plus"
              size="small"
              className="p-button-sm py-1 px-2 text-xs"
              onClick={() => handleOpenAddSection(data.id)}
            />
          )}
        </div>

        {sections.length === 0 ? (
          <div className="text-center p-3 text-500 text-xs font-italic">
            No sections defined for this class. Click "+ Add Section" above to add one.
          </div>
        ) : (
          <DataTable value={sections} size="small" responsiveLayout="scroll" className="p-datatable-sm shadow-none">
            <Column
              header="#"
              body={(_, options) => (
                <span className="text-xs text-slate-500 font-semibold">{options.rowIndex + 1}</span>
              )}
              style={{ width: '50px', textAlign: 'center' }}
            />
            <Column
              field="name"
              header="Section Name"
              body={(sec) => (
                <div className="flex align-items-center gap-2">
                  <span
                    className="inline-flex align-items-center justify-content-center border-round font-bold"
                    style={{ width: '26px', height: '26px', fontSize: '12px', backgroundColor: `${themeColor}18`, color: themeColor }}
                  >
                    {sec.name}
                  </span>
                  <span className="font-bold text-xs text-slate-800">Section {sec.name}</span>
                </div>
              )}
              style={{ width: '200px' }}
            />
            <Column
              field="capacity"
              header="Student Capacity"
              body={(sec) => (
                <div className="flex align-items-center gap-2">
                  <span className="font-semibold text-xs text-slate-800">{sec.capacity} Students</span>
                  <span className="text-xs text-slate-400 font-mono">(Max Limit BR-3.2)</span>
                </div>
              )}
            />
            <Column
              header="Status"
              body={() => <Tag value="Active" severity="success" style={{ fontSize: '9px', padding: '1px 6px' }} />}
              style={{ width: '100px' }}
            />
            <Column
              header="Actions"
              body={(sec) => (
                <div className="flex align-items-center justify-content-center gap-1">
                  {canEdit && (
                    <Button
                      icon="pi pi-pencil"
                      text
                      rounded
                      size="small"
                      severity="info"
                      className="p-button-sm"
                      style={{ width: '28px', height: '28px' }}
                      title="Edit Section"
                      onClick={() => handleOpenEditSection(data.id, sec)}
                    />
                  )}
                  {canDelete && (
                    <Button
                      icon="pi pi-trash"
                      text
                      rounded
                      size="small"
                      severity="danger"
                      className="p-button-sm"
                      style={{ width: '28px', height: '28px' }}
                      title="Delete Section"
                      onClick={() => {
                        setDeleteTarget({ type: 'section', id: sec.id });
                        setDeleteConfirmOpen(true);
                      }}
                    />
                  )}
                </div>
              )}
              style={{ width: '120px', textAlign: 'center' }}
            />
          </DataTable>
        )}
      </div>
    );
  };

  return (
    <Box>
      {/* Top Header Card */}
      <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-2 bg-white px-3 py-2 border-round-lg shadow-1 border-1 surface-border mb-2">
        <div>
          <h2 className="text-base font-bold text-slate-800 m-0">Classes & Sections Master</h2>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Define grade levels with display ordering and classroom sections with maximum capacity
          </p>
        </div>
        <div className="flex align-items-center gap-2">
          {canAdd && (
            <AppButton
              label="Add Class"
              icon="pi pi-plus"
              size="small"
              onClick={handleOpenAddClass}
            />
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid mb-3">
        <div className="col-12 sm:col-4">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Total Classes</span>
              <span className="text-2xl font-bold" style={{ color: themeColor }}>{totalClassesCount}</span>
            </div>
            <div
              className="flex align-items-center justify-content-center border-round p-2"
              style={{ width: '42px', height: '42px', backgroundColor: `${themeColor}15`, color: themeColor }}
            >
              <i className="pi pi-building text-xl" />
            </div>
          </div>
        </div>
        <div className="col-12 sm:col-4">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Total Sections</span>
              <span className="text-2xl font-bold" style={{ color: themeColor }}>{totalSectionsCount}</span>
            </div>
            <div
              className="flex align-items-center justify-content-center border-round p-2"
              style={{ width: '42px', height: '42px', backgroundColor: `${themeColor}15`, color: themeColor }}
            >
              <i className="pi pi-book text-xl" />
            </div>
          </div>
        </div>
        <div className="col-12 sm:col-4">
          <div className="flex align-items-center justify-content-between p-3 bg-white border-round-lg shadow-1 border-1 surface-border">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Total Student Capacity</span>
              <span className="text-2xl font-bold text-emerald-600">{totalCapacityCount} Seats</span>
            </div>
            <div className="flex align-items-center justify-content-center bg-emerald-50 text-emerald-600 border-round p-2" style={{ width: '42px', height: '42px' }}>
              <i className="pi pi-users text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Classes & Sections Table Card */}
      <div className="bg-white border-round-lg shadow-1 border-1 surface-border p-3">
        {/* Table Search & Control Bar */}
        <div className="flex flex-column sm:flex-row align-items-stretch sm:align-items-center justify-content-between gap-2 mb-3">
          <div className="flex align-items-center gap-2">
            <span className="p-input-icon-left w-full sm:w-20rem">
              <i className="pi pi-search" />
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Class or Section..."
                className="p-inputtext-sm w-full"
              />
            </span>
            {search && (
              <Button
                icon="pi pi-times"
                text
                rounded
                size="small"
                severity="secondary"
                onClick={() => setSearch('')}
                title="Clear Search"
              />
            )}
          </div>
          <div className="flex align-items-center gap-2">
            <Button
              label={expandedRows && Object.keys(expandedRows).length > 0 ? 'Collapse All' : 'Expand All'}
              icon={expandedRows && Object.keys(expandedRows).length > 0 ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
              size="small"
              outlined
              severity="secondary"
              className="p-button-sm text-xs"
              onClick={toggleExpandAll}
            />
          </div>
        </div>

        {/* PrimeReact DataTable */}
        <DataTable
          value={filteredClasses}
          dataKey="id"
          loading={loading}
          expandedRows={expandedRows}
          onRowToggle={(e) => setExpandedRows(e.data)}
          rowExpansionTemplate={rowExpansionTemplate}
          stripedRows
          responsiveLayout="scroll"
          className="p-datatable-sm"
          emptyMessage="No classes or sections found."
        >
          <Column expander style={{ width: '3.5rem' }} />

          {/* Order Column */}
          <Column
            field="displayOrder"
            header="Order"
            sortable
            body={(row) => (
              <div className="flex align-items-center justify-content-center">
                <span className="inline-flex align-items-center justify-content-center border-round font-bold bg-slate-100 text-slate-700 border-1 surface-border" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                  {row.displayOrder}
                </span>
              </div>
            )}
            style={{ width: '90px', textAlign: 'center' }}
          />

          {/* Class Name Column */}
          <Column
            field="name"
            header="Class Name"
            sortable
            body={(row) => (
              <div className="flex align-items-center gap-2">
                <div
                  className="flex align-items-center justify-content-center border-round font-bold text-white shadow-1"
                  style={{
                    width: '32px',
                    height: '32px',
                    background: `linear-gradient(135deg, ${themeColor} 0%, ${themeDarker} 100%)`,
                    fontSize: '11px',
                  }}
                >
                  {row.name.slice(0, 3).toUpperCase()}
                </div>
                <div className="flex flex-column">
                  <span className="font-bold text-sm text-slate-800">{row.name}</span>
                  <span className="text-xs text-slate-400">Order: {row.displayOrder}</span>
                </div>
              </div>
            )}
            style={{ minWidth: '160px' }}
          />

          {/* Sections List Column */}
          <Column
            header="Sections & Capacity"
            body={(row) => {
              const sections = row.sections || [];
              if (sections.length === 0) {
                return (
                  <div className="flex align-items-center gap-2">
                    <span className="text-xs text-slate-400 italic">No sections</span>
                    {canAdd && (
                      <Button
                        label="Add Section"
                        icon="pi pi-plus"
                        size="small"
                        text
                        className="p-0 text-xs text-indigo-600 hover:underline"
                        onClick={() => handleOpenAddSection(row.id)}
                      />
                    )}
                  </div>
                );
              }

              return (
                <div className="flex flex-wrap align-items-center gap-2 py-1">
                  {sections.map((sec) => (
                    <div
                      key={sec.id}
                      className="flex align-items-center gap-2 px-2 py-1 bg-slate-50 hover:bg-slate-100 border-1 surface-border border-round transition-colors"
                    >
                      <div className="flex align-items-center gap-1">
                        <span className="font-bold text-xs" style={{ color: themeDarker }}>Sec {sec.name}</span>
                        <span className="text-xs text-slate-500">({sec.capacity} seats)</span>
                      </div>
                      <div className="flex align-items-center gap-1 border-left-1 surface-border pl-1 ml-1">
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit Section"
                            className="p-0 border-none bg-transparent cursor-pointer text-slate-400 hover:text-primary flex align-items-center"
                            onClick={() => handleOpenEditSection(row.id, sec)}
                          >
                            <i className="pi pi-pencil" style={{ fontSize: '10px' }} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            title="Delete Section"
                            className="p-0 border-none bg-transparent cursor-pointer text-slate-400 hover:text-red-600 flex align-items-center"
                            onClick={() => {
                              setDeleteTarget({ type: 'section', id: sec.id });
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <i className="pi pi-trash" style={{ fontSize: '10px' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {canAdd && (
                    <button
                      type="button"
                      title="Add another section to this class"
                      className="flex align-items-center gap-1 px-2 py-1 border-1 border-dashed border-round text-xs cursor-pointer transition-colors"
                      style={{
                        borderColor: `${themeColor}80`,
                        backgroundColor: `${themeColor}12`,
                        color: themeColor,
                      }}
                      onClick={() => handleOpenAddSection(row.id)}
                    >
                      <i className="pi pi-plus" style={{ fontSize: '9px' }} />
                      <span className="font-semibold">Add</span>
                    </button>
                  )}
                </div>
              );
            }}
            style={{ minWidth: '320px' }}
          />

          {/* Total Sections Badge */}
          <Column
            header="Sections"
            body={(row) => {
              const count = row.sections?.length || 0;
              return (
                <Tag
                  value={`${count} ${count === 1 ? 'Sec' : 'Secs'}`}
                  severity={count > 0 ? 'info' : 'warning'}
                  style={{ fontSize: '10px', padding: '2px 6px' }}
                />
              );
            }}
            style={{ width: '100px', textAlign: 'center' }}
          />

          {/* Total Seats Capacity Badge */}
          <Column
            header="Capacity"
            body={(row) => {
              const capacity = row.sections?.reduce((sum, s) => sum + (s.capacity || 0), 0) || 0;
              return (
                <div className="flex flex-column align-items-center">
                  <span className="font-bold text-xs text-slate-700">{capacity}</span>
                  <span className="text-xs text-slate-400">Seats</span>
                </div>
              );
            }}
            style={{ width: '100px', textAlign: 'center' }}
          />

          {/* Actions Column */}
          <Column
            header="Actions"
            body={(row) => (
              <div className="flex align-items-center justify-content-center gap-1">
                {canAdd && (
                  <Button
                    icon="pi pi-plus"
                    size="small"
                    outlined
                    severity="primary"
                    className="p-button-sm py-1 px-2 text-xs"
                    label="Section"
                    title="Add Section to this class"
                    onClick={() => handleOpenAddSection(row.id)}
                  />
                )}
                {canEdit && (
                  <Button
                    icon="pi pi-pencil"
                    text
                    rounded
                    size="small"
                    severity="secondary"
                    className="p-0 text-slate-500 hover:text-indigo-600"
                    style={{ width: '28px', height: '28px' }}
                    title="Edit Class"
                    onClick={() => handleOpenEditClass(row)}
                  />
                )}
                {canDelete && (
                  <Button
                    icon="pi pi-trash"
                    text
                    rounded
                    size="small"
                    severity="danger"
                    className="p-0 text-slate-400 hover:text-red-600"
                    style={{ width: '28px', height: '28px' }}
                    title="Delete Class"
                    onClick={() => {
                      setDeleteTarget({ type: 'class', id: row.id });
                      setDeleteConfirmOpen(true);
                    }}
                  />
                )}
              </div>
            )}
            style={{ width: '170px', textAlign: 'center' }}
          />
        </DataTable>
      </div>

      {/* Class Modal */}
      <Modal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title={editingClass ? 'Edit Class' : 'Create New Class'}
        maxWidth="xs"
        formId="class-form"
        submitLabel={editingClass ? 'Save Changes' : 'Save Class'}
      >
        <Box component="form" id="class-form" onSubmit={handleSaveClass} sx={{ mt: 1 }}>
          <TextField
            required
            fullWidth
            label="Class Name (e.g. Class 1, Grade 1)"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            required
            fullWidth
            type="number"
            label="Display Order"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            sx={{ mb: 2 }}
          />
        </Box>
      </Modal>

      {/* Section Modal */}
      <Modal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={editingSection ? 'Edit Section' : 'Add Section to Class'}
        maxWidth="xs"
        formId="section-form"
        submitLabel={editingSection ? 'Save Changes' : 'Save Section'}
      >
        <Box component="form" id="section-form" onSubmit={handleSaveSection} sx={{ mt: 1 }}>
          <TextField
            required
            fullWidth
            label="Section Name (e.g. A, B, Green)"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            required
            fullWidth
            type="number"
            label="Student Capacity"
            helperText="Section capacity cannot be exceeded without Principal override"
            value={sectionCapacity}
            onChange={(e) => setSectionCapacity(Number(e.target.value))}
            sx={{ mb: 2 }}
          />
        </Box>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={deleteTarget?.type === 'class' ? 'Delete Class' : 'Delete Section'}
        message="Are you sure you want to remove this record? This action cannot be undone."
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Box>
  );
};

export default ClassesSectionsPage;
