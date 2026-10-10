const fs = require('fs');
const file = 'd:/erp/frontend/src/features/dashboard/pages/DashboardPage.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import InventoryDashboardPage')) {
    content = content.replace(
        "import { dashboardApi } from '../api';",
        "import { dashboardApi } from '../api';\nimport InventoryDashboardPage from '../../inventory/pages/InventoryDashboardPage';"
    );
}

// remove inventoryCards from displayCards logic
content = content.replace(
\      : activeRoleView === 'inventory'
      ? inventoryCards\,
"");

// hide the top 4 cards if inventory
content = content.replace(
\      {/* 4 Top KPI Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>\,
\      {activeRoleView === 'inventory' ? (
        <Box sx={{ mt: -2 }}>
          <InventoryDashboardPage />
        </Box>
      ) : (
      <>
      {/* 4 Top KPI Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>\
);

// close the fragment at the very end
const endTarget = \    </Box>
  );
};\;

content = content.replace(
    endTarget,
\      </>
      )}
    </Box>
  );
};\);

fs.writeFileSync(file, content);
console.log('Patched');
