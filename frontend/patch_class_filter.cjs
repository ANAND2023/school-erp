const fs = require('fs');
let code = fs.readFileSync('D:/erp/frontend/src/features/transport/pages/TransportAllocationsPage.jsx', 'utf8');

// Add states
code = code.replace(
  "const [students, setStudents] = useState([]);",
  `const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');`
);

// Add fetchClasses to useEffect
code = code.replace(
  "fetchStudents();\n  }, []);",
  "fetchStudents();\n    fetchClasses();\n  }, []);"
).replace(
  "fetchStudents();\r\n  }, []);",
  "fetchStudents();\r\n    fetchClasses();\r\n  }, []);"
);

// Define fetchClasses
code = code.replace(
  "const fetchStudents = async () => {",
  `const fetchClasses = async () => {
    try {
      const res = await apiClient.get('/classes');
      setClasses(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {`
);

// handleClassChange
code = code.replace(
  "const handleOpen = () => {",
  `const handleClassChange = (e) => {
    const cid = e.target.value;
    setSelectedClassId(cid);
    const cls = classes.find(c => c.id === cid);
    setSections(cls?.sections || []);
    setSelectedSectionId('');
    setFormData(prev => ({...prev, studentIds: []}));
  };

  const handleSectionChange = (e) => {
    setSelectedSectionId(e.target.value);
    setFormData(prev => ({...prev, studentIds: []}));
  };

  const filteredStudents = students.filter(s => s.classSectionId === selectedSectionId);

  const handleOpen = () => {`
);

// handleOpen clear class/section
code = code.replace(
  "setFormData({",
  `setSelectedClassId('');
    setSections([]);
    setSelectedSectionId('');
    setFormData({`
);

// Update Dialog Content Grid
const oldGridStart = `<Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Student(s)</InputLabel>`;
                
const oldGridStartCRLF = oldGridStart.replace(/\n/g, '\r\n');

const newGridStart = `<Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Select Class</InputLabel>
                <Select label="Select Class" value={selectedClassId} onChange={handleClassChange}>
                  {classes.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.className}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!selectedClassId}>
                <InputLabel>Select Section</InputLabel>
                <Select label="Select Section" value={selectedSectionId} onChange={handleSectionChange}>
                  {sections.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!selectedSectionId}>
                <InputLabel>Select Student(s)</InputLabel>`;

code = code.replace(oldGridStart, newGridStart);
code = code.replace(oldGridStartCRLF, newGridStart);

// Replace mapping students.map -> filteredStudents.map
const oldStudentMap = `{students.map(s => (
                      <MenuItem key={s.id} value={s.id}>{s.fullName} ({s.admissionNo})</MenuItem>
                    ))}`;
const oldStudentMapCRLF = oldStudentMap.replace(/\n/g, '\r\n');
const newStudentMap = `{filteredStudents.map(s => (
                      <MenuItem key={s.id} value={s.id}>{s.fullName} ({s.admissionNo})</MenuItem>
                    ))}`;

code = code.replace(oldStudentMap, newStudentMap);
code = code.replace(oldStudentMapCRLF, newStudentMap);


fs.writeFileSync('D:/erp/frontend/src/features/transport/pages/TransportAllocationsPage.jsx', code);
