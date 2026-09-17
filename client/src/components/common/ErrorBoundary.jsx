import React from 'react';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LMS Portal Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
    sessionStorage.clear();
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
              Something went wrong
            </h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              The portal encountered an unexpected display issue. You can reload the application or reset your session.
            </p>
            {this.state.error && (
              <div className="bg-slate-100 rounded-xl p-3 mb-5 text-left overflow-x-auto max-h-32">
                <code className="text-[11px] text-rose-700 font-mono break-all">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-blue-500/20"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign In Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
