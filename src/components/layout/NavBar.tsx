// src/components/layout/NavBar.tsx
// Top navigation bar — highlights the active route automatically via NavLink.

import { FC } from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/designer',
    label: 'MBR Designer',
    icon: '⬡',
    description: 'Design workflows / MBRs',
  },
  {
    to: '/execution',
    label: 'EBR Execution',
    icon: '▶',
    description: 'Execute production orders',
  },
];

const NavBar: FC = () => {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 18px',
    height: '100%',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textDecoration: 'none',
    borderBottom: '3px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
    color: '#475569',
    whiteSpace: 'nowrap',
  };

  const active: React.CSSProperties = {
    color: '#e2e8f0',
    borderBottomColor: '#3b82f6',
  };

  return (
    <header
      style={{
        height: 56,
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        paddingLeft: 4,
        paddingRight: 16,
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 20px 0 16px',
          marginRight: 8,
          borderRight: '1px solid #1e293b',
        }}
      >
        <span style={{ fontSize: 20, color: '#3b82f6' }}>◈</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.08em' }}>
            BIM
          </div>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            MES Platform
          </div>
        </div>
      </div>

      {/* Route links */}
      <nav style={{ display: 'flex', alignItems: 'stretch', height: '100%', gap: 2 }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.description}
            style={({ isActive }) => ({ ...base, ...(isActive ? active : {}) })}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Right side status area */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#334155' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          API Connected
        </div>
      </div>
    </header>
  );
};

export default NavBar;
