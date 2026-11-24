import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';

export const EditPayrollModal = ({ visible, onHide, payroll, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    totalWorkingDays: 30,
    presentDays: 30,
    paidLeaves: 0,
    unpaidLeaves: 0,
    basicSalary: 0,
    da: 0,
    hra: 0,
    conveyance: 0,
    medicalAllowance: 0,
    specialAllowance: 0,
    pfDeduction: 0,
    esiDeduction: 0,
    professionalTax: 0,
    tdsDeduction: 0,
    loanDeduction: 0,
    leaveDeduction: 0,
    remarks: '',
  });

  useEffect(() => {
    if (payroll) {
      setFormData({
        totalWorkingDays: payroll.totalWorkingDays || 30,
        presentDays: payroll.presentDays || 30,
        paidLeaves: payroll.paidLeaves || 0,
        unpaidLeaves: payroll.unpaidLeaves || 0,
        basicSalary: payroll.basicSalary || 0,
        da: payroll.da || 0,
        hra: payroll.hra || 0,
        conveyance: payroll.conveyance || 0,
        medicalAllowance: payroll.medicalAllowance || 0,
        specialAllowance: payroll.specialAllowance || 0,
        pfDeduction: payroll.pfDeduction || 0,
        esiDeduction: payroll.esiDeduction || 0,
        professionalTax: payroll.professionalTax || 0,
        tdsDeduction: payroll.tdsDeduction || 0,
        loanDeduction: payroll.loanDeduction || 0,
        leaveDeduction: payroll.leaveDeduction || 0,
        remarks: payroll.remarks || '',
      });
    }
  }, [payroll]);

  if (!payroll) return null;

  const grossSalary =
    (formData.basicSalary || 0) +
    (formData.da || 0) +
    (formData.hra || 0) +
    (formData.conveyance || 0) +
    (formData.medicalAllowance || 0) +
    (formData.specialAllowance || 0);

  const totalDeductions =
    (formData.pfDeduction || 0) +
    (formData.esiDeduction || 0) +
    (formData.professionalTax || 0) +
    (formData.tdsDeduction || 0) +
    (formData.loanDeduction || 0) +
    (formData.leaveDeduction || 0);

  const netSalary = Math.max(0, grossSalary - totalDeductions);

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val ?? 0 }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      grossSalary,
      totalDeductions,
      netSalary,
    });
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-user-edit text-primary text-xl" />
          <span className="font-bold text-lg">Edit Salary Breakdown - {payroll.employeeName}</span>
        </div>
      }
      style={{ width: '840px', maxWidth: '96vw' }}
      modal
    >
      <form onSubmit={handleSubmit} className="p-fluid flex flex-column gap-3 pt-2">
        {/* Attendance Days */}
        <div className="surface-100 border-round p-3">
          <div className="font-bold text-xs uppercase text-700 mb-2">Month Attendance & Leaves</div>
          <div className="grid m-0">
            <div className="col-12 sm:col-3 p-1">
              <label className="text-xs font-semibold text-600 block mb-1">Total Days</label>
              <InputNumber
                value={formData.totalWorkingDays}
                onValueChange={(e) => handleChange('totalWorkingDays', e.value)}
                min={1}
                max={31}
                className="p-inputtext-sm"
              />
            </div>
            <div className="col-12 sm:col-3 p-1">
              <label className="text-xs font-semibold text-600 block mb-1">Present / Paid Days</label>
              <InputNumber
                value={formData.presentDays}
                onValueChange={(e) => handleChange('presentDays', e.value)}
                min={0}
                max={31}
                className="p-inputtext-sm"
              />
            </div>
            <div className="col-12 sm:col-3 p-1">
              <label className="text-xs font-semibold text-600 block mb-1">Paid Leaves</label>
              <InputNumber
                value={formData.paidLeaves}
                onValueChange={(e) => handleChange('paidLeaves', e.value)}
                min={0}
                max={31}
                className="p-inputtext-sm"
              />
            </div>
            <div className="col-12 sm:col-3 p-1">
              <label className="text-xs font-semibold text-600 block mb-1">Unpaid Leaves (LOP)</label>
              <InputNumber
                value={formData.unpaidLeaves}
                onValueChange={(e) => handleChange('unpaidLeaves', e.value)}
                min={0}
                max={31}
                className="p-inputtext-sm"
              />
            </div>
          </div>
        </div>

        {/* Earnings & Deductions Columns */}
        <div className="grid m-0">
          {/* Earnings */}
          <div className="col-12 sm:col-6 p-1">
            <div className="border-1 border-blue-200 border-round p-3 surface-0">
              <div className="font-bold text-xs uppercase text-blue-700 mb-2 flex justify-content-between">
                <span>Earnings Allowances</span>
                <span>Gross: ₹{grossSalary.toFixed(2)}</span>
              </div>
              <div className="flex flex-column gap-2">
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">Basic Salary</label>
                  <InputNumber
                    value={formData.basicSalary}
                    onValueChange={(e) => handleChange('basicSalary', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">Dearness Allowance (DA)</label>
                  <InputNumber
                    value={formData.da}
                    onValueChange={(e) => handleChange('da', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">House Rent (HRA)</label>
                  <InputNumber
                    value={formData.hra}
                    onValueChange={(e) => handleChange('hra', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">Conveyance Allowance</label>
                  <InputNumber
                    value={formData.conveyance}
                    onValueChange={(e) => handleChange('conveyance', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">Medical Allowance</label>
                  <InputNumber
                    value={formData.medicalAllowance}
                    onValueChange={(e) => handleChange('medicalAllowance', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">Special / Other Allowance</label>
                  <InputNumber
                    value={formData.specialAllowance}
                    onValueChange={(e) => handleChange('specialAllowance', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="col-12 sm:col-6 p-1">
            <div className="border-1 border-orange-200 border-round p-3 surface-0">
              <div className="font-bold text-xs uppercase text-orange-700 mb-2 flex justify-content-between">
                <span>Deductions</span>
                <span>Total: ₹{totalDeductions.toFixed(2)}</span>
              </div>
              <div className="flex flex-column gap-2">
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">Provident Fund (PF)</label>
                  <InputNumber
                    value={formData.pfDeduction}
                    onValueChange={(e) => handleChange('pfDeduction', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">ESI Deduction</label>
                  <InputNumber
                    value={formData.esiDeduction}
                    onValueChange={(e) => handleChange('esiDeduction', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">Professional Tax (PT)</label>
                  <InputNumber
                    value={formData.professionalTax}
                    onValueChange={(e) => handleChange('professionalTax', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">TDS / Income Tax</label>
                  <InputNumber
                    value={formData.tdsDeduction}
                    onValueChange={(e) => handleChange('tdsDeduction', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">Loan / Advance Deduction</label>
                  <InputNumber
                    value={formData.loanDeduction}
                    onValueChange={(e) => handleChange('loanDeduction', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-600 block mb-1">Loss of Pay (Leave) Deduction</label>
                  <InputNumber
                    value={formData.leaveDeduction}
                    onValueChange={(e) => handleChange('leaveDeduction', e.value)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    className="p-inputtext-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Preview */}
        <div className="bg-green-50 border-1 border-green-500 border-round p-3 flex justify-content-between align-items-center">
          <div>
            <div className="text-xs uppercase font-bold text-green-800">Recalculated Net Payable</div>
            <div className="text-xs text-green-700">Gross (₹{grossSalary.toFixed(2)}) - Deductions (₹{totalDeductions.toFixed(2)})</div>
          </div>
          <div className="text-2xl font-extrabold text-green-800">
            ₹{netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-600 block mb-1">Adjustment Notes / Remarks</label>
          <InputTextarea
            value={formData.remarks}
            onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
            rows={2}
            placeholder="Reason for adjustment..."
            className="p-inputtext-sm"
          />
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
            label="Save Changes"
            icon="pi pi-check"
            className="p-button-primary p-button-sm"
            loading={loading}
          />
        </div>
      </form>
    </Dialog>
  );
};

export default EditPayrollModal;
