import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { inventoryApi } from '../api';

const IssueSlip = ({ data, config: propConfig, onHide }) => {
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

  useEffect(() => {
    if (!loadingConfig) {
      const timer = setTimeout(() => {
        window.print();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [data?.issueNumber, loadingConfig]);

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
    receiptTitle: 'RETAIL CASH MEMO / INVOICE',
    receiptSubtitle: 'Inventory Stock Issue & Sale Acknowledgement',
    currencySymbol: '₹',
    printFormat: '80mm',
    headerAlignment: 'center',
    storeNameFontSize: 13,
    baseFontSize: 10,
    showLogo: false,
    showGstin: true,
    showPhone: true,
    showEmail: false,
    showAddress: true,
    showPaymentMode: true,
    showIssuedToType: true,
    showTerms: true,
    showSignatures: true,
    showBarcodeOrQr: true,
    issuerSignatureLabel: 'Store Keeper / Cashier',
    receiverSignatureLabel: 'Receiver / Student Sign',
    termsTitle: 'TERMS & CONDITIONS:',
    termsText: '1. Goods once sold will be exchanged within 7 days with original memo.\n2. Washed or altered uniforms will not be exchanged.\n3. Books with marks or damage cannot be returned.',
    footerNote: 'Thank you for your purchase! Visit again.'
  };

  const is58mm = cfg.printFormat === '58mm';
  const isA4 = cfg.printFormat === 'A4' || cfg.printFormat === 'A5';
  const slipWidth = is58mm ? '58mm' : (isA4 ? '100%' : '80mm');
  const maxWidth = isA4 ? '680px' : slipWidth;

  const grandTotal = data.grandTotal || (data.items || []).reduce((sum, item) => {
    const qty = Number(item.quantity || item.qty || 0);
    const rate = Number(item.sellingPrice || item.unitPrice || 0);
    return sum + (item.totalAmount || (qty * rate));
  }, 0);

  return (
    <div className="flex flex-column gap-3 align-items-center w-full">
      {/* POS Receipt Container */}
      <div 
        className="print-area surface-card border-1 surface-border" 
        id="printable-issue-slip" 
        style={{ 
          width: slipWidth, 
          maxWidth: maxWidth, 
          padding: is58mm ? '6px' : '14px', 
          fontFamily: '"Courier New", Courier, monospace', 
          fontSize: `${cfg.baseFontSize || 10}px`, 
          color: '#000000',
          background: '#ffffff',
          boxSizing: 'border-box'
        }}
      >
        
        {/* Header: Store Identity (Separate entity from school) */}
        <div style={{ textAlign: cfg.headerAlignment || 'center', marginBottom: '8px' }}>
          {/* Store Logo if configured & enabled */}
          {cfg.showLogo && cfg.logoUrl && (
            <div style={{ marginBottom: '6px', textAlign: 'center' }}>
              <img 
                src={cfg.logoUrl} 
                alt="Store Logo" 
                style={{ maxHeight: '45px', maxWidth: '140px', objectFit: 'contain' }} 
              />
            </div>
          )}

          {/* Store / Entity Name */}
          <h2 
            className="m-0 font-bold" 
            style={{ 
              fontSize: `${cfg.storeNameFontSize || 13}px`, 
              textTransform: 'uppercase', 
              letterSpacing: '0.3px',
              lineHeight: 1.2
            }}
          >
            {cfg.useCustomStoreEntity ? (cfg.storeName || 'Bookstore & Uniform Outlet') : (data.schoolName || 'School Inventory')}
          </h2>

          {/* Subtitle / Tagline */}
          {cfg.storeTagline && (
            <p className="m-0 mt-1" style={{ fontSize: `${(cfg.baseFontSize || 10) - 1}px`, color: '#333' }}>
              {cfg.storeTagline}
            </p>
          )}

          {/* Store Address */}
          {cfg.showAddress && cfg.storeAddress && (
            <p className="m-0 mt-1" style={{ fontSize: `${(cfg.baseFontSize || 10) - 1.5}px`, color: '#444' }}>
              {cfg.storeAddress}
            </p>
          )}

          {/* Contact & GSTIN row */}
          <div style={{ fontSize: `${(cfg.baseFontSize || 10) - 1.5}px`, marginTop: '3px' }}>
            {cfg.showPhone && cfg.storePhone && (
              <span style={{ marginRight: '8px' }}><strong>Ph:</strong> {cfg.storePhone}</span>
            )}
            {cfg.showEmail && cfg.storeEmail && (
              <span style={{ marginRight: '8px' }}><strong>Email:</strong> {cfg.storeEmail}</span>
            )}
            {cfg.showGstin && cfg.gstinNumber && (
              <span><strong>GSTIN:</strong> {cfg.gstinNumber}</span>
            )}
          </div>

          {/* Receipt Title Banner */}
          <div style={{ 
            margin: '8px 0 4px 0', 
            padding: '2px 0', 
            borderTop: '1px dashed #000', 
            borderBottom: '1px dashed #000',
            textAlign: 'center' 
          }}>
            <span style={{ fontSize: `${(cfg.baseFontSize || 10) + 1}px`, fontWeight: 'bold', letterSpacing: '0.5px' }}>
              {cfg.receiptTitle || 'RETAIL CASH MEMO'}
            </span>
            {cfg.receiptSubtitle && (
              <div style={{ fontSize: `${(cfg.baseFontSize || 10) - 2}px` }}>{cfg.receiptSubtitle}</div>
            )}
          </div>

          {/* Prominent REFUND / RETURN Red Stamp Banner */}
          {(data.status === 'Returned' || data.status === 'Partially Returned' || (data.totalReturnedAmount && data.totalReturnedAmount > 0) || (data.items && data.items.some(i => i.isReturned || (i.returnedQuantity && i.returnedQuantity > 0)))) && (
            <div style={{
              margin: '6px auto 4px auto',
              padding: '4px 8px',
              backgroundColor: '#fee2e2',
              border: '2px dashed #dc2626',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <div style={{
                color: '#dc2626',
                fontWeight: 900,
                fontSize: '13pt',
                letterSpacing: '2px',
                lineHeight: 1.1,
                textTransform: 'uppercase'
              }}>
                ★ {data.status === 'Partially Returned' ? 'PARTIALLY REFUNDED' : 'REFUND / ITEM RETURNED'} ★
              </div>
              {data.totalReturnedAmount > 0 && (
                <div style={{
                  color: '#991b1b',
                  fontWeight: 800,
                  fontSize: '8pt',
                  marginTop: '2px'
                }}>
                  REFUND VALUE: {cfg.currencySymbol || '₹'}{Number(data.totalReturnedAmount).toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Voucher & Customer Metadata */}
        <div style={{ marginBottom: '8px', lineHeight: 1.35, fontSize: `${(cfg.baseFontSize || 10) - 0.5}px` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><strong>Memo No:</strong> {data.issueNumber || 'N/A'}</span>
            <span><strong>Date:</strong> {data.issueDate ? new Date(data.issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</span>
          </div>

          <div style={{ marginTop: '2px' }}>
            <strong>Issued To:</strong> {data.issuedToName || 'Walk-in Customer'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
            {cfg.showIssuedToType && (
              <span><strong>Type:</strong> {data.issuedToType || 'Student'}</span>
            )}
            {cfg.showPaymentMode && (
              <span><strong>Payment:</strong> {data.paymentMode || 'Cash'}</span>
            )}
          </div>
          {(data.status === 'Returned' || data.status === 'Partially Returned') && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span><strong>Status:</strong> {data.status}</span>
              <span style={{ color: '#dc2626', fontWeight: 800 }}>
                [{data.status === 'Partially Returned' ? 'PARTIAL REFUND' : 'REFUNDED'}]
              </span>
            </div>
          )}
        </div>

        <div style={{ borderBottom: '1px dashed #000', margin: '4px 0 6px 0' }}></div>

        {/* Items Table */}
        <table className="w-full text-left" style={{ borderCollapse: 'collapse', fontSize: `${cfg.baseFontSize || 10}px`, width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th className="pb-1 text-left" style={{ width: '50%' }}>Item Description</th>
              <th className="pb-1 text-center" style={{ width: '22%' }}>Qty x Rate</th>
              <th className="pb-1 text-right" style={{ width: '28%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item, idx) => {
              const qty = Number(item.quantity || item.qty || 1);
              const rate = Number(item.sellingPrice || item.unitPrice || 0);
              const total = item.totalAmount || (qty * rate);
              const isItemRefunded = Boolean(item.isReturned || (item.returnedQuantity && item.returnedQuantity > 0));
              return (
                <tr key={idx} style={{ borderBottom: '1px dotted #ccc', backgroundColor: isItemRefunded ? '#fef2f2' : 'transparent' }}>
                  <td className="py-1 text-left" style={{ wordBreak: 'break-word', verticalAlign: 'top' }}>
                    <strong>{idx + 1}.</strong> {item.itemName || 'Item'}
                    {item.itemCode && <div style={{ fontSize: '8px', color: '#555' }}>Code: {item.itemCode}</div>}
                    {isItemRefunded && (
                      <div style={{ fontSize: '8px', color: '#dc2626', fontWeight: 800, marginTop: '1px' }}>
                        ⚠ REFUNDED: {item.returnedQuantity || item.quantity} {item.unit || 'Pcs'}
                      </div>
                    )}
                  </td>
                  <td className="py-1 text-center" style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    {qty} x {cfg.currencySymbol || '₹'}{rate}
                  </td>
                  <td className="py-1 text-right font-bold" style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    {cfg.currencySymbol || '₹'}{total.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals Section */}
        <div style={{ borderTop: '1px dashed #000', margin: '6px 0 4px 0' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${(cfg.baseFontSize || 10) + 2}px`, fontWeight: 'bold', margin: '4px 0' }}>
          <span>TOTAL AMOUNT:</span>
          <span>{cfg.currencySymbol || '₹'}{grandTotal.toFixed(2)}</span>
        </div>

        {Boolean(data.totalReturnedAmount && data.totalReturnedAmount > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${(cfg.baseFontSize || 10) + 1}px`, fontWeight: 'bold', margin: '4px 0', color: '#dc2626' }}>
            <span>REFUNDED AMOUNT:</span>
            <span>- {cfg.currencySymbol || '₹'}{Number(data.totalReturnedAmount).toFixed(2)}</span>
          </div>
        )}

        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

        {/* QR / Barcode indicator */}
        {cfg.showBarcodeOrQr && (
          <div style={{ textAlign: 'center', margin: '8px 0 4px 0' }}>
            <div style={{ 
              fontFamily: '"Libre Barcode 39", "Courier New", monospace', 
              fontSize: '22px', 
              letterSpacing: '3px',
              lineHeight: 1 
            }}>
              *{data.issueNumber || 'INVOICE'}*
            </div>
            <div style={{ fontSize: '8px', color: '#666' }}>VERIFIED SALE VOUCHER</div>
          </div>
        )}

        {/* Signatures */}
        {cfg.showSignatures && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: `${(cfg.baseFontSize || 10) - 1.5}px` }}>
            <div style={{ textAlign: 'left', minWidth: '40%' }}>
              <div style={{ borderBottom: '1px solid #444', height: '14px', marginBottom: '2px' }}></div>
              <p className="m-0 font-bold">{cfg.issuerSignatureLabel || 'Issuer Sign'}</p>
            </div>
            <div style={{ textAlign: 'right', minWidth: '40%' }}>
              <div style={{ borderBottom: '1px solid #444', height: '14px', marginBottom: '2px' }}></div>
              <p className="m-0 font-bold">{cfg.receiverSignatureLabel || 'Receiver Sign'}</p>
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        {cfg.showTerms && cfg.termsText && (
          <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '1px dotted #888', fontSize: `${(cfg.baseFontSize || 10) - 2}px`, color: '#333' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{cfg.termsTitle || 'TERMS & CONDITIONS:'}</div>
            <div style={{ whiteSpace: 'pre-line', lineHeight: 1.25 }}>
              {cfg.termsText}
            </div>
          </div>
        )}

        {/* Footer Greetings Note */}
        {cfg.footerNote && (
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: `${(cfg.baseFontSize || 10) - 1}px`, fontWeight: 'bold' }}>
            <p className="m-0">{cfg.footerNote}</p>
          </div>
        )}

      </div>

      {/* Action Buttons (Excluded from Print) */}
      <div className="flex justify-content-end gap-2 no-print mt-3 w-full" style={{ maxWidth: maxWidth }}>
        {onHide && <Button label="Close" icon="pi pi-times" className="p-button-text p-button-sm" onClick={onHide} />}
        <Button label="Print Receipt" icon="pi pi-print" className="p-button-sm p-button-primary" onClick={handlePrint} />
      </div>

      {/* Strict Thermal POS Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: ${slipWidth} auto;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden;
          }
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
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-issue-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${slipWidth} !important;
            max-width: ${slipWidth} !important;
            margin: 0 !important;
            padding: ${is58mm ? '4px' : '8px'} !important;
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
