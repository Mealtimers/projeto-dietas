import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './auth';
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

// Guarda de rota — redireciona para /login se não autenticado
function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<LoginPage />} />

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
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
