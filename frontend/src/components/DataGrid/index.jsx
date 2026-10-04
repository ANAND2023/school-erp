import React from 'react';
import { AppTable } from '../common/AppTable';

/**
 * DataGrid wrapper powered by PrimeReact AppTable.
 * Maintains full backward compatibility with existing MUI DataGrid prop signatures.
 */
export const DataGrid = ({
  title,
  menuKey,
  columns = [],
  rows = [],
  rowCount,
  loading = false,
  paginationModel,
  onPaginationModelChange,
  onAddClick,
  onExportClick,
  addLabel = 'Add New',
  extraHeaderActions,
  ...rest
}) => {
  return (
    <AppTable
      title={title}
      menuKey={menuKey}
      columns={columns}
      data={rows}
      loading={loading}
      onAddClick={onAddClick}
      onExportClick={onExportClick}
      addLabel={addLabel}
      extraHeaderActions={extraHeaderActions}
      rowCount={rowCount}
      paginationModel={paginationModel}
      onPaginationModelChange={onPaginationModelChange}
      {...rest}
    />
  );
};

export default DataGrid;
