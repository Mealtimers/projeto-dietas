import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pedidosApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');

  useEffect(() => {
    pedidosApi.listar()
      .then((res) => setPedidos(res.data))
      .catch(() => setError('Erro ao carregar pedidos.'))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('pt-BR') : '-';

  const pedidosFiltrados = filtroStatus
    ? pedidos.filter((p) => p.status === filtroStatus)
    : pedidos;

  const statusOptions = [
    'PENDENTE', 'GERADO', 'AGUARDANDO_APROVACAO', 'APROVADO',
    'REPROVADO', 'EM_PRODUCAO', 'CONCLUIDO',
  ];

  return (
    <>
      <div className="page-header">
        <h1>Pedidos</h1>
        <Link to="/pedidos/novo" className="btn btn-primary">+ Novo Pedido</Link>
      </div>
      <div className="page-content">
        <div className="card">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Filtrar por status:</label>
            <select
              className="form-control"
              style={{ maxWidth: '220px' }}
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>
              {pedidosFiltrados.length} registro(s)
            </span>
          </div>

          {loading && <div className="loading">Carregando...</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && pedidosFiltrados.length === 0 && (
            <div className="empty-state">
              <p>Nenhum pedido encontrado.</p>
              <Link to="/pedidos/novo" className="btn btn-primary">Criar pedido</Link>
            </div>
          )}
          {!loading && pedidosFiltrados.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Total Pratos</th>
                    <th>Máx. Rep.</th>
                    <th>Criado em</th>
                    <th>Status</th>
                    <th>Aprovação</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/clientes/${p.cliente?.id}`}>{p.cliente?.nome || '-'}</Link>
                      </td>
                      <td>{p.totalPratos}</td>
                      <td>{p.maxRepeticoes}x</td>
                      <td>{formatDate(p.createdAt)}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td>
                        {p.aprovacao ? <StatusBadge status={p.aprovacao.status} /> : '-'}
                      </td>
                      <td>
                        <Link to={`/pedidos/${p.id}`} className="btn btn-sm btn-outline">Ver</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
