import re

with open("src/features/attendance/pages/AttendanceReportsPage.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports
imports = """
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
"""
if 'import { jsPDF }' not in content:
    content = content.replace("import api from '../../../api/client';", imports + "\nimport api from '../../../api/client';")

# 2. Add Export functions
export_funcs = """
  const exportStudentExcel = () => {
    if (!studentRegister || !studentRegister.rows) return;
    const wsData = [];
    
    // Header
    const headerRow = ['Roll', 'Student Name', 'Work', '% (BR-6.2)'];
    for (let i = 1; i <= studentRegister.daysInMonth; i++) headerRow.push(i.toString());
    headerRow.push('P', 'A');
    wsData.push(headerRow);

    // Rows
    studentRegister.rows.forEach(row => {
      const dataRow = [row.rollNo || '-', row.fullName, row.totalWorkingDays, row.attendancePercentage + '%'];
      for (let i = 1; i <= studentRegister.daysInMonth; i++) {
        dataRow.push(row.dailyStatus[i] || '-');
      }
      dataRow.push(row.totalPresent, row.totalAbsent);
      wsData.push(dataRow);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Register');
    XLSX.writeFile(wb, `Student_Monthly_Register_${month}_${year}.xlsx`);
  };

  const exportStudentPdf = () => {
    if (!studentRegister || !studentRegister.rows) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text(`Student Monthly Register - ${month} ${year}`, 14, 15);
    
    const headRow = ['Roll', 'Name', 'Work', '%'];
    for (let i = 1; i <= studentRegister.daysInMonth; i++) headRow.push(i.toString());
    headRow.push('P', 'A');

    const bodyRows = studentRegister.rows.map(row => {
      const dataRow = [row.rollNo || '-', row.fullName, row.totalWorkingDays, row.attendancePercentage + '%'];
      for (let i = 1; i <= studentRegister.daysInMonth; i++) {
        dataRow.push(row.dailyStatus[i] || '-');
      }
      dataRow.push(row.totalPresent, row.totalAbsent);
      return dataRow;
    });

    doc.autoTable({
      head: [headRow],
      body: bodyRows,
      startY: 20,
      styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' }
      }
    });

    doc.save(`Student_Monthly_Register_${month}_${year}.pdf`);
  };
"""
if 'exportStudentExcel' not in content:
    content = content.replace("  return (", export_funcs + "\n  return (")

# 3. Add Export Buttons
btns_original = """
        {tabValue === 0 && absentees.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={exportAbsenteesCsv}
            sx={{ px: 2.5 }}
          >
            Export Absentees CSV
          </Button>
        )}
"""
btns_new = """
        {tabValue === 0 && absentees.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={exportAbsenteesCsv}
            sx={{ px: 2.5 }}
          >
            Export Absentees CSV
          </Button>
        )}
        {tabValue === 1 && studentRegister?.rows?.length > 0 && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportStudentExcel} sx={{ px: 2.5 }}>
              Excel
            </Button>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={exportStudentPdf} sx={{ px: 2.5 }}>
              PDF
            </Button>
          </Stack>
        )}
"""
if 'exportStudentExcel' in btns_new and 'exportStudentExcel' not in content[content.find("tabValue === 1"):]: 
    content = content.replace(btns_original.strip(), btns_new.strip())

# 4. Move columns in TableHead
head_orig = """
                  <TableCell sx={{ fontWeight: 700, minWidth: 60 }}>Roll</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Student Name</TableCell>
                  {Array.from({ length: studentRegister.daysInMonth }, (_, i) => i + 1).map((d) => {
"""
head_new = """
                  <TableCell sx={{ fontWeight: 700, minWidth: 60 }}>Roll</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Student Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>Work</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 70 }}>% (BR-6.2)</TableCell>
                  {Array.from({ length: studentRegister.daysInMonth }, (_, i) => i + 1).map((d) => {
"""
content = content.replace(head_orig.strip(), head_new.strip())

head_bottom_orig = """
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>P</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>A</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>Work</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 70 }}>% (BR-6.2)</TableCell>
"""
head_bottom_new = """
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>P</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center', minWidth: 50 }}>A</TableCell>
"""
content = content.replace(head_bottom_orig.strip(), head_bottom_new.strip())

# 5. Move columns in TableBody
body_orig = """
                    <TableCell sx={{ fontWeight: 600 }}>{row.rollNo ?? '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.fullName}</TableCell>
                    {Array.from({ length: studentRegister.daysInMonth }, (_, i) => i + 1).map((d) => {
"""
body_new = """
                    <TableCell sx={{ fontWeight: 600 }}>{row.rollNo ?? '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.fullName}</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                      {row.totalWorkingDays}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={`${row.attendancePercentage}%`}
                        color={
                          row.attendancePercentage >= 75
                            ? 'success'
                            : row.attendancePercentage >= 50
                            ? 'warning'
                            : 'error'
                        }
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    {Array.from({ length: studentRegister.daysInMonth }, (_, i) => i + 1).map((d) => {
"""
content = content.replace(body_orig.strip(), body_new.strip())

body_bottom_orig = """
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'success.main' }}>
                        {row.totalPresent}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'error.main' }}>
                        {row.totalAbsent}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600 }}>
                        {row.totalWorkingDays}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip
                          size="small"
                          label={`${row.attendancePercentage}%`}
                          color={
                            row.attendancePercentage >= 75
                              ? 'success'
                              : row.attendancePercentage >= 50
                              ? 'warning'
                              : 'error'
                          }
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
"""
body_bottom_new = """
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'success.main' }}>
                        {row.totalPresent}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'error.main' }}>
                        {row.totalAbsent}
                      </TableCell>
"""
content = content.replace(body_bottom_orig.strip(), body_bottom_new.strip())

with open("src/features/attendance/pages/AttendanceReportsPage.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied successfully.")
