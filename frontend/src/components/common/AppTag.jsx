import React from 'react';
import { Tag } from 'primereact/tag';

/**
 * Common AppTag component wrapping PrimeReact Tag
 */
export const AppTag = ({
  value,
  severity = 'info',
  rounded = false,
  icon,
  className = '',
  style,
  ...rest
}) => {
  return (
    <Tag
      value={value}
      severity={severity}
      rounded={rounded}
      icon={icon}
      className={`app-tag text-xs font-semibold px-2 py-1 ${className}`}
      style={style}
      {...rest}
    />
  );
};

export default AppTag;
