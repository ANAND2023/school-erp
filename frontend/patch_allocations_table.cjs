const fs = require('fs');
let code = fs.readFileSync('D:/erp/frontend/src/features/transport/pages/TransportAllocationsPage.jsx', 'utf8');

// 1. Add Switch import
if (!code.includes('Switch')) {
  code = code.replace("import { Box", "import { Switch, Box");
}

// 2. Add filter states
code = code.replace(
  "const [selectedSectionId, setSelectedSectionId] = useState('');",
  "const [selectedSectionId, setSelectedSectionId] = useState('');\n  const [filterClassId, setFilterClassId] = useState('');\n  const [filterSectionId, setFilterSectionId] = useState('');"
);

// 3. Define tableData
const toggleCode = `
  const handleToggleStatus = async (id) => {
    try {
      await apiClient.put(\`/transport/allocations/\${id}/toggle-status\`);
      fetchAllocations();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAllocations = allocations.filter(a => {
    if (filterClassId && a.classId !== filterClassId) return false;
    if (filterSectionId && a.sectionId !== filterSectionId) return false;
    return true;
  });
`;
code = code.replace("const handleSave = async () => {", toggleCode + "\n  const handleSave = async () => {");

// 4. Add filter dropdowns above the table
const filtersUI = `
      <Box display="flex" gap={2} mb={3}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Class</InputLabel>
          <Select label="Filter by Class" value={filterClassId} onChange={e => { setFilterClassId(e.target.value); setFilterSectionId(''); }}>
            <MenuItem value="">All Classes</MenuItem>
            {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }} disabled={!filterClassId}>
          <InputLabel>Filter by Section</InputLabel>
          <Select label="Filter by Section" value={filterSectionId} onChange={e => setFilterSectionId(e.target.value)}>
            <MenuItem value="">All Sections</MenuItem>
            {classes.find(c => c.id === filterClassId)?.sections?.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <TableContainer`;
code = code.replace("<TableContainer", filtersUI);

// 5. Update TableBody mapping & rendering
code = code.replace("allocations.length === 0", "filteredAllocations.length === 0");
code = code.replace("allocations.map((a) =>", "filteredAllocations.map((a) =>");

const oldStudentCell = `<TableCell fontWeight="bold">
                  {a.student?.firstName} {a.student?.lastName}
                  <Typography variant="caption" display="block">{a.student?.admissionNo}</Typography>
                </TableCell>`;
const oldStudentCellCRLF = oldStudentCell.replace(/\n/g, '\r\n');

const newStudentCell = `<TableCell fontWeight="bold">
                  {a.studentName}
                  <Typography variant="caption" display="block">Adm: {a.admissionNo}</Typography>
                </TableCell>`;

code = code.replace(oldStudentCell, newStudentCell);
code = code.replace(oldStudentCellCRLF, newStudentCell);

code = code.replace("<TableCell>Class {a.student?.classSectionId}</TableCell>", "<TableCell>{a.className} / {a.sectionName}</TableCell>");

code = code.replace("{a.routeStop?.route?.routeName}", "{a.routeName}");
code = code.replace("{a.routeStop?.stopName}", "{a.stopName}");
code = code.replace("{a.routeStop?.monthlyFare}", "{a.monthlyFare}");

const oldStatusCell = `<TableCell><Chip size="small" label={a.status} color="success" /></TableCell>`;
const newStatusCell = `<TableCell>
                  <Box display="flex" alignItems="center">
                    <Switch size="small" checked={a.status === 'Active'} onChange={() => handleToggleStatus(a.id)} color="success" />
                    <Typography variant="body2" sx={{ ml: 1, color: a.status === 'Active' ? 'success.main' : 'text.secondary' }}>{a.status}</Typography>
                  </Box>
                </TableCell>`;

code = code.replace(oldStatusCell, newStatusCell);

fs.writeFileSync('D:/erp/frontend/src/features/transport/pages/TransportAllocationsPage.jsx', code);
