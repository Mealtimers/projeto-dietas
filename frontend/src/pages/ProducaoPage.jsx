import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordensApi, pedidosApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS   = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
const STATUS_LABELS    = { PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em Produção', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };

export default function ProducaoPage() {
  const [ordens, setOrdens]                   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [success, setSuccess]                 = useState(null);
  const [atualizando, setAtualizando]         = useState({});
  const [filtroStatus, setFiltroStatus]       = useState('');
  const [dataPrevisao, setDataPrevisao]       = useState({});

  const loadOrdens = () => ordensApi.listar().then((res) => setOrdens(res.data));

  useEffect(() => {
    loadOrdens()
      .catch(() => setError('Erro ao carregar ordens de produção.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAtualizarStatus = async (id, status) => {
    setAtualizando((prev) => ({ ...prev, [id]: true }));
    setError(null); setSuccess(null);
    try {
      await ordensApi.atualizarStatus(id, { status, dataPrevisao: dataPrevisao[id] || undefined });
      setSuccess(`Status atualizado para: ${STATUS_LABELS[status] || status}`);
      setTimeout(() => setSuccess(null), 3500);
      await loadOrdens();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar status.');
      setTimeout(() => setError(null), 3500);
    } finally {
      setAtualizando((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Ação atômica "Enviar para produção" — 1 clique faz TUDO:
  // 1) Envia planning ao Meal Control (só se todos preparos vinculados)
  // 2) Se sucesso, muda status pra EM_ANDAMENTO
  // 3) Se falhar (preparo sem vínculo), NÃO muda nada e mostra lista dos faltantes
  const handleEnviarProducao = async (o) => {
    const cli = o.pedido?.cliente?.nome || 'este pedido';
    if (!window.confirm(`Enviar produção de ${cli} para o Meal Control?\n\nIsso cria o planning no MC (Dietas personalizadas) e marca esta ordem como "Em Produção".`)) return;
    setAtualizando((prev) => ({ ...prev, [o.id]: true }));
    setError(null); setSuccess(null);
    try {
      const mcRes = await pedidosApi.enviarMealcontrol(o.pedidoId);
      // muda status só se envio ao MC deu certo
      await ordensApi.atualizarStatus(o.id, { status: 'EM_ANDAMENTO', dataPrevisao: dataPrevisao[o.id] || undefined });
      const planId = mcRes.data?.planningId;
      setSuccess(`✓ Enviado ao Meal Control (planning #${planId}) e marcado Em Produção.`);
      setTimeout(() => setSuccess(null), 5000);
      await loadOrdens();
    } catch (err) {
      const data = err.response?.data;
      if (data?.semVinculo) {
        const lista = data.semVinculo.map((p) => `• ${p.alimento} — ${p.preparo}`).join('\n');
        setError(`Não foi enviado. ${data.semVinculo.length} preparo(s) sem vínculo no Meal Control:\n\n${lista}\n\nVá em Base Alimentar → botão 🔗 MC pra vincular antes de enviar.`);
      } else {
        setError(data?.error || 'Erro ao enviar produção.');
      }
      setTimeout(() => setError(null), 12000);
    } finally {
      setAtualizando((prev) => ({ ...prev, [o.id]: false }));
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '-';

  const ordensFiltradas = filtroStatus ? ordens.filter((o) => o.status === filtroStatus) : ordens;

  return (
    <>
      <div className="page-header">
        <h1>Ordens de Produção</h1>
      </div>

      <div className="page-content">
        {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

        {/* ── Lista de ordens ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-500)' }}>Status:</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setFiltroStatus('')} className={`btn btn-sm ${filtroStatus === '' ? 'btn-primary' : 'btn-ghost'}`}>Todos</button>
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => setFiltroStatus(s === filtroStatus ? '' : s)} className={`btn btn-sm ${filtroStatus === s ? 'btn-primary' : 'btn-ghost'}`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {loading && <div className="loading">Carregando...</div>}

          {!loading && ordensFiltradas.length === 0 && (
            <div className="empty-state">
              <p>Nenhuma ordem de produção encontrada.</p>
              <Link to="/pedidos" className="btn btn-outline">Ver pedidos aprovados</Link>
            </div>
          )}

          {!loading && ordensFiltradas.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Gerado em</th>
                    <th>Previsão</th>
                    <th>Pratos</th>
                    <th>Preparos</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ordensFiltradas.map((o) => {
                    const ic = o.itensConsolidados || {};
                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600 }}>{o.pedido?.cliente?.nome || '-'}</td>
                        <td>{formatDate(o.dataGeracao || o.createdAt)}</td>
                        <td>
                          <input
                            type="date"
                            className="form-control"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={dataPrevisao[o.id] || (o.dataPrevisao ? o.dataPrevisao.slice(0, 10) : '')}
                            onChange={(e) => setDataPrevisao((prev) => ({ ...prev, [o.id]: e.target.value }))}
                          />
                        </td>
                        <td>{ic.totalPratos || '-'}</td>
                        <td>{ic.consolidadoCozinha?.length || '-'}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td>
                          <div className="btn-group">
                            <Link to={`/producao/${o.id}`} className="btn btn-sm btn-outline">
                              📊 Somatório
                            </Link>
                            {o.status === 'PENDENTE' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleEnviarProducao(o)}
                                disabled={atualizando[o.id]}
                                title="Cria planning no Meal Control (Dietas personalizadas) e marca em produção"
                              >
                                {atualizando[o.id] ? 'Enviando…' : '🏭 Enviar para produção'}
                              </button>
                            )}
                            {o.status === 'EM_ANDAMENTO' && o.pedido?.mealcontrolPlanningId && (
                              <span
                                title={`Enviado ao Meal Control · planning #${o.pedido.mealcontrolPlanningId}`}
                                style={{
                                  fontSize: '0.72rem', fontWeight: 600, color: '#166534',
                                  background: '#dcfce7', border: '1px solid #16a34a',
                                  borderRadius: 10, padding: '2px 8px',
                                }}
                              >
                                ✓ MC #{o.pedido.mealcontrolPlanningId}
                              </span>
                            )}
                            {o.status === 'EM_ANDAMENTO' && (
                              <button className="btn btn-sm btn-success" onClick={() => handleAtualizarStatus(o.id, 'CONCLUIDA')} disabled={atualizando[o.id]}>
                                ✓ Concluir
                              </button>
                            )}
                            {['PENDENTE', 'EM_ANDAMENTO'].includes(o.status) && (
                              <button className="btn btn-sm btn-danger" onClick={() => handleAtualizarStatus(o.id, 'CANCELADA')} disabled={atualizando[o.id]}>
                                Cancelar
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
