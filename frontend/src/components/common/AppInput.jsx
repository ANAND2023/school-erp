import React, { forwardRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';

/**
 * Notched Outline AppInput component wrapping PrimeReact input controls
 * 
 * Matches user-specified design:
 * - Floating label centered on top border cutout
 * - Clean compact form styling
 * - Optional right-attached action button (e.g. 'H' or custom icon)
 */
export const AppInput = forwardRef(({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  error,
  helperText,
  required = false,
  disabled = false,
  readOnly = false,
  icon,
  iconPos = 'left',
  addon,
  onAddonClick,
  addonTooltip,
  rows = 3,
  autoResize = true,
  min,
  max,
  step,
  prefix,
  suffix,
  className = '',
  containerClassName = '',
  style,
  id,
  maxLength,
  keyfilter,
  uppercase,
  ...rest
}, ref) => {
  const inputId = id || name || `input-${Math.random().toString(36).substring(2, 9)}`;
  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : null;
  const hasAddon = Boolean(addon || onAddonClick);

  const lowerLabel = (label || '').toLowerCase();
  const lowerName = (name || '').toLowerCase();

  const isNameField = Boolean(uppercase || (lowerLabel.includes('name') && !lowerLabel.includes('username') && !lowerName.includes('username')));
  const isAadhaar = lowerLabel.includes('aadhaar') || lowerLabel.includes('adhaar') || lowerName.includes('aadhaar') || lowerName.includes('adhaar');
  const isMobile = lowerLabel.includes('mobile') || lowerLabel.includes('phone') || lowerLabel.includes('emergency contact') || lowerName.includes('mobile') || lowerName.includes('phone') || lowerName.includes('emergencycontact');
  const isPincode = lowerLabel.includes('pincode') || lowerName.includes('pincode');

  let effectiveMaxLength = maxLength;
  if (isAadhaar) effectiveMaxLength = effectiveMaxLength || 12;
  else if (isMobile) effectiveMaxLength = effectiveMaxLength || 10;
  else if (isPincode) effectiveMaxLength = effectiveMaxLength || 6;

  const isNumericOnly = isAadhaar || isMobile || isPincode;
  const effectiveKeyFilter = keyfilter || (isNumericOnly ? 'num' : undefined);

  const handleTextChange = (e) => {
    if (!onChange) return;
    let rawVal = e.target.value || '';
    if (isNameField) {
      rawVal = rawVal.toUpperCase();
    }

    if (isNumericOnly) {
      const sanitized = rawVal.replace(/\D/g, '').slice(0, effectiveMaxLength);
      const clonedEvent = {
        ...e,
        target: {
          ...e.target,
          name,
          value: sanitized,
        },
      };
      onChange(clonedEvent);
    } else if (effectiveMaxLength) {
      const sliced = rawVal.slice(0, effectiveMaxLength);
      const clonedEvent = {
        ...e,
        target: {
          ...e.target,
          name,
          value: sliced,
        },
      };
      onChange(clonedEvent);
    } else {
      const clonedEvent = isNameField ? {
        ...e,
        target: {
          ...e.target,
          name,
          value: rawVal,
        },
      } : e;
      onChange(clonedEvent);
    }
  };

  const inputClass = `w-full ${className}`;

  const renderInput = () => {
    if (type === 'password') {
      return (
        <Password
          id={inputId}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          toggleMask
          feedback={false}
          inputRef={ref}
          inputClassName={inputClass}
          className="w-full"
          {...rest}
        />
      );
    }

    if (type === 'textarea') {
      return (
        <InputTextarea
          id={inputId}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          rows={rows}
          autoResize={autoResize}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={inputClass}
          ref={ref}
          {...rest}
        />
      );
    }

    if (type === 'number') {
      return (
        <InputNumber
          id={inputId}
          name={name}
          value={value === '' || value === null || value === undefined ? null : Number(value)}
          onValueChange={(e) => {
            if (onChange) {
              onChange({
                target: {
                  name,
                  value: e.value,
                },
              });
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          step={step}
          prefix={prefix}
          suffix={suffix}
          inputRef={ref}
          inputClassName={inputClass}
          className="w-full"
          {...rest}
        />
      );
    }

    return (
      <InputText
        id={inputId}
        ref={ref}
        type={type}
        name={name}
        value={value ?? ''}
        onChange={handleTextChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        maxLength={effectiveMaxLength}
        keyfilter={effectiveKeyFilter}
        inputMode={isNumericOnly ? 'numeric' : undefined}
        className={inputClass}
        style={{ ...(isNameField ? { textTransform: 'uppercase' } : {}), ...style }}
        {...rest}
      />
    );
  };

  return (
    <div className={`app-notched-field ${containerClassName}`} style={style}>
      <div className={`app-notched-control-group ${hasAddon ? 'has-addon' : ''} ${hasError ? 'has-error' : ''}`}>
        {label && (
          <span className="app-notched-label">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        )}

        {icon ? (
          <span className={iconPos === 'right' ? 'p-input-icon-right w-full' : 'p-input-icon-left w-full'}>
            <i className={icon} />
            {renderInput()}
          </span>
        ) : (
          renderInput()
        )}

        {hasAddon && (
          <button
            type="button"
            className="app-addon-btn"
            title={addonTooltip || (typeof addon === 'string' ? addon : 'Action')}
            onClick={onAddonClick}
          >
            {addon || 'H'}
          </button>
        )}
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

AppInput.displayName = 'AppInput';

export default AppInput;
