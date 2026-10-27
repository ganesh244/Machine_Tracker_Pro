import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import WorkspaceApp from './WorkspaceApp';
import './index.css';
import { AppErrorBoundary } from './components/AppErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><WorkspaceApp /></AppErrorBoundary>
  </StrictMode>,
);
