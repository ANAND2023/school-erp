using System;
using Microsoft.Data.Sqlite;

class Program {
    static void Main() {
        var connectionString = "Data Source=D:\\erp\\backend\\SchoolERP.API\\school_erp.db";
        using (var connection = new SqliteConnection(connectionString)) {
            connection.Open();
            var command = connection.CreateCommand();
            
            // Delete structures associated with transport
            command.CommandText = "DELETE FROM FeeStructures WHERE FeeHeadId IN (SELECT Id FROM FeeHeads WHERE Name LIKE '%Transport%' OR Name LIKE '%Bus%')";
            int count1 = command.ExecuteNonQuery();
            Console.WriteLine("Deleted " + count1 + " FeeStructures.");
            
            // Mark the fee head as inactive so it hides from the UI completely
            command.CommandText = "UPDATE FeeHeads SET IsActive = 0 WHERE Name LIKE '%Transport%' OR Name LIKE '%Bus%'";
            int count2 = command.ExecuteNonQuery();
            Console.WriteLine("Deactivated " + count2 + " FeeHeads.");
        }
    }
}
