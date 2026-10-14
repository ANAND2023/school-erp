import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, MenuItem, Button as MuiButton,
  Stack, Alert, Avatar, Chip, Paper, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { AutoComplete } from 'primereact/autocomplete';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../api';
import { studentApi } from '../../students/api';
import IssueSlip from '../components/IssueSlip';

const StockIssuePage = () => {
  const navigate = useNavigate();
  const [issueType, setIssueType] = useState('Registered');
  
  // Student Search
  const [students, setStudents] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Walk-in
  const [walkInDetails, setWalkInDetails] = useState({ title: 'Mr.', name: '', age: '', ageType: 'Yrs', address: '', contactNo: '' });

  // Items
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedSearchItem, setSelectedSearchItem] = useState(null);
  const [issueQty, setIssueQty] = useState(1);
  const [cart, setCart] = useState([]);

  // Payment
  const [paymentSplits, setPaymentSplits] = useState([{ mode: 1, amount: '', transactionRef: '' }]);
  const [paymentModeError, setPaymentModeError] = useState('');

  // History & Print
  const [issues, setIssues] = useState([]);
  const [historyDialogVisible, setHistoryDialogVisible] = useState(false);
  const [viewDialogVisible, setViewDialogVisible] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [printIssue, setPrintIssue] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [itemsRes, studentsRes, issuesRes] = await Promise.all([
        inventoryApi.getItems(),
        studentApi.getStudents({}),
        inventoryApi.getIssues()
      ]);
      if (itemsRes.data?.success) setInventoryItems(itemsRes.data.data);
      if (studentsRes.data?.success) setStudents(studentsRes.data.data.items);
      if (issuesRes.data?.success) setIssues(issuesRes.data.data);
    } catch (error) {
      console.error("Error loading data", error);
    }
  };

  const searchUsers = (event) => {
    let query = event.query.toLowerCase();
    let _filtered = students.filter(s => {
      const fName = s.fullName || s.FullName || '';
      const aNo = s.admissionNo || s.AdmissionNo || '';
      return fName.toLowerCase().includes(query) || aNo.toLowerCase().includes(query);
    }).map(s => {
      const fName = s.fullName || s.FullName || '';
      const aNo = s.admissionNo || s.AdmissionNo || '';
      const cName = s.className || s.ClassName || '';
      const secName = s.sectionName || s.SectionName || '';
      const contact = s.guardianMobile || s.GuardianMobile || s.emergencyContact || s.EmergencyContact || 'N/A';
      return {
        id: aNo,
        name: fName.trim(),
        class: `${cName} - ${secName}`,
        userType: 'Student',
        contactNo: contact
      };
    });
    setFilteredUsers(_filtered);
  };

  const searchItems = (event) => {
    let query = event.query.toLowerCase();
    let _filtered = inventoryItems.filter(i => {
      const iName = i.itemName || i.ItemName || '';
      const iCode = i.itemCode || i.ItemCode || '';
      return iName.toLowerCase().includes(query) || iCode.toLowerCase().includes(query);
    }).map(i => ({
      ...i,
      itemName: i.itemName || i.ItemName || '',
      itemCode: i.itemCode || i.ItemCode || '',
      sellingPrice: i.sellingPrice || i.SellingPrice || 0,
      unitPrice: i.unitPrice || i.UnitPrice || 0,
      currentStock: i.currentStock || i.CurrentStock || 0
    }));
    setFilteredItems(_filtered);
  };

  const userTemplate = (item) => {
    return (
      <div className="flex flex-column">
        <span className="font-bold">{item.name || 'Unknown'}</span>
        <small className="text-500">{item.id || 'No ID'} | {item.class || 'No Class'}</small>
      </div>
    );
  };

  const itemTemplate = (item) => {
    const price = item.sellingPrice || item.unitPrice || 0;
    const isOutOfStock = (item.currentStock || 0) <= 0;
    return (
      <div className="flex flex-column p-2" style={{ backgroundColor: isOutOfStock ? '#ffebee' : 'transparent', borderRadius: '4px' }}>
        <div className="flex justify-content-between align-items-center">
          <span className={`font-bold ${isOutOfStock ? 'text-red-500' : ''}`}>{item.itemName || 'Unknown Item'}</span>
          <span className="font-bold text-green-600">₹{price}</span>
        </div>
        <small className="text-500">
          Code: {item.itemCode || '-'} | Stock: <span className={isOutOfStock ? 'text-red-500 font-bold' : ''}>{item.currentStock || 0}</span>
          {isOutOfStock && <span className="text-red-500 ml-2 font-bold">(Out of Stock)</span>}
        </small>
      </div>
    );
  };

  const handleAddToCart = () => {
    if (!selectedSearchItem || issueQty <= 0) return;
    if (selectedSearchItem.currentStock <= 0) {
      alert("This item is out of stock and cannot be issued.");
      return;
    }
    
    const existing = cart.find(c => c.itemId === selectedSearchItem.id);
    const price = selectedSearchItem.sellingPrice || selectedSearchItem.unitPrice || 0;
    
    if (existing) {
      const newQty = existing.qty + issueQty;
      setCart(cart.map(c => c.itemId === selectedSearchItem.id ? { 
        ...c, qty: newQty, totalAmount: newQty * price 
      } : c));
    } else {
      setCart([...cart, {
        id: Date.now(),
        itemId: selectedSearchItem.id,
        itemName: selectedSearchItem.itemName,
        itemCode: selectedSearchItem.itemCode,
        qty: issueQty,
        sellingPrice: selectedSearchItem.sellingPrice,
        unitPrice: selectedSearchItem.unitPrice,
        totalAmount: issueQty * price
      }]);
    }
    setSelectedSearchItem(null);
    setIssueQty(1);
  };

  const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

  // Payment Handlers
  const handleAddPaymentMode = () => {
    setPaymentModeError('');
    const grandTotal = cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const enteredTotal = paymentSplits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    if (enteredTotal >= grandTotal) {
      alert("Total payable amount is already covered. Cannot add more payment modes.");
      return;
    }
    
    setPaymentSplits([...paymentSplits, { mode: 2, amount: '', transactionRef: '' }]);
  };

  const handleRemovePaymentMode = (index) => {
    setPaymentModeError('');
    if (paymentSplits.length > 1) {
      setPaymentSplits(paymentSplits.filter((_, i) => i !== index));
    }
  };

  const grandTotal = cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

  useEffect(() => {
    // Auto-fill amount if only one payment mode is present
    if (paymentSplits.length === 1) {
      setPaymentSplits([{ ...paymentSplits[0], amount: grandTotal || '' }]);
    }
  }, [grandTotal]);

  const handlePaymentFieldChange = (index, field, value) => {
    setPaymentModeError('');
    const next = [...paymentSplits];
    
    if (field === 'amount') {
      let numVal = Number(value);
      // Calculate total of OTHER splits
      const otherTotal = next.reduce((sum, split, i) => i === index ? sum : sum + (Number(split.amount) || 0), 0);
      
      // Prevent exceeding grand total
      if (otherTotal + numVal > grandTotal) {
        numVal = grandTotal - otherTotal;
      }
      next[index][field] = numVal || '';
    } else {
      next[index][field] = value;
    }
    
    setPaymentSplits(next);
  };

  const handleSaveIssue = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (issueType === 'Registered' && !selectedUser) return alert("Select a user");
    if (issueType === 'Walk-in') {
      if (!walkInDetails.name) return alert("Enter Walk-in Name");
      if (!walkInDetails.contactNo || !/^\d{10}$/.test(walkInDetails.contactNo)) {
        return alert("Please enter a valid 10-digit mobile number.");
      }
    }

    const grandTotal = cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const enteredTotal = paymentSplits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    if (enteredTotal < grandTotal) {
      alert(`Please enter full payment. You entered ₹${enteredTotal}, but ₹${grandTotal} is required.`);
      return;
    }
    
    // Build Payment String
    const paymentModeStr = paymentSplits.filter(p => Number(p.amount) > 0).map(p => {
      const modeName = { 1:'Cash', 2:'UPI', 3:'Card', 4:'Cheque', 5:'Bank Transfer' }[p.mode] || 'Cash';
      return `${modeName}: ${p.amount}`;
    }).join(' | ') || 'Unpaid';

    const payload = {
      issuedToType: issueType === 'Registered' ? 'Student' : 'Walk-in',
      issuedToId: issueType === 'Registered' ? null : null, 
      issuedToName: issueType === 'Registered' ? selectedUser.name : `${walkInDetails.title} ${walkInDetails.name}`,
      department: issueType === 'Registered' ? selectedUser.class : walkInDetails.contactNo,
      isReturnable: false,
      returnDueDate: null,
      paymentMode: paymentModeStr,
      remarks: '',
      items: cart.map(c => ({
        itemId: c.itemId,
        quantity: c.qty,
        remarks: ''
      }))
    };

    setSubmitting(true);
    try {
      const res = await inventoryApi.createIssue(payload);
      if (res.data?.success) {
        setCart([]);
        setPaymentSplits([{ mode: 1, amount: '', transactionRef: '' }]);
        const savedIssue = res.data.data;
        setPrintIssue({
          issueNumber: savedIssue.issueNumber,
          issueDate: savedIssue.issueDate,
          issuedToName: payload.issuedToName,
          issuedToType: payload.issuedToType,
          paymentMode: paymentModeStr,
          items: cart
        });
        loadInitialData();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save issue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className="pi pi-send text-primary" style={{ fontSize: '1.5rem' }} /> Stock Issue POS
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button 
            label="Store & Slip Setup" 
            icon="pi pi-cog" 
            className="p-button-outlined p-button-help p-button-sm" 
            onClick={() => navigate('/inventory/store-setup')} 
          />
          <Button 
            label="View History" 
            icon="pi pi-history" 
            className="p-button-outlined p-button-sm" 
            onClick={() => setHistoryDialogVisible(true)} 
          />
        </Box>
      </Box>

      {/* TOP SECTION: Search & Select Student */}
      <Card sx={{ mb: 3, boxShadow: 2, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="flex-start">
            {/* Issue Type */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>Issue Type</Typography>
              <Dropdown value={issueType} options={[{label: 'Registered', value: 'Registered'}, {label: 'Walk-in', value: 'Walk-in'}]} onChange={(e) => setIssueType(e.value)} className="w-full p-inputtext-sm" />
            </Grid>

            {issueType === 'Registered' ? (
              <>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>Search & Select Student / Staff</Typography>
                  <AutoComplete 
                    value={selectedUser} 
                    suggestions={filteredUsers} 
                    completeMethod={searchUsers} 
                    field="name" 
                    itemTemplate={userTemplate}
                    onChange={(e) => setSelectedUser(e.value)} 
                    placeholder="Search by Name, ID, Mobile No" 
                    className="p-inputtext-sm w-full"
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  {selectedUser ? (
                    <Paper sx={{ p: 2, bgcolor: '#f7fafc', border: '1px solid #90caf9', borderRadius: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ width: 50, height: 50, bgcolor: 'primary.main', fontSize: 22 }}>
                            {selectedUser.name ? selectedUser.name[0].toUpperCase() : 'U'}
                          </Avatar>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle1" fontWeight={700}>{selectedUser.name}</Typography>
                              <Chip label={selectedUser.id} color="primary" size="small" sx={{ fontWeight: 700 }} />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">Role: {selectedUser.userType} | Class/Dept: {selectedUser.class}</Typography>
                            <Typography variant="caption" color="text.secondary">Contact: {selectedUser.contactNo}</Typography>
                          </Box>
                      </Stack>
                    </Paper>
                 ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ mt: 3 }}>Please search and select a user.</Typography>
                 )}
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} md={5}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>Walk-in Details</Typography>
                  <div className="grid p-fluid">
                     <div className="col-3"><Dropdown value={walkInDetails.title} options={[{label:'Mr.',value:'Mr.'},{label:'Mrs.',value:'Mrs.'},{label:'Ms.',value:'Ms.'}]} onChange={(e) => setWalkInDetails({...walkInDetails, title: e.value})} className="p-inputtext-sm" /></div>
                     <div className="col-9"><InputText placeholder="Full Name" value={walkInDetails.name} onChange={(e) => setWalkInDetails({...walkInDetails, name: e.target.value})} className="p-inputtext-sm" /></div>
                     <div className="col-12"><InputText keyfilter="num" maxLength={10} placeholder="10-digit Contact Number" value={walkInDetails.contactNo} onChange={(e) => setWalkInDetails({...walkInDetails, contactNo: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="p-inputtext-sm" /></div>
                  </div>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="warning.dark">Walk-in Customer</Typography>
                    <Typography variant="body2">Name: {walkInDetails.title} {walkInDetails.name || 'N/A'}</Typography>
                    <Typography variant="body2">Contact: {walkInDetails.contactNo || 'N/A'}</Typography>
                  </Paper>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* BOTTOM SECTION */}
      <Grid container spacing={3}>
         {/* Left: Item Search & Cart */}
         <Grid item xs={12} lg={8}>
            <Card sx={{ boxShadow: 2, height: '100%' }}>
              <CardContent>
                 <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#424242' }}>
                   ITEM SEARCH & CART
                 </Typography>
                 
                 <div className="grid p-fluid align-items-end mb-3">
                   <div className="col-8">
                     <label className="text-xs font-bold text-700 block mb-1">Search Item</label>
                     <AutoComplete 
                        value={selectedSearchItem} 
                        suggestions={filteredItems} 
                        completeMethod={searchItems} 
                        field="itemName" 
                        itemTemplate={itemTemplate}
                        onChange={(e) => {
                          if (e.value && e.value.currentStock <= 0) {
                            alert("Cannot select out of stock items.");
                            return;
                          }
                          setSelectedSearchItem(e.value);
                        }} 
                        placeholder="Start typing to search item..." 
                        className="p-inputtext-sm"
                      />
                   </div>
                   <div className="col-2">
                     <label className="text-xs font-bold text-700 block mb-1">Qty</label>
                     <InputNumber value={issueQty} onValueChange={(e) => setIssueQty(e.value || 1)} min={1} className="p-inputtext-sm" />
                   </div>
                   <div className="col-2">
                     <Button label="Add" icon="pi pi-plus" className="p-button-primary p-button-sm w-full" onClick={handleAddToCart} />
                   </div>
                 </div>

                 <DataTable value={cart} emptyMessage="No items added to cart." className="p-datatable-sm border-1 surface-border">
                    <Column field="itemName" header="Item Name" className="font-bold" />
                    <Column field="qty" header="Qty" style={{ width: '80px' }} />
                    <Column field="mrp" header="Rate" body={(r) => r.sellingPrice ? `₹${r.sellingPrice}` : '-'} style={{ width: '100px' }} />
                    <Column field="totalAmount" header="Total" body={(r) => `₹${r.totalAmount || 0}`} className="font-bold text-primary" style={{ width: '100px' }} />
                    <Column header="Action" body={(r) => (
                      <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger p-button-sm" onClick={() => removeFromCart(r.id)} />
                    )} style={{ width: '60px' }} />
                 </DataTable>
              </CardContent>
            </Card>
         </Grid>

         {/* Right Sidebar: Payment Breakdown */}
         <Grid item xs={12} lg={4}>
            <Card sx={{ boxShadow: 2, position: 'sticky', top: 20 }}>
              <CardContent>
                 <Box sx={{ pb: 2, borderBottom: '1px dashed #ccc', mb: 2 }}>
                    <Typography variant="h6" fontWeight={800}>
                      Payment Breakdown (FR-5.4)
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">Total Payable:</Typography>
                      <Typography variant="h6" fontWeight={800} color="success.main">
                        ₹{cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0)}
                      </Typography>
                    </Stack>
                 </Box>

                 <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#424242' }}>
                   Payment Modes (Cash, UPI, Card, Cheque)
                 </Typography>
                 
                 <Stack spacing={2} sx={{ mb: 2 }}>
                  {paymentSplits.map((item, index) => (
                    <Paper key={index} sx={{ p: 1.5, border: "1px solid #e0e0e0", bgcolor: "#fff", display: "flex", gap: "8px", alignItems: "center" }}>
                        <TextField select size="small" label="Mode" sx={{ width: 130 }} value={item.mode} onChange={(e) => handlePaymentFieldChange(index, "mode", Number(e.target.value))}>
                          <MenuItem value={1}>Cash</MenuItem>
                          <MenuItem value={2}>UPI</MenuItem>
                          <MenuItem value={3}>Card</MenuItem>
                          <MenuItem value={4}>Cheque</MenuItem>
                          <MenuItem value={5}>Transfer</MenuItem>
                        </TextField>
                        <TextField type="number" size="small" label="Amount (₹)" sx={{ flex: 1 }} value={item.amount} onChange={(e) => handlePaymentFieldChange(index, "amount", e.target.value)} />
                        {paymentSplits.length > 1 && (
                          <IconButton size="small" color="error" onClick={() => handleRemovePaymentMode(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                    </Paper>
                  ))}
                 </Stack>
                 <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <MuiButton size="small" startIcon={<AddIcon />} onClick={handleAddPaymentMode} disabled={paymentSplits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) >= cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0) && cart.length > 0}>
                      Add Payment Mode
                    </MuiButton>
                 </Stack>

                 <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #ccc' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#757575' }}>Cashier Remarks</Typography>
                    <TextField fullWidth size="small" placeholder="Enter remarks (optional)..." sx={{ mb: 2 }} />
                    
                    <Box sx={{ p: 1.5, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 1, mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={700} color="success.main" display="flex" alignItems="center" gap={1}>
                          <CheckCircleIcon fontSize="small" /> Total Entered
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="success.main">
                          ₹{paymentSplits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)}
                        </Typography>
                      </Stack>
                    </Box>
                    <MuiButton 
                       fullWidth variant="contained" color="success" size="large" 
                       sx={{ py: 1.5, fontWeight: 800, fontSize: '1rem', textTransform: 'none' }} 
                       onClick={handleSaveIssue} disabled={submitting || cart.length === 0 || paymentSplits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) < cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0)}
                    >
                      Collect & Generate Receipt (₹{cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0)})
                    </MuiButton>
                 </Box>
              </CardContent>
            </Card>
         </Grid>
      </Grid>

      {/* History Dialog */}
      <Dialog header="Issue History" visible={historyDialogVisible} style={{ width: '90vw', maxWidth: '1000px' }} modal onHide={() => setHistoryDialogVisible(false)}>
        <DataTable value={issues} className="p-datatable-sm" paginator rows={10}>
          <Column field="issueNumber" header="Issue No" />
          <Column field="issueDate" header="Date" body={(row) => new Date(row.issueDate).toLocaleDateString()} />
          <Column field="issuedToName" header="Issued To" />
          <Column field="issuedToType" header="Type" />
          <Column header="Action" body={(row) => (
            <div className="flex gap-2">
              <Button icon="pi pi-print" label="Print" className="p-button-outlined p-button-sm" onClick={() => setPrintIssue(row)} />
            </div>
          )} />
        </DataTable>
      </Dialog>

      {printIssue && (
        <Dialog header="Print Issue Slip" visible={!!printIssue} style={{ width: '60vw', minWidth: '600px' }} modal onHide={() => setPrintIssue(null)}>
          <IssueSlip data={printIssue} onHide={() => setPrintIssue(null)} />
        </Dialog>
      )}
    </Box>
  );
};

export default StockIssuePage;
