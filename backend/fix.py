import sys
path = 'D:\\erp\\backend\\SchoolERP.API\\Program.cs'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

sql = 'CREATE TABLE IF NOT EXISTS `landing_enquiries` (`id` bigint NOT NULL AUTO_INCREMENT, `name` longtext NOT NULL, `school_name` longtext NOT NULL, `phone` longtext NOT NULL, `email` longtext NULL, `message` longtext NULL, `is_read` tinyint(1) NOT NULL, `submitted_at` datetime(6) NOT NULL, `created_by` bigint NULL, `created_on` datetime(6) NOT NULL, `modified_by` bigint NULL, `modified_on` datetime(6) NULL, `is_active` tinyint(1) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;'

insert = f'''await DbInitializer.SeedAsync(context);
          try {{ context.Database.ExecuteSqlRaw("{sql}"); }} catch (Exception ex) {{ Console.WriteLine("SQL ERROR: " + ex.Message); }}'''

text = text.replace('await DbInitializer.SeedAsync(context);', insert)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
