import React, { useState } from 'react';
import App from './App';
import { isLocalDemo } from './lib/demo';
import { OperationsWorkspace } from './components/operations/OperationsWorkspace';

export default function WorkspaceApp() {
  const [tools, setTools] = useState(() => new URLSearchParams(window.location.search).get('view') === 'tools');
  if (!isLocalDemo) return <App />;
  if (!tools) return <OperationsWorkspace onOpenTools={() => { window.history.pushState({}, '', '/?view=tools'); setTools(true); }} />;
  return <><div className="bg-emerald-900 text-white px-5 py-3 text-sm"><button onClick={() => { window.history.pushState({}, '', '/'); setTools(false); }}>← Back to field operations</button></div><App /></>;
}
