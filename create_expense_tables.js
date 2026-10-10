const mysql = require('mysql2/promise'); 
async function run() { 
  const con = await mysql.createConnection({host:'localhost',user:'root',password:'123456',database:'school_erp'}); 
  
  await con.query('DROP TABLE IF EXISTS expenses'); 
  await con.query('DROP TABLE IF EXISTS expense_categories'); 
  
  await con.query(`CREATE TABLE expense_categories (
    id bigint NOT NULL AUTO_INCREMENT, 
    branch_id bigint NOT NULL, 
    name longtext CHARACTER SET utf8mb4 NOT NULL, 
    description longtext CHARACTER SET utf8mb4 NULL, 
    created_by bigint NOT NULL, 
    created_on datetime(6) NOT NULL, 
    modified_by bigint NULL, 
    modified_on datetime(6) NULL, 
    is_active tinyint(1) NOT NULL, 
    CONSTRAINT PK_expense_categories PRIMARY KEY (id), 
    CONSTRAINT FK_expense_categories_branches_branch_id FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE
  )`); 
  
  await con.query(`CREATE TABLE expenses (
    id bigint NOT NULL AUTO_INCREMENT, 
    branch_id bigint NOT NULL, 
    category_id bigint NOT NULL, 
    title longtext CHARACTER SET utf8mb4 NOT NULL, 
    description longtext CHARACTER SET utf8mb4 NULL, 
    amount decimal(65,30) NOT NULL, 
    expense_date datetime(6) NOT NULL, 
    receipt_url longtext CHARACTER SET utf8mb4 NULL, 
    created_by bigint NOT NULL, 
    created_on datetime(6) NOT NULL, 
    modified_by bigint NULL, 
    modified_on datetime(6) NULL, 
    is_active tinyint(1) NOT NULL, 
    CONSTRAINT PK_expenses PRIMARY KEY (id), 
    CONSTRAINT FK_expenses_branches_branch_id FOREIGN KEY (branch_id) REFERENCES branches (id) ON DELETE CASCADE, 
    CONSTRAINT FK_expenses_expense_categories_category_id FOREIGN KEY (category_id) REFERENCES expense_categories (id) ON DELETE CASCADE
  )`); 
  
  console.log('Created successfully'); 
  process.exit(0); 
} 
run().catch(console.error);
