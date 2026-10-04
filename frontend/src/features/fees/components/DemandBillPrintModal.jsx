import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { SingleDemandSlip, TwoCopyDemandSlip, ThreeCopyDemandSlip } from './DemandBillSlip';
import dayjs from 'dayjs';

export const DemandBillPrintModal = ({ visible, onHide, students = [], schoolInfo = {} }) => {
  const [copyFormat, setCopyFormat] = useState('2-copy');

  const copyOptions = [
    { label: 'Single Copy', value: '1-copy', icon: 'pi pi-file' },
    { label: '2-Part (Parent + Office)', value: '2-copy', icon: 'pi pi-copy' },
    { label: '3-Part (Bank Challan)', value: '3-copy', icon: 'pi pi-clone' },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = (student) => {
    if (!student?.guardianMobile) {
      alert('Guardian mobile number not available for this student.');
      return;
    }
    const cleanMobile = student.guardianMobile.replace(/[^0-9]/g, '');
    const mobileWithCountry = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    const dueDate = student.dueDate ? dayjs(student.dueDate).format('DD-MM-YYYY') : dayjs().add(10, 'day').format('DD-MM-YYYY');
    const netAmount = Number(student.netDemandAmount || student.balanceAmount || 0).toLocaleString('en-IN');
    
    const message = `*FEE DEMAND NOTICE - ${schoolInfo?.schoolName || 'SCHOOL ERP'}*\n\n` +
      `Dear Parent,\n` +
      `This is a gentle reminder regarding the fee demand bill for your ward *${student.studentName}* (Class: *${student.className}${student.sectionName ? ' - ' + student.sectionName : ''}*, Adm No: *${student.admissionNo}*).\n\n` +
      `• *Total Due Demand:* ₹${netAmount}\n` +
      `• *Due Date:* ${dueDate}\n` +
      `• *Bill No:* ${student.demandBillNo || 'DB-' + student.admissionNo}\n\n` +
      `Please deposit the fees on or before the due date to avoid late charges. Ignore if already paid.\n\n` +
      `Thank you,\n*${schoolInfo?.schoolName || 'Accounts Office'}*`;

    const url = `https://wa.me/${mobileWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const studentCount = students.length;

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center justify-content-between w-full pr-4">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-print text-primary text-xl" />
            <div>
              <div className="font-bold text-lg">
                Print Fee Demand {studentCount > 1 ? `Bills (${studentCount} Students)` : 'Bill'}
              </div>
              <div className="text-xs text-500 font-normal">
                Professional high-contrast printable student demand notice & bank challans
              </div>
            </div>
          </div>

          <div className="flex align-items-center gap-2">
            <SelectButton
              value={copyFormat}
              options={copyOptions}
              onChange={(e) => e.value && setCopyFormat(e.value)}
              className="p-buttonset-sm"
            />
            <Button
              label="Print Now"
              icon="pi pi-print"
              className="p-button-primary p-button-sm font-bold shadow-2"
              onClick={handlePrint}
            />
          </div>
        </div>
      }
      style={{ width: '90vw', maxWidth: '850px' }}
      modal
      className="p-fluid demand-bill-modal"
    >
      {/* Printable Area Styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-demand-bills-preview, #printable-demand-bills-preview * {
            visibility: visible;
          }
          #printable-demand-bills-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .demand-bill-page-break {
            page-break-after: always;
            break-after: page;
            margin-bottom: 20px;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
        }
      `}</style>

      {/* Floating Action Bar inside Modal */}
      {studentCount === 1 && students[0]?.guardianMobile && (
        <div className="flex justify-content-end mb-3">
          <Button
            label={`Send WhatsApp Reminder (${students[0].guardianMobile})`}
            icon="pi pi-whatsapp"
            className="p-button-success p-button-outlined p-button-sm"
            onClick={() => handleSendWhatsApp(students[0])}
          />
        </div>
      )}

      {/* Bill Preview Container */}
      <div
        id="printable-demand-bills-preview"
        style={{
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: '12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
        }}
      >
        {students.map((student, idx) => (
          <div key={student.studentId || idx} className="demand-bill-page-break mb-4 shadow-1 bg-white border-round">
            {copyFormat === '1-copy' && (
              <SingleDemandSlip data={student} copyTitle="STUDENT / PARENT COPY" schoolInfo={schoolInfo} />
            )}
            {copyFormat === '2-copy' && (
              <TwoCopyDemandSlip data={student} schoolInfo={schoolInfo} />
            )}
            {copyFormat === '3-copy' && (
              <ThreeCopyDemandSlip data={student} schoolInfo={schoolInfo} />
            )}
          </div>
        ))}
      </div>
    </Dialog>
  );
};

export default DemandBillPrintModal;
