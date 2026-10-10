$sql = @"
CREATE TABLE IF NOT EXISTS ``vehicles`` (
  ``id`` bigint NOT NULL AUTO_INCREMENT,
  ``branch_id`` bigint NOT NULL,
  ``registration_no`` longtext NOT NULL,
  ``vehicle_type`` longtext NOT NULL,
  ``capacity`` int NOT NULL,
  ``make_and_model`` longtext NULL,
  ``driver_name`` longtext NULL,
  ``driver_phone`` longtext NULL,
  ``status`` longtext NOT NULL,
  ``created_by`` bigint NULL,
  ``created_on`` datetime(6) NOT NULL,
  ``modified_by`` bigint NULL,
  ``modified_on`` datetime(6) NULL,
  ``is_active`` tinyint(1) NOT NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ``transport_routes`` (
  ``id`` bigint NOT NULL AUTO_INCREMENT,
  ``branch_id`` bigint NOT NULL,
  ``route_name`` longtext NOT NULL,
  ``description`` longtext NULL,
  ``vehicle_id`` bigint NULL,
  ``created_by`` bigint NULL,
  ``created_on`` datetime(6) NOT NULL,
  ``modified_by`` bigint NULL,
  ``modified_on`` datetime(6) NULL,
  ``is_active`` tinyint(1) NOT NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ``route_stops`` (
  ``id`` bigint NOT NULL AUTO_INCREMENT,
  ``route_id`` bigint NOT NULL,
  ``stop_name`` longtext NOT NULL,
  ``pick_up_time`` time(6) NULL,
  ``drop_time`` time(6) NULL,
  ``monthly_fare`` decimal(18,2) NOT NULL,
  ``created_by`` bigint NULL,
  ``created_on`` datetime(6) NOT NULL,
  ``modified_by`` bigint NULL,
  ``modified_on`` datetime(6) NULL,
  ``is_active`` tinyint(1) NOT NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ``transport_allocations`` (
  ``id`` bigint NOT NULL AUTO_INCREMENT,
  ``branch_id`` bigint NOT NULL,
  ``academic_year_id`` bigint NOT NULL,
  ``student_id`` bigint NOT NULL,
  ``route_stop_id`` bigint NOT NULL,
  ``start_date`` datetime(6) NOT NULL,
  ``end_date`` datetime(6) NULL,
  ``status`` longtext NOT NULL,
  ``created_by`` bigint NULL,
  ``created_on`` datetime(6) NOT NULL,
  ``modified_by`` bigint NULL,
  ``modified_on`` datetime(6) NULL,
  ``is_active`` tinyint(1) NOT NULL,
  PRIMARY KEY (``id``)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
"@

$programContent = Get-Content "D:\erp\backend\SchoolERP.API\Program.cs" -Raw
$injection = "try { context.Database.ExecuteSqlRaw(`"$sql`"); } catch { Console.WriteLine(`"SQL ERROR transport: `" + `$_.Exception.Message); }`n          try { context.Database.ExecuteSqlRaw(`"UPDATE `"landing_enquiries`" " # just keeping the original string match
$newContent = $programContent -replace 'try \{ context.Database.ExecuteSqlRaw\("UPDATE `"landing_enquiries`"', $injection

Set-Content "D:\erp\backend\SchoolERP.API\Program.cs" $newContent
