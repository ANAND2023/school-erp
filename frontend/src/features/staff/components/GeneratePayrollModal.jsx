import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';

const MONTHS = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

export const GeneratePayrollModal = ({ visible, onHide, onGenerate, loading, departments = [] }) => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [departmentId, setDepartmentId] = useState(null);
  const [autoCalculateAttendance, setAutoCalculateAttendance] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({
      month,
      year,
      departmentId: departmentId || null,
      autoCalculateAttendance,
    });
  };

  const deptOptions = [
    { label: 'All Departments (All Staff & Teachers)', value: null },
    ...departments.map((d) => ({ label: d.name, value: d.id })),
  ];

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-bolt text-yellow-600 text-xl" />
          <span className="font-bold text-lg">Generate Monthly Staff Payroll</span>
        </div>
      }
      style={{ width: '500px', maxWidth: '95vw' }}
      modal
    >
      <form onSubmit={handleSubmit} className="p-fluid flex flex-column gap-3 pt-2">
        <div className="surface-100 border-round p-3 text-xs text-700">
          <i className="pi pi-info-circle text-primary mr-1" />
          This will generate salary slips for all active employees and teachers using their designated monthly salary, calculating present days and any loss of pay (LOP) deductions from daily attendance records.
        </div>

        <div className="grid m-0">
          <div className="col-12 sm:col-7 p-1">
            <label className="text-xs font-semibold text-700 block mb-1">Payroll Month *</label>
            <Dropdown
              value={month}
              options={MONTHS}
              onChange={(e) => setMonth(e.value)}
              className="p-inputtext-sm w-full"
            />
          </div>
          <div className="col-12 sm:col-5 p-1">
            <label className="text-xs font-semibold text-700 block mb-1">Year *</label>
            <InputNumber
              value={year}
              onValueChange={(e) => setYear(e.value)}
              useGrouping={false}
              min={2020}
              max={2035}
              className="p-inputtext-sm w-full"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-700 block mb-1">Department Scope</label>
          <Dropdown
            value={departmentId}
            options={deptOptions}
            onChange={(e) => setDepartmentId(e.value)}
            className="p-inputtext-sm w-full"
            placeholder="Select department..."
          />
        </div>

        <div className="field-checkbox flex align-items-center gap-2 mt-1">
          <Checkbox
            inputId="autoAtt"
            checked={autoCalculateAttendance}
            onChange={(e) => setAutoCalculateAttendance(e.checked)}
          />
          <label htmlFor="autoAtt" className="text-xs text-700 cursor-pointer select-none">
            Auto-calculate present days, leaves, and LOP deductions from Daily Staff Attendance
          </label>
        </div>

        <div className="flex justify-content-end gap-2 mt-2 pt-2 border-top-1 surface-border">
          <Button
            type="button"
            label="Cancel"
            className="p-button-text p-button-sm"
            onClick={onHide}
            disabled={loading}
          />
          <Button
            type="submit"
            label="Generate Payroll"
            icon="pi pi-bolt"
            className="p-button-primary p-button-sm"
            loading={loading}
          />
        </div>
      </form>
    </Dialog>
  );
};

export default GeneratePayrollModal;
