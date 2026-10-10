
import re
with open(r'SchoolERP.API\Controllers\TransportController.cs', 'r', encoding='utf8') as f:
    text = f.read()

replacement = '''
                .Select(v => new {
                    id = v.Id,
                    registrationNo = v.RegistrationNo,
                    vehicleType = v.VehicleType,
                    capacity = v.Capacity,
                    status = v.Status,
                    driverId = v.DriverId,
                    driver = v.Driver != null ? new {
                        firstName = v.Driver.FirstName,
                        lastName = v.Driver.LastName
                    } : null
                })
                .ToListAsync();
            return Ok(new { success = true, data = vehicles });
'''

text = re.sub(r'\.ToListAsync\(\);\s*return Ok\(new \{ success = true, data = vehicles \}\);', replacement.strip(), text, count=1)

with open(r'SchoolERP.API\Controllers\TransportController.cs', 'w', encoding='utf8') as f:
    f.write(text)

