import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pedidosApi, aprovacoesApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function AprovacoesPage() {
  const [pedidosAguardando, setPedidosAguardando] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [decidindo, setDecidindo] = useState({});
  const [observacoes, setObservacoes] = useState({});

  const loadPedidos = () => {
    return pedidosApi.listar().then((res) => {
      const aguardando = res.data.filter((p) =>
        p.status === 'AGUARDANDO_APROVACAO'
      );
      setPedidosAguardando(aguardando);
    });
  };

  useEffect(() => {
    loadPedidos()
      .catch(() => setError('Erro ao carregar pedidos.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDecisao = async (pedidoId, status) => {
    setDecidindo((prev) => ({ ...prev, [pedidoId]: true }));
    setError(null);
    setSuccess(null);
    try {
      await aprovacoesApi.aprovarOuReprovar(pedidoId, {
        status,
        observacoes: observacoes[pedidoId] || '',
      });
      const msg = `Pedido ${status === 'APROVADO' ? 'aprovado' : 'reprovado'} com sucesso!`;
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3500);
      setObservacoes((prev) => ({ ...prev, [pedidoId]: '' }));
      await loadPedidos();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar decisão.');
    } finally {
      setDecidindo((prev) => ({ ...prev, [pedidoId]: false }));
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('pt-BR') : '-';

  return (
    <>
      <div className="page-header">
        <h1>Aprovações de Pedidos</h1>
      </div>
      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {loading && <div className="loading">Carregando...</div>}

        {!loading && pedidosAguardando.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <p>Nenhum pedido aguardando aprovação no momento.</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>Pedidos aparecem aqui quando enviados para aprovação.</p>
              <Link to="/pedidos" className="btn btn-outline">Ver todos os pedidos</Link>
            </div>
          </div>
        )}

        {pedidosAguardando.map((pedido) => (
          <div key={pedido.id} className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                  {pedido.cliente?.nome}
                </h3>
                <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                  {pedido.totalPratos} pratos
                  {' · '}
                  Máx. {pedido.maxRepeticoes} repetições
                  {' · '}
                  Criado em {formatDate(pedido.createdAt)}
                </div>
              </div>
              <div className="btn-group">
                <StatusBadge status={pedido.status} />
                <Link to={`/pedidos/${pedido.id}`} className="btn btn-sm btn-outline">
                  Ver Cardápio
                </Link>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observações (opcional)</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Motivo da aprovação ou reprovação..."
                value={observacoes[pedido.id] || ''}
                onChange={(e) =>
                  setObservacoes((prev) => ({ ...prev, [pedido.id]: e.target.value }))
                }
              />
            </div>

            <div className="btn-group">
              <button
                className="btn btn-success"
                onClick={() => handleDecisao(pedido.id, 'APROVADO')}
                disabled={decidindo[pedido.id]}
              >
                ✅ Aprovar Pedido
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDecisao(pedido.id, 'REPROVADO')}
                disabled={decidindo[pedido.id]}
              >
                ❌ Reprovar Pedido
              </button>
              {decidindo[pedido.id] && (
                <span style={{ color: 'var(--gray-400)', fontSize: '0.875rem', alignSelf: 'center' }}>
                  Processando...
                </span>
              )}
            </div>
          </div>
        ))}

        <div style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '12px' }}>
            Verificar histórico de aprovações
          </h2>
          <Link to="/pedidos" className="btn btn-outline">
            Ver todos os pedidos com histórico
          </Link>
        </div>
      </div>
    </>
  );
}
