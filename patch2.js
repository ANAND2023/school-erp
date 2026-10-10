const fs = require('fs');
const file = 'd:/erp/frontend/src/features/dashboard/pages/DashboardPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = \  const displayCards =
    activeRoleView === 'accounts'
      ? accountsCards
      : activeRoleView === 'teacher'
      ? teacherCards
      : activeRoleView === 'admissions'
      ? admissionsCards
      : coreCards;\;

const newCards = \
  // 5. Inventory Role Cards
  const inventoryCards = [
    {
      title: 'Total Stock Value',
      value: \\\? \\\\\\,
      subtitle: \\\Overall Inventory Valuation\\\,
      icon: <InventoryIcon sx={{ fontSize: 34, color: '#3B82F6' }} />,
      color: '#eff6ff',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Low Stock Alerts',
      value: \\\12\\\,
      subtitle: \\\Items need reordering\\\,
      icon: <PendingIcon sx={{ fontSize: 34, color: '#F59E0B' }} />,
      color: '#fffbeb',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Purchases This Month',
      value: \\\24\\\,
      subtitle: \\\Inward GRN receipts\\\,
      icon: <ReceiptLongIcon sx={{ fontSize: 34, color: '#10B981' }} />,
      color: '#ecfdf5',
      onClick: () => navigate('/inventory/purchases'),
    },
    {
      title: 'Issues This Month',
      value: \\\85\\\,
      subtitle: \\\Outward stock issues\\\,
      icon: <TrendingUpIcon sx={{ fontSize: 34, color: '#8B5CF6' }} />,
      color: '#f5f3ff',
      onClick: () => navigate('/inventory/issues'),
    },
  ];

  const displayCards =
    activeRoleView === 'accounts'
      ? accountsCards
      : activeRoleView === 'teacher'
      ? teacherCards
      : activeRoleView === 'admissions'
      ? admissionsCards
      : activeRoleView === 'inventory'
      ? inventoryCards
      : coreCards;
\;

if (content.includes("const displayCards =")) {
    content = content.replace(targetStr, newCards);
}

// Now replace ToggleButtonGroup
const btnTarget = \<ToggleButton value="admissions">
              ?? Admissions & Leads
            </ToggleButton>\;
const newBtn = \<ToggleButton value="admissions">
              ?? Admissions & Leads
            </ToggleButton>
            <ToggleButton value="inventory">
              ?? Inventory & Stock
            </ToggleButton>\;

if (content.includes(btnTarget)) {
    content = content.replace(btnTarget, newBtn);
}

fs.writeFileSync(file, content);
console.log('Replaced');
