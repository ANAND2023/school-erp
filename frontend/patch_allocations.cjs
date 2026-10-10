const fs = require('fs');
let code = fs.readFileSync('D:/erp/frontend/src/features/transport/pages/TransportAllocationsPage.jsx', 'utf8');

// Replace state initialization
code = code.replace(
  "studentId: '',",
  "studentIds: [],"
);

// Replace state initialization in handleOpen
code = code.replace(
  "studentId: '',",
  "studentIds: [],"
);

// Replace handleSave
const oldHandleSave = `  const handleSave = async () => {
    try {
      // For brevity, assuming backend has POST /transport/allocations implemented
      // If not, we might get a 404, but frontend is ready
      await apiClient.post('/transport/allocations', formData);
      setOpen(false);
      fetchAllocations();
    } catch (err) {
      console.error(err);
      
    }
  };`;

const newHandleSave = `  const handleSave = async () => {
    try {
      const promises = formData.studentIds.map(id => {
        const payload = {
          studentId: id,
          routeId: formData.routeId,
          routeStopId: formData.routeStopId,
          startDate: formData.startDate
        };
        return apiClient.post('/transport/allocations', payload);
      });
      await Promise.all(promises);
      setOpen(false);
      fetchAllocations();
    } catch (err) {
      console.error(err);
    }
  };`;
code = code.replace(oldHandleSave, newHandleSave);
// Handle CRLF if needed
code = code.replace(oldHandleSave.replace(/\n/g, '\r\n'), newHandleSave);

// Replace Select component
const oldStudentSelect = `<Select label="Select Student" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})}>
                  {students.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.fullName} ({s.admissionNo})</MenuItem>
                  ))}
                </Select>`;
const oldStudentSelectCRLF = oldStudentSelect.replace(/\n/g, '\r\n');

const newStudentSelect = `<Select multiple label="Select Students" value={formData.studentIds || []} onChange={e => setFormData({...formData, studentIds: e.target.value})} renderValue={(selected) => selected.map(id => students.find(s => s.id === id)?.fullName).join(', ')}>
                  {students.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.fullName} ({s.admissionNo})</MenuItem>
                  ))}
                </Select>`;

code = code.replace(oldStudentSelect, newStudentSelect);
code = code.replace(oldStudentSelectCRLF, newStudentSelect);

code = code.replace("<InputLabel>Select Student</InputLabel>", "<InputLabel>Select Student(s)</InputLabel>");
code = code.replace("!formData.studentId", "(!formData.studentIds || formData.studentIds.length === 0)");

fs.writeFileSync('D:/erp/frontend/src/features/transport/pages/TransportAllocationsPage.jsx', code);
