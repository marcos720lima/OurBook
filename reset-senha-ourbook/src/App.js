import React from 'react';
import './App.css';
import ResetForm from './components/ResetForm';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src="/logo.png" className="App-logo" alt="logo" />
        <h1>Our Book</h1>
      </header>
      <main>
        <ResetForm />
      </main>
      <footer>
        <p>&copy; 2025 Our Book. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default App;