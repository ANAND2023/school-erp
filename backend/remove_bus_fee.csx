using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SchoolERP.Infrastructure.Persistence;
using SchoolERP.Domain.Entities;

var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
optionsBuilder.UseSqlite("Data Source=D:\\erp\\backend\\SchoolERP.API\\school_erp.db");

using (var context = new ApplicationDbContext(optionsBuilder.Options))
{
    var transportHeads = context.FeeHeads.Where(h => h.Name.Contains("Transport") || h.Name.Contains("Bus")).ToList();
    
    foreach(var head in transportHeads)
    {
        var structures = context.FeeStructures.Where(s => s.FeeHeadId == head.Id).ToList();
        context.FeeStructures.RemoveRange(structures);
        
        var concessions = context.FeeConcessions.Where(c => c.FeeHeadId == head.Id).ToList();
        context.FeeConcessions.RemoveRange(concessions);
        
        // Don't delete StudentFeeDues yet, just the structures so it hides from the UI
        context.FeeHeads.Remove(head);
    }
    
    context.SaveChanges();
    Console.WriteLine("Deleted " + transportHeads.Count + " transport fee heads.");
}
