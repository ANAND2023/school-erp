import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { inventoryApi } from '../api';

const ReturnSlip = ({ data, config: propConfig, onHide }) => {
  const [config, setConfig] = useState(propConfig || null);
  const [loadingConfig, setLoadingConfig] = useState(!propConfig);

  useEffect(() => {
    if (propConfig) {
      setConfig(propConfig);
      setLoadingConfig(false);
      return;
    }

    const loadConfig = async () => {
      try {
        const res = await inventoryApi.getSlipConfig();
        if (res.data?.success && res.data?.data) {
          setConfig(res.data.data);
        }
      } catch (err) {
        console.warn('Failed to load inventory slip config, using defaults', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();
  }, [propConfig]);

  const handlePrint = () => {
    window.print();
  };

  // Safe defaults if config not yet loaded
  const cfg = config || {
    useCustomStoreEntity: true,
    storeName: 'Vidyarthi Pustak Bhandar & Uniform Counter',
    storeTagline: 'Authorized School Books, Uniforms & Stationery Supplier',
    storeAddress: 'Campus Retail Counter, Main Road',
    storePhone: '+91 98765 43210',
    storeEmail: '',
    gstinNumber: '07AAAAA0000A1Z5',
    tradeLicenseOrPan: '',
    logoUrl: '',
    receiptTitle: 'GOODS RETURN / REFUND CREDIT MEMO',
    receiptSubtitle: 'Inventory Stock Return Acknowledgement',
    currencySymbol: '₹',
    printFormat: '80mm',
    headerAlignment: 'center',
    storeNameFontSize: 13,
    baseFontSize: 10,
    showLogo: false,
    showGstin: true,
    showPhone: true,
    showAddress: true,
    showSignatures: true,
    issuerSignatureLabel: 'Store Keeper / Cashier',
    receiverSignatureLabel: 'Customer / Student Sign',
    footerNote: 'Items received in stock. Refund processed successfully.'
  };

  const is58mm = cfg.printFormat === '58mm';
  const isA4 = cfg.printFormat === 'A4' || cfg.printFormat === 'A5';
  const slipWidth = is58mm ? '58mm' : (isA4 ? '100%' : '80mm');
  const maxWidth = isA4 ? '680px' : slipWidth;

  const items = data?.returnedItems || data?.items || [];
  const totalRefund = data?.totalRefundAmount != null 
    ? data.totalRefundAmount 
    : items.reduce((sum, it) => sum + (Number(it.totalRefund || (it.returnedQuantity * it.unitPrice)) || 0), 0);

  return (
    <div className="flex flex-column gap-3 align-items-center w-full">
      {/* POS Receipt Container */}
      <div 
        className="print-area surface-card border-1 surface-border" 
        id="printable-return-slip" 
        style={{ 
          width: slipWidth, 
          maxWidth: maxWidth, 
          padding: is58mm ? '6px' : '14px', 
          fontSize: `${cfg.baseFontSize || 10}pt`,
          fontFamily: "'Courier New', Courier, monospace, 'Segoe UI', Tahoma, sans-serif",
          color: '#000',
          backgroundColor: '#fff',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          borderRadius: '6px'
        }}
      >
        {/* Header Block */}
        <div style={{ textAlign: cfg.headerAlignment || 'center', marginBottom: '8px', borderBottom: '1.5px dashed #000', paddingBottom: '6px' }}>
          {cfg.showLogo && cfg.logoUrl && (
            <div style={{ marginBottom: '4px' }}>
              <img src={cfg.logoUrl} alt="Store Logo" style={{ maxHeight: '42px', maxWidth: '140px', objectFit: 'contain' }} />
            </div>
          )}
          <div style={{ fontWeight: 800, fontSize: `${cfg.storeNameFontSize || 13}pt`, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
            {cfg.storeName}
          </div>
          {cfg.storeTagline && (
            <div style={{ fontSize: '7.5pt', fontStyle: 'italic', color: '#444', marginTop: '1px' }}>
              {cfg.storeTagline}
            </div>
          )}
          {cfg.showAddress && cfg.storeAddress && (
            <div style={{ fontSize: '7.5pt', color: '#333', marginTop: '2px' }}>
              {cfg.storeAddress}
            </div>
          )}
          <div style={{ fontSize: '7.5pt', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            {cfg.showPhone && cfg.storePhone && <span>Tel: {cfg.storePhone}</span>}
            {cfg.showGstin && cfg.gstinNumber && <span>GSTIN: {cfg.gstinNumber}</span>}
          </div>
          <div style={{ 
            marginTop: '6px', 
            display: 'inline-block',
            fontWeight: 800, 
            fontSize: '9pt', 
            border: '1px solid #000', 
            padding: '2px 8px',
            borderRadius: '2px',
            backgroundColor: '#f5f5f5'
          }}>
            GOODS RETURN MEMO
          </div>
        </div>

        {/* Meta Info */}
        <div style={{ fontSize: '8pt', marginBottom: '8px', lineHeight: '1.3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><strong>Return No:</strong> {data?.returnNumber || `RET-${Date.now().toString().slice(-6)}`}</span>
            <span><strong>Date:</strong> {data?.returnDate ? new Date(data.returnDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
            <span><strong>Orig Issue No:</strong> {data?.issueNumber || '-'}</span>
            <span><strong>Refund Mode:</strong> {data?.refundMode || 'Cash'}</span>
          </div>
          <div style={{ marginTop: '2px' }}>
            <span><strong>Customer:</strong> {data?.customerName || data?.issuedToName || 'Customer'}</span>
            {data?.customerType && <span style={{ marginLeft: '4px', color: '#555' }}>({data.customerType})</span>}
          </div>
          {data?.department && (
            <div style={{ marginTop: '2px', color: '#555' }}>
              <span><strong>Class/Contact:</strong> {data.department}</span>
            </div>
          )}
        </div>

        {/* Returned Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '8px' }}>
          <thead>
            <tr style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000' }}>
              <th style={{ textAlign: 'left', padding: '3px 0' }}>Item Description</th>
              <th style={{ textAlign: 'center', padding: '3px 0', width: '35px' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '3px 0', width: '50px' }}>Rate</th>
              <th style={{ textAlign: 'right', padding: '3px 0', width: '60px' }}>Refund</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px dotted #e0e0e0' }}>
                <td style={{ padding: '3px 0' }}>
                  <div style={{ fontWeight: 600 }}>{it.itemName || it.ItemName}</div>
                  {it.reason && <div style={{ fontSize: '7pt', color: '#666', fontStyle: 'italic' }}>Reason: {it.reason}</div>}
                </td>
                <td style={{ textAlign: 'center', padding: '3px 0', verticalAlign: 'top' }}>
                  {it.returnedQuantity || it.qty || 1}
                </td>
                <td style={{ textAlign: 'right', padding: '3px 0', verticalAlign: 'top' }}>
                  {cfg.currencySymbol}{it.unitPrice || it.sellingPrice || 0}
                </td>
                <td style={{ textAlign: 'right', padding: '3px 0', fontWeight: 600, verticalAlign: 'top' }}>
                  {cfg.currencySymbol}{it.totalRefund || ((it.returnedQuantity || 1) * (it.unitPrice || 0))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1.5px dashed #000', borderBottom: '1.5px dashed #000' }}>
              <td colSpan="3" style={{ padding: '4px 0', fontWeight: 800, textAlign: 'right' }}>
                TOTAL REFUND AMOUNT:
              </td>
              <td style={{ padding: '4px 0', fontWeight: 900, fontSize: '9.5pt', textAlign: 'right', color: '#b91c1c' }}>
                {cfg.currencySymbol}{totalRefund}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Remarks */}
        {data?.remarks && (
          <div style={{ fontSize: '7.5pt', marginBottom: '8px', color: '#444', fontStyle: 'italic', borderLeft: '2px solid #ccc', paddingLeft: '4px' }}>
            Note: {data.remarks}
          </div>
        )}

        {/* Signatures */}
        {cfg.showSignatures && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '8px', borderTop: '1px dotted #ccc', fontSize: '7.5pt' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', width: '90px', margin: '0 auto 2px auto' }}></div>
              <span>{cfg.issuerSignatureLabel || 'Store Keeper'}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', width: '90px', margin: '0 auto 2px auto' }}></div>
              <span>{cfg.receiverSignatureLabel || 'Customer Sign'}</span>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '7.5pt', color: '#666', borderTop: '1px dashed #000', paddingTop: '4px' }}>
          {cfg.footerNote}
        </div>
      </div>

      {/* Action Buttons (Excluded from print) */}
      <div className="no-print flex gap-2 justify-content-center w-full mt-2">
        <Button label="Print Slip" icon="pi pi-print" className="p-button-primary p-button-sm" onClick={handlePrint} />
        {onHide && (
          <Button label="Close" icon="pi pi-times" className="p-button-outlined p-button-secondary p-button-sm" onClick={onHide} />
        )}
      </div>

      {/* Print stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-return-slip, #printable-return-slip * {
            visibility: visible;
          }
          #printable-return-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: ${slipWidth} !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 4px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReturnSlip;
