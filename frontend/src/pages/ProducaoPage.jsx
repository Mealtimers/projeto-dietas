import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordensApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS   = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
const STATUS_LABELS    = { PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em Andamento', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };
const GRUPO_ORDER      = ['Proteína', 'Carboidrato', 'Leguminosa', 'Legumes', 'Molho'];
const GRUPO_ICONS      = { 'Proteína': '🥩', 'Carboidrato': '🍚', 'Leguminosa': '🫘', 'Legumes': '🥦', 'Molho': '🫙' };
const GRUPO_COLORS     = { 'Proteína': '#f97316', 'Carboidrato': '#eab308', 'Leguminosa': '#a855f7', 'Legumes': '#16a34a', 'Molho': '#7c3aed' };

function fmt(g) { return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`; }

function fmtDataHora() {
  return new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

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
  const [abaDetalhe, setAbaDetalhe]           = useState('consolidado'); // 'consolidado' | 'montagem' | 'impressao'
  const [docImpressao, setDocImpressao]       = useState('descritivo');  // 'descritivo' | 'plano'

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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className={`btn btn-sm ${abaDetalhe === 'consolidado' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setAbaDetalhe('consolidado')}
                >📋 Insumos</button>
                <button
                  className={`btn btn-sm ${abaDetalhe === 'montagem' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setAbaDetalhe('montagem')}
                >🍽️ Montagem</button>
                <button
                  className={`btn btn-sm ${abaDetalhe === 'impressao' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setAbaDetalhe('impressao')}
                  style={{ borderColor: '#7B1A1A' }}
                >🖨️ Imprimir</button>
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

            {/* ── ABA: Impressão ── */}
            {abaDetalhe === 'impressao' && (() => {
              const pedido  = ordemSelecionada.pedido || {};
              const cliente = pedido.cliente?.nome    || '—';
              const nutri   = pedido.nutricionista    || null;
              const obsLeg  = pedido.obsLegumes       || null;
              const dataImp = fmtDataHora();

              return (
                <div>
                  {/* Controles (ocultos na impressão) */}
                  <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Seletor de documento */}
                    <div style={{ display: 'flex', border: '1px solid var(--gray-300)', borderRadius: 8, overflow: 'hidden' }}>
                      <button
                        onClick={() => setDocImpressao('descritivo')}
                        style={{
                          padding: '7px 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: docImpressao === 'descritivo' ? '#7B1A1A' : '#fff',
                          color: docImpressao === 'descritivo' ? '#fff' : 'var(--gray-600)',
                        }}
                      >
                        Descritivo Individual
                      </button>
                      <button
                        onClick={() => setDocImpressao('plano')}
                        style={{
                          padding: '7px 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                          border: 'none', borderLeft: '1px solid var(--gray-300)',
                          background: docImpressao === 'plano' ? '#7B1A1A' : '#fff',
                          color: docImpressao === 'plano' ? '#fff' : 'var(--gray-600)',
                        }}
                      >
                        Plano de Producao
                      </button>
                    </div>

                    <button className="btn btn-primary" onClick={() => window.print()}>Imprimir</button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => window.print()}
                      title="No diálogo de impressão, selecione 'Salvar como PDF'"
                    >
                      Salvar PDF
                      <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginLeft: 6 }}>(selecione PDF no diálogo)</span>
                    </button>
                  </div>

                  <div className="print-area">

                    {/* ── DESCRITIVO INDIVIDUAL ── */}
                    {docImpressao === 'descritivo' && (
                      <div className="print-section">
                        {/* Cabeçalho */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                          borderBottom: '3px solid #7B1A1A', paddingBottom: 12, marginBottom: 20,
                        }}>
                          <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7B1A1A' }}>
                              Descritivo Individual — Cardapio por Lote
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
                              Cliente: {cliente}
                            </div>
                            {nutri && (
                              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>
                                Nutricionista: {nutri}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                            <div>{totalPratos} pratos no total</div>
                            <div style={{ marginTop: 4 }}>Gerado em {dataImp}</div>
                          </div>
                        </div>

                        {/* OBS Legumes */}
                        {obsLeg && (
                          <div style={{
                            background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 8,
                            padding: '10px 14px', marginBottom: 16,
                          }}>
                            <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', marginBottom: 2 }}>
                              Legumes — Restricoes do cliente
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#78350f' }}>{obsLeg}</div>
                          </div>
                        )}

                        {/* Lotes */}
                        {mapaMontagem.length === 0 ? (
                          <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Nenhum dado de montagem disponivel.</p>
                        ) : (
                          mapaMontagem.map((lote, li) => (
                            <div key={li} style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 14px',
                                background: '#7B1A1A', color: '#fff',
                              }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Lote {li + 1}</span>
                                <span style={{
                                  background: 'rgba(255,255,255,0.2)', borderRadius: 20,
                                  padding: '2px 10px', fontSize: '0.8rem',
                                }}>
                                  {lote.quantidade} prato(s) identico(s)
                                </span>
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ textAlign: 'left', padding: '6px 12px', border: '1px solid #e2e8f0', fontWeight: 700, width: 100 }}>Grupo</th>
                                    <th style={{ textAlign: 'left', padding: '6px 12px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Preparo</th>
                                    <th style={{ textAlign: 'right', padding: '6px 12px', border: '1px solid #e2e8f0', fontWeight: 700, width: 90 }}>Gramagem</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lote.itens.map((item, ii) => {
                                    const nomeExibido = item.nomeManual || item.preparo;
                                    return (
                                      <tr key={ii} style={{ background: ii % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '6px 12px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569' }}>
                                          {item.grupoNome}
                                        </td>
                                        <td style={{ padding: '6px 12px', border: '1px solid #e2e8f0' }}>
                                          <span style={{ fontWeight: 500 }}>{nomeExibido}</span>
                                          {item.obs && (
                                            <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 2, fontStyle: 'italic' }}>
                                              Obs: {item.obs}
                                            </div>
                                          )}
                                        </td>
                                        <td style={{ padding: '6px 12px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>
                                          {item.gramagem > 0 ? `${item.gramagem} g` : '—'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ))
                        )}

                        {/* Rodapé */}
                        <div style={{
                          marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0',
                          display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8',
                        }}>
                          <span>Meal Time Ultracongelados</span>
                          {nutri && <span>Nutricionista: {nutri}</span>}
                          <span>{dataImp}</span>
                        </div>
                      </div>
                    )}

                    {/* ── PLANO DE PRODUCAO ── */}
                    {docImpressao === 'plano' && (
                      <div className="print-section">
                        {/* Cabeçalho */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                          borderBottom: '3px solid #7B1A1A', paddingBottom: 12, marginBottom: 20,
                        }}>
                          <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7B1A1A' }}>
                              Plano de Producao — Insumos Consolidados
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
                              Cliente: {cliente}
                            </div>
                            {nutri && (
                              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>
                                Nutricionista: {nutri}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                            <div>{totalPratos} pratos no total</div>
                            <div style={{ marginTop: 4 }}>Gerado em {dataImp}</div>
                          </div>
                        </div>

                        {/* OBS Legumes */}
                        {obsLeg && (
                          <div style={{
                            background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 8,
                            padding: '10px 14px', marginBottom: 16,
                          }}>
                            <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', marginBottom: 2 }}>
                              Legumes — Restricoes do cliente
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#78350f' }}>{obsLeg}</div>
                          </div>
                        )}

                        {/* Tabelas por grupo */}
                        {Object.entries(porGrupo).map(([grupo, lista]) => {
                          const subtotal = lista.reduce((s, i) => s + i.totalGramas, 0);
                          return (
                            <div key={grupo} style={{ marginBottom: 20 }}>
                              <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '7px 12px', borderRadius: 6,
                                background: '#f1f5f9', borderLeft: '4px solid #7B1A1A',
                                marginBottom: 6,
                              }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{grupo}</span>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#7B1A1A' }}>Subtotal: {fmt(subtotal)}</span>
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                  <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ textAlign: 'left', padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Alimento</th>
                                    <th style={{ textAlign: 'left', padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Modo de Preparo</th>
                                    <th style={{ textAlign: 'right', padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 700 }}>g / prato</th>
                                    <th style={{ textAlign: 'right', padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Pratos</th>
                                    <th style={{ textAlign: 'right', padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#7B1A1A' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lista.map((item, idx) => (
                                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                      <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{item.alimento}</td>
                                      <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', color: '#475569' }}>{item.preparo}</td>
                                      <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#475569' }}>{item.gramagem} g</td>
                                      <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#475569' }}>{item.totalPratos}x</td>
                                      <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: '#7B1A1A' }}>{fmt(item.totalGramas)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}

                        {/* Total geral */}
                        <div style={{
                          display: 'flex', justifyContent: 'flex-end',
                          padding: '10px 14px', background: '#f1f5f9', borderRadius: 6, border: '1px solid #e2e8f0',
                        }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                            Total Geral:&nbsp;
                            <span style={{ color: '#7B1A1A', fontSize: '1.1rem' }}>{fmt(totalGeralGramas)}</span>
                          </span>
                        </div>

                        {/* Rodapé */}
                        <div style={{
                          marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0',
                          display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8',
                        }}>
                          <span>Meal Time Ultracongelados</span>
                          {nutri && <span>Nutricionista: {nutri}</span>}
                          <span>{dataImp}</span>
                        </div>
                      </div>
                    )}

                  </div>{/* fim print-area */}
                </div>
              );
            })()}

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
                              <th style={{ width: 110 }}>Grupo</th>
                              <th>Preparo</th>
                              <th style={{ textAlign: 'right', width: 90 }}>Gramagem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lote.itens.map((item, ii) => {
                              const cor = GRUPO_COLORS[item.grupoNome] || 'var(--primary)';
                              const nomeExibido = item.nomeManual || item.preparo;
                              return (
                                <tr key={ii}>
                                  <td>
                                    <span style={{
                                      fontSize: '0.75rem', fontWeight: 700,
                                      color: cor, textTransform: 'uppercase',
                                    }}>
                                      {item.grupoNome}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 500 }}>
                                    {nomeExibido}
                                    {item.obs && (
                                      <div style={{ fontSize: '0.75rem', color: '#92400e', fontStyle: 'italic', marginTop: 2 }}>
                                        {item.obs}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: cor }}>
                                    {item.gramagem > 0 ? `${item.gramagem} g` : '—'}
                                  </td>
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
