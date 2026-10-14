import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Paper, TextField, Button, Switch, FormControlLabel,
  Tabs, Tab, Divider, Alert, IconButton, Tooltip, Chip
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TuneIcon from '@mui/icons-material/Tune';
import GavelIcon from '@mui/icons-material/Gavel';
import PrintIcon from '@mui/icons-material/Print';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Toast } from 'primereact/toast';
import { inventoryApi } from '../api';

const DEFAULT_CONFIG = {
  useCustomStoreEntity: true,
  storeName: 'Vidyarthi Pustak Bhandar & Uniform Counter',
  storeTagline: 'Authorized School Books, Uniforms & Stationery Supplier',
  storeAddress: 'Shop No. 2, Campus Gate No. 1, Institutional Area, Main Road',
  storePhone: '+91 98765 43210 / 011-23456789',
  storeEmail: 'store@vidyarthibooks.com',
  gstinNumber: '07AAAAA0000A1Z5',
  tradeLicenseOrPan: 'PAN: ABCDE1234F',
  logoUrl: '',
  receiptTitle: 'RETAIL CASH MEMO / INVOICE',
  receiptSubtitle: 'Inventory Stock Issue & Sale Acknowledgement',
  currencySymbol: '₹',
  printFormat: '80mm',
  headerAlignment: 'center',
  primaryColor: '#0f172a',
  baseFontSize: 10,
  storeNameFontSize: 13,
  showLogo: false,
  showGstin: true,
  showPhone: true,
  showEmail: false,
  showAddress: true,
  showTradeLicense: false,
  showPaymentMode: true,
  showIssuedToType: true,
  showItemRate: true,
  showTotalAmount: true,
  showAmountInWords: true,
  showTerms: true,
  showSignatures: true,
  showBarcodeOrQr: true,
  issuerSignatureLabel: 'Store Keeper / Authorized Sign',
  receiverSignatureLabel: 'Receiver / Student Sign',
  termsTitle: 'TERMS & CONDITIONS:',
  termsText: '1. Goods once sold will be exchanged within 7 days with original cash memo.\n2. Washed or altered uniforms will not be exchanged.\n3. Books with marks or damage cannot be returned.',
  footerNote: 'Thank you for your purchase! Have a great academic session.'
};

