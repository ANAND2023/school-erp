const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'school_erp',
    port: 3306
  });

  try {
    const [rows, fields] = await connection.execute("SHOW TABLES;");
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
