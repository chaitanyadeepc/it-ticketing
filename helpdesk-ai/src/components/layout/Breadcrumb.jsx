import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const routeLabels = {
  'chatbot': 'Raise Ticket',
  'raise-ticket': 'Raise Ticket',
  'my-tickets': 'My Tickets',
  'admin': 'Admin Dashboard',
  'profile': 'Profile',
  'settings': 'Settings',
};

const Breadcrumb = ({ items }) => {
  const location = useLocation();

  // Auto-generate from URL if no items provided
  const crumbs = items ?? (() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const result = [{ label: 'Home', path: '/' }];
    segments.forEach((seg) => {
      result.push({ label: routeLabels[seg] ?? seg, path: null });
    });
    return result;
  })();

  return (
    <nav className="flex items-center gap-2 text-[12px] font-mono text-[#52525b] mb-3">
      {crumbs.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-[#3f3f46]">›</span>}
          {item.path && index < crumbs.length - 1 ? (
            <Link to={item.path} className="hover:text-[#a1a1aa] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className={index === crumbs.length - 1 ? 'text-[#a1a1aa]' : ''}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
