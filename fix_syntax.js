const fs = require('fs');
const file = 'd:/erp/frontend/src/features/inventory/pages/StockIssuePage.jsx';
let content = fs.readFileSync(file, 'utf8');

// The file has literal "\`" instead of "`", and "\$" instead of "$"
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');

fs.writeFileSync(file, content);
console.log('Fixed syntax!');
