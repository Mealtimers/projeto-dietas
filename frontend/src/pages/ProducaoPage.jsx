import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordensApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS   = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
const STATUS_LABELS    = { PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em Andamento', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };
const GRUPO_ORDER      = ['Proteína', 'Carboidrato', 'Leguminosa', 'Legumes'];
const GRUPO_ICONS      = { 'Proteína': '🥩', 'Carboidrato': '🍚', 'Leguminosa': '🫘', 'Legumes': '🥦' };
const GRUPO_COLORS     = { 'Proteína': '#f97316', 'Carboidrato': '#eab308', 'Leguminosa': '#a855f7', 'Legumes': '#16a34a' };

function fmt(g) { return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`; }

export default function ProducaoPage() {
  const [ordens, setOrdens]                   = useState([]);
  const [ordemSelecionada, setOrdemSelecionada] = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [loadingDetalhe, setLoadingDetalhe]   = useState(false);
  const [error, setError]                     = useState(null);
  const [success, setSuccess]                 = useState(null);
  const [atualizando, setAtualizando]         = useState({});
  const [filtroStatus, setFiltroStatus]       = useState('');
  const [dataPrevisao, setDataPrevisao]       = useState({});
  const [abaDetalhe, setAbaDetalhe]           = useState('consolidado'); // 'consolidado' | 'montagem'

  const loadOrdens = () => ordensApi.listar().then((res) => setOrdens(res.data));

  useEffect(() => {
    loadOrdens()
      .catch(() => setError('Erro ao carregar ordens de produção.'))
      .finally(() => setLoading(false));
  }, []);

  const handleVerDetalhe = async (id) => {
    if (ordemSelecionada?.id === id) { setOrdemSelecionada(null); return; }
    setLoadingDetalhe(true);
    try {
      const res = await ordensApi.buscar(id);
      setOrdemSelecionada(res.data);
      setAbaDetalhe('consolidado');
    } catch {
      setError('Erro ao carregar detalhes.');
      setTimeout(() => setError(null), 3500);
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const handleAtualizarStatus = async (id, status) => {
    setAtualizando((prev) => ({ ...prev, [id]: true }));
    setError(null); setSuccess(null);
    try {
      await ordensApi.atualizarStatus(id, { status, dataPrevisao: dataPrevisao[id] || undefined });
      setSuccess(`Status atualizado para: ${STATUS_LABELS[status] || status}`);
      setTimeout(() => setSuccess(null), 3500);
      await loadOrdens();
      if (ordemSelecionada?.id === id) {
        const res = await ordensApi.buscar(id);
        setOrdemSelecionada(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar status.');
      setTimeout(() => setError(null), 3500);
    } finally {
      setAtualizando((prev) => ({ ...prev, [id]: false }));
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '-';

  const ordensFiltradas = filtroStatus ? ordens.filter((o) => o.status === filtroStatus) : ordens;

  // ── Dados do consolidado ──────────────────────────────────────────────────
  const itens            = ordemSelecionada?.itensConsolidados?.consolidadoCozinha || [];
  const mapaMontagem     = ordemSelecionada?.itensConsolidados?.mapaMontagem        || [];
  const totalPratos      = ordemSelecionada?.itensConsolidados?.totalPratos         || 0;
  const geradoEm         = ordemSelecionada?.itensConsolidados?.geradoEm;
  const totalGeralGramas = itens.reduce((s, i) => s + i.totalGramas, 0);

  // Agrupa por grupo
  const porGrupo = GRUPO_ORDER.reduce((acc, g) => {
    const lista = itens.filter((i) => i.grupo === g);
    if (lista.length > 0) acc[g] = lista;
    return acc;
  }, {});

  // Grupos extras não na ordem definida
  const gruposExtras = [...new Set(itens.map((i) => i.grupo))].filter((g) => !GRUPO_ORDER.includes(g));
  gruposExtras.forEach((g) => { porGrupo[g] = itens.filter((i) => i.grupo === g); });

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
                      <tr key={o.id} style={ordemSelecionada?.id === o.id ? { background: '#f0fdf4' } : {}}>
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
                            <button className="btn btn-sm btn-outline" onClick={() => handleVerDetalhe(o.id)}>
                              {ordemSelecionada?.id === o.id ? '✕ Fechar' : '📊 Somatório'}
                            </button>
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

        {loadingDetalhe && <div className="loading">Carregando somatório...</div>}

        {/* ── Painel de Somatório ── */}
        {ordemSelecionada && !loadingDetalhe && itens.length > 0 && (
          <div className="card">

            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                  📊 Somatório de Produção
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: 2 }}>
                  {ordemSelecionada.pedido?.cliente?.nome}
                  {geradoEm && ` · gerado em ${formatDate(geradoEm)}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn btn-sm ${abaDetalhe === 'consolidado' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setAbaDetalhe('consolidado')}
                >📋 Insumos</button>
                <button
                  className={`btn btn-sm ${abaDetalhe === 'montagem' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setAbaDetalhe('montagem')}
                >🍽️ Montagem</button>
              </div>
            </div>

            {/* OBS Legumes — destaque laranja */}
            {ordemSelecionada.pedido?.obsLegumes && (
              <div style={{
                background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 10,
                padding: '12px 16px', marginBottom: 20,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    🥦 OBS — Legumes proibidos neste pedido
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#78350f', fontWeight: 500 }}>
                    {ordemSelecionada.pedido.obsLegumes}
                  </div>
                </div>
              </div>
            )}

            {/* Cards de resumo */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Total de Pratos',   valor: totalPratos,              icon: '🍱', cor: 'var(--primary)' },
                { label: 'Preparos Distintos', valor: itens.length,             icon: '🧑‍🍳', cor: '#f97316' },
                { label: 'Total Geral',        valor: fmt(totalGeralGramas),    icon: '⚖️', cor: '#6366f1' },
                { label: 'Grupos Alimentares', valor: Object.keys(porGrupo).length, icon: '📦', cor: '#eab308' },
              ].map(({ label, valor, icon, cor }) => (
                <div key={label} style={{
                  flex: '1 1 140px', padding: '14px 18px',
                  background: '#f8fafc', borderRadius: 10,
                  border: `1px solid #e2e8f0`, borderLeft: `4px solid ${cor}`,
                }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: cor }}>{valor}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* ── ABA: Consolidado de Insumos ── */}
            {abaDetalhe === 'consolidado' && (
              <div>
                {Object.entries(porGrupo).map(([grupo, lista]) => {
                  const subtotal = lista.reduce((s, i) => s + i.totalGramas, 0);
                  const cor      = GRUPO_COLORS[grupo] || 'var(--primary)';
                  const icon     = GRUPO_ICONS[grupo]  || '🥘';
                  return (
                    <div key={grupo} style={{ marginBottom: 24 }}>
                      {/* Header do grupo */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 14px', borderRadius: 8,
                        background: cor + '18', borderLeft: `4px solid ${cor}`,
                        marginBottom: 8,
                      }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cor }}>
                          {icon} {grupo}
                          <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--gray-500)', marginLeft: 8 }}>
                            {lista.length} preparo(s)
                          </span>
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cor }}>
                          Subtotal: {fmt(subtotal)}
                        </span>
                      </div>

                      {/* Tabela do grupo */}
                      <div className="table-wrapper" style={{ marginBottom: 0 }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Alimento</th>
                              <th>Modo de Preparo</th>
                              <th style={{ textAlign: 'right' }}>g / prato</th>
                              <th style={{ textAlign: 'right' }}>Pratos</th>
                              <th style={{ textAlign: 'right', color: cor }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lista.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>{item.alimento}</td>
                                <td style={{ color: 'var(--gray-600)' }}>{item.preparo}</td>
                                <td style={{ textAlign: 'right', color: 'var(--gray-500)' }}>{item.gramagem} g</td>
                                <td style={{ textAlign: 'right', color: 'var(--gray-500)' }}>{item.totalPratos}×</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: cor }}>
                                  {fmt(item.totalGramas)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Total Geral */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end',
                  padding: '12px 16px', marginTop: 4,
                  background: '#f1f5f9', borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--gray-800)' }}>
                    ⚖️ Total Geral de Insumos:&nbsp;
                    <span style={{ color: 'var(--primary-dark)', fontSize: '1.15rem' }}>
                      {fmt(totalGeralGramas)}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* ── ABA: Mapa de Montagem ── */}
            {abaDetalhe === 'montagem' && (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 16 }}>
                  Cada lote tem a mesma combinação de itens. A quantidade indica quantos pratos idênticos são montados juntos.
                </p>
                {mapaMontagem.length === 0
                  ? <div className="empty-state"><p>Nenhum mapa de montagem disponível.</p></div>
                  : mapaMontagem.map((lote, li) => (
                    <div key={li} style={{
                      marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                        color: '#fff',
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>🍱</span>
                        <span style={{ fontWeight: 700 }}>Lote {li + 1}</span>
                        <span style={{
                          background: 'rgba(255,255,255,0.2)', borderRadius: 20,
                          padding: '2px 10px', fontSize: '0.85rem',
                        }}>
                          {lote.quantidade} prato(s) idêntico(s)
                        </span>
                      </div>
                      <div className="table-wrapper" style={{ marginBottom: 0 }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Grupo</th>
                              <th>Alimento</th>
                              <th>Preparo</th>
                              <th style={{ textAlign: 'right' }}>Gramagem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lote.itens.map((item, ii) => {
                              const cor  = GRUPO_COLORS[item.grupoNome] || 'var(--primary)';
                              const icon = GRUPO_ICONS[item.grupoNome]  || '🥘';
                              return (
                                <tr key={ii}>
                                  <td>
                                    <span style={{
                                      fontSize: '0.75rem', fontWeight: 700,
                                      color: cor, textTransform: 'uppercase',
                                    }}>
                                      {icon} {item.grupoNome}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 500 }}>{item.alimento}</td>
                                  <td style={{ color: 'var(--gray-600)' }}>{item.preparo}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: cor }}>{item.gramagem} g</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

          </div>
        )}

        {ordemSelecionada && !loadingDetalhe && itens.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <p>Esta ordem não possui dados de consolidado. Pode ter sido gerada em uma versão anterior.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
