import React, { forwardRef, useMemo } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';

/**
 * Notched Outline AppSelect component wrapping PrimeReact Dropdown / MultiSelect
 * 
 * Matches user-specified design:
 * - Floating label centered on top border cutout
 * - Clear icon 'X' support
 * - Chevron dropdown arrow
 * - Optional right-attached action button (e.g. 'H' or custom icon)
 */
export const AppSelect = forwardRef(({
  label,
  name,
  value,
  onChange,
  options = [],
  optionLabel,
  optionValue,
  placeholder = 'Select',
  filter = true,
  filterPlaceholder = 'Search...',
  showClear = true,
  error,
  helperText,
  required = false,
  disabled = false,
  loading = false,
  isMulti = false,
  addon,
  onAddonClick,
  addonTooltip,
  className = '',
  containerClassName = '',
  style,
  id,
  itemTemplate,
  valueTemplate,
  ...rest
}, ref) => {
  const selectId = id || name || `select-${Math.random().toString(36).substring(2, 9)}`;
  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : null;
  const hasAddon = Boolean(addon || onAddonClick);

  // Auto-detect optionLabel & optionValue if not specified
  const { resolvedOptionLabel, resolvedOptionValue, normalizedOptions } = useMemo(() => {
    if (!options || !Array.isArray(options) || options.length === 0) {
      return { resolvedOptionLabel: 'label', resolvedOptionValue: 'value', normalizedOptions: [] };
    }

    const firstItem = options[0];

    // If options are simple primitives
    if (typeof firstItem !== 'object' || firstItem === null) {
      return {
        resolvedOptionLabel: undefined,
        resolvedOptionValue: undefined,
        normalizedOptions: options,
      };
    }

    // If custom props supplied
    if (optionLabel && optionValue) {
      return {
        resolvedOptionLabel: optionLabel,
        resolvedOptionValue: optionValue,
        normalizedOptions: options,
      };
    }

    const detectedLabel = optionLabel || ('name' in firstItem ? 'name' : 'label' in firstItem ? 'label' : 'title' in firstItem ? 'title' : Object.keys(firstItem)[1] || Object.keys(firstItem)[0]);
    const detectedValue = optionValue || ('id' in firstItem ? 'id' : 'value' in firstItem ? 'value' : 'code' in firstItem ? 'code' : Object.keys(firstItem)[0]);

    return {
      resolvedOptionLabel: detectedLabel,
      resolvedOptionValue: detectedValue,
      normalizedOptions: options,
    };
  }, [options, optionLabel, optionValue]);

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

  const commonProps = {
    id: selectId,
    name,
    value: value ?? (isMulti ? [] : null),
    options: normalizedOptions,
    optionLabel: resolvedOptionLabel,
    optionValue: resolvedOptionValue,
    placeholder,
    filter,
    filterPlaceholder,
    showClear,
    disabled: disabled || loading,
    className: `w-full ${className}`,
    onChange: handleChange,
    itemTemplate,
    dropdownIcon: 'pi pi-chevron-down',
    appendTo: rest.appendTo || (typeof document !== 'undefined' ? document.body : undefined),
    panelClassName: `app-select-panel ${rest.panelClassName || ''}`.trim(),
    panelStyle: {
      zIndex: 99999,
      ...rest.panelStyle,
    },
    ...rest,
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

        {isMulti ? (
          <MultiSelect
            ref={ref}
            display="chip"
            selectedItemsLabel="{0} items selected"
            maxSelectedLabels={2}
            {...commonProps}
          />
        ) : (
          <Dropdown
            ref={ref}
            loading={loading}
            valueTemplate={valueTemplate}
            {...commonProps}
          />
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

AppSelect.displayName = 'AppSelect';

export default AppSelect;
