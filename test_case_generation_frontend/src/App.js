import React from 'react';
import './App.css';
import LoginPage from './pages/LoginPage';

// PUBLIC_INTERFACE
function App() {
  /** Root app entry: currently renders the LoginPage UI scaffold. */
  return (
    <div className="App">
      <LoginPage />
    </div>
  );
}

export default App;
