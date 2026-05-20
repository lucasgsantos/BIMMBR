// src/components/layout/AppShell.tsx
// Shared shell that wraps every page with the NavBar and a scrollable main area.
// Pages are rendered via <Outlet />.

import { FC } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';

const AppShell: FC = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0a0f1c',
      color: '#e2e8f0',
      fontFamily: "'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace",
      overflow: 'hidden',
    }}
  >
    <NavBar />
    <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Outlet />
    </main>
  </div>
);

export default AppShell;
