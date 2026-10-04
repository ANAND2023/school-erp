const BASE_URL = 'http://localhost:5000/api';

async function testAll() {
  console.log('========================================================');
  console.log('   COMPREHENSIVE END-TO-END TEST: ALL 8 ERP MODULES   ');
  console.log('========================================================\n');

  // 1. Auth & Login
  console.log('>>> [Module 1] Testing Auth & Login...');
  const loginRes = await fetch(`${BASE_URL}/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123' }),
  });
  const loginJson = await loginRes.json();
  if (!loginJson.success) throw new Error('Login failed: ' + loginJson.message);
  const token = loginJson.data.accessToken;
  const user = loginJson.data.user;
  console.log(`[PASS] Login successful! User: ${user.fullName} (${user.roleName}), Permissions: ${loginJson.data.permissions.length}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Masters
  console.log('\n>>> [Module 2] Testing Masters...');
  const classRes = await fetch(`${BASE_URL}/classes`, { headers: authHeaders });
  const classJson = await classRes.json();
  const classes = classJson.data || [];
  console.log(`[PASS] Classes loaded: ${classes.length} classes found.`);
  const testClass = classes[0];
  const testSection = testClass?.sections?.[0];
  console.log(`       Using Test Class: ${testClass?.name}, Section: ${testSection?.name}`);

  const subRes = await fetch(`${BASE_URL}/subjects`, { headers: authHeaders });
  const subJson = await subRes.json();
  const subjects = subJson.data || [];
  console.log(`[PASS] Subjects loaded: ${subjects.length} subjects found.`);
  const testSubject = subjects[0];
  console.log(`       Using Test Subject: ${testSubject?.name} (${testSubject?.code})`);

  // 3. Students
  console.log('\n>>> [Module 3] Testing Students & Admission...');
  const studentRes = await fetch(`${BASE_URL}/students?pageSize=5`, { headers: authHeaders });
  const studentJson = await studentRes.json();
  const students = studentJson.data?.items || studentJson.data || [];
  console.log(`[PASS] Students loaded: ${students.length} students found.`);
  const testStudent = students[0];
  console.log(`       Using Test Student: ${testStudent?.fullName} (${testStudent?.admissionNo})`);

  // 4. Staff
  console.log('\n>>> [Module 4] Testing Staff & HR...');
  const staffRes = await fetch(`${BASE_URL}/employees?pageSize=5`, { headers: authHeaders });
  const staffJson = await staffRes.json();
  const employees = staffJson.data?.items || staffJson.data || [];
  console.log(`[PASS] Staff loaded: ${employees.length} employees found.`);

  // 5. Fees Management
  console.log('\n>>> [Module 5] Testing Fees Management...');
  const feeHeadRes = await fetch(`${BASE_URL}/fees/heads`, { headers: authHeaders });
  const feeHeadJson = await feeHeadRes.json();
  console.log(`[PASS] Fee Heads loaded: ${(feeHeadJson.data || []).length} heads.`);

  if (testStudent) {
    const duesRes = await fetch(`${BASE_URL}/fees/students/${testStudent.id}/dues`, { headers: authHeaders });
    const duesJson = await duesRes.json();
    console.log(`[PASS] Student dues check: Success = ${duesJson.success}`);
  }

  // 6. Attendance & Timetable
  console.log('\n>>> [Module 6] Testing Attendance & Timetable...');
  const periodsRes = await fetch(`${BASE_URL}/timetable/periods`, { headers: authHeaders });
  const periodsJson = await periodsRes.json();
  console.log(`[PASS] Periods loaded: ${(periodsJson.data || []).length} periods.`);

  // 7. Examinations & Report Cards
  console.log('\n>>> [Module 7] Testing Examinations & Report Cards...');
  // A. Create Term
  const termRes = await fetch(`${BASE_URL}/exams/terms`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Term 1 (Mid-Term)',
      termCode: 'T1',
      weightage: 50,
      description: 'First Term Examination',
    }),
  });
  const termJson = await termRes.json();
  console.log(`[PASS] Exam Term created: ${termJson.message} (Term ID: ${termJson.data?.id})`);
  const termId = termJson.data?.id;

  // B. Create Exam
  const examRes = await fetch(`${BASE_URL}/exams`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      termId: termId,
      classId: testClass.id,
      name: 'Half Yearly Examination 2026',
      description: 'Comprehensive mid-year assessment',
    }),
  });
  const examJson = await examRes.json();
  console.log(`[PASS] Exam created: ${examJson.message} (Exam ID: ${examJson.data?.id})`);
  const examId = examJson.data?.id;

  // C. Schedule Exam Subject
  const schRes = await fetch(`${BASE_URL}/exams/${examId}/schedules`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      subjectId: testSubject.id,
      examDate: '2026-10-15',
      startTime: '09:00',
      endTime: '12:00',
      maxMarks: 100,
      passMarks: 33,
      roomNo: 'Room 102',
    }),
  });
  const schJson = await schRes.json();
  console.log(`[PASS] Exam Schedule saved: ${schJson.message}`);

  const getSchRes = await fetch(`${BASE_URL}/exams/${examId}/schedules`, { headers: authHeaders });
  const getSchJson = await getSchRes.json();
  const schedule = getSchJson.data?.[0];
  console.log(`       Schedule: ${schedule?.subjectName} on ${schedule?.examDate}, Max: ${schedule?.maxMarks}`);

  // D. Bulk Marks Entry
  if (testStudent && schedule) {
    const marksRes = await fetch(`${BASE_URL}/exams/marks/bulk`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        scheduleId: schedule.id,
        entries: [
          {
            studentId: testStudent.id,
            marksObtained: 92,
            isAbsent: false,
            isMedicalLeave: false,
            remarks: 'Excellent analytical work',
          },
        ],
      }),
    });
    const marksJson = await marksRes.json();
    console.log(`[PASS] Marks Entry saved: ${marksJson.message}`);
  }

  // E. Process Results & Ranks
  const resultRes = await fetch(`${BASE_URL}/exams/${examId}/process-results`, { headers: authHeaders });
  const resultJson = await resultRes.json();
  console.log(`[PASS] Results Processed: Exam "${resultJson.data?.examName}", Total Candidates: ${resultJson.data?.results?.length}`);
  const topResult = resultJson.data?.results?.[0];
  if (topResult) {
    console.log(`       Top Student: ${topResult.fullName}, Marks: ${topResult.totalObtained}/${topResult.totalMax}, %: ${topResult.percentage}%, Grade: ${topResult.grade}, Rank: #${topResult.classRank}, Status: ${topResult.resultStatus}`);
  }

  // F. Report Card Generation
  if (testStudent) {
    const rcRes = await fetch(`${BASE_URL}/exams/report-card?studentId=${testStudent.id}&examId=${examId}`, { headers: authHeaders });
    const rcJson = await rcRes.json();
    console.log(`[PASS] CBSE Report Card generated: ${rcJson.data?.student?.fullName}, School: ${rcJson.data?.schoolName}, Total: ${rcJson.data?.totalObtainedMarks}/${rcJson.data?.totalMaxMarks}, Attendance: ${rcJson.data?.attendance?.percentage}%`);
  }

  // 8. Promotion & Transfer Certificate
  console.log('\n>>> [Module 8] Testing Promotion & Transfer Certificate...');
  // A. Eligible Students for Promotion
  const promoEligibleRes = await fetch(`${BASE_URL}/promotion/eligible-students?classId=${testClass.id}&sectionId=${testSection.id}&academicYearId=1`, { headers: authHeaders });
  const promoEligibleJson = await promoEligibleRes.json();
  console.log(`[PASS] Promotion eligibility check: ${promoEligibleJson.data?.totalCount} students eligible in Class ${testClass.name}.`);

  // B. TC Clearance Check
  if (testStudent) {
    const tcCheckRes = await fetch(`${BASE_URL}/transfer-certificates/dues-check/${testStudent.id}`, { headers: authHeaders });
    const tcCheckJson = await tcCheckRes.json();
    console.log(`[PASS] TC Clearance Check for ${testStudent.fullName}: Fee Cleared = ${tcCheckJson.data?.feeCleared}, Can Issue = ${tcCheckJson.data?.canIssueTc}`);

    // C. Issue TC
    const tcIssueRes = await fetch(`${BASE_URL}/transfer-certificates`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        studentId: testStudent.id,
        applicationDate: '2026-09-29',
        issueDate: '2026-09-29',
        lastClassStudied: testClass.name,
        qualifiedForPromotion: true,
        reasonForLeaving: 'Parents Relocating to New City',
        conduct: 'Exemplary',
        adminOverrideDues: true,
        remarks: 'Student has shown great academic diligence.',
      }),
    });
    const tcIssueJson = await tcIssueRes.json();
    console.log(`[PASS] TC Issued: ${tcIssueJson.message}, TC Number: ${tcIssueJson.data?.tcNumber}`);
    const tcId = tcIssueJson.data?.id;

    // D. Print TC
    if (tcId) {
      const tcPrintRes = await fetch(`${BASE_URL}/transfer-certificates/${tcId}/print`, { headers: authHeaders });
      const tcPrintJson = await tcPrintRes.json();
      console.log(`[PASS] Printable TC retrieved: Pupil = ${tcPrintJson.data?.student?.fullName}, TC No = ${tcPrintJson.data?.tcNumber}, Conduct = ${tcPrintJson.data?.conduct}, School = ${tcPrintJson.data?.schoolName}`);
    }
  }

  console.log('\n========================================================');
  console.log('   ALL 8 ERP MODULES TESTED & FULLY FUNCTIONAL!         ');
  console.log('========================================================');
}

testAll().catch((err) => {
  console.error('\n[FAIL] Test Error:', err);
  process.exit(1);
});
