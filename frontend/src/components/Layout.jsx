import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { clearSession, getUser } from '../auth';
import { solicitacoesApi } from '../services/api';

export default function Layout() {
  const navigate = useNavigate();
  const usuario = getUser();
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState(0);

  useEffect(() => {
    const fetchContagem = () => {
      solicitacoesApi.contagem()
        .then(res => setSolicitacoesPendentes(res.data.count || 0))
        .catch(() => {});
    };
    fetchContagem();
    const interval = setInterval(fetchContagem, 30000); // atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  function handleLogout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-wrapper">
      <aside className="sidebar">

        {/* ── Logo da marca ── */}
        <div className="sidebar-logo">
          <div className="sidebar-brand-name">MEAL TIME</div>
          <div className="sidebar-brand-sub">ULTRACONGELADOS</div>
          <div className="sidebar-brand-divider" />
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">📊</span>Dashboard
          </NavLink>

          <div className="nav-section">Cadastros</div>
          <NavLink to="/clientes" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">👥</span>Clientes
          </NavLink>
          <NavLink to="/base-alimentar" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">🏭</span>Base Alimentar
          </NavLink>

          <div className="nav-section">Operações</div>
          <NavLink to="/pedidos" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">📋</span>Pedidos
          </NavLink>
          <NavLink to="/aprovacoes" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">✅</span>Aprovações
          </NavLink>
          <NavLink to="/producao" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">⚙️</span>Produção
          </NavLink>

          <div className="nav-section">Portal</div>
          <NavLink to="/solicitacoes" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">📥</span>
            Solicitações
            {solicitacoesPendentes > 0 && (
              <span style={{
                marginLeft: 'auto', background: '#ef4444', color: '#fff',
                borderRadius: 10, fontSize: '0.68rem', fontWeight: 700,
                padding: '1px 7px', minWidth: 18, textAlign: 'center',
              }}>
                {solicitacoesPendentes}
              </span>
            )}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
            👤 {usuario || 'admin'}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '7px 12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            🚪 Sair
          </button>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: 8, textAlign: 'center' }}>
            v1.0 · Meal Time © 2025
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