export const InventoryStoreSetupPage = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toastRef = useRef(null);

  useEffect(() => {
    loadSlipConfig();
  }, []);

  const loadSlipConfig = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getSlipConfig();
      if (res.data?.success && res.data?.data) {
        setConfig({ ...DEFAULT_CONFIG, ...res.data.data });
      }
    } catch (err) {
      console.error('Failed to load store setup', err);
      toastRef.current?.show({ severity: 'warn', summary: 'Notice', detail: 'Using default bookstore profile template.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, val) => {
    setConfig(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await inventoryApi.saveSlipConfig(config);
      if (res.data?.success) {
        toastRef.current?.show({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Store Profile & Receipt Slip settings saved successfully!' 
        });
      } else {
        toastRef.current?.show({ severity: 'error', summary: 'Error', detail: res.data?.message || 'Failed to save.' });
      }
    } catch (err) {
      console.error('Save error', err);
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to save store profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset store profile to platform defaults?')) {
      setConfig(DEFAULT_CONFIG);
      toastRef.current?.show({ severity: 'info', summary: 'Reset', detail: 'Restored default bookstore values.' });
    }
  };

  const handlePrintTest = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return;

    const receiptHtml = document.getElementById('inventory-live-preview')?.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Print - ${config.storeName}</title>
          <style>
            @page { margin: 0; size: ${config.printFormat === '58mm' ? '58mm' : '80mm'} auto; }
            body { margin: 0; padding: 6px; font-family: monospace; font-size: ${config.baseFontSize}px; color: #000; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          ${receiptHtml}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const is58mm = config.printFormat === '58mm';
  const previewWidth = is58mm ? '58mm' : '80mm';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Toast ref={toastRef} />

      {/* Top Header & Action Bar */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2, 
        mb: 3 
      }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ 
              width: 40, height: 40, borderRadius: 2, 
              bgcolor: '#0f172a', color: '#38bdf8',
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <StorefrontIcon />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="900" sx={{ color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Inventory Store & Billing Profile Setup
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                Setup custom entity name, address, phone, GSTIN & receipt layout for uniform & book sales
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#cbd5e1' }}
          >
            Reset Template
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrintTest}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Test Print
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, px: 3, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
          >
            {saving ? 'Saving...' : 'Save Store Profile'}
          </Button>
        </Box>
      </Box>

      {/* Notice Banner */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <strong>Independent Entity Billing:</strong> Usually, schools run their uniform, books and stationery counters under a separate bookstore or vendor trade name (not school name). All receipts issued from the <strong>Stock Issue</strong> POS counter will automatically print this custom seller name, contact, GSTIN, and terms.
      </Alert>

      {/* Main 2-Column Studio Grid */}
      <Grid container spacing={3}>
        {/* Left Column: Form Controls */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <Tabs 
              value={activeTab} 
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                bgcolor: '#f8fafc', 
                borderBottom: '1px solid #e2e8f0',
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 48, fontSize: '0.86rem' }
              }}
            >
              <Tab icon={<StorefrontIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Store Identity" />
              <Tab icon={<ReceiptIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Receipt & Header" />
              <Tab icon={<TuneIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Display Toggles" />
              <Tab icon={<GavelIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Terms & Signatures" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* TAB 0: STORE IDENTITY */}
              {activeTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={config.useCustomStoreEntity} 
                        onChange={(e) => handleChange('useCustomStoreEntity', e.target.checked)} 
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight="800">
                          Sell Under Separate Store / Vendor Entity
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          When enabled, receipts will display this custom bookstore / uniform trader name instead of school name.
                        </Typography>
                      </Box>
                    }
                  />

                  <Divider />

                  <TextField
                    label="Store / Trading Legal Name *"
                    fullWidth
                    size="small"
                    value={config.storeName}
                    onChange={(e) => handleChange('storeName', e.target.value)}
                    placeholder="e.g. Vidyarthi Pustak Bhandar & Uniform Counter"
                    helperText="Printed as the main seller/vendor header at the top of every receipt slip."
                  />

                  <TextField
                    label="Store Tagline / Subtitle"
                    fullWidth
                    size="small"
                    value={config.storeTagline || ''}
                    onChange={(e) => handleChange('storeTagline', e.target.value)}
                    placeholder="e.g. Authorized School Books, Uniforms & Stationery Supplier"
                  />

                  <TextField
                    label="Store Outlet Address *"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={config.storeAddress || ''}
                    onChange={(e) => handleChange('storeAddress', e.target.value)}
                    placeholder="e.g. Shop No. 2, Campus Gate No. 1, Main Road, Delhi - 110092"
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Store Contact Phone / Mobile"
                        fullWidth
                        size="small"
                        value={config.storePhone || ''}
                        onChange={(e) => handleChange('storePhone', e.target.value)}
                        placeholder="e.g. +91 98765 43210 / 011-23456789"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Store Email Address"
                        fullWidth
                        size="small"
                        value={config.storeEmail || ''}
                        onChange={(e) => handleChange('storeEmail', e.target.value)}
                        placeholder="e.g. store@vidyarthibooks.com"
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="GSTIN / Tax ID Number"
                        fullWidth
                        size="small"
                        value={config.gstinNumber || ''}
                        onChange={(e) => handleChange('gstinNumber', e.target.value)}
                        placeholder="e.g. 07AAAAA0000A1Z5"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Trade License / PAN Number"
                        fullWidth
                        size="small"
                        value={config.tradeLicenseOrPan || ''}
                        onChange={(e) => handleChange('tradeLicenseOrPan', e.target.value)}
                        placeholder="e.g. PAN: ABCDE1234F"
                      />
                    </Grid>
                  </Grid>

                  <Box>
                    <TextField
                      label="Store Logo Image URL"
                      fullWidth
                      size="small"
                      value={config.logoUrl || ''}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                      placeholder="https://... or data:image/png;base64,..."
                      helperText="Paste an image URL, or upload below to render store logo on the slip."
                    />

                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        startIcon={<CloudUploadIcon />}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        Upload Logo File
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                handleChange('logoUrl', ev.target.result);
                                handleChange('showLogo', true);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </Button>

                      {config.logoUrl && (
                        <Button 
                          size="small" 
                          color="error" 
                          onClick={() => handleChange('logoUrl', '')}
                          sx={{ textTransform: 'none' }}
                        >
                          Remove Logo
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* TAB 1: RECEIPT & HEADER */}
              {activeTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Receipt Title Banner"
                        fullWidth
                        size="small"
                        value={config.receiptTitle}
                        onChange={(e) => handleChange('receiptTitle', e.target.value)}
                        placeholder="e.g. RETAIL CASH MEMO / INVOICE"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Receipt Subtitle"
                        fullWidth
                        size="small"
                        value={config.receiptSubtitle || ''}
                        onChange={(e) => handleChange('receiptSubtitle', e.target.value)}
                        placeholder="e.g. Stock Issue & Sale Acknowledgement"
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        label="Print Format"
                        fullWidth
                        size="small"
                        value={config.printFormat || '80mm'}
                        onChange={(e) => handleChange('printFormat', e.target.value)}
                        SelectProps={{ native: true }}
                      >
                        <option value="80mm">80mm POS Thermal Slip (Standard)</option>
                        <option value="58mm">58mm POS Thermal Slip (Compact)</option>
                        <option value="A4">A4 Full Page Voucher</option>
                        <option value="A5">A5 Half Page Slip</option>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        label="Header Alignment"
                        fullWidth
                        size="small"
                        value={config.headerAlignment || 'center'}
                        onChange={(e) => handleChange('headerAlignment', e.target.value)}
                        SelectProps={{ native: true }}
                      >
                        <option value="center">Centered</option>
                        <option value="left">Left Aligned</option>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Currency Symbol"
                        fullWidth
                        size="small"
                        value={config.currencySymbol || '₹'}
                        onChange={(e) => handleChange('currencySymbol', e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        type="number"
                        label="Store Name Font Size (px)"
                        fullWidth
                        size="small"
                        inputProps={{ min: 11, max: 20 }}
                        value={config.storeNameFontSize || 13}
                        onChange={(e) => handleChange('storeNameFontSize', Number(e.target.value))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        type="number"
                        label="Base Body Font Size (px)"
                        fullWidth
                        size="small"
                        inputProps={{ min: 8, max: 14 }}
                        value={config.baseFontSize || 10}
                        onChange={(e) => handleChange('baseFontSize', Number(e.target.value))}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* TAB 2: DISPLAY TOGGLES */}
              {activeTab === 2 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <FormControlLabel
                    control={<Switch checked={config.showLogo} onChange={(e) => handleChange('showLogo', e.target.checked)} />}
                    label="Show Store Logo"
                  />
                  <FormControlLabel
                    control={<Switch checked={config.showGstin} onChange={(e) => handleChange('showGstin', e.target.checked)} />}
                    label="Show GSTIN / Tax ID"
                  />
                  <FormControlLabel
                    control={<Switch checked={config.showPhone} onChange={(e) => handleChange('showPhone', e.target.checked)} />}
                    label="Show Contact Phone"
                  />
                  <FormControlLabel
                    control={<Switch checked={config.showEmail} onChange={(e) => handleChange('showEmail', e.target.checked)} />}
                    label="Show Email Address"
                  />
                  <FormControlLabel
                    control={<Switch checked={config.showAddress} onChange={(e) => handleChange('showAddress', e.target.checked)} />}
                    label="Show Store Address"
                  />
                  <FormControlLabel
                    control={<Switch checked={config.showPaymentMode} onChange={(e) => handleChange('showPaymentMode', e.target.checked)} />}
                    label="Show Payment Mode (Cash/UPI)"
                  />
                  <FormControlLabel
                    control={<Switch checked={config.showIssuedToType} onChange={(e) => handleChange('showIssuedToType', e.target.checked)} />}
                    label="Show Issued To Type (Student/Staff)"
                  />
                  <FormControlLabel
                    control={<Switch checked={config.showBarcodeOrQr} onChange={(e) => handleChange('showBarcodeOrQr', e.target.checked)} />}
                    label="Show Barcode Box"
                  />
                  <FormControlLabel
                    control={<Switch checked={config.showSignatures} onChange={(e) => handleChange('showSignatures', e.target.checked)} />}
                    label="Show Signature Blocks"
                  />
                  <FormControlLabel
                    control={<Switch checked={config.showTerms} onChange={(e) => handleChange('showTerms', e.target.checked)} />}
                    label="Show Terms & Conditions"
                  />
                </Box>
              )}

              {/* TAB 3: TERMS & SIGNATURES */}
              {activeTab === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Issuer / Seller Signature Label"
                        fullWidth
                        size="small"
                        value={config.issuerSignatureLabel}
                        onChange={(e) => handleChange('issuerSignatureLabel', e.target.value)}
                        placeholder="e.g. Store Keeper / Authorized Sign"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Receiver / Customer Signature Label"
                        fullWidth
                        size="small"
                        value={config.receiverSignatureLabel}
                        onChange={(e) => handleChange('receiverSignatureLabel', e.target.value)}
                        placeholder="e.g. Receiver / Student Sign"
                      />
                    </Grid>
                  </Grid>

                  <TextField
                    label="Terms & Conditions Title"
                    fullWidth
                    size="small"
                    value={config.termsTitle}
                    onChange={(e) => handleChange('termsTitle', e.target.value)}
                  />

                  <TextField
                    label="Terms & Conditions Text (Exchange/Return Policy)"
                    fullWidth
                    multiline
                    rows={4}
                    size="small"
                    value={config.termsText || ''}
                    onChange={(e) => handleChange('termsText', e.target.value)}
                    helperText="Each line will appear as a term or bullet on the printed receipt slip."
                  />

                  <TextField
                    label="Footer Greeting Note"
                    fullWidth
                    size="small"
                    value={config.footerNote || ''}
                    onChange={(e) => handleChange('footerNote', e.target.value)}
                    placeholder="e.g. Thank you for your purchase! Visit again."
                  />
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right Column: Real-Time Live Thermal Paper Preview */}
        <Grid item xs={12} lg={5}>
          <Box sx={{ position: 'sticky', top: 20 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                Real-Time Thermal Paper Preview
              </Typography>
              <Chip 
                label={`Format: ${config.printFormat || '80mm'}`} 
                size="small" 
                sx={{ bgcolor: '#e2e8f0', fontWeight: 800, fontSize: '0.72rem' }} 
              />
            </Box>

            {/* Paper Container simulating POS printer roll */}
            <Box sx={{ 
              p: 3, 
              bgcolor: '#1e293b', 
              borderRadius: 3, 
              display: 'flex', 
              justifyContent: 'center',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
              overflowX: 'auto'
            }}>
              <Paper 
                id="inventory-live-preview"
                elevation={6}
                sx={{ 
                  width: previewWidth, 
                  maxWidth: '100%',
                  bgcolor: '#ffffff', 
                  color: '#000000', 
                  p: is58mm ? '8px' : '14px', 
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: `${config.baseFontSize || 10}px`,
                  borderRadius: 0,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  borderTop: '3px solid #000'
                }}
              >
                {/* Header */}
                <div style={{ textAlign: config.headerAlignment || 'center', marginBottom: '8px' }}>
                  {config.showLogo && config.logoUrl && (
                    <div style={{ marginBottom: '6px', textAlign: 'center' }}>
                      <img 
                        src={config.logoUrl} 
                        alt="Store Logo" 
                        style={{ maxHeight: '42px', maxWidth: '120px', objectFit: 'contain' }} 
                      />
                    </div>
                  )}

                  <h3 style={{ 
                    margin: 0, 
                    fontSize: `${config.storeNameFontSize || 13}px`, 
                    fontWeight: 'bold', 
                    textTransform: 'uppercase',
                    lineHeight: 1.2
                  }}>
                    {config.useCustomStoreEntity ? (config.storeName || 'Bookstore & Uniform Outlet') : 'Delhi Public School'}
                  </h3>

                  {config.storeTagline && (
                    <div style={{ fontSize: `${(config.baseFontSize || 10) - 1.5}px`, color: '#333', marginTop: '2px' }}>
                      {config.storeTagline}
                    </div>
                  )}

                  {config.showAddress && config.storeAddress && (
                    <div style={{ fontSize: `${(config.baseFontSize || 10) - 2}px`, color: '#444', marginTop: '2px' }}>
                      {config.storeAddress}
                    </div>
                  )}

                  <div style={{ fontSize: `${(config.baseFontSize || 10) - 2}px`, marginTop: '3px' }}>
                    {config.showPhone && config.storePhone && (
                      <span style={{ marginRight: '6px' }}><strong>Ph:</strong> {config.storePhone}</span>
                    )}
                    {config.showGstin && config.gstinNumber && (
                      <span><strong>GSTIN:</strong> {config.gstinNumber}</span>
                    )}
                  </div>

                  {/* Receipt Banner */}
                  <div style={{ 
                    margin: '6px 0 4px 0', 
                    padding: '2px 0', 
                    borderTop: '1px dashed #000', 
                    borderBottom: '1px dashed #000',
                    textAlign: 'center' 
                  }}>
                    <div style={{ fontSize: `${(config.baseFontSize || 10) + 1}px`, fontWeight: 'bold' }}>
                      {config.receiptTitle || 'RETAIL CASH MEMO'}
                    </div>
                    {config.receiptSubtitle && (
                      <div style={{ fontSize: `${(config.baseFontSize || 10) - 2}px` }}>{config.receiptSubtitle}</div>
                    )}
                  </div>
                </div>

                {/* Voucher Meta */}
                <div style={{ fontSize: `${(config.baseFontSize || 10) - 0.5}px`, lineHeight: 1.35, marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Memo:</strong> ISS-2026-0042</span>
                    <span><strong>Date:</strong> 15/10/2026</span>
                  </div>
                  <div>
                    <strong>Customer:</strong> Aarav Sharma (Adm: 2026049)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {config.showIssuedToType && <span><strong>Type:</strong> Student (VIII - A)</span>}
                    {config.showPaymentMode && <span><strong>Pay:</strong> UPI / QR</span>}
                  </div>
                </div>

                <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Sample Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${config.baseFontSize || 10}px` }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '2px' }}>Item</th>
                      <th style={{ textAlign: 'center', paddingBottom: '2px' }}>Qty x Rate</th>
                      <th style={{ textAlign: 'right', paddingBottom: '2px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px dotted #ddd' }}>
                      <td style={{ padding: '3px 0' }}>
                        <strong>1.</strong> Mathematics NCERT Cl-8
                      </td>
                      <td style={{ textAlign: 'center' }}>1 x ₹180</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹180.00</td>
                    </tr>
                    <tr style={{ borderBottom: '1px dotted #ddd' }}>
                      <td style={{ padding: '3px 0' }}>
                        <strong>2.</strong> Summer School Shirt (Sz 32)
                      </td>
                      <td style={{ textAlign: 'center' }}>2 x ₹450</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹900.00</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0' }}>
                        <strong>3.</strong> Student Notebook 6-Pack
                      </td>
                      <td style={{ textAlign: 'center' }}>1 x ₹240</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹240.00</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000', margin: '6px 0 4px 0' }}></div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${(config.baseFontSize || 10) + 2}px`, fontWeight: 'bold' }}>
                  <span>GRAND TOTAL:</span>
                  <span>{config.currencySymbol || '₹'}1,320.00</span>
                </div>

                <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

                {/* Barcode box */}
                {config.showBarcodeOrQr && (
                  <div style={{ textAlign: 'center', margin: '8px 0 4px 0' }}>
                    <div style={{ fontSize: '18px', letterSpacing: '3px', fontWeight: 'bold' }}>
                      *ISS-2026-0042*
                    </div>
                    <div style={{ fontSize: '7px', color: '#555' }}>VERIFIED SALE MEMO</div>
                  </div>
                )}

                {/* Signatures */}
                {config.showSignatures && (
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: `${(config.baseFontSize || 10) - 2}px` }}>
                    <div style={{ minWidth: '40%' }}>
                      <div style={{ borderBottom: '1px solid #444', height: '14px', marginBottom: '2px' }}></div>
                      <strong>{config.issuerSignatureLabel || 'Issuer Sign'}</strong>
                    </div>
                    <div style={{ minWidth: '40%', textAlign: 'right' }}>
                      <div style={{ borderBottom: '1px solid #444', height: '14px', marginBottom: '2px' }}></div>
                      <strong>{config.receiverSignatureLabel || 'Receiver Sign'}</strong>
                    </div>
                  </div>
                )}

                {/* Terms */}
                {config.showTerms && config.termsText && (
                  <div style={{ marginTop: '10px', paddingTop: '4px', borderTop: '1px dotted #888', fontSize: `${(config.baseFontSize || 10) - 2}px`, color: '#333' }}>
                    <strong>{config.termsTitle || 'TERMS & CONDITIONS:'}</strong>
                    <div style={{ whiteSpace: 'pre-line', lineHeight: 1.25, marginTop: '2px' }}>
                      {config.termsText}
                    </div>
                  </div>
                )}

                {/* Footer Note */}
                {config.footerNote && (
                  <div style={{ textAlign: 'center', marginTop: '10px', fontSize: `${(config.baseFontSize || 10) - 1}px`, fontWeight: 'bold' }}>
                    {config.footerNote}
                  </div>
                )}
              </Paper>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InventoryStoreSetupPage;
