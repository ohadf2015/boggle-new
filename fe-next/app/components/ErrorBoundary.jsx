'use client';

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI when LanguageContext is not available
      // Using English as fallback for error messages
      const errorMessages = {
        somethingWentWrong: 'Something went wrong',
        unexpectedError: 'An unexpected error occurred. Please refresh the page.',
        errorDetails: 'Error details',
        refreshPage: 'Refresh Page'
      };

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          backgroundColor: '#1a1a2e',
          color: '#eee'
        }}>
          <div style={{
            maxWidth: '600px',
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: '#16213e',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <h1 style={{
              fontSize: '2rem',
              marginBottom: '1rem',
              color: '#ff6b6b'
            }}>
              {errorMessages.somethingWentWrong}
            </h1>
            <p style={{
              marginBottom: '1.5rem',
              color: '#aaa'
            }}>
              {errorMessages.unexpectedError}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                marginBottom: '1.5rem',
                textAlign: 'left',
                backgroundColor: '#0f1419',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem', color: '#ffa500' }}>
                  {errorMessages.errorDetails}
                </summary>
                <pre style={{
                  overflowX: 'auto',
                  color: '#ff6b6b',
                  margin: 0
                }}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre style={{
                    overflowX: 'auto',
                    color: '#aaa',
                    marginTop: '0.5rem',
                    fontSize: '0.75rem'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: '#4ecdc4',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#45b7d1'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#4ecdc4'}
              aria-label={errorMessages.refreshPage}
            >
              {errorMessages.refreshPage}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
