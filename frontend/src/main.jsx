import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("UI Render Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#fff', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#ef4444' }}>⚠️ VAIDYcare-AI Runtime Error</h2>
          <pre style={{ background: '#1e293b', padding: '1rem', borderRadius: '0.75rem', overflowX: 'auto', marginTop: '1rem' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            Clear Session & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);