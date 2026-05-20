// src/App.tsx
// Central route table.  All pages are mounted under the shared AppShell layout.
// Add new routes here; never scatter <Route> declarations across the tree.

import { FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import WorkflowDesignerPage from './pages/WorkflowDesignerPage';
import WorkflowExecutionPage from './pages/WorkflowExecutionPage';

const App: FC = () => (
  <Routes>
    {/* Default redirect */}
    <Route path="/" element={<Navigate to="/designer" replace />} />

    {/* All authenticated pages share the AppShell (nav + main area) */}
    <Route element={<AppShell />}>
      <Route path="/designer"                  element={<WorkflowDesignerPage />} />
      <Route path="/execution"                 element={<WorkflowExecutionPage />} />
      <Route path="/execution/:workflowId"     element={<WorkflowExecutionPage />} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/designer" replace />} />
  </Routes>
);

export default App;
