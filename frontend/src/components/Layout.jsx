import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../auth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', exact: true },
  { section: 'Cadastros' },
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/base-alimentar', label: 'Base Alimentar', icon: '🏭' },
  { section: 'Operações' },
  { to: '/pedidos', label: 'Pedidos', icon: '📋' },
  { to: '/aprovacoes', label: 'Aprovações', icon: '✅' },
  { to: '/producao', label: 'Produção', icon: '⚙️' },
];

export default function Layout() {
  const navigate = useNavigate();
  const usuario = getUser();

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
          {navItems.map((item, idx) => {
            if (item.section) return <div key={idx} className="nav-section">{item.section}</div>;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
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
