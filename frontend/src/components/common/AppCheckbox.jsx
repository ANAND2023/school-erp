import React from 'react';
import { Checkbox } from 'primereact/checkbox';

/**
 * Common AppCheckbox component wrapping PrimeReact Checkbox
 */
export const AppCheckbox = ({
  label,
  name,
  checked = false,
  onChange,
  disabled = false,
  binary = true,
  required = false,
  className = '',
  containerClassName = '',
  id,
  tooltip,
  ...rest
}) => {
  const checkboxId = id || name || `checkbox-${Math.random().toString(36).substring(2, 9)}`;

  const handleChange = (e) => {
    if (!onChange) return;
    onChange({
      target: {
        name,
        checked: e.checked,
      },
      checked: e.checked,
      originalEvent: e.originalEvent,
    });
  };

  return (
    <div className={`flex align-items-center gap-2 ${containerClassName}`}>
      <Checkbox
        inputId={checkboxId}
        name={name}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        binary={binary}
        className={className}
        tooltip={tooltip}
        {...rest}
      />
      {label && (
        <label
          htmlFor={checkboxId}
          className={`text-sm cursor-pointer select-none ${disabled ? 'text-400' : 'text-700'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
    </div>
  );
};

export default AppCheckbox;
