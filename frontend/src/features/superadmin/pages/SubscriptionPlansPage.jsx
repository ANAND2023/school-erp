import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { superAdminApi } from '../api/superAdminApi';

export const SubscriptionPlansPage = () => {
  const toastRef = useRef(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    billingPeriod: 'Monthly',
    pricePerPeriod: 2999,
    maxStudents: 500,
    maxStaff: 50,
    includedModules: 'STUDENTS,ACADEMICS,ATTENDANCE,FEES',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getPlans();
      if (res.success) setPlans(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toastRef.current?.show({ severity: 'warn', summary: 'Required', detail: 'Code and Name are required.' });
      return;
    }
    try {
      setSaving(true);
      const res = await superAdminApi.createPlan(form);
      if (res.success) {
        toastRef.current?.show({ severity: 'success', summary: 'Plan Created', detail: `${form.name} added.` });
        setDialogVisible(false);
        loadPlans();
      }
    } catch (err) {
      toastRef.current?.show({ severity: 'error', summary: 'Failed', detail: err.response?.data?.message || 'Error creating plan' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toastRef} />

      <div className="flex align-items-center justify-content-between bg-white p-4 border-round-lg shadow-1 border-1 surface-border">
        <div>
          <h2 className="text-xl font-bold text-slate-800 m-0">Subscription Plans & Licensing</h2>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Define pricing tiers, billing periodicity, maximum quotas, and bundle modules per subscription package.
          </p>
        </div>
        <Button
          label="Add New Plan"
          icon="pi pi-plus"
          size="small"
          className="bg-indigo-600 border-indigo-600"
          onClick={() => setDialogVisible(true)}
        />
      </div>

      <div className="grid">
        {plans.map((p) => (
          <div key={p.id} className="col-12 md:col-4">
            <div className="p-4 bg-white border-round-xl shadow-1 border-1 surface-border h-full flex flex-column justify-content-between">
              <div>
                <div className="flex align-items-center justify-content-between mb-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 border-round">
                    {p.code}
                  </span>
                  <Tag value={p.isActive ? 'Active' : 'Archived'} severity={p.isActive ? 'success' : 'secondary'} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 m-0 mb-1">{p.name}</h3>
                <p className="text-xs text-slate-500 m-0 mb-3">{p.description}</p>

                <div className="text-2xl font-bold text-slate-900 mb-3">
                  ₹{Number(p.pricePerPeriod).toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-normal text-slate-500">/{p.billingPeriod}</span>
                </div>

                <div className="flex flex-column gap-2 text-xs text-slate-600 pt-3 border-top-1 surface-border">
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-check text-emerald-500 text-xs"></i>
                    <span>Max Students Quota: <strong>{p.maxStudents}</strong></span>
                  </div>
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-check text-emerald-500 text-xs"></i>
                    <span>Max Staff / Faculty: <strong>{p.maxStaff}</strong></span>
                  </div>
                  <div className="flex align-items-start gap-2 mt-1">
                    <i className="pi pi-th-large text-indigo-500 text-xs mt-0.5"></i>
                    <span>
                      Included Modules:{' '}
                      <span className="text-slate-700 font-semibold">{p.includedModules || 'All Standard Modules'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-top-1 surface-border">
                <Button label="Edit Plan" icon="pi pi-pencil" size="small" outlined className="w-full" disabled />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog
        header="Create New Subscription Plan"
        visible={dialogVisible}
        style={{ width: '480px' }}
        modal
        onHide={() => setDialogVisible(false)}
        footer={
          <div className="flex align-items-center justify-content-end gap-2">
            <Button label="Cancel" size="small" outlined severity="secondary" onClick={() => setDialogVisible(false)} />
            <Button label="Create Plan" icon="pi pi-check" size="small" className="bg-indigo-600 border-indigo-600" loading={saving} onClick={handleCreate} />
          </div>
        }
      >
        <div className="flex flex-column gap-3 py-2 text-xs">
          <div>
            <label className="font-semibold block mb-1">Plan Code</label>
            <InputText value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. ULTRA" className="p-inputtext-sm w-full uppercase" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Plan Name</label>
            <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ultra Campus" className="p-inputtext-sm w-full" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Description</label>
            <InputText value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" className="p-inputtext-sm w-full" />
          </div>
          <div className="grid">
            <div className="col-6">
              <label className="font-semibold block mb-1">Billing Period</label>
              <Dropdown value={form.billingPeriod} options={['Monthly', 'Annual']} onChange={(e) => setForm({ ...form, billingPeriod: e.value })} className="p-inputtext-sm w-full" />
            </div>
            <div className="col-6">
              <label className="font-semibold block mb-1">Price (₹)</label>
              <InputText type="number" value={form.pricePerPeriod} onChange={(e) => setForm({ ...form, pricePerPeriod: Number(e.target.value) })} className="p-inputtext-sm w-full" />
            </div>
          </div>
          <div className="grid">
            <div className="col-6">
              <label className="font-semibold block mb-1">Max Students</label>
              <InputText type="number" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: Number(e.target.value) })} className="p-inputtext-sm w-full" />
            </div>
            <div className="col-6">
              <label className="font-semibold block mb-1">Max Staff</label>
              <InputText type="number" value={form.maxStaff} onChange={(e) => setForm({ ...form, maxStaff: Number(e.target.value) })} className="p-inputtext-sm w-full" />
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1">Included Modules (Comma Separated)</label>
            <InputText value={form.includedModules} onChange={(e) => setForm({ ...form, includedModules: e.target.value })} placeholder="STUDENTS,ACADEMICS,FEES" className="p-inputtext-sm w-full font-mono" />
          </div>
        </div>
      </Dialog>
    </div>
  );
};
