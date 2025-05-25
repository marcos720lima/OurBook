import React, { useState, useEffect } from 'react';
import api from '../api';
import './ResetForm.css';

function ResetForm() {
  const [token, setToken] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tokenValido, setTokenValido] = useState(false);
  const [resetConcluido, setResetConcluido] = useState(false);
  
  useEffect(() => {
    // Extrair token da URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      verificarToken(tokenParam);
    } else {
      setError('Token não fornecido na URL');
    }
  }, []);
  
  const verificarToken = async (tokenValue) => {
    setLoading(true);
    try {
      const response = await api.get(`/reset-senha/verificar/${tokenValue}`);
      if (response.data.valido) {
        setTokenValido(true);
        setMessage(`Redefinindo senha para: ${response.data.usuario.email}`);
      } else {
        setError('Token inválido ou expirado');
      }
    } catch (err) {
      setError(err.response?.data?.erro || 'Erro ao verificar token');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (novaSenha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await api.post(`/reset-senha/redefinir/${token}`, { novaSenha });
      setResetConcluido(true);
    } catch (err) {
      setError(err.response?.data?.erro || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !tokenValido) {
    return <div className="loading">Verificando token...</div>;
  }
  
  if (error && !tokenValido) {
    return (
      <div className="error-container">
        <h2>Erro</h2>
        <p>{error}</p>
        <p>Este link pode ter expirado ou ser inválido.</p>
      </div>
    );
  }
  
  if (resetConcluido) {
    return (
      <div className="success-container">
        <h2>Senha Redefinida!</h2>
        <p>Sua senha foi alterada com sucesso.</p>
        <p>Agora você pode fazer login no aplicativo Our Book com sua nova senha.</p>
        <a href="ourbook://login" className="app-link">Abrir o App</a>
      </div>
    );
  }
  
  return (
    <div className="reset-container">
      <h2>Redefinir Senha</h2>
      {message && <p className="message">{message}</p>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nova Senha</label>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
            minLength="6"
          />
        </div>
        
        <div className="form-group">
          <label>Confirmar Senha</label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
            minLength="6"
          />
        </div>
        
        {error && <p className="error">{error}</p>}
        
        <button 
          type="submit" 
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Processando...' : 'Redefinir Senha'}
        </button>
      </form>
    </div>
  );
}

export default ResetForm;