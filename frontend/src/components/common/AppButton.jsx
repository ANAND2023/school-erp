import React from 'react';
import { Button as PrimeButton } from 'primereact/button';

/**
 * Common Button component wrapping PrimeReact Button
 * 
 * @param {Object} props
 * @param {string} [props.label] - Text label of button
 * @param {string} [props.icon] - PrimeIcons class, e.g. 'pi pi-check' or 'pi pi-plus'
 * @param {'left'|'right'|'top'|'bottom'} [props.iconPos='left'] - Icon position
 * @param {'primary'|'secondary'|'success'|'info'|'warning'|'help'|'danger'} [props.severity] - Visual severity
 * @param {'outlined'|'text'|'contained'} [props.variant='contained'] - Button style variant
 * @param {boolean} [props.outlined=false] - Outlined style
 * @param {boolean} [props.text=false] - Text only style
 * @param {boolean} [props.rounded=false] - Rounded pill style
 * @param {boolean} [props.raised=false] - Raised shadow style
 * @param {'small'|'normal'|'large'} [props.size='small'] - Size of button
 * @param {boolean} [props.loading=false] - Show loading spinner
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {'button'|'submit'|'reset'} [props.type='button'] - HTML button type
 * @param {string} [props.tooltip] - Tooltip text
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Extra CSS classes
 * @param {React.ReactNode} [props.children] - Children elements
 */
export const AppButton = ({
  label,
  icon,
  iconPos = 'left',
  severity,
  variant = 'contained',
  outlined = false,
  text = false,
  rounded = false,
  raised = false,
  size = 'small',
  loading = false,
  disabled = false,
  type = 'button',
  tooltip,
  tooltipOptions,
  onClick,
  className = '',
  children,
  style,
  ...rest
}) => {
  const isOutlined = outlined || variant === 'outlined';
  const isText = text || variant === 'text';

  const primeSize = size === 'small' ? 'small' : size === 'large' ? 'large' : undefined;

  return (
    <PrimeButton
      label={label || (typeof children === 'string' ? children : undefined)}
      icon={icon}
      iconPos={iconPos}
      severity={severity}
      outlined={isOutlined}
      text={isText}
      rounded={rounded}
      raised={raised}
      size={primeSize}
      loading={loading}
      disabled={disabled || loading}
      type={type}
      tooltip={tooltip}
      tooltipOptions={tooltipOptions || { position: 'top' }}
      onClick={onClick}
      className={`app-button ${className}`}
      style={style}
      {...rest}
    >
      {typeof children !== 'string' ? children : null}
    </PrimeButton>
  );
};

export default AppButton;
