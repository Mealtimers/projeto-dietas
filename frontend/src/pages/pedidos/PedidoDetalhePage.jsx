import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { pedidosApi, aprovacoesApi, ordensApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const GRUPO_ORDER = ['Proteína', 'Carboidrato', 'Leguminosa', 'Legume'];

const GRUPO_COLOR = {
  Proteína:    { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  Carboidrato: { bg: '#fefce8', border: '#fde68a', text: '#92400e' },
  Leguminosa:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  Legume:      { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
};

export default function PedidoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msgSuccess, setMsgSuccess] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [enviandoAprovacao, setEnviandoAprovacao] = useState(false);
  const [gerandoOrdem, setGerandoOrdem] = useState(false);
  const [versaoSelecionada, setVersaoSelecionada] = useState(null);

  const loadPedido = useCallback(async () => {
    const res = await pedidosApi.buscar(id);
    setPedido(res.data);
    setVersaoSelecionada(null);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadPedido()
      .catch(() => setError('Erro ao carregar pedido.'))
      .finally(() => setLoading(false));
  }, [loadPedido]);

  const showSuccess = (msg) => {
    setMsgSuccess(msg);
    setTimeout(() => setMsgSuccess(null), 4000);
  };

  const handleGerarCardapio = async () => {
    setGerando(true);
    setError(null);
    try {
      const res = await pedidosApi.gerarCardapio(id);
      showSuccess(`Cardápio v${res.data.versaoNumero} gerado com sucesso!`);
      await loadPedido();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar cardápio.');
    } finally {
      setGerando(false);
    }
  };

  const handleEnviarParaAprovacao = async () => {
    setEnviandoAprovacao(true);
    setError(null);
    try {
      await pedidosApi.atualizarStatus(id, { status: 'AGUARDANDO_APROVACAO' });
      await aprovacoesApi.aprovarOuReprovar(id, { status: 'PENDENTE' }).catch(() => {});
      showSuccess('Pedido enviado para aprovação.');
      await loadPedido();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar para aprovação.');
    } finally {
      setEnviandoAprovacao(false);
    }
  };

  const handleGerarOrdem = async () => {
    setGerandoOrdem(true);
    setError(null);
    try {
      await ordensApi.gerar(id);
      showSuccess('Ordem de produção gerada!');
      await loadPedido();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar ordem de produção.');
    } finally {
      setGerandoOrdem(false);
    }
  };

  const formatDate = (date) => date
    ? new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

  if (loading) return <div className="loading">Carregando...</div>;
  if (error && !pedido) return <div className="page-content"><div className="alert alert-error">{error}</div></div>;
  if (!pedido) return null;

  const canGerar         = pedido.status === 'PENDENTE';
  const canReGerar       = ['GERADO', 'REPROVADO'].includes(pedido.status);
  const canEnviarAprov   = pedido.status === 'GERADO';
  const canGerarOrdem    = pedido.status === 'APROVADO' && !pedido.ordemProducao;

  const versoes      = pedido.versoes || [];
  const versaoAtiva  = versoes.find((v) => v.ativo);
  const versaoExibida = versaoSelecionada
    ? versoes.find((v) => v.id === versaoSelecionada)
    : versaoAtiva;

  const totalPratosVersao = versaoExibida
    ? versaoExibida.lotes.reduce((s, l) => s + l.quantidade, 0)
    : 0;

  // Ordem de produção — parse itensConsolidados
  const ordem    = pedido.ordemProducao;
  const dadosOrdem = ordem?.itensConsolidados ?? null;
  const consolidadoCozinha = dadosOrdem?.consolidadoCozinha ?? [];
  const mapaMontagem       = dadosOrdem?.mapaMontagem       ?? [];

  return (
    <>
      <div className="page-header">
        <h1>Pedido — {pedido.cliente?.nome}</h1>
        <div className="btn-group">
          <StatusBadge status={pedido.status} />
          <Link to="/pedidos" className="btn btn-outline">Voltar</Link>
        </div>
      </div>

      <div className="page-content">
        {error     && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
        {msgSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msgSuccess}</div>}

        {/* ── Informações ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Informações do Pedido</div>
          <div className="detail-grid">
            <div className="detail-item"><label>Cliente</label>
              <span><Link to={`/clientes/${pedido.clienteId}`}>{pedido.cliente?.nome}</Link></span>
            </div>
            <div className="detail-item"><label>Total de Pratos</label><span>{pedido.totalPratos} pratos</span></div>
            <div className="detail-item"><label>Máx. Repetições</label><span>{pedido.maxRepeticoes}× por preparo</span></div>
            <div className="detail-item"><label>Mín. por Lote</label><span>{pedido.minRepeticoesLote} pratos/lote</span></div>
            <div className="detail-item"><label>Status</label><span><StatusBadge status={pedido.status} /></span></div>
            <div className="detail-item"><label>Criado em</label><span>{formatDate(pedido.createdAt)}</span></div>
          </div>
          {pedido.observacoes && (
            <div className="detail-item" style={{ marginTop: 12 }}>
              <label>Observações</label>
              <span style={{ display: 'block', marginTop: 4 }}>{pedido.observacoes}</span>
            </div>
          )}
        </div>

        {/* ── Proteínas ── */}
        {pedido.proteinas?.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Distribuição de Proteínas</div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Proteína Base</th><th>Gramagem</th><th>Pratos</th></tr></thead>
                <tbody>
                  {pedido.proteinas.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.alimentoBase?.nome}</td>
                      <td>{p.gramagem}g</td>
                      <td><span style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{p.quantidadePratos}×</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Itens Permitidos ── */}
        {pedido.itensPermitidos?.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Itens Permitidos</div>
            {['Carboidrato', 'Leguminosa', 'Legume'].map((grupo) => {
              const itens = pedido.itensPermitidos.filter((i) => i.grupoNome === grupo);
              if (itens.length === 0) return null;
              const cor = GRUPO_COLOR[grupo];
              return (
                <div key={grupo} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: cor.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    {grupo}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {itens.map((item) => (
                      <span key={item.id} style={{
                        padding: '4px 14px', borderRadius: 20, fontSize: '0.875rem',
                        background: cor.bg, border: `1px solid ${cor.border}`, color: cor.text,
                      }}>
                        {item.alimentoBase?.nome}
                        <span style={{ marginLeft: 6, fontWeight: 700 }}>{item.gramagemBase}g</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Ações ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Ações</div>
          <div className="btn-group">
            {canGerar && (
              <button className="btn btn-primary" onClick={handleGerarCardapio} disabled={gerando}>
                {gerando ? 'Gerando...' : 'Gerar Cardápio'}
              </button>
            )}
            {canReGerar && (
              <button className="btn btn-secondary" onClick={handleGerarCardapio} disabled={gerando}>
                {gerando ? 'Regerando...' : 'Gerar Nova Versão'}
              </button>
            )}
            {canEnviarAprov && (
              <button className="btn btn-warning" onClick={handleEnviarParaAprovacao} disabled={enviandoAprovacao}>
                {enviandoAprovacao ? 'Enviando...' : 'Enviar para Aprovação'}
              </button>
            )}
            {pedido.status === 'AGUARDANDO_APROVACAO' && (
              <Link to="/aprovacoes" className="btn btn-warning">Ir para Aprovações</Link>
            )}
            {canGerarOrdem && (
              <button className="btn btn-success" onClick={handleGerarOrdem} disabled={gerandoOrdem}>
                {gerandoOrdem ? 'Gerando...' : 'Gerar Ordem de Produção'}
              </button>
            )}
            {ordem && (
              <Link to="/producao" className="btn btn-secondary">
                Ver Produção ({ordem.status})
              </Link>
            )}
          </div>
          {pedido.status === 'REPROVADO' && (
            <div className="alert alert-error" style={{ marginTop: 12 }}>
              Este pedido foi reprovado.
              {pedido.aprovacao?.observacoes && (
                <div style={{ marginTop: 6 }}><strong>Motivo:</strong> {pedido.aprovacao.observacoes}</div>
              )}
            </div>
          )}
        </div>

        {/* ── Aprovação ── */}
        {pedido.aprovacao && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Aprovação</div>
            <div className="detail-grid">
              <div className="detail-item"><label>Status</label><span><StatusBadge status={pedido.aprovacao.status} /></span></div>
              <div className="detail-item"><label>Data</label><span>{formatDate(pedido.aprovacao.dataAprovacao)}</span></div>
            </div>
            {pedido.aprovacao.observacoes && (
              <div className="detail-item" style={{ marginTop: 8 }}>
                <label>Observações</label>
                <span style={{ display: 'block', marginTop: 4 }}>{pedido.aprovacao.observacoes}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Histórico de Versões + Cardápio ── */}
        {versoes.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-600)' }}>Geração:</span>
              {versoes.map((v) => {
                const ativa   = v.ativo;
                const selecionada = versaoSelecionada === v.id || (versaoSelecionada === null && ativa);
                return (
                  <button
                    key={v.id}
                    onClick={() => setVersaoSelecionada(selecionada ? null : v.id)}
                    style={{
                      padding: '4px 14px', borderRadius: 20, cursor: 'pointer',
                      border: `1px solid ${ativa ? 'var(--primary)' : 'var(--gray-300)'}`,
                      background: selecionada ? 'var(--primary)' : 'transparent',
                      color: selecionada ? '#fff' : ativa ? 'var(--primary-dark)' : 'var(--gray-600)',
                      fontWeight: ativa ? 700 : 400, fontSize: '0.875rem',
                    }}
                  >
                    v{v.numero}{ativa ? ' ✓ ativa' : ''}
                  </button>
                );
              })}
            </div>

            {versaoExibida && (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>
                  Cardápio — v{versaoExibida.numero}
                  {versaoExibida.ativo && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 400 }}>versão ativa</span>}
                  {' — '}{versaoExibida.lotes.length} lote(s), {totalPratosVersao} pratos
                  <span style={{ marginLeft: 12, fontSize: '0.8rem', fontWeight: 400, color: 'var(--gray-400)' }}>
                    {formatDate(versaoExibida.criadoEm)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...versaoExibida.lotes]
                    .sort((a, b) => b.quantidade - a.quantidade)
                    .map((lote) => {
                      const itensOrdenados = [...(lote.itens || [])].sort((a, b) =>
                        GRUPO_ORDER.indexOf(a.grupoNome) - GRUPO_ORDER.indexOf(b.grupoNome)
                      );
                      return (
                        <div key={lote.id} style={{
                          display: 'flex', gap: 16, padding: 14,
                          border: '1px solid var(--gray-200)', borderRadius: 8, alignItems: 'flex-start',
                        }}>
                          <div style={{
                            minWidth: 52, height: 52, borderRadius: 8,
                            background: 'var(--primary)', color: '#fff',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
                          }}>
                            {lote.quantidade}
                            <span style={{ fontSize: '0.6rem', fontWeight: 400 }}>pratos</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            {itensOrdenados.map((item) => {
                              const cor = GRUPO_COLOR[item.grupoNome] || {};
                              return (
                                <div key={item.id} style={{
                                  display: 'flex', alignItems: 'baseline', gap: 8,
                                  paddingBottom: 4, marginBottom: 4, borderBottom: '1px solid var(--gray-100)',
                                }}>
                                  <span style={{
                                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                    minWidth: 84, color: cor.text || 'var(--primary-dark)', opacity: 0.85,
                                  }}>
                                    {item.grupoNome}
                                  </span>
                                  <span style={{ fontWeight: 500, flex: 1 }}>{item.preparo?.nome}</span>
                                  {item.gramagem > 0 && (
                                    <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 600 }}>
                                      {item.gramagem}g
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Ordem de Produção ── */}
        {ordem && dadosOrdem && (
          <>
            {/* Consolidado de Cozinha */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">
                Consolidado de Cozinha
                <span style={{ marginLeft: 12, fontSize: '0.8rem', fontWeight: 400, color: 'var(--gray-400)' }}>
                  V{dadosOrdem.versaoNumero} · {formatDate(dadosOrdem.geradoEm)} · {dadosOrdem.totalPratos} pratos
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <StatusBadge status={ordem.status} />
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>ordem #{ordem.id.slice(-6)}</span>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Preparo</th>
                      <th style={{ textAlign: 'right' }}>Pratos</th>
                      <th style={{ textAlign: 'right' }}>Gramagem unit.</th>
                      <th style={{ textAlign: 'right' }}>Total (g)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidadoCozinha.map((item) => {
                      const cor = GRUPO_COLOR[item.grupo] || {};
                      return (
                        <tr key={item.preparoId}>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem',
                              fontWeight: 700, background: cor.bg, color: cor.text,
                              border: `1px solid ${cor.border}`,
                            }}>
                              {item.grupo}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{item.preparo}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.totalPratos}×</td>
                          <td style={{ textAlign: 'right', color: 'var(--gray-500)' }}>{item.gramagem}g</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>
                            {item.totalGramas}g
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mapa de Montagem */}
            {mapaMontagem.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title">Mapa de Montagem</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 14 }}>
                  Combinações por lote para guiar a montagem na cozinha.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mapaMontagem.map((lote, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 14, padding: 14,
                      border: '1px solid var(--gray-200)', borderRadius: 8,
                    }}>
                      <div style={{
                        minWidth: 52, height: 52, borderRadius: 8,
                        background: 'var(--primary-dark)', color: '#fff',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
                      }}>
                        {lote.quantidade}
                        <span style={{ fontSize: '0.6rem', fontWeight: 400 }}>pratos</span>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {lote.itens.map((item, j) => {
                          const cor = GRUPO_COLOR[item.grupoNome] || {};
                          return (
                            <span key={j} style={{
                              padding: '4px 12px', borderRadius: 20, fontSize: '0.85rem',
                              background: cor.bg, border: `1px solid ${cor.border}`, color: cor.text,
                            }}>
                              <span style={{ fontWeight: 400, fontSize: '0.7rem', marginRight: 4, opacity: 0.7 }}>
                                {item.grupoNome}
                              </span>
                              <strong>{item.preparo}</strong>
                              <span style={{ marginLeft: 4, opacity: 0.7 }}>{item.gramagem}g</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
