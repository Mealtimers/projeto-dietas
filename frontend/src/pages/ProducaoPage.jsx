import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordensApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS   = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
const STATUS_LABELS    = { PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em Andamento', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };

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
                              <button className="btn btn-sm btn-primary" onClick={() => handleAtualizarStatus(o.id, 'EM_ANDAMENTO')} disabled={atualizando[o.id]}>
                                ▶ Iniciar
                              </button>
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
