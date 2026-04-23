import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { isAuthenticated } from './auth';
import { ToastProvider, useToast, setGlobalToast } from './components/Toast';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ClientesPage from './pages/clientes/ClientesPage';
import ClienteFormPage from './pages/clientes/ClienteFormPage';
import ClienteDetalhePage from './pages/clientes/ClienteDetalhePage';
import BaseAlimentarPage from './pages/base/BaseAlimentarPage';
import PedidosPage from './pages/pedidos/PedidosPage';
import PedidoFormPage from './pages/pedidos/PedidoFormPage';
import PedidoDetalhePage from './pages/pedidos/PedidoDetalhePage';
import AprovacoesPage from './pages/AprovacoesPage';
import ProducaoPage from './pages/ProducaoPage';
import ProducaoDetalhePage from './pages/ProducaoDetalhePage';
import PortalPage from './pages/portal/PortalPage';
import SolicitacoesPage from './pages/solicitacoes/SolicitacoesPage';
import SolicitacaoDetalhePage from './pages/solicitacoes/SolicitacaoDetalhePage';

// Guarda de rota — redireciona para /login se não autenticado
function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

// Conecta o toast global e escuta expiração de sessão
function AppShell({ children }) {
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    setGlobalToast(toast);
  }, [toast]);

  useEffect(() => {
    const handleExpired = () => {
      toast.warning('Sessão expirada. Faça login novamente.');
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [navigate, toast]);

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/portal" element={<PortalPage />} />

            {/* Rotas protegidas */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="clientes" element={<ClientesPage />} />
              <Route path="clientes/novo" element={<ClienteFormPage />} />
              <Route path="clientes/:id" element={<ClienteDetalhePage />} />
              <Route path="clientes/:id/editar" element={<ClienteFormPage />} />
              <Route path="base-alimentar" element={<BaseAlimentarPage />} />
              <Route path="pedidos" element={<PedidosPage />} />
              <Route path="pedidos/novo" element={<PedidoFormPage />} />
              <Route path="pedidos/:id/editar" element={<PedidoFormPage />} />
              <Route path="pedidos/:id" element={<PedidoDetalhePage />} />
              <Route path="aprovacoes" element={<AprovacoesPage />} />
              <Route path="producao" element={<ProducaoPage />} />
              <Route path="producao/:id" element={<ProducaoDetalhePage />} />
              <Route path="solicitacoes" element={<SolicitacoesPage />} />
              <Route path="solicitacoes/:id" element={<SolicitacaoDetalhePage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </AppShell>
      </ToastProvider>
    </BrowserRouter>
  );
}
