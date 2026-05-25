// src/App.tsx
// Central route table — the single source of truth for all pages.
// To add a new page: import it and add one <Route> line here.

import { FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell              from './components/layout/AppShell';
import WorkflowDesignerPage  from './pages/WorkflowDesignerPage';
import ProcessOrderPage      from './pages/ProcessOrderPage';
import WorkflowExecutionPage from './pages/WorkflowExecutionPage';
import MasterDataPage        from './pages/MasterDataPage';

const App: FC = () => (
  <Routes>
    {/* Default redirect */}
    <Route path="/" element={<Navigate to="/designer" replace />} />

    {/* All pages share the AppShell (NavBar + main area via <Outlet />) */}
    <Route element={<AppShell />}>
      {/* Supervisor: design MBRs */}
      <Route path="/designer"                  element={<WorkflowDesignerPage />} />

      {/* Supervisor / Operator: master data */}
      <Route path="/master-data"               element={<MasterDataPage />} />

      {/* Supervisor: manage process orders */}
      <Route path="/orders"                    element={<ProcessOrderPage />} />

      {/* Operator: execute a process order step by step */}
      <Route path="/execution"                 element={<WorkflowExecutionPage />} />
      <Route path="/execution/:processOrderId" element={<WorkflowExecutionPage />} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/designer" replace />} />
  </Routes>
);

export default App;
