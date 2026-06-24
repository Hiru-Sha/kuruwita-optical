/* eslint-disable */
// ============================================================
//  ErrorBoundary.js — Catches JS errors in any child page
//  so the whole app doesn't crash to a blank white screen.
//  Usage in App.js: wrap each route's element with <ErrorBoundary>
// ============================================================
import React from 'react';

const navy = '#0f1f3d';
const gold  = '#c9a84c';
const muted = '#6b7280';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console — could send to a logging service here
    console.error('[ErrorBoundary] Page crash:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 40, minHeight: 300,
        fontFamily: "'DM Sans', sans-serif", textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: navy, fontFamily: "'Playfair Display', serif", margin: '0 0 8px' }}>
          This page ran into a problem
        </h2>
        <p style={{ color: muted, fontSize: 14, maxWidth: 360, margin: '0 0 24px', lineHeight: 1.6 }}>
          Don't worry — your data is safe. Try refreshing, or go back to the dashboard.
          {this.state.error?.message && (
            <span style={{ display: 'block', marginTop: 8, fontFamily: 'monospace', fontSize: 12, background: '#f9f6f2', padding: '6px 10px', borderRadius: 6, color: '#374151' }}>
              {this.state.error.message}
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 20px', background: 'white', color: navy,
              border: `1.5px solid ${navy}`, borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Try again
          </button>
          <button
            onClick={() => { window.location.href = '/dashboard'; }}
            style={{
              padding: '10px 20px', background: navy, color: gold,
              border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
}