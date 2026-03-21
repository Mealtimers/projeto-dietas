import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clientesApi, preparosApi, pedidosApi, ordensApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalPreparos: 0,
    pedidosPendentes: 0,
    ordensEmProducao: 0,
  });
  const [pedidosRecentes, setPedidosRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [clientesRes, preparosRes, pedidosRes, ordensRes] = await Promise.all([
          clientesApi.listar(),
          preparosApi.listar(),
          pedidosApi.listar(),
          ordensApi.listar(),
        ]);

        const clientes = clientesRes.data;
        const preparos = preparosRes.data;
        const pedidos = pedidosRes.data;
        const ordens = ordensRes.data;

        setStats({
          totalClientes: clientes.length,
          totalPreparos: preparos.length,
          pedidosPendentes: pedidos.filter((p) =>
            ['PENDENTE', 'GERADO', 'AGUARDANDO_APROVACAO'].includes(p.status)
          ).length,
          ordensEmProducao: ordens.filter((o) => o.status === 'EM_ANDAMENTO').length,
        });

        setPedidosRecentes(pedidos.slice(0, 8));
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('pt-BR') : '-';

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalClientes}</div>
            <div className="stat-label">Total de Clientes</div>
          </div>
          <div className="stat-card secondary">
            <div className="stat-value">{stats.totalPreparos}</div>
            <div className="stat-label">Preparos Cadastrados</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-value">{stats.pedidosPendentes}</div>
            <div className="stat-label">Pedidos Pendentes</div>
          </div>
          <div className="stat-card info">
            <div className="stat-value">{stats.ordensEmProducao}</div>
            <div className="stat-label">Ordens em Produção</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Pedidos Recentes</div>
          {pedidosRecentes.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum pedido encontrado.</p>
              <Link to="/pedidos/novo" className="btn btn-primary">Criar primeiro pedido</Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Total Pratos</th>
                    <th>Criado em</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosRecentes.map((pedido) => (
                    <tr key={pedido.id}>
                      <td>{pedido.cliente?.nome || '-'}</td>
                      <td>{pedido.totalPratos} pratos</td>
                      <td>{formatDate(pedido.createdAt)}</td>
                      <td><StatusBadge status={pedido.status} /></td>
                      <td>
                        <Link to={`/pedidos/${pedido.id}`} className="btn btn-sm btn-outline">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
          <div className="card">
            <div className="card-title">Acesso Rápido</div>
            <div className="btn-group" style={{ flexDirection: 'column', gap: '8px' }}>
              <Link to="/clientes/novo" className="btn btn-outline">+ Novo Cliente</Link>
              <Link to="/base-alimentar" className="btn btn-outline">+ Gerenciar Base Alimentar</Link>
              <Link to="/pedidos/novo" className="btn btn-outline">+ Novo Pedido</Link>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Fluxo do Sistema</div>
            <ol style={{ paddingLeft: '20px', lineHeight: 2, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
              <li>Cadastrar Cliente</li>
              <li>Configurar Base Alimentar (Grupos, Alimentos, Preparos)</li>
              <li>Criar Pedido com Grupos e Gramagens</li>
              <li>Gerar Cardápio Automaticamente</li>
              <li>Enviar para Aprovação do Cliente</li>
              <li>Gerar Ordem de Produção</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
