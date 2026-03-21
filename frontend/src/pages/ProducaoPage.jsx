import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordensApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];

export default function ProducaoPage() {
  const [ordens, setOrdens] = useState([]);
  const [ordemSelecionada, setOrdemSelecionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [atualizando, setAtualizando] = useState({});
  const [filtroStatus, setFiltroStatus] = useState('');
  const [dataPrevisao, setDataPrevisao] = useState({});

  const loadOrdens = () => {
    return ordensApi.listar().then((res) => setOrdens(res.data));
  };

  useEffect(() => {
    loadOrdens()
      .catch(() => setError('Erro ao carregar ordens de produção.'))
      .finally(() => setLoading(false));
  }, []);

  const handleVerDetalhe = async (id) => {
    if (ordemSelecionada?.id === id) {
      setOrdemSelecionada(null);
      return;
    }
    setLoadingDetalhe(true);
    try {
      const res = await ordensApi.buscar(id);
      setOrdemSelecionada(res.data);
    } catch {
      alert('Erro ao carregar detalhes.');
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const handleAtualizarStatus = async (id, status) => {
    setAtualizando((prev) => ({ ...prev, [id]: true }));
    setError(null);
    setSuccess(null);
    try {
      await ordensApi.atualizarStatus(id, {
        status,
        dataPrevisao: dataPrevisao[id] || undefined,
      });
      setSuccess(`Status atualizado para: ${status.replace(/_/g, ' ')}`);
      await loadOrdens();
      if (ordemSelecionada?.id === id) {
        const res = await ordensApi.buscar(id);
        setOrdemSelecionada(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar status.');
    } finally {
      setAtualizando((prev) => ({ ...prev, [id]: false }));
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('pt-BR') : '-';

  const ordensFiltradas = filtroStatus
    ? ordens.filter((o) => o.status === filtroStatus)
    : ordens;

  const consolidado = ordemSelecionada?.itensConsolidados;

  return (
    <>
      <div className="page-header">
        <h1>Ordens de Produção</h1>
      </div>
      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Filtrar:</label>
            <select
              className="form-control"
              style={{ maxWidth: '200px' }}
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
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
                    <th>Total Pratos</th>
                    <th>Preparos</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ordensFiltradas.map((o) => {
                    const resumo = o.itensConsolidados?.resumo || {};
                    return (
                      <tr key={o.id}>
                        <td>{o.pedido?.cliente?.nome || '-'}</td>
                        <td>{formatDate(o.dataGeracao)}</td>
                        <td>
                          <input
                            type="date"
                            className="form-control"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={dataPrevisao[o.id] || (o.dataPrevisao ? o.dataPrevisao.slice(0, 10) : '')}
                            onChange={(e) =>
                              setDataPrevisao((prev) => ({ ...prev, [o.id]: e.target.value }))
                            }
                          />
                        </td>
                        <td>{resumo.totalPratos || '-'}</td>
                        <td>{resumo.totalPreparos || '-'}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleVerDetalhe(o.id)}
                            >
                              {ordemSelecionada?.id === o.id ? 'Fechar' : 'Detalhes'}
                            </button>
                            {o.status === 'PENDENTE' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleAtualizarStatus(o.id, 'EM_ANDAMENTO')}
                                disabled={atualizando[o.id]}
                              >
                                Iniciar
                              </button>
                            )}
                            {o.status === 'EM_ANDAMENTO' && (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleAtualizarStatus(o.id, 'CONCLUIDA')}
                                disabled={atualizando[o.id]}
                              >
                                Concluir
                              </button>
                            )}
                            {['PENDENTE', 'EM_ANDAMENTO'].includes(o.status) && (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleAtualizarStatus(o.id, 'CANCELADA')}
                                disabled={atualizando[o.id]}
                              >
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

        {loadingDetalhe && <div className="loading">Carregando detalhes...</div>}

        {ordemSelecionada && !loadingDetalhe && consolidado && (
          <div className="card">
            <div className="card-title">
              Itens Consolidados — {ordemSelecionada.pedido?.cliente?.nome}
            </div>

            {consolidado.resumo && (
              <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Total Pratos
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{consolidado.resumo.totalPratos}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Preparos Distintos
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{consolidado.resumo.totalPreparos}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Gerado em
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {consolidado.resumo.geradoEm
                      ? new Date(consolidado.resumo.geradoEm).toLocaleDateString('pt-BR')
                      : '-'}
                  </div>
                </div>
              </div>
            )}

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Grupo</th>
                    <th>Alimento</th>
                    <th>Preparo</th>
                    <th>Qtd Pratos</th>
                    <th>Gramagem por Prato</th>
                    <th>Total (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidado.itens?.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase' }}>
                          {item.grupo}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{item.alimento}</td>
                      <td>{item.preparo}</td>
                      <td>{item.totalPratos}x</td>
                      <td>{item.gramagem}g</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                        {item.totalGramas.toFixed(0)}g
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
