const fs = require('fs');

const file = 'd:/erp/frontend/src/features/inventory/pages/StockIssuePage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace top header
content = content.replace(
  /<div className="p-4 md:p-5">\s*<div className="flex justify-content-between align-items-center mb-4 pb-3 border-bottom-1 surface-border">\s*<h2 className="m-0 text-xl font-bold flex align-items-center gap-2">\s*<i className="pi pi-send text-primary text-2xl" \/> Stock Issue \(Outward\)\s*<\/h2>\s*<Button label="View History" icon="pi pi-history" className="p-button-outlined p-button-sm" onClick=\{\(\) => setHistoryDialogVisible\(true\)\} \/>\s*<\/div>/g,
  `<Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className="pi pi-send text-primary" style={{ fontSize: '1.5rem' }} /> Stock Issue (Outward)
        </Typography>
        <Button label="View History" icon="pi pi-history" className="p-button-outlined p-button-sm" onClick={() => setHistoryDialogVisible(true)} />
      </Box>`
);

// Replace the Top Section (surface-card)
content = content.replace(
  /<div className="surface-card shadow-1 border-round p-3 mb-3">([\s\S]*?)<\/div>\s*<div className="surface-card shadow-1 border-round p-3">/g,
  `<Card sx={{ mb: 3, boxShadow: 2, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={5}>
$1
            </Grid>
            <Grid item xs={12} md={7}>
              {issueType === 'Registered' && selectedUser ? (
                <Paper sx={{ p: 2, bgcolor: '#f7fafc', border: '1px solid #90caf9', borderRadius: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 50, height: 50, bgcolor: '#4caf50', fontSize: 22 }}>
                        {selectedUser.name ? selectedUser.name[0].toUpperCase() : 'U'}
                      </Avatar>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" fontWeight={700}>
                            {selectedUser.name}
                          </Typography>
                          <Chip label={selectedUser.id} color="primary" size="small" sx={{ fontWeight: 700 }} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Role/Class: <b>{selectedUser.class} ({selectedUser.userType})</b>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Contact: <b>{selectedUser.contactNo}</b>
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </Paper>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  Please search and select a user to proceed.
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ boxShadow: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#424242' }}>
                ITEM SEARCH & CART
              </Typography>`
);

// We need to find the Box for PAYMENT DETAILS and move it to the right grid
const paymentRegex = /<Box sx=\{\{ mt: 3, pt: 3, borderTop: "1px dashed #ccc" \}\}>([\s\S]*?)<\/Box>\s*<\/div>/g;
const paymentMatch = paymentRegex.exec(content);

if (paymentMatch) {
  let paymentContent = paymentMatch[1];
  
  // Replace the inner styling of the payment block to match the Fee collection exact look
  paymentContent = paymentContent.replace(
    /<div className="flex justify-content-end gap-3 pt-3">[\s\S]*?<\/div>/,
    `<Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #ccc' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: '#757575' }}>
          Cashier Remarks
        </Typography>
        <TextField fullWidth size="small" placeholder="Enter remarks (optional)..." sx={{ mb: 2 }} />
        
        <Box sx={{ p: 2, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 1, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight={700} color="success.main" display="flex" alignItems="center" gap={1}>
              <CheckCircleIcon fontSize="small" /> Full Payment Validated
            </Typography>
            <Typography variant="h6" fontWeight={800} color="success.main">
              ₹{cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0)}
            </Typography>
          </Stack>
        </Box>
        <MuiButton fullWidth variant="contained" color="success" size="large" sx={{ py: 1.5, fontWeight: 800, fontSize: '1.1rem', textTransform: 'none' }} onClick={handleSaveIssue} disabled={submitting || cart.length === 0}>
          Collect & Generate Receipt (₹{cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0)})
        </MuiButton>
      </Box>`
  );

  content = content.replace(paymentRegex, `            </CardContent>
          </Card>
        </Grid>
        
        {/* Right Sidebar */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ boxShadow: 2, position: 'sticky', top: 20 }}>
            <CardContent>
              <Box sx={{ pb: 2, borderBottom: '1px dashed #ccc', mb: 2 }}>
                <Typography variant="h6" fontWeight={800}>
                  Payment Breakdown
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Total Payable:</Typography>
                  <Typography variant="h6" fontWeight={800} color="success.main">₹{cart.reduce((sum, item) => sum + (item.totalAmount || 0), 0)}</Typography>
                </Stack>
              </Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#424242' }}>
                Payment Modes
              </Typography>
              ${paymentContent}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>`
  );
}

// Add the required imports if they are not there
if (!content.includes('import { Avatar')) {
  content = content.replace("import { Box", "import { Avatar, Grid, Card, CardContent, Box");
  content = content.replace("import DeleteIcon", "import CheckCircleIcon from '@mui/icons-material/CheckCircle';\nimport DeleteIcon");
}

fs.writeFileSync(file, content);
console.log('Refactoring complete');
