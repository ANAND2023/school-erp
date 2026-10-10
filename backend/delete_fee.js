const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('D:/erp/backend/SchoolERP.API/school_erp.db');

db.serialize(() => {
  db.run(`DELETE FROM FeeStructures WHERE FeeHeadId IN (SELECT Id FROM FeeHeads WHERE Name LIKE '%Transport%' OR Name LIKE '%Bus%')`);
  
  // We can't delete the head if it has foreign keys in StudentFeeDues, but if we just delete it from FeeStructures, it won't show in the Fee Structure UI!
  // Wait, the UI shows FeeHeads on the left side or the rows are FeeHeads.
  // The screenshot shows rows of FeeHeads. So we must delete from FeeHeads too, but only if we also delete referencing Dues.
  // Actually, we don't want to delete Dues because we just added them via Transport module!
  // BUT wait, my new C# code expects a FeeHead containing "Transport" to exist so it can attach Dues to it!
  // If I delete the FeeHead, my code will recreate it on the fly:
  // transportHead = new FeeHead { Name = "Transport Fee" ... }
  // So it's safe to delete the old one, but then the dues that were attached to the old one will be orphaned or cascade deleted!
  // If they cascade delete, it's fine, the new logic will recreate them.

  db.run(`DELETE FROM FeeHeads WHERE Name LIKE '%Transport%' OR Name LIKE '%Bus%'`, function(err) {
    if (err) console.error(err);
    else console.log('Deleted ' + this.changes + ' transport fee heads.');
  });
});
db.close();
