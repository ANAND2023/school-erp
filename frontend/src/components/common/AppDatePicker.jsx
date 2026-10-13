import React, { forwardRef } from 'react';
import { Calendar } from 'primereact/calendar';

/**
 * Notched Outline AppDatePicker component wrapping PrimeReact Calendar
 * 
 * Matches User Specification (Image 2):
 * - Date display format: 'dd/M/yy' (e.g. 30/Nov/2027 or 15/May/2020)
 * - Solid theme-colored right calendar button attached seamlessly to the input
 * - Header with '<  Month Year  >' navigation
 * - No bottom Clear/Today footer bar
 * - Perfectly circular filled selected day badge in theme primary color
 * - Compact ERP height (30px)
 */
export const AppDatePicker = forwardRef(({
  label,
  name,
  value,
  onChange,
  dateFormat = 'dd/M/yy',
  placeholder = 'dd/M/yy',
  showIcon = true,
  iconDisplay = 'button',
  showButtonBar = false, // Set to false to match Image 2
  view = 'date',
  selectionMode = 'single',
  minDate,
  maxDate,
  disabled = false,
  readOnly = false,
  error,
  helperText,
  required = false,
  className = '',
  containerClassName = '',
  style,
  id,
  ...rest
}, ref) => {
  const dateId = id || name || `date-${Math.random().toString(36).substring(2, 9)}`;
  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : null;

  // Safe timezone-independent parse for YYYY-MM-DD or standard date strings
  let parsedValue = value;
  if (typeof value === 'string' && value.trim()) {
    const parts = value.trim().split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      parsedValue = new Date(year, month, day);
    } else {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        parsedValue = d;
      }
    }
  }

  const handleChange = (e) => {
    if (!onChange) return;
    onChange({
      target: {
        name,
        value: e.value,
      },
      value: e.value,
      originalEvent: e.originalEvent,
    });
  };

  return (
    <div className={`app-notched-field ${containerClassName}`} style={style}>
      <div className={`app-notched-control-group ${hasError ? 'has-error' : ''}`}>
        {label && (
          <span className="app-notched-label">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        )}

        <Calendar
          id={dateId}
          name={name}
          ref={ref}
          value={parsedValue}
          onChange={handleChange}
          dateFormat={dateFormat}
          placeholder={placeholder}
          showIcon={showIcon}
          iconDisplay="button"
          icon="pi pi-calendar"
          showButtonBar={showButtonBar}
          view={view}
          selectionMode={selectionMode}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          readOnlyInput={readOnly}
          appendTo={rest.appendTo || (typeof document !== 'undefined' ? document.body : undefined)}
          panelClassName={`app-datepicker-panel ${rest.panelClassName || ''}`.trim()}
          panelStyle={{
            zIndex: 99999,
            ...rest.panelStyle,
          }}
          className={`w-full ${className}`}
          prevIcon="pi pi-chevron-left"
          nextIcon="pi pi-chevron-right"
          {...rest}
        />
      </div>

      {hasError && errorMessage && (
        <small className="p-error text-xs mt-1 block">
          {errorMessage}
        </small>
      )}

      {!hasError && helperText && (
        <small className="text-500 text-xs mt-1 block">
          {helperText}
        </small>
      )}
    </div>
  );
});

AppDatePicker.displayName = 'AppDatePicker';

export default AppDatePicker;
