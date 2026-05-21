// src/components/layout/NavBar.tsx
// Top navigation bar — highlights the active route via NavLink.
// Add new pages to NAV_ITEMS; no other changes needed.

import { CSSProperties, FC } from 'react';
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
    description: 'Design Master Batch Records',
  },
  {
    to: '/orders',
    label: 'Process Orders',
    icon: '◈',
    description: 'Create and manage production orders',
  },
  {
    to: '/execution',
    label: 'EBR Execution',
    icon: '▶',
    description: 'Execute process orders step by step',
  },
];

const NavBar: FC = () => {
  const baseStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '0 16px',
    height: '100%',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
    color: '#475569',
    whiteSpace: 'nowrap',
    fontFamily: "'IBM Plex Mono', monospace",
  };

  const activeStyle: CSSProperties = {
    color: '#e2e8f0',
    borderBottomColor: '#3b82f6',
  };

  return (
    <header style={{
      height: 52,
      background: '#0f172a',
      borderBottom: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'stretch',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 20px', marginRight: 4,
        borderRight: '1px solid #1e293b', flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, color: '#3b82f6' }}>◈</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0',
            letterSpacing: '0.1em', fontFamily: "'IBM Plex Mono', monospace" }}>
            BIM
          </div>
          <div style={{ fontSize: 8, color: '#334155', letterSpacing: '0.14em',
            textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }}>
            MES Platform
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.description}
            style={({ isActive }) => ({
              ...baseStyle,
              ...(isActive ? activeStyle : {}),
            })}
          >
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Right side status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 18px', borderLeft: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, color: '#334155',
          fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%',
            background: '#10b981', display: 'inline-block',
            boxShadow: '0 0 6px #10b98188' }} />
          API Connected
        </div>
      </div>
    </header>
  );
};

export default NavBar;
