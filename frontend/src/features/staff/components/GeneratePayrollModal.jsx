import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { RadioButton } from 'primereact/radiobutton';
import { payrollApi } from '../api';

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
  const [attendanceMode, setAttendanceMode] = useState('StrictAttendance');

  const [attStatus, setAttStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const parseDepartmentId = (val) => {
    if (val === null || val === undefined || val === '' || val === 'null') return null;
    const num = Number(val);
    return isNaN(num) || num <= 0 ? null : num;
  };

  // Fetch Attendance Status whenever month, year, or department changes and modal is visible
  useEffect(() => {
    if (visible && month && year) {
      fetchAttendanceStatus();
    }
  }, [visible, month, year, departmentId]);

  const fetchAttendanceStatus = async () => {
    setStatusLoading(true);
    try {
      const cleanDeptId = parseDepartmentId(departmentId);
      const res = await payrollApi.getAttendanceStatus({
        month: Number(month),
        year: Number(year),
        departmentId: cleanDeptId || undefined,
      });
      const data = res.data?.data || res.data;
      setAttStatus(data);

      // Smart default: If no attendance records marked, switch default to FullFixedSalary or keep Strict with notice
      if (data && !data.hasAttendanceRecords) {
        setAttendanceMode('FullFixedSalary');
      } else {
        setAttendanceMode('StrictAttendance');
      }
    } catch (err) {
      console.error('Failed to fetch attendance status', err);
      setAttStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanDeptId = parseDepartmentId(departmentId);
    onGenerate({
      month: Number(month),
      year: Number(year),
      departmentId: cleanDeptId,
      autoCalculateAttendance: attendanceMode !== 'FullFixedSalary',
      attendanceMode,
    });
  };

  const deptOptions = [
    { label: 'All Departments (All Staff & Teachers)', value: null },
    ...departments.map((d) => ({ label: d.name, value: Number(d.id) })),
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
      style={{ width: '560px', maxWidth: '95vw' }}
      modal
    >
      <form onSubmit={handleSubmit} className="p-fluid flex flex-column gap-3 pt-2">
        {/* Month & Year Selection */}
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

        {/* Department Scope */}
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

        {/* Live Attendance Status Card */}
        <div className="surface-50 border-1 surface-border border-round p-3">
          <div className="flex align-items-center justify-content-between mb-2">
            <span className="text-xs font-bold text-700 uppercase">
              <i className="pi pi-calendar mr-1 text-primary" />
              Attendance Status for {attStatus?.monthName || 'Month'}
            </span>
            {statusLoading && (
              <span className="text-xs text-500 flex align-items-center gap-1">
                <i className="pi pi-spin pi-spinner text-xs" /> Checking...
              </span>
            )}
          </div>

          {attStatus && (
            <>
              {/* Month stats pills */}
              <div className="grid grid-nogutter gap-2 mb-2">
                <div className="col surface-card p-2 border-round text-center border-1 surface-border">
                  <div className="text-xs text-500">Days</div>
                  <div className="font-bold text-sm text-800">{attStatus.calendarDays}</div>
                </div>
                <div className="col surface-card p-2 border-round text-center border-1 surface-border">
                  <div className="text-xs text-500">Sundays (Off)</div>
                  <div className="font-bold text-sm text-blue-600">{attStatus.sundaysCount}</div>
                </div>
                <div className="col surface-card p-2 border-round text-center border-1 surface-border">
                  <div className="text-xs text-500">Holidays</div>
                  <div className="font-bold text-sm text-purple-600">{attStatus.holidaysCount}</div>
                </div>
                <div className="col surface-card p-2 border-round text-center border-1 surface-border">
                  <div className="text-xs text-500">Working Days</div>
                  <div className="font-bold text-sm text-green-700">{attStatus.workingDays}</div>
                </div>
              </div>

              {/* Status Notice */}
              {attStatus.hasAttendanceRecords ? (
                <div className="bg-green-50 border-1 border-green-200 border-round p-2 text-xs text-green-800 flex align-items-start gap-2">
                  <i className="pi pi-check-circle text-green-600 text-base mt-1" />
                  <div>
                    <div className="font-bold">Attendance Synced ({attStatus.markedDatesCount} working days recorded)</div>
                    <div className="text-green-700 mt-1">
                      Staff attendance is recorded. Sundays & holidays are paid. Absents will be deducted as Loss of Pay (LOP).
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border-1 border-yellow-300 border-round p-2 text-xs text-yellow-900 flex flex-column gap-2">
                  <div className="flex align-items-center justify-content-between">
                    <span className="font-bold flex align-items-center gap-2">
                      <i className="pi pi-exclamation-triangle text-yellow-600" />
                      No Attendance Marked for this Month (0 Days)
                    </span>
                    <Button
                      type="button"
                      label="Open Attendance"
                      icon="pi pi-external-link"
                      className="p-button-outlined p-button-warning p-button-sm text-xs py-1 px-2"
                      onClick={() => window.open('/attendance/staff', '_blank')}
                    />
                  </div>
                  <p className="m-0 text-yellow-800">
                    Is mahine me kisi bhi teacher/staff ki attendance mark nahi hui hai. Agar aap attendance ke hisaab se salary banana chahte hain to pehle attendance mark karein, ya neeche <b>'Full Fixed Monthly Salary'</b> mode chunein.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Calculation Modes Selection */}
        <div>
          <label className="text-xs font-semibold text-700 block mb-2">Salary Calculation Mode *</label>
          <div className="flex flex-column gap-2">
            {/* Mode 1: Strict Attendance */}
            <div
              className={`p-2 border-round border-1 cursor-pointer transition-all ${
                attendanceMode === 'StrictAttendance'
                  ? 'border-primary surface-50'
                  : 'border-200 hover:surface-50'
              }`}
              onClick={() => setAttendanceMode('StrictAttendance')}
            >
              <div className="flex align-items-start gap-2">
                <RadioButton
                  inputId="modeStrict"
                  name="attendanceMode"
                  value="StrictAttendance"
                  onChange={(e) => setAttendanceMode(e.value)}
                  checked={attendanceMode === 'StrictAttendance'}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="modeStrict" className="font-semibold text-xs cursor-pointer block text-800">
                    Sync with Daily Attendance Register (Auto LOP)
                    {attStatus?.hasAttendanceRecords && (
                      <span className="ml-2 text-green-600 text-xs font-normal">● Recommended</span>
                    )}
                    {attStatus && !attStatus.hasAttendanceRecords && (
                      <span className="ml-2 text-yellow-700 text-xs font-normal">⚠️ Requires attendance</span>
                    )}
                  </label>
                  <p className="m-0 text-xs text-600 mt-1">
                    Calculates actual present days, includes Sundays and configured Holidays as paid, and deducts Loss of Pay (LOP) for absents and unmarked days.
                  </p>
                </div>
              </div>
            </div>

            {/* Mode 2: Deduct Explicit Absents Only */}
            <div
              className={`p-2 border-round border-1 cursor-pointer transition-all ${
                attendanceMode === 'DeductExplicitAbsents'
                  ? 'border-primary surface-50'
                  : 'border-200 hover:surface-50'
              }`}
              onClick={() => setAttendanceMode('DeductExplicitAbsents')}
            >
              <div className="flex align-items-start gap-2">
                <RadioButton
                  inputId="modeExplicit"
                  name="attendanceMode"
                  value="DeductExplicitAbsents"
                  onChange={(e) => setAttendanceMode(e.value)}
                  checked={attendanceMode === 'DeductExplicitAbsents'}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="modeExplicit" className="font-semibold text-xs cursor-pointer block text-800">
                    Deduct Only Explicit Absents
                  </label>
                  <p className="m-0 text-xs text-600 mt-1">
                    Pays full monthly salary, deducting salary only for days specifically marked 'Absent' in the register.
                  </p>
                </div>
              </div>
            </div>

            {/* Mode 3: Full Fixed Salary */}
            <div
              className={`p-2 border-round border-1 cursor-pointer transition-all ${
                attendanceMode === 'FullFixedSalary'
                  ? 'border-primary surface-50'
                  : 'border-200 hover:surface-50'
              }`}
              onClick={() => setAttendanceMode('FullFixedSalary')}
            >
              <div className="flex align-items-start gap-2">
                <RadioButton
                  inputId="modeFixed"
                  name="attendanceMode"
                  value="FullFixedSalary"
                  onChange={(e) => setAttendanceMode(e.value)}
                  checked={attendanceMode === 'FullFixedSalary'}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="modeFixed" className="font-semibold text-xs cursor-pointer block text-800">
                    Full Monthly Fixed Salary (Standard School Pay)
                    {attStatus && !attStatus.hasAttendanceRecords && (
                      <span className="ml-2 text-primary text-xs font-normal">● Recommended (No attendance)</span>
                    )}
                  </label>
                  <p className="m-0 text-xs text-600 mt-1">
                    Disburses 100% full fixed salary (30/30 days, no attendance deductions). Use this if attendance is maintained offline or on paper.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Attendance Preview toggle (if records exist) */}
        {attStatus?.staffPreview && attStatus.staffPreview.length > 0 && attStatus.hasAttendanceRecords && (
          <div className="border-top-1 surface-border pt-2">
            <Button
              type="button"
              label={showPreview ? 'Hide Staff Attendance Preview' : `Preview Staff Attendance & Salary (${attStatus.staffPreview.length})`}
              icon={showPreview ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
              className="p-button-text p-button-sm text-xs p-1"
              onClick={() => setShowPreview(!showPreview)}
            />

            {showPreview && (
              <div className="surface-card border-1 surface-border border-round mt-2 max-h-12rem overflow-y-auto">
                <table className="w-full text-xs text-left" style={{ borderCollapse: 'collapse' }}>
                  <thead className="surface-100 text-600">
                    <tr>
                      <th className="p-2 border-bottom-1 surface-border">Staff</th>
                      <th className="p-2 border-bottom-1 surface-border">Basic</th>
                      <th className="p-2 border-bottom-1 surface-border">Paid / LOP</th>
                      <th className="p-2 border-bottom-1 surface-border text-right">Est. Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attStatus.staffPreview.map((staff) => (
                      <tr key={staff.employeeId} className="border-bottom-1 surface-border">
                        <td className="p-2 font-medium">{staff.employeeName}</td>
                        <td className="p-2">₹{staff.basicSalary?.toLocaleString('en-IN')}</td>
                        <td className="p-2">
                          <span className="text-green-700 font-semibold">{staff.paidDays}d</span>
                          {staff.lopDays > 0 && (
                            <span className="text-red-600 font-semibold ml-1">(-{staff.lopDays}d LOP)</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-bold text-800">
                          ₹{staff.estimatedNetSalary?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
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
