import React from 'react';
import { Button } from 'primereact/button';
import { useEffect } from 'react';

const IssueSlip = ({ data, onHide }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 100);
    return () => clearTimeout(timer);
  }, [data.issueNumber]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-column gap-3 align-items-center">
      {/* POS Receipt Container */}
      <div className="print-area surface-card border-1 surface-border" id="printable-issue-slip" style={{ width: '80mm', padding: '10px', fontFamily: 'monospace', fontSize: '10px', color: '#000' }}>
        
        <div className="text-center mb-2">
          <h3 className="m-0 font-bold" style={{ fontSize: '12px' }}>Delhi Public School</h3>
          <p className="m-0" style={{ fontSize: '12px' }}>Stock Issue Slip</p>
        </div>
        
        <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
        
        <div className="mb-2">
          <p className="m-0 pb-1"><strong>Issue No:</strong> {data.issueNumber || 'N/A'}</p>
          <p className="m-0 pb-1"><strong>Date:</strong> {data.issueDate ? new Date(data.issueDate).toLocaleDateString() : 'N/A'}</p>
          <p className="m-0 pb-1"><strong>Issued To:</strong> {data.issuedToName}</p>
          <p className="m-0 pb-1"><strong>Type:</strong> {data.issuedToType}</p>
          <p className="m-0 pb-1"><strong>Payment:</strong> {data.paymentMode || 'N/A'}</p>
        </div>

        <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

        <table className="w-full text-left" style={{ borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              <th className="pb-2 text-left" colSpan="2">Item</th>
            </tr>
            <tr>
              <th className="pb-2 font-normal text-left" style={{ width: '60%' }}>Qty x Price</th>
              <th className="pb-2 font-normal text-right" style={{ width: '40%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr>
                  <td colSpan="2" className="pt-2 font-bold">{idx + 1}. {item.itemName}</td>
                </tr>
                <tr>
                  <td className="pb-2 text-left">
                    {item.quantity || item.qty} x ₹{item.sellingPrice || item.unitPrice || 0}
                  </td>
                  <td className="pb-2 text-right">
                    ₹{item.totalAmount || ((item.quantity || item.qty) * (item.sellingPrice || item.unitPrice || 0)) || 0}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>
        
        <div className="flex justify-content-between font-bold" style={{ fontSize: '12px', margin: '10px 0' }}>
          <span>Grand Total:</span>
          <span>₹{data.grandTotal || data.items.reduce((sum, item) => sum + (item.totalAmount || ((item.quantity || item.qty) * (item.sellingPrice || item.unitPrice || 0)) || 0), 0)}</span>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>

        <div className="mt-4 flex justify-content-between" style={{ fontSize: '9px' }}>
          <div>
            <p className="m-0 pb-4">Issuer Sign</p>
            <p className="m-0">__________</p>
          </div>
          <div className="text-right">
            <p className="m-0 pb-4">Rcvr Sign</p>
            <p className="m-0">__________</p>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="m-0" style={{ fontSize: '10px' }}>Thank you!</p>
        </div>
      </div>

      <div className="flex justify-content-end gap-2 no-print mt-3 w-full" style={{ maxwidth: '80mm' }}>
        {onHide && <Button label="Close" icon="pi pi-times" className="p-button-text p-button-sm" onClick={onHide} />}
        <Button label="Print Receipt" icon="pi pi-print" className="p-button-sm" onClick={handlePrint} />
      </div>

      <style>{`
        @media print {
          @page {
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          body * {
            visibility: hidden;
          }
          /* Reset PrimeReact Dialog positioning for print */
          .p-dialog-mask, .p-dialog, .p-dialog-content {
            position: static !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          #printable-issue-slip, #printable-issue-slip * {
            visibility: visible;
          }
          #printable-issue-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0;
            padding: 10px !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default IssueSlip;





