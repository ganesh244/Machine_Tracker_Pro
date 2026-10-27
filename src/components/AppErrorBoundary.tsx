import React from 'react';

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  declare readonly props: { children: React.ReactNode };
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <section className="max-w-lg rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">This view could not load</h1>
        <p className="mt-3 text-slate-600">Your saved data is still in this browser. Reload to return to the dashboard.</p>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-rose-700 break-words">{this.state.error.message}</p>
        <button className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white" onClick={() => window.location.reload()}>Reload app</button>
      </section>
    </main>;
  }
}
