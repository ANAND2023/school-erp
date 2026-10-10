const fs = require('fs');
const file = 'd:/erp/frontend/src/features/inventory/pages/InventoryDashboardPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = '{/* KPI Cards Row */}';
const targetEnd = '{/* Main Tables Grid: Low Stock Alert Items & Recent Activity Ledger */}';

const startIndex = content.indexOf(targetStr);
const endIndex = content.indexOf(targetEnd);

if (startIndex > -1 && endIndex > -1) {
  const newBlock = "      {/* TOP KPI ROW: Sales & Profit */}\n" +
"      <div className=\"grid mb-4\">\n" +
"        {/* Today's Sales */}\n" +
"        <div className=\"col-12 sm:col-6 lg:col-3\">\n" +
"          <div className=\"surface-card shadow-1 p-3 border-round border-left-3 border-green-500 flex justify-content-between align-items-center h-full\">\n" +
"            <div>\n" +
"              <span className=\"block text-500 font-medium text-xs mb-1 uppercase\">Today's Sales</span>\n" +
"              <div className=\"text-900 font-bold text-2xl text-green-700\">\n" +
"                {loading ? <Skeleton width=\"5rem\" height=\"1.8rem\" /> : formatCurrency(summary?.todaySalesAmount)}\n" +
"              </div>\n" +
"              <span className=\"text-xs text-green-600 font-medium\">Sold Today</span>\n" +
"            </div>\n" +
"            <div className=\"flex align-items-center justify-content-center bg-green-100 border-round\" style={{ width: '42px', height: '42px' }}>\n" +
"              <i className=\"pi pi-indian-rupee text-green-500 text-xl\" />\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"\n" +
"        {/* Today's Profit */}\n" +
"        <div className=\"col-12 sm:col-6 lg:col-3\">\n" +
"          <div className=\"surface-card shadow-1 p-3 border-round border-left-3 border-blue-500 flex justify-content-between align-items-center h-full\">\n" +
"            <div>\n" +
"              <span className=\"block text-500 font-medium text-xs mb-1 uppercase\">Today's Profit</span>\n" +
"              <div className=\"text-900 font-bold text-2xl text-blue-700\">\n" +
"                {loading ? <Skeleton width=\"5rem\" height=\"1.8rem\" /> : formatCurrency(summary?.todayProfit)}\n" +
"              </div>\n" +
"              <span className=\"text-xs text-blue-600 font-medium\">Earned Today</span>\n" +
"            </div>\n" +
"            <div className=\"flex align-items-center justify-content-center bg-blue-100 border-round\" style={{ width: '42px', height: '42px' }}>\n" +
"              <i className=\"pi pi-chart-line text-blue-500 text-xl\" />\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"\n" +
"        {/* Monthly Sales */}\n" +
"        <div className=\"col-12 sm:col-6 lg:col-3\">\n" +
"          <div className=\"surface-card shadow-1 p-3 border-round border-left-3 border-teal-500 flex justify-content-between align-items-center h-full\">\n" +
"            <div>\n" +
"              <span className=\"block text-500 font-medium text-xs mb-1 uppercase\">Monthly Sales</span>\n" +
"              <div className=\"text-900 font-bold text-xl text-teal-700\">\n" +
"                {loading ? <Skeleton width=\"5rem\" height=\"1.8rem\" /> : formatCurrency(summary?.monthlySalesAmount)}\n" +
"              </div>\n" +
"              <span className=\"text-xs text-teal-600 font-medium\">Profit: {formatCurrency(summary?.monthlyProfit)}</span>\n" +
"            </div>\n" +
"            <div className=\"flex align-items-center justify-content-center bg-teal-100 border-round\" style={{ width: '42px', height: '42px' }}>\n" +
"              <i className=\"pi pi-calendar text-teal-500 text-xl\" />\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"\n" +
"        {/* Total Stock Valuation */}\n" +
"        <div className=\"col-12 sm:col-6 lg:col-3\">\n" +
"          <div className=\"surface-card shadow-1 p-3 border-round border-left-3 border-purple-500 flex justify-content-between align-items-center h-full\">\n" +
"            <div>\n" +
"              <span className=\"block text-500 font-medium text-xs mb-1 uppercase\">Total Stock Value</span>\n" +
"              <div className=\"text-900 font-bold text-xl text-purple-700\">\n" +
"                {loading ? <Skeleton width=\"5rem\" height=\"1.8rem\" /> : formatCurrency(summary?.totalStockValue)}\n" +
"              </div>\n" +
"              <span className=\"text-xs text-purple-600 font-medium\">Items: {summary?.totalItems || 0}</span>\n" +
"            </div>\n" +
"            <div className=\"flex align-items-center justify-content-center bg-purple-100 border-round\" style={{ width: '42px', height: '42px' }}>\n" +
"              <i className=\"pi pi-wallet text-purple-500 text-xl\" />\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      {/* Graph and Secondary Stats */}\n" +
"      <div className=\"grid mb-4\">\n" +
"        {/* Sales Graph */}\n" +
"        <div className=\"col-12 lg:col-8\">\n" +
"          <Card title=\"Sales & Profit (Last 7 Days)\" className=\"shadow-1 h-full\">\n" +
"            {loading ? (\n" +
"              <Skeleton width=\"100%\" height=\"300px\" />\n" +
"            ) : (\n" +
"              <Chart type=\"line\" data={chartData} options={chartOptions} style={{ height: '300px' }} />\n" +
"            )}\n" +
"          </Card>\n" +
"        </div>\n" +
"\n" +
"        {/* Secondary Stats */}\n" +
"        <div className=\"col-12 lg:col-4 flex flex-column gap-3\">\n" +
"          {/* Out of Stock */}\n" +
"          <div className=\"surface-card shadow-1 p-3 border-round border-left-3 border-red-500 flex justify-content-between align-items-center\">\n" +
"            <div>\n" +
"              <span className=\"block text-500 font-medium text-xs mb-1 uppercase\">Out of Stock</span>\n" +
"              <div className=\"text-900 font-bold text-2xl text-red-600\">\n" +
"                {loading ? <Skeleton width=\"3rem\" height=\"1.8rem\" /> : summary?.outOfStockItems || 0}\n" +
"              </div>\n" +
"              <span className=\"text-xs text-red-500 font-medium\">Quantity is 0</span>\n" +
"            </div>\n" +
"            <div className=\"flex align-items-center justify-content-center bg-red-100 border-round\" style={{ width: '42px', height: '42px' }}>\n" +
"              <i className=\"pi pi-times-circle text-red-500 text-xl\" />\n" +
"            </div>\n" +
"          </div>\n" +
"\n" +
"          {/* Low Stock Alerts */}\n" +
"          <div className=\"surface-card shadow-1 p-3 border-round border-left-3 border-orange-500 flex justify-content-between align-items-center\">\n" +
"            <div>\n" +
"              <span className=\"block text-500 font-medium text-xs mb-1 uppercase\">Low Stock Alerts</span>\n" +
"              <div className=\"text-900 font-bold text-2xl text-orange-600\">\n" +
"                {loading ? <Skeleton width=\"3rem\" height=\"1.8rem\" /> : summary?.lowStockItems || 0}\n" +
"              </div>\n" +
"              <span className=\"text-xs text-orange-500 font-medium\">Needs Reordering</span>\n" +
"            </div>\n" +
"            <div className=\"flex align-items-center justify-content-center bg-orange-100 border-round\" style={{ width: '42px', height: '42px' }}>\n" +
"              <i className=\"pi pi-exclamation-triangle text-orange-500 text-xl\" />\n" +
"            </div>\n" +
"          </div>\n" +
"          \n" +
"          {/* Quick Links */}\n" +
"          <div className=\"surface-card shadow-1 p-3 border-round flex flex-column gap-2\">\n" +
"            <span className=\"block text-500 font-semibold text-xs mb-1 uppercase\">Quick Actions</span>\n" +
"            <Button label=\"View Issues/Sales\" icon=\"pi pi-arrow-right\" className=\"p-button-outlined p-button-sm p-button-info\" onClick={() => navigate('/inventory/issues')} />\n" +
"            <Button label=\"View Purchases\" icon=\"pi pi-arrow-right\" className=\"p-button-outlined p-button-sm p-button-secondary\" onClick={() => navigate('/inventory/purchases')} />\n" +
"          </div>\n" +
"        </div>\n" +
"      </div>\n\n      ";
  
  content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
  fs.writeFileSync(file, content);
  console.log('Replaced');
} else {
  console.log('Not found');
}
