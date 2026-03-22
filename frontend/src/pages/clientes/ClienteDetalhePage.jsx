import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { clientesApi, pedidosApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const STATUS_BLOQUEADO_EDICAO   = ['APROVADO', 'EM_PRODUCAO', 'CONCLUIDO', 'CANCELADO'];
const STATUS_BLOQUEADO_EXCLUSAO = ['APROVADO', 'CONCLUIDO', 'EM_PRODUCAO'];

export default function ClienteDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [success, setSuccess]             = useState(null);
  const [deletingPedido, setDeletingPedido] = useState(null);
  const [cancelingPedido, setCancelingPedido] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    clientesApi.buscar(id)
      .then((res) => setCliente(res.data))
      .catch(() => setError('Erro ao carregar cliente.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const showError = (msg) => { setError(msg); setTimeout(() => setError(null), 3500); };

  const handleCancelPedido = async (pedidoId) => {
    if (!window.confirm('Confirma o cancelamento deste pedido em produção?')) return;
    setCancelingPedido(pedidoId);
    try {
      await pedidosApi.atualizarStatus(pedidoId, { status: 'CANCELADO' });
      showSuccess('Pedido cancelado. Agora você pode excluí-lo se desejar.');
      load();
    } catch (err) {
      showError(err.response?.data?.error || 'Erro ao cancelar pedido.');
    } finally {
      setCancelingPedido(null);
    }
  };

  const handleDeletePedido = async (pedidoId, status) => {
    if (STATUS_BLOQUEADO_EXCLUSAO.includes(status)) {
      showError(status === 'EM_PRODUCAO'
        ? 'Cancele o pedido primeiro antes de excluir.'
        : `Pedido com status "${status}" não pode ser excluído.`);
      return;
    }
    if (!window.confirm('Confirma a exclusão definitiva deste pedido?')) return;
    setDeletingPedido(pedidoId);
    try {
      await pedidosApi.deletar(pedidoId);
      showSuccess('Pedido excluído com sucesso.');
      load();
    } catch (err) {
      showError(err.response?.data?.error || 'Erro ao excluir pedido.');
    } finally {
      setDeletingPedido(null);
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  if (loading) return <div className="loading">Carregando...</div>;
  if (error && !cliente) return <div className="page-content"><div className="alert alert-error">{error}</div></div>;
  if (!cliente) return null;

  const pedidos      = cliente.pedidos || [];
  const ultimoPedido = pedidos[0];
  const ativos       = pedidos.filter((p) => !['CONCLUIDO', 'REPROVADO'].includes(p.status)).length;
  const initials     = cliente.nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <div className="page-header">
        <h1>{cliente.nome}</h1>
        <div className="btn-group">
          <Link to={`/clientes/${id}/editar`} className="btn btn-secondary">Editar cliente</Link>
          <Link to="/clientes" className="btn btn-ghost">← Voltar</Link>
        </div>
      </div>

      <div className="page-content">
        {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

        {/* Profile card */}
        <div className="profile-card">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-info">
            <div className="profile-name">{cliente.nome}</div>
            <div className="profile-meta">
              <span>✉️ {cliente.email}</span>
              {cliente.telefone && <span>📞 {cliente.telefone}</span>}
              <span>📅 Cliente desde {formatDate(cliente.createdAt)}</span>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <div className="profile-stat-value">{pedidos.length}</div>
                <div className="profile-stat-label">pedidos</div>
              </div>
              <div className="profile-stat" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 20 }}>
                <div className="profile-stat-value">{ativos}</div>
                <div className="profile-stat-label">em andamento</div>
              </div>
              <div className="profile-stat" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 20 }}>
                <div className="profile-stat-value">{ultimoPedido ? formatDate(ultimoPedido.createdAt) : '—'}</div>
                <div className="profile-stat-label">último pedido</div>
              </div>
            </div>
            {cliente.observacoes && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
                📝 {cliente.observacoes}
              </div>
            )}
          </div>
          <div className="profile-actions">
            <Link
              to={`/pedidos/novo?clienteId=${id}`}
              className="btn btn-accent"
            >
              + Novo Pedido
            </Link>
            {ultimoPedido && (
              <Link
                to={`/pedidos/novo?repetirDe=${ultimoPedido.id}`}
                className="btn"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.8rem' }}
              >
                🔄 Repetir último
              </Link>
            )}
          </div>
        </div>

        {/* Order history */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              📋 Histórico de Pedidos
              <span style={{ marginLeft: 8, fontSize: '0.8rem', fontWeight: 400, color: 'var(--gray-400)' }}>
                {pedidos.length} registro(s)
              </span>
            </div>
            <Link to={`/pedidos/novo?clienteId=${id}`} className="btn btn-sm btn-primary">+ Novo Pedido</Link>
          </div>

          {pedidos.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 24px' }}>
              <div className="empty-state-icon">📦</div>
              <p>Nenhum pedido para este cliente ainda.</p>
              <Link to={`/pedidos/novo?clienteId=${id}`} className="btn btn-primary">Criar primeiro pedido</Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Pratos</th>
                    <th>Config</th>
                    <th>Status</th>
                    <th>Aprovação</th>
                    <th>Ordem</th>
                    <th className="action-cell">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => {
                    const canEdit   = !STATUS_BLOQUEADO_EDICAO.includes(p.status);
                    const canCancel = p.status === 'EM_PRODUCAO';
                    const canDelete = !STATUS_BLOQUEADO_EXCLUSAO.includes(p.status);
                    return (
                      <tr key={p.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatDate(p.createdAt)}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1rem' }}>{p.totalPratos}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginLeft: 3 }}>pratos</span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                          máx {p.maxRepeticoes}×
                        </td>
                        <td><StatusBadge status={p.status} /></td>
                        <td>
                          {p.aprovacao ? <StatusBadge status={p.aprovacao.status} /> : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                        </td>
                        <td>
                          {p.ordemProducao
                            ? <StatusBadge status={p.ordemProducao.status} />
                            : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                        </td>
                        <td className="action-cell">
                          <div className="btn-group">
                            <Link to={`/pedidos/${p.id}`} className="btn btn-xs btn-outline">Ver</Link>
                            {canEdit && (
                              <Link to={`/pedidos/${p.id}/editar`} className="btn btn-xs btn-secondary">Editar</Link>
                            )}
                            <Link
                              to={`/pedidos/novo?repetirDe=${p.id}`}
                              className="btn btn-xs btn-ghost"
                              title="Repetir este pedido"
                            >
                              🔄
                            </Link>
                            {canCancel && (
                              <button
                                className="btn btn-xs btn-warning"
                                onClick={() => handleCancelPedido(p.id)}
                                disabled={cancelingPedido === p.id}
                                title="Cancelar pedido em produção"
                              >
                                {cancelingPedido === p.id ? '...' : '⛔ Cancelar'}
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="btn btn-xs btn-danger"
                                onClick={() => handleDeletePedido(p.id, p.status)}
                                disabled={deletingPedido === p.id}
                              >
                                {deletingPedido === p.id ? '...' : 'Excluir'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
