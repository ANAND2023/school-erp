const fs = require('fs');
let code = fs.readFileSync('D:/erp/frontend/src/features/transport/pages/TransportAllocationsPage.jsx', 'utf8');

if (!code.includes('primereact/multiselect')) {
  code = code.replace(
    "import apiClient from '../../../api/client';",
    "import apiClient from '../../../api/client';\nimport { MultiSelect } from 'primereact/multiselect';"
  );
}

const oldSelectRegex = /<FormControl fullWidth disabled=\{!selectedSectionId\}>[\s\S]*?<\/FormControl>/;
const newSelect = `
                <Box>
                  <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>Select Student(s)</Typography>
                  <MultiSelect 
                    value={formData.studentIds || []} 
                    onChange={(e) => setFormData({...formData, studentIds: e.value})} 
                    options={filteredStudents} 
                    optionLabel="fullName" 
                    optionValue="id"
                    display="chip" 
                    placeholder="Select Students" 
                    disabled={!selectedSectionId}
                    filter
                    className="w-full" 
                    style={{ width: '100%' }}
                  />
                </Box>`;

code = code.replace(oldSelectRegex, newSelect);

fs.writeFileSync('D:/erp/frontend/src/features/transport/pages/TransportAllocationsPage.jsx', code);
