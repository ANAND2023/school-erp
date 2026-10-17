import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Paper, Stack,
  Chip, Avatar, Divider, Alert
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../api';
import ReturnSlip from '../components/ReturnSlip';
import IssueSlip from '../components/IssueSlip';

export const StockReturnPage = () => {
  const navigate = useNavigate();
  const toastRef = useRef(null);

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Return Processing Dialog
  const [returnDialogVisible, setReturnDialogVisible] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMode, setRefundMode] = useState('Cash');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);

  // Return Slip Print Dialog
  const [printReturnData, setPrintReturnData] = useState(null);
  const [printOriginalIssue, setPrintOriginalIssue] = useState(null);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getIssues();
      if (res.data?.success && res.data?.data) {
        setIssues(res.data.data);
      }
    } catch (err) {
      console.error('Error loading inventory issues:', err);
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to load sale issues' });
    } finally {
      setLoading(false);
    }
  };

  // Open Return Dialog for an issue
  const handleOpenReturnModal = (issue) => {
    setSelectedIssue(issue);
    setRefundMode('Cash');
    setReturnRemarks('');

    // Prepare editable return item lines
    const lines = (issue.items || []).map((it) => {
      const remaining = it.remainingQuantity != null ? it.remainingQuantity : (it.quantity - it.returnedQuantity);
      const rate = it.sellingPrice || it.unitPrice || 0;
      return {
        issueItemId: it.id,
        itemId: it.itemId,
        itemName: it.itemName,
        itemCode: it.itemCode,
        unit: it.unit || 'Pcs',
        soldQuantity: it.quantity,
        returnedQuantity: it.returnedQuantity || 0,
        remainingQuantity: remaining,
        rate: rate,
        returnQty: 0,
        reason: 'Wrong Size / Exchange',
        lineRefund: 0
      };
    });

    setReturnItems(lines);
    setReturnDialogVisible(true);
  };

  // Update return qty for an item line
  const handleItemReturnQtyChange = (index, qty) => {
    const updated = [...returnItems];
    const maxQty = updated[index].remainingQuantity;
    const boundedQty = Math.max(0, Math.min(Number(qty) || 0, maxQty));
    
    updated[index].returnQty = boundedQty;
    updated[index].lineRefund = boundedQty * updated[index].rate;
    setReturnItems(updated);
  };

  // Update return reason for an item line
  const handleItemReasonChange = (index, reason) => {
    const updated = [...returnItems];
    updated[index].reason = reason;
    setReturnItems(updated);
  };

  // Quick return all remaining items
  const handleReturnAll = () => {
    const updated = returnItems.map(it => ({
      ...it,
      returnQty: it.remainingQuantity,
      lineRefund: it.remainingQuantity * it.rate
    }));
    setReturnItems(updated);
  };

  // Quick reset to 0
  const handleResetReturn = () => {
    const updated = returnItems.map(it => ({
      ...it,
      returnQty: 0,
      lineRefund: 0
    }));
    setReturnItems(updated);
  };

  // Total return calculations
  const totalReturnQty = returnItems.reduce((sum, it) => sum + (it.returnQty || 0), 0);
  const totalRefundAmount = returnItems.reduce((sum, it) => sum + (it.lineRefund || 0), 0);

  // Submit Batch Return
  const handleSubmitReturn = async () => {
    const itemsToReturn = returnItems
      .filter(it => it.returnQty > 0)
      .map(it => ({
        issueItemId: it.issueItemId,
        returnQuantity: it.returnQty,
        reason: it.reason
      }));

    if (itemsToReturn.length === 0) {
      toastRef.current?.show({ 
        severity: 'warn', 
        summary: 'No Items Selected', 
        detail: 'Please enter a return quantity greater than 0 for at least one item.' 
      });
      return;
    }

    try {
      setProcessingReturn(true);
      const payload = {
        issueId: selectedIssue.id,
        refundMode: refundMode,
        remarks: returnRemarks,
        items: itemsToReturn
      };

      const res = await inventoryApi.batchReturnIssue(payload);
      if (res.data?.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Return Processed',
          detail: res.data.message || 'Items returned to stock successfully.'
        });

        setReturnDialogVisible(false);
        // Show return slip
        setPrintReturnData(res.data.data);
        // Reload list
        loadIssues();
      } else {
        toastRef.current?.show({
          severity: 'error',
          summary: 'Return Failed',
          detail: res.data?.message || 'Could not process return.'
        });
      }
    } catch (err) {
      console.error('Error processing return:', err);
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.message || 'Failed to process return.'
      });
    } finally {
      setProcessingReturn(false);
    }
  };

  // Filter issues by status
  const filteredIssues = issues.filter((iss) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'RETURNABLE') return iss.canReturn !== false && iss.status !== 'Returned';
    if (statusFilter === 'PARTIAL') return iss.status === 'Partially Returned';
    if (statusFilter === 'RETURNED') return iss.status === 'Returned';
    return true;
  });

  // Calculate high-level summary KPIs
  const totalSalesCount = issues.length;
  const totalSalesVal = issues.reduce((sum, it) => sum + (Number(it.totalAmount) || 0), 0);
  const totalReturnedVal = issues.reduce((sum, it) => sum + (Number(it.totalReturnedAmount) || 0), 0);
  const returnableCount = issues.filter(it => it.canReturn !== false && it.status !== 'Returned').length;

  // Status tag styling
  const statusTemplate = (row) => {
    const isReturned = row.status === 'Returned';
    const isPartial = row.status === 'Partially Returned';
    const severity = isReturned ? 'success' : isPartial ? 'warning' : 'info';
    return <Tag value={row.status || 'Issued'} severity={severity} />;
  };

  const reasonOptions = [
    { label: 'Wrong Size / Exchange', value: 'Wrong Size / Exchange' },
    { label: 'Defective / Damaged Item', value: 'Defective / Damaged Item' },
    { label: 'Course / Subject Changed', value: 'Course / Subject Changed' },
    { label: 'Duplicate / Excess Purchased', value: 'Duplicate / Excess Purchased' },
    { label: 'Customer Dissatisfaction', value: 'Customer Dissatisfaction' },
    { label: 'Other', value: 'Other' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Toast ref={toastRef} />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#0f172a' }}>
            <i className="pi pi-replay" style={{ fontSize: '1.6rem', color: '#0284c7' }} />
            Item Returns & Sales Credit (वापसी)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Process item returns, exchange wrong uniform sizes, restore live inventory stock, and issue credit refunds.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            label="Stock Issue POS"
            icon="pi pi-send"
            className="p-button-outlined p-button-sm"
            onClick={() => navigate('/inventory/issues')}
          />
          <Button
            label="Stock Ledger"
            icon="pi pi-list"
            className="p-button-outlined p-button-secondary p-button-sm"
            onClick={() => navigate('/inventory/ledger')}
          />
          <Button
            icon="pi pi-refresh"
            className="p-button-outlined p-button-sm"
            onClick={loadIssues}
            loading={loading}
            tooltip="Refresh List"
          />
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                    Total Invoices Sold
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color="#0f172a" sx={{ mt: 0.5 }}>
                    {totalSalesCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Value: ₹{totalSalesVal.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0284c7', width: 48, height: 48 }}>
                  <i className="pi pi-shopping-bag" style={{ fontSize: '1.4rem' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                    Eligible for Return
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color="#0284c7" sx={{ mt: 0.5 }}>
                    {returnableCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active sales with remaining items
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ecfdf5', color: '#10b981', width: 48, height: 48 }}>
                  <i className="pi pi-check-circle" style={{ fontSize: '1.4rem' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                    Total Refunded Value
                  </Typography>
                  <Typography variant="h5" fontWeight={900} color="#dc2626" sx={{ mt: 0.5 }}>
                    ₹{totalReturnedVal.toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Restored into inventory stock
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fef2f2', color: '#dc2626', width: 48, height: 48 }}>
                  <i className="pi pi-undo" style={{ fontSize: '1.4rem' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                    Store Slip Config
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                    POS 80mm Active
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="primary" 
                    sx={{ cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => navigate('/inventory/store-setup')}
                  >
                    Edit Slip Format →
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f5f3ff', color: '#8b5cf6', width: 48, height: 48 }}>
                  <i className="pi pi-print" style={{ fontSize: '1.4rem' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main DataTable Card */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 14px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          
          {/* Filter Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
            <div className="p-input-icon-left" style={{ width: '320px' }}>
              <i className="pi pi-search" />
              <InputText
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search Issue No, Customer, Class..."
                className="p-inputtext-sm w-full"
              />
            </div>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Filter Status:
              </Typography>
              {[
                { id: 'ALL', label: 'All Invoices' },
                { id: 'RETURNABLE', label: 'Returnable' },
                { id: 'PARTIAL', label: 'Partially Returned' },
                { id: 'RETURNED', label: 'Fully Returned' },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  label={tab.label}
                  size="small"
                  className={statusFilter === tab.id ? 'p-button-primary p-button-sm' : 'p-button-outlined p-button-secondary p-button-sm'}
                  onClick={() => setStatusFilter(tab.id)}
                />
              ))}
            </Box>
          </Box>

          {/* Table */}
          <DataTable
            value={filteredIssues}
            loading={loading}
            globalFilter={globalFilter}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            className="p-datatable-sm"
            emptyMessage="No sales issue records found."
            responsiveLayout="scroll"
          >
            <Column
              field="issueNumber"
              header="Issue / Bill No"
              sortable
              body={(row) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={800} color="primary">
                    {row.issueNumber}
                  </Typography>
                </Box>
              )}
            />
            <Column
              field="issueDate"
              header="Date"
              sortable
              body={(row) => new Date(row.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            />
            <Column
              field="issuedToName"
              header="Customer / Student"
              sortable
              body={(row) => (
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    {row.issuedToName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.issuedToType} {row.department ? `| ${row.department}` : ''}
                  </Typography>
                </Box>
              )}
            />
            <Column
              field="totalItems"
              header="Items"
              body={(row) => (
                <span className="font-semibold">
                  {row.totalItems || (row.items?.length || 0)} item(s)
                </span>
              )}
            />
            <Column
              field="totalAmount"
              header="Total Value"
              body={(row) => (
                <Typography variant="body2" fontWeight={800} color="#0f172a">
                  ₹{(row.totalAmount || 0).toLocaleString('en-IN')}
                </Typography>
              )}
            />
            <Column
              field="status"
              header="Status"
              body={statusTemplate}
              sortable
            />
            <Column
              header="Actions"
              body={(row) => {
                const canReturn = row.canReturn !== false && row.status !== 'Returned';
                return (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      label="Return Items"
                      icon="pi pi-replay"
                      size="small"
                      className={canReturn ? 'p-button-danger p-button-sm' : 'p-button-outlined p-button-secondary p-button-sm'}
                      disabled={!canReturn}
                      onClick={() => handleOpenReturnModal(row)}
                      tooltip={canReturn ? 'Process sale return / exchange' : 'All items in this invoice have been returned'}
                    />
                    <Button
                      icon="pi pi-print"
                      size="small"
                      className="p-button-outlined p-button-secondary p-button-sm"
                      onClick={() => setPrintOriginalIssue(row)}
                      tooltip="Print Invoice Memo"
                    />
                  </Box>
                );
              }}
            />
          </DataTable>
        </CardContent>
      </Card>

      {/* Return Processing Dialog */}
      <Dialog
        header={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className="pi pi-replay text-red-600" style={{ fontSize: '1.3rem' }} />
            <Typography variant="h6" fontWeight={800}>
              Process Sale Return — {selectedIssue?.issueNumber}
            </Typography>
          </Box>
        }
        visible={returnDialogVisible}
        style={{ width: '92vw', maxWidth: '980px' }}
        modal
        onHide={() => !processingReturn && setReturnDialogVisible(false)}
      >
        {selectedIssue && (
          <Box>
            {/* Customer & Issue Metadata Banner */}
            <Paper sx={{ p: 2, mb: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Customer / Student</Typography>
                  <Typography variant="body2" fontWeight={800}>{selectedIssue.issuedToName}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedIssue.issuedToType} {selectedIssue.department ? `(${selectedIssue.department})` : ''}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Original Date</Typography>
                  <Typography variant="body2" fontWeight={800}>
                    {new Date(selectedIssue.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Payment Mode</Typography>
                  <Typography variant="body2" fontWeight={800}>{selectedIssue.paymentMode || 'Cash'}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Quick Controls</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Button label="Return All" size="small" className="p-button-sm p-button-outlined p-button-danger" onClick={handleReturnAll} />
                    <Button label="Reset (0)" size="small" className="p-button-sm p-button-outlined p-button-secondary" onClick={handleResetReturn} />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Alert severity="info" sx={{ mb: 2.5, fontSize: '0.85rem' }}>
              Enter the quantity you wish to return for each item. The item will be <strong>restored back into inventory stock</strong> and recorded in the Stock Movement Ledger.
            </Alert>

            {/* Items Return Table */}
            <DataTable value={returnItems} className="p-datatable-sm border-1 surface-border" responsiveLayout="scroll">
              <Column
                header="Item Details"
                body={(r) => (
                  <Box>
                    <Typography variant="body2" fontWeight={800}>{r.itemName}</Typography>
                    <Typography variant="caption" color="text.secondary">Code: {r.itemCode || '-'} | Unit: {r.unit}</Typography>
                  </Box>
                )}
              />
              <Column
                header="Sold Qty"
                field="soldQuantity"
                style={{ width: '85px', textAlign: 'center' }}
                body={(r) => <span className="font-bold">{r.soldQuantity}</span>}
              />
              <Column
                header="Returned"
                field="returnedQuantity"
                style={{ width: '85px', textAlign: 'center' }}
                body={(r) => <span className="text-orange-600 font-semibold">{r.returnedQuantity}</span>}
              />
              <Column
                header="Returnable"
                field="remainingQuantity"
                style={{ width: '95px', textAlign: 'center' }}
                body={(r) => (
                  <Tag
                    value={r.remainingQuantity}
                    severity={r.remainingQuantity > 0 ? 'success' : 'danger'}
                  />
                )}
              />
              <Column
                header="Rate"
                style={{ width: '90px', textAlign: 'right' }}
                body={(r) => <span>₹{r.rate}</span>}
              />
              <Column
                header="Return Qty"
                style={{ width: '130px' }}
                body={(r, { rowIndex }) => (
                  <InputNumber
                    value={r.returnQty}
                    onValueChange={(e) => handleItemReturnQtyChange(rowIndex, e.value)}
                    min={0}
                    max={r.remainingQuantity}
                    disabled={r.remainingQuantity <= 0}
                    className="p-inputtext-sm w-full"
                    showButtons
                    buttonLayout="horizontal"
                    decrementButtonClassName="p-button-secondary"
                    incrementButtonClassName="p-button-primary"
                    incrementButtonIcon="pi pi-plus"
                    decrementButtonIcon="pi pi-minus"
                  />
                )}
              />
              <Column
                header="Refund"
                style={{ width: '100px', textAlign: 'right' }}
                body={(r) => (
                  <span className="font-bold text-red-600">
                    ₹{r.lineRefund || 0}
                  </span>
                )}
              />
              <Column
                header="Return Reason"
                style={{ width: '180px' }}
                body={(r, { rowIndex }) => (
                  <Dropdown
                    value={r.reason}
                    options={reasonOptions}
                    onChange={(e) => handleItemReasonChange(rowIndex, e.value)}
                    className="p-inputtext-sm w-full"
                    disabled={r.returnQty <= 0}
                  />
                )}
              />
            </DataTable>

            {/* Bottom Refund Summary & Payment Controls */}
            <Paper sx={{ mt: 3, p: 2.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Refund Payment Mode
                  </Typography>
                  <Dropdown
                    value={refundMode}
                    options={[
                      { label: '💵 Cash Refund', value: 'Cash' },
                      { label: '📱 UPI / Online Transfer', value: 'UPI' },
                      { label: '🧾 Credit Note / Store Credit', value: 'Credit Note' },
                      { label: '🎓 Adjust in Student Fee Ledger', value: 'Fee Adjustment' },
                    ]}
                    onChange={(e) => setRefundMode(e.value)}
                    className="p-inputtext-sm w-full"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Cashier Remarks (Optional)
                  </Typography>
                  <InputText
                    value={returnRemarks}
                    onChange={(e) => setReturnRemarks(e.target.value)}
                    placeholder="e.g. Size exchange for 34 inch shirt"
                    className="p-inputtext-sm w-full"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, bgcolor: '#fef2f2', border: '1.5px dashed #f87171', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" fontWeight={700} color="#991b1b" textTransform="uppercase">
                      Total Refund Payable ({totalReturnQty} Items)
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color="#dc2626">
                      ₹{totalRefundAmount.toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Dialog Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
              <Button
                label="Cancel"
                className="p-button-outlined p-button-secondary"
                onClick={() => setReturnDialogVisible(false)}
                disabled={processingReturn}
              />
              <Button
                label={`Complete Return & Refund (₹${totalRefundAmount})`}
                icon="pi pi-check"
                className="p-button-danger"
                disabled={totalReturnQty === 0 || processingReturn}
                loading={processingReturn}
                onClick={handleSubmitReturn}
              />
            </Box>
          </Box>
        )}
      </Dialog>

      {/* Return Slip Dialog */}
      {printReturnData && (
        <Dialog
          header="Goods Return Slip / Credit Memo"
          visible={!!printReturnData}
          style={{ width: '60vw', minWidth: '550px' }}
          modal
          onHide={() => setPrintReturnData(null)}
        >
          <ReturnSlip data={printReturnData} onHide={() => setPrintReturnData(null)} />
        </Dialog>
      )}

      {/* Original Issue Memo Dialog */}
      {printOriginalIssue && (
        <Dialog
          header={`Original Issue Slip — ${printOriginalIssue.issueNumber}`}
          visible={!!printOriginalIssue}
          style={{ width: '60vw', minWidth: '550px' }}
          modal
          onHide={() => setPrintOriginalIssue(null)}
        >
          <IssueSlip data={printOriginalIssue} onHide={() => setPrintOriginalIssue(null)} />
        </Dialog>
      )}
    </Box>
  );
};

export default StockReturnPage;
