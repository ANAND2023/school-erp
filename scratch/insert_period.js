const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'school_erp'
});

const now = new Date();
now.setMinutes(now.getMinutes() + 2); // 2 minutes from now

const start_time = now.toTimeString().substring(0, 5) + ':00';
now.setMinutes(now.getMinutes() + 5);
const end_time = now.toTimeString().substring(0, 5) + ':00';

const query = `
  INSERT INTO periods (
    branch_id, academic_year_id, period_number, name, start_time, end_time, 
    is_break, is_bell_enabled, is_dismissal_bell, display_order, is_active, 
    created_by, created_on
  ) VALUES (
    1, 1, 999, 'Test Bell Period', ?, ?, 
    0, 1, 0, 999, 1, 
    1, UTC_TIMESTAMP()
  )
`;

connection.query(query, [start_time, end_time], (err, results) => {
  if (err) {
    console.error('Error inserting period:', err);
  } else {
    console.log(`Successfully inserted Test Bell Period starting at ${start_time}`);
  }
  connection.end();
});
