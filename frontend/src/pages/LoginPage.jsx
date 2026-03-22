import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveSession } from '../auth';
import api from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [senha,   setSenha]   = useState('');
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { usuario, senha });
      saveSession(res.data.token, res.data.usuario);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0606 0%, #2d0d0d 50%, #3a1010 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>
        {/* Header com logo */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0606 0%, #3a1010 100%)',
          padding: '36px 32px 28px',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: "'Arial Black', Impact, sans-serif",
            fontSize: '2rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: '#fff',
            lineHeight: 1,
          }}>
            MEAL TIME
          </div>
          <div style={{
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            ULTRACONGELADOS
          </div>
          <div style={{
            marginTop: 16,
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.55)',
          }}>
            Sistema de Dietas Personalizadas
          </div>
        </div>

        {/* Formulário */}
        <div style={{ padding: '32px 32px 36px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 24, textAlign: 'center' }}>
            Acesso ao Sistema
          </h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label required">Usuário</label>
              <input
                type="text"
                className="form-control"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Digite seu usuário"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Senha</label>
              <input
                type="password"
                className="form-control"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.78rem', color: '#94a3b8' }}>
            Acesso restrito · Meal Time © 2025
          </div>
        </div>
      </div>
    </div>
  );
}
