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
    const interval = setInterval(fetchContagem, 30000);
    return () => clearInterval(interval);
  }, []);

  function handleLogout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-wrapper">

      {/* ── Sidebar (desktop) ── */}
      <aside className="sidebar">
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
              <span className="sidebar-badge">
                {solicitacoesPendentes}
              </span>
            )}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">👤 {usuario || 'admin'}</div>
          <button onClick={handleLogout} className="sidebar-logout-btn">
            🚪 Sair
          </button>
          <div className="sidebar-version">v1.0 · Meal Time © 2025</div>
        </div>
      </aside>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="bottom-nav-icon">📊</span>
          <span className="bottom-nav-label">Dashboard</span>
        </NavLink>
        <NavLink to="/clientes" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="bottom-nav-icon">👥</span>
          <span className="bottom-nav-label">Clientes</span>
        </NavLink>
        <NavLink to="/pedidos" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="bottom-nav-icon">📋</span>
          <span className="bottom-nav-label">Pedidos</span>
        </NavLink>
        <NavLink to="/producao" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="bottom-nav-icon">⚙️</span>
          <span className="bottom-nav-label">Produção</span>
        </NavLink>
        <NavLink to="/solicitacoes" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
          <span className="bottom-nav-icon" style={{ position: 'relative', display: 'inline-block' }}>
            📥
            {solicitacoesPendentes > 0 && (
              <span className="bottom-nav-badge">{solicitacoesPendentes}</span>
            )}
          </span>
          <span className="bottom-nav-label">Solicitações</span>
        </NavLink>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
