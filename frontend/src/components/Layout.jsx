import { Outlet, NavLink } from 'react-router-dom';

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
  return (
    <div className="app-wrapper">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>🥦</span>
          <div>
            <div style={{ fontSize: '0.95rem' }}>Meal Time</div>
            <div style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 400 }}>Sistema de Dietas</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item, idx) => {
            if (item.section) return <div key={idx} className="nav-section">{item.section}</div>;
            return (
              <NavLink key={item.to} to={item.to} end={item.exact}
                className={({ isActive }) => isActive ? 'active' : ''}>
                <span>{item.icon}</span>{item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
