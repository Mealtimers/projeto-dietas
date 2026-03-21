import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { clientesApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function ClienteDetalhePage() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    clientesApi.buscar(id)
      .then((res) => setCliente(res.data))
      .catch(() => setError('Erro ao carregar cliente.'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('pt-BR') : '-';

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="page-content"><div className="alert alert-error">{error}</div></div>;
  if (!cliente) return null;

  return (
    <>
      <div className="page-header">
        <h1>{cliente.nome}</h1>
        <div className="btn-group">
          <Link to={`/clientes/${id}/editar`} className="btn btn-secondary">Editar</Link>
          <Link to="/clientes" className="btn btn-outline">Voltar</Link>
        </div>
      </div>
      <div className="page-content">
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title">Informações do Cliente</div>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Email</label>
              <span>{cliente.email}</span>
            </div>
            <div className="detail-item">
              <label>Telefone</label>
              <span>{cliente.telefone || 'Não informado'}</span>
            </div>
            <div className="detail-item">
              <label>Cadastrado em</label>
              <span>{formatDate(cliente.createdAt)}</span>
            </div>
            <div className="detail-item">
              <label>Total de Pedidos</label>
              <span>{cliente.pedidos?.length || 0} pedido(s)</span>
            </div>
          </div>
          {cliente.observacoes && (
            <div className="detail-item">
              <label>Observações</label>
              <span style={{ display: 'block', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                {cliente.observacoes}
              </span>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              Pedidos ({cliente.pedidos?.length || 0})
            </div>
            <Link to="/pedidos/novo" className="btn btn-sm btn-primary">+ Novo Pedido</Link>
          </div>
          {!cliente.pedidos?.length ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <p>Nenhum pedido encontrado para este cliente.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Pratos</th>
                    <th>Máx. Rep.</th>
                    <th>Criado em</th>
                    <th>Status</th>
                    <th>Aprovação</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.pedidos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.totalPratos} pratos</td>
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
