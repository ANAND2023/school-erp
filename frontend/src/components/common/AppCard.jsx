import React from 'react';
import { Card } from 'primereact/card';

/**
 * Common AppCard component wrapping PrimeReact Card
 */
export const AppCard = ({
  title,
  subTitle,
  header,
  footer,
  actions,
  children,
  className = '',
  style,
  ...rest
}) => {
  const cardTitle = (title || actions) ? (
    <div className="flex align-items-center justify-content-between mb-2">
      <div>
        {title && <span className="text-lg font-bold text-800">{title}</span>}
        {subTitle && <div className="text-sm text-500 mt-1">{subTitle}</div>}
      </div>
      {actions && <div className="flex gap-2 align-items-center">{actions}</div>}
    </div>
  ) : null;

  return (
    <Card
      title={cardTitle}
      header={header}
      footer={footer}
      className={`shadow-1 border-round-lg mb-3 ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </Card>
  );
};

export default AppCard;
