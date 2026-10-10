const fs = require('fs');
let code = fs.readFileSync('D:/erp/frontend/src/features/transport/pages/TransportRoutesPage.jsx', 'utf8');

code = code.replace(
  "import DeleteIcon from '@mui/icons-material/Delete';",
  "import DeleteIcon from '@mui/icons-material/Delete';\nimport VisibilityIcon from '@mui/icons-material/Visibility';"
);

code = code.replace(
  "const [editData, setEditData] = useState(null);",
  "const [editData, setEditData] = useState(null);\n  const [viewOpen, setViewOpen] = useState(false);\n  const [viewData, setViewData] = useState(null);\n\n  const handleView = (r) => {\n    setViewData(r);\n    setViewOpen(true);\n  };"
);

code = code.replace(
  "<IconButton color=\"primary\" onClick={() => handleOpen(r)}><EditIcon /></IconButton>",
  "<IconButton color=\"info\" onClick={() => handleView(r)}><VisibilityIcon /></IconButton>\n                  <IconButton color=\"primary\" onClick={() => handleOpen(r)}><EditIcon /></IconButton>"
);

const dialogCode = `
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Route Stops Details - {viewData?.routeName}</DialogTitle>
        <DialogContent dividers>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell>Stop Name</TableCell>
                  <TableCell>Pick-up Time</TableCell>
                  <TableCell>Drop Time</TableCell>
                  <TableCell>Monthly Fare</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {viewData?.stops?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center">No stops added to this route.</TableCell></TableRow>
                ) : (
                  viewData?.stops?.map((stop, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{stop.stopName}</TableCell>
                      <TableCell>{stop.pickUpTime || '-'}</TableCell>
                      <TableCell>{stop.dropTime || '-'}</TableCell>
                      <TableCell>{stop.monthlyFare}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
`;

code = code.replace(
  "    </Box>\n  );\n};",
  dialogCode
);
// Also catch \r\n if applicable
code = code.replace(
  "    </Box>\r\n  );\r\n};",
  dialogCode
);

fs.writeFileSync('D:/erp/frontend/src/features/transport/pages/TransportRoutesPage.jsx', code);
