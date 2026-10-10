import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { SingleDemandSlip, TwoCopyDemandSlip, ThreeCopyDemandSlip, EightPerA4DemandSlipSheet } from './DemandBillSlip';
import { printWithTitle } from '../../../utils/printUtils';
import dayjs from 'dayjs';

export const DemandBillPrintModal = ({ visible, onHide, students = [], schoolInfo = {}, initialFormat = '8-per-page' }) => {
  const [copyFormat, setCopyFormat] = useState(initialFormat);

  React.useEffect(() => {
    if (students.length > 1) {
      setCopyFormat('8-per-page');
    } else {
      setCopyFormat('2-copy');
    }
  }, [students.length, visible]);

  const copyOptions = [
    { label: '8 Slips / A4 Sheet (Recommended)', value: '8-per-page', icon: 'pi pi-th-large' },
    { label: '2-Part (Parent + Office)', value: '2-copy', icon: 'pi pi-copy' },
    { label: '3-Part (Bank Challan)', value: '3-copy', icon: 'pi pi-clone' },
    { label: 'Single Full Copy', value: '1-copy', icon: 'pi pi-file' },
  ];

  const handlePrint = () => {
    const title = copyFormat === '8-per-page'
      ? `Demand_Bills_8_Per_A4_${students.length}_Students`
      : `Demand_Bill_${students[0]?.studentName || 'Student'}`;
    printWithTitle(title);
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

  // Chunk students into pages of 8 for '8-per-page' format
  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const studentPages = copyFormat === '8-per-page' ? chunkArray(students, 8) : [];
  const totalA4Pages = copyFormat === '8-per-page' ? (studentPages.length || 1) : studentCount;

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex flex-column md:flex-row align-items-start md:align-items-center justify-content-between w-full pr-4 gap-2 no-print">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-print text-primary text-xl" />
            <div>
              <div className="font-bold text-lg">
                Print Fee Demand {studentCount > 1 ? `Bills (${studentCount} Students)` : 'Bill'}
              </div>
              <div className="text-xs text-500 font-normal">
                {copyFormat === '8-per-page'
                  ? `📄 Exactly 8 Slips per A4 Page • Total ${totalA4Pages} Sheet(s)`
                  : 'Professional high-contrast printable student demand notice & bank challans'}
              </div>
            </div>
          </div>

          <div className="flex align-items-center gap-2 flex-wrap">
            <SelectButton
              value={copyFormat}
              options={copyOptions}
              onChange={(e) => e.value && setCopyFormat(e.value)}
              className="p-buttonset-sm"
            />
            <Button
              label={copyFormat === '8-per-page' ? `Print ${totalA4Pages} A4 Sheet(s)` : 'Print Now'}
              icon="pi pi-print"
              className="p-button-primary p-button-sm font-bold shadow-2"
              onClick={handlePrint}
            />
          </div>
        </div>
      }
      style={{ width: '95vw', maxWidth: '960px' }}
      modal
      className="p-fluid demand-bill-modal"
    >
      {/* 🖨️ Precision Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 4mm 4mm 4mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          /* Hide app background, header, and screen UI elements */
          #root,
          .no-print,
          .p-dialog-header,
          .p-dialog-footer,
          .p-dialog-header-icons {
            display: none !important;
          }
          /* Reset PrimeReact Dialog Mask and Container so they don't hide or offset content */
          .p-dialog-mask {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
            z-index: auto !important;
          }
          .p-dialog {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .p-dialog-content {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            max-height: none !important;
          }
          /* Printable Area Container */
          #printable-demand-bills-preview {
            display: block !important;
            width: 100% !important;
            max-width: 202mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            max-height: none !important;
          }
          .demand-bill-page-break {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .a4-eight-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 202mm !important;
            height: 280mm !important;
            max-height: 280mm !important;
            padding: 2mm !important;
            margin: 0 auto !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: repeat(4, 66.5mm) !important;
            gap: 3mm !important;
            background: #ffffff !important;
          }
          .mini-demand-slip-8 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 66.5mm !important;
            max-height: 66.5mm !important;
            box-shadow: none !important;
            border: 1.2px solid #1e3a8a !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* Floating Action Bar inside Modal (Screen Only) */}
      {studentCount === 1 && students[0]?.guardianMobile && (
        <div className="flex justify-content-end mb-2 no-print">
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
          maxHeight: '75vh',
          overflowY: 'auto',
          padding: '12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
        }}
      >
        {copyFormat === '8-per-page' ? (
          studentPages.map((chunk, pageIdx) => (
            <div key={pageIdx} className="demand-bill-page-break mb-4 shadow-2 bg-white border-round overflow-hidden" style={{ border: '1px solid #cbd5e1' }}>
              <div className="p-2 bg-blue-50 border-bottom-1 border-blue-200 text-xs font-bold text-blue-900 flex justify-content-between no-print">
                <span>📄 A4 SHEET #{pageIdx + 1} ({chunk.length} SLIPS)</span>
                <span className="text-500 font-normal">2 Columns × 4 Rows Grid (8 per A4)</span>
              </div>
              <EightPerA4DemandSlipSheet students={chunk} schoolInfo={schoolInfo} />
            </div>
          ))
        ) : (
          students.map((student, idx) => (
            <div key={student.studentId || idx} className="demand-bill-page-break mb-4 shadow-1 bg-white border-round p-2">
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
          ))
        )}
      </div>
    </Dialog>
  );
};

export default DemandBillPrintModal;
