import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordensApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const GRUPO_ORDER  = ['Proteína', 'Carboidrato', 'Leguminosa', 'Legumes', 'Molho'];
const GRUPO_ICONS  = { 'Proteína': '🥩', 'Carboidrato': '🍚', 'Leguminosa': '🫘', 'Legumes': '🥦', 'Molho': '🫙' };
const GRUPO_COLORS = { 'Proteína': '#f97316', 'Carboidrato': '#eab308', 'Leguminosa': '#a855f7', 'Legumes': '#16a34a', 'Molho': '#7c3aed' };

function fmt(g) { return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(0)} g`; }
function fmtDataHora() {
  return new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function ProducaoDetalhePage() {
  const { id } = useParams();
  const [ordem, setOrdem]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [abaDetalhe, setAbaDetalhe]     = useState('consolidado');
  const [docImpressao, setDocImpressao] = useState('descritivo');

  useEffect(() => {
    ordensApi.buscar(id)
      .then(res => setOrdem(res.data))
      .catch(() => setError('Erro ao carregar ordem de produção.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <div className="page-content"><div className="alert alert-error">{error}</div></div>;
  if (!ordem) return null;

  const itens            = ordem.itensConsolidados?.consolidadoCozinha || [];
  const mapaMontagem     = ordem.itensConsolidados?.mapaMontagem || [];
  const totalPratos      = ordem.itensConsolidados?.totalPratos || 0;
  const geradoEm         = ordem.itensConsolidados?.geradoEm;
  const totalGeralGramas = itens.reduce((s, i) => s + i.totalGramas, 0);
  const formatDate       = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  const porGrupo = GRUPO_ORDER.reduce((acc, g) => {
    const lista = itens.filter(i => i.grupo === g);
    if (lista.length > 0) acc[g] = lista;
    return acc;
  }, {});
  const gruposExtras = [...new Set(itens.map(i => i.grupo))].filter(g => !GRUPO_ORDER.includes(g));
  gruposExtras.forEach(g => { porGrupo[g] = itens.filter(i => i.grupo === g); });

  const pedido  = ordem.pedido || {};
  const cliente = pedido.cliente?.nome || '—';
  const nutri   = pedido.nutricionista || null;
  const obsLeg  = pedido.obsLegumes || null;
  const dataImp = fmtDataHora();

  const handlePrint = () => window.print();

  return (
    <>
      <div className="page-header">
        <h1>Somatório — {cliente}</h1>
        <div className="btn-group">
          <StatusBadge status={ordem.status} />
          <Link to="/producao" className="btn btn-outline">← Voltar</Link>
        </div>
      </div>

      <div className="page-content">
        {itens.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <p>Esta ordem não possui dados de consolidado.</p>
            </div>
          </div>
        ) : (
          <>
            {/* OBS Legumes */}
            {obsLeg && (
              <div style={{
                background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 10,
                padding: '12px 16px', marginBottom: 20,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Observações importantes
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#78350f', fontWeight: 500 }}>{obsLeg}</div>
                </div>
              </div>
            )}

            {/* Cards de resumo */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Total de Pratos',   valor: totalPratos,           icon: '🍱', cor: 'var(--primary)' },
                { label: 'Preparos Distintos', valor: itens.length,          icon: '🧑‍🍳', cor: '#f97316' },
                { label: 'Total Geral',        valor: fmt(totalGeralGramas), icon: '⚖️', cor: '#6366f1' },
                { label: 'Grupos Alimentares', valor: Object.keys(porGrupo).length, icon: '📦', cor: '#eab308' },
              ].map(({ label, valor, icon, cor }) => (
                <div key={label} style={{
                  flex: '1 1 140px', padding: '14px 18px',
                  background: '#f8fafc', borderRadius: 10,
                  border: '1px solid #e2e8f0', borderLeft: `4px solid ${cor}`,
                }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: cor }}>{valor}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Abas */}
            <div className="card">
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <button className={`btn btn-sm ${abaDetalhe === 'consolidado' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAbaDetalhe('consolidado')}>📋 Insumos</button>
                <button className={`btn btn-sm ${abaDetalhe === 'montagem' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAbaDetalhe('montagem')}>🍽️ Montagem</button>
                <button className={`btn btn-sm ${abaDetalhe === 'impressao' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAbaDetalhe('impressao')} style={{ borderColor: '#7B1A1A' }}>🖨️ Imprimir</button>
              </div>

              {/* ── ABA: Consolidado ── */}
              {abaDetalhe === 'consolidado' && (
                <div>
                  {Object.entries(porGrupo).map(([grupo, lista]) => {
                    const subtotal = lista.reduce((s, i) => s + i.totalGramas, 0);
                    const cor = GRUPO_COLORS[grupo] || 'var(--primary)';
                    const icon = GRUPO_ICONS[grupo] || '🥘';
                    return (
                      <div key={grupo} style={{ marginBottom: 24 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 14px', borderRadius: 8,
                          background: cor + '18', borderLeft: `4px solid ${cor}`, marginBottom: 8,
                        }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cor }}>
                            {icon} {grupo}
                            <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--gray-500)', marginLeft: 8 }}>{lista.length} preparo(s)</span>
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: cor }}>Subtotal: {fmt(subtotal)}</span>
                        </div>
                        <div className="table-wrapper" style={{ marginBottom: 0 }}>
                          <table>
                            <thead><tr>
                              <th>Alimento</th><th>Modo de Preparo</th>
                              <th style={{ textAlign: 'right' }}>g / prato</th>
                              <th style={{ textAlign: 'right' }}>Pratos</th>
                              <th style={{ textAlign: 'right', color: cor }}>Total</th>
                            </tr></thead>
                            <tbody>
                              {lista.map((item, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 600 }}>{item.alimento}</td>
                                  <td style={{ color: 'var(--gray-600)' }}>{item.preparo}</td>
                                  <td style={{ textAlign: 'right', color: 'var(--gray-500)' }}>{item.gramagem} g</td>
                                  <td style={{ textAlign: 'right', color: 'var(--gray-500)' }}>{item.totalPratos}×</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: cor }}>{fmt(item.totalGramas)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', marginTop: 4,
                    background: '#f1f5f9', borderRadius: 8, border: '1px solid #e2e8f0',
                  }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--gray-800)' }}>
                      ⚖️ Total Geral:&nbsp;
                      <span style={{ color: 'var(--primary-dark)', fontSize: '1.15rem' }}>{fmt(totalGeralGramas)}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* ── ABA: Montagem ── */}
              {abaDetalhe === 'montagem' && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 16 }}>
                    Cada lote tem a mesma combinação de itens. A quantidade indica quantos pratos idênticos são montados juntos.
                  </p>
                  {mapaMontagem.map((lote, li) => (
                    <div key={li} style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff',
                      }}>
                        <span style={{ fontWeight: 700 }}>Lote {li + 1}</span>
                        <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: '0.85rem' }}>
                          {lote.quantidade} prato(s) idêntico(s)
                        </span>
                      </div>
                      <div className="table-wrapper" style={{ marginBottom: 0 }}>
                        <table>
                          <thead><tr><th style={{ width: 110 }}>Grupo</th><th>Preparo</th><th style={{ textAlign: 'right', width: 90 }}>Gramagem</th></tr></thead>
                          <tbody>
                            {lote.itens.map((item, ii) => {
                              const cor = GRUPO_COLORS[item.grupoNome] || 'var(--primary)';
                              return (
                                <tr key={ii}>
                                  <td><span style={{ fontSize: '0.75rem', fontWeight: 700, color: cor, textTransform: 'uppercase' }}>{item.grupoNome}</span></td>
                                  <td style={{ fontWeight: 500 }}>
                                    {item.nomeManual || item.preparo}
                                    {item.obs && <div style={{ fontSize: '0.75rem', color: '#92400e', fontStyle: 'italic', marginTop: 2 }}>{item.obs}</div>}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: cor }}>{item.gramagem > 0 ? `${item.gramagem} g` : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── ABA: Impressão (com seleção) ── */}
              {abaDetalhe === 'impressao' && (
                <div>
                  <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', border: '1px solid var(--gray-300)', borderRadius: 8, overflow: 'hidden' }}>
                      {[
                        { key: 'descritivo', label: 'Descritivo Individual' },
                        { key: 'plano', label: 'Plano de Produção' },
                        { key: 'ambos', label: 'Ambos' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setDocImpressao(key)}
                          style={{
                            padding: '7px 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                            border: 'none', borderLeft: key !== 'descritivo' ? '1px solid var(--gray-300)' : 'none',
                            background: docImpressao === key ? '#7B1A1A' : '#fff',
                            color: docImpressao === key ? '#fff' : 'var(--gray-600)',
                          }}
                        >{label}</button>
                      ))}
                    </div>
                    <button className="btn btn-primary" onClick={handlePrint}>Imprimir</button>
                    <button className="btn btn-secondary" onClick={handlePrint} title="No diálogo de impressão, selecione 'Salvar como PDF'">
                      Salvar PDF
                      <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginLeft: 6 }}>(selecione PDF no diálogo)</span>
                    </button>
                  </div>

                  <div className="print-area">
                    {/* ── DESCRITIVO INDIVIDUAL ── */}
                    {(docImpressao === 'descritivo' || docImpressao === 'ambos') && (
                      <div className="print-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #7B1A1A', paddingBottom: 12, marginBottom: 20 }}>
                          <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7B1A1A' }}>Descritivo Individual — Cardápio por Lote</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginTop: 2 }}>Cliente: {cliente}</div>
                            {nutri && <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>Nutricionista: {nutri}</div>}
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                            <div>{totalPratos} pratos no total</div>
                            <div style={{ marginTop: 4 }}>Gerado em {dataImp}</div>
                          </div>
                        </div>
                        {obsLeg && (
                          <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', marginBottom: 2 }}>Observações importantes</div>
                            <div style={{ fontSize: '0.9rem', color: '#78350f' }}>{obsLeg}</div>
                          </div>
                        )}
                        {mapaMontagem.map((lote, li) => (
                          <div key={li} style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: '#7B1A1A', color: '#fff' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Lote {li + 1}</span>
                              <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: '0.8rem' }}>{lote.quantidade} prato(s)</span>
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
                                {lote.itens.map((item, ii) => (
                                  <tr key={ii} style={{ background: ii % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                    <td style={{ padding: '6px 12px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569' }}>{item.grupoNome}</td>
                                    <td style={{ padding: '6px 12px', border: '1px solid #e2e8f0' }}>
                                      <span style={{ fontWeight: 500 }}>{item.nomeManual || item.preparo}</span>
                                      {item.obs && <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 2, fontStyle: 'italic' }}>Obs: {item.obs}</div>}
                                    </td>
                                    <td style={{ padding: '6px 12px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>{item.gramagem > 0 ? `${item.gramagem} g` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <span>Meal Time Ultracongelados</span>
                          {nutri && <span>Nutricionista: {nutri}</span>}
                          <span>{dataImp}</span>
                        </div>
                      </div>
                    )}

                    {/* ── PLANO DE PRODUÇÃO ── */}
                    {(docImpressao === 'plano' || docImpressao === 'ambos') && (
                      <div className="print-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #7B1A1A', paddingBottom: 12, marginBottom: 20 }}>
                          <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7B1A1A' }}>Plano de Produção — Insumos Consolidados</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginTop: 2 }}>Cliente: {cliente}</div>
                            {nutri && <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>Nutricionista: {nutri}</div>}
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                            <div>{totalPratos} pratos no total</div>
                            <div style={{ marginTop: 4 }}>Gerado em {dataImp}</div>
                          </div>
                        </div>
                        {obsLeg && (
                          <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', marginBottom: 2 }}>Observações importantes</div>
                            <div style={{ fontSize: '0.9rem', color: '#78350f' }}>{obsLeg}</div>
                          </div>
                        )}
                        {Object.entries(porGrupo).map(([grupo, lista]) => {
                          const subtotal = lista.reduce((s, i) => s + i.totalGramas, 0);
                          return (
                            <div key={grupo} style={{ marginBottom: 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderRadius: 6, background: '#f1f5f9', borderLeft: '4px solid #7B1A1A', marginBottom: 6 }}>
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
                                      <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#475569' }}>{item.totalPratos}×</td>
                                      <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: '#7B1A1A' }}>{fmt(item.totalGramas)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px', background: '#f1f5f9', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                            Total Geral:&nbsp;<span style={{ color: '#7B1A1A', fontSize: '1.1rem' }}>{fmt(totalGeralGramas)}</span>
                          </span>
                        </div>
                        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <span>Meal Time Ultracongelados</span>
                          {nutri && <span>Nutricionista: {nutri}</span>}
                          <span>{dataImp}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
