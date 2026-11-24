import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';

const PAYMENT_MODES = [
  { label: 'Bank Transfer (NEFT/RTGS/IMPS)', value: 'Bank Transfer' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'UPI / QR', value: 'UPI' },
  { label: 'Cash', value: 'Cash' },
];

export const RecordPaymentModal = ({ visible, onHide, payroll, onSubmit, loading }) => {
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [transactionReference, setTransactionReference] = useState('');
  const [remarks, setRemarks] = useState('');

  if (!payroll) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      paymentMode,
      paymentDate: paymentDate ? paymentDate.toISOString() : new Date().toISOString(),
      transactionReference,
      remarks,
    });
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-credit-card text-primary text-xl" />
          <span className="font-bold text-lg">Record Salary Disbursement</span>
        </div>
      }
      style={{ width: '480px', maxWidth: '95vw' }}
      modal
    >
      <form onSubmit={handleSubmit} className="p-fluid flex flex-column gap-3 pt-2">
        <div className="surface-100 border-round p-3 flex justify-content-between align-items-center">
          <div>
            <div className="font-bold text-900">{payroll.employeeName}</div>
            <div className="text-xs text-500">{payroll.employeeCode} • {payroll.designation || 'Staff'}</div>
            <div className="text-xs text-primary font-semibold mt-1">Slip: {payroll.salarySlipNo}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-600 font-semibold uppercase">Net Payable</div>
            <div className="text-xl font-extrabold text-green-700">₹{payroll.netSalary?.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div>
          <label className="font-semibold text-xs text-700 block mb-1">Payment Mode *</label>
          <Dropdown
            value={paymentMode}
            options={PAYMENT_MODES}
            onChange={(e) => setPaymentMode(e.value)}
            className="w-full p-inputtext-sm"
          />
        </div>

        <div>
          <label className="font-semibold text-xs text-700 block mb-1">Disbursement Date *</label>
          <Calendar
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.value)}
            dateFormat="dd/mm/yy"
            showIcon
            className="w-full p-inputtext-sm"
          />
        </div>

        <div>
          <label className="font-semibold text-xs text-700 block mb-1">Transaction Ref / UTR / Cheque No</label>
          <InputText
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
            placeholder="e.g. UTR192830192 / CHQ-00912"
            className="p-inputtext-sm"
          />
        </div>

        <div>
          <label className="font-semibold text-xs text-700 block mb-1">Notes / Remarks (Optional)</label>
          <InputTextarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="Disbursed via corporate payroll account..."
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
            label="Confirm Payment"
            icon="pi pi-check"
            className="p-button-success p-button-sm"
            loading={loading}
          />
        </div>
      </form>
    </Dialog>
  );
};

export default RecordPaymentModal;
