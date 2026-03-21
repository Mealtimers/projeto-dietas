import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="clientes/novo" element={<ClienteFormPage />} />
          <Route path="clientes/:id" element={<ClienteDetalhePage />} />
          <Route path="clientes/:id/editar" element={<ClienteFormPage />} />
          <Route path="base-alimentar" element={<BaseAlimentarPage />} />
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="pedidos/novo" element={<PedidoFormPage />} />
          <Route path="pedidos/:id" element={<PedidoDetalhePage />} />
          <Route path="aprovacoes" element={<AprovacoesPage />} />
          <Route path="producao" element={<ProducaoPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
