import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { pedidosApi, aprovacoesApi, ordensApi, lotesApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const GRUPO_ORDER = ['Proteína', 'Carboidrato', 'Leguminosa', 'Legumes', 'Molho'];

const GRUPO_COLOR = {
  Proteína:    { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  Carboidrato: { bg: '#fefce8', border: '#fde68a', text: '#92400e' },
  Leguminosa:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  Legumes:     { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  Molho:       { bg: '#fdf4ff', border: '#e9d5ff', text: '#7c3aed' },
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

  // Financeiro
  const [valorInput, setValorInput]   = useState('');
  const [salvandoValor, setSalvandoValor] = useState(false);

  // Edit per lote
  const [editandoLoteId, setEditandoLoteId] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Molho
  const [molhoModalLoteId, setMolhoModalLoteId] = useState(null);
  const [molhos, setMolhos] = useState([]);
  const [loadingMolhos, setLoadingMolhos] = useState(false);
  const [addingMolho, setAddingMolho] = useState(false);

  const loadPedido = useCallback(async () => {
    const res = await pedidosApi.buscar(id);
    setPedido(res.data);
    setValorInput(res.data.valorTotal != null ? String(res.data.valorTotal) : '');
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

  const handleSalvarValor = async () => {
    setSalvandoValor(true);
    setError(null);
    try {
      const v = valorInput.trim().replace(',', '.');
      await pedidosApi.atualizarValor(id, { valorTotal: v === '' ? null : parseFloat(v) });
      showSuccess('Valor do pedido salvo!');
      await loadPedido();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar valor.');
    } finally {
      setSalvandoValor(false);
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

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const startEdit = (lote) => {
    const initial = {};
    lote.itens.forEach((item) => {
      if (item.grupoNome !== 'Molho') {
        initial[item.id] = {
          nome:     item.nomeManual ?? item.preparo?.nome ?? '',
          gramagem: String(item.gramagem ?? ''),
          obs:      item.obs ?? '',
        };
      }
    });
    setEditData(initial);
    setEditandoLoteId(lote.id);
    setMolhoModalLoteId(null);
  };

  const cancelEdit = () => {
    setEditandoLoteId(null);
    setEditData({});
  };

  const saveEdit = async (lote) => {
    setSavingEdit(true);
    setError(null);
    try {
      const itensEditaveis = lote.itens.filter((i) => i.grupoNome !== 'Molho' && editData[i.id]);
      await Promise.all(
        itensEditaveis.map((item) => {
          const d = editData[item.id];
          const nomeOriginal = item.preparo?.nome ?? '';
          const nomeManual   = d.nome !== nomeOriginal ? d.nome.trim() : null;
          return lotesApi.atualizarItem(lote.id, item.id, {
            nomeManual: nomeManual || null,
            gramagem:   parseFloat(d.gramagem) || item.gramagem,
            obs:        d.obs.trim() || null,
          });
        })
      );
      showSuccess('Refeição atualizada!');
      setEditandoLoteId(null);
      setEditData({});
      await loadPedido();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar edição.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Molho handlers ─────────────────────────────────────────────────────────

  const openMolhoModal = async (loteId) => {
    setMolhoModalLoteId((prev) => (prev === loteId ? null : loteId));
    setEditandoLoteId(null);
    if (molhos.length === 0) {
      setLoadingMolhos(true);
      try {
        const res = await lotesApi.molhos();
        setMolhos(res.data);
      } catch {
        setError('Erro ao carregar molhos.');
      } finally {
        setLoadingMolhos(false);
      }
    }
  };

  const handleAdicionarMolho = async (loteId, preparoId) => {
    setAddingMolho(true);
    setError(null);
    try {
      await lotesApi.adicionarMolho(loteId, { preparoId });
      await loadPedido();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar molho.');
    } finally {
      setAddingMolho(false);
    }
  };

  const handleRemoverMolho = async (loteId, itemId) => {
    setError(null);
    try {
      await lotesApi.removerItem(loteId, itemId);
      await loadPedido();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao remover molho.');
    }
  };

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '-';

  // Build preparos lookup for edit mode — must be before early returns (Rules of Hooks)
  const preparosPorGrupo = useMemo(() => {
    if (!pedido) return {};
    const map = { Carboidrato: [], Leguminosa: [], Legumes: [], 'Proteína': {} };
    ['Carboidrato', 'Leguminosa', 'Legumes'].forEach((g) => {
      map[g] = pedido.itensPermitidos
        .filter((i) => i.grupoNome === g)
        .map((i) => i.preparo)
        .filter(Boolean);
    });
    pedido.proteinas.forEach((p) => {
      const todos = p.alimentoBase?.preparos ?? [];
      const permitidos =
        p.preparosIds?.length > 0 ? todos.filter((prep) => p.preparosIds.includes(prep.id)) : todos;
      map['Proteína'][p.alimentoBaseId] = permitidos;
    });
    return map;
  }, [pedido]);

  if (loading) return <div className="loading">Carregando...</div>;
  if (error && !pedido) return <div className="page-content"><div className="alert alert-error">{error}</div></div>;
  if (!pedido) return null;

  const canGerar        = pedido.status === 'PENDENTE';
  const canReGerar      = ['GERADO', 'REPROVADO'].includes(pedido.status);
  const canEnviarAprov  = pedido.status === 'GERADO';
  const canGerarOrdem   = pedido.status === 'APROVADO' && !pedido.ordemProducao;

  const versoes       = pedido.versoes || [];
  const versaoAtiva   = versoes.find((v) => v.ativo);
  const versaoExibida = versaoSelecionada
    ? versoes.find((v) => v.id === versaoSelecionada)
    : versaoAtiva;

  const canEditCardapio = versaoAtiva && ['GERADO', 'REPROVADO'].includes(pedido.status);

  const totalPratosVersao = versaoExibida
    ? versaoExibida.lotes.reduce((s, l) => s + l.quantidade, 0)
    : 0;

  const ordem           = pedido.ordemProducao;
  const dadosOrdem      = ordem?.itensConsolidados ?? null;
  const consolidadoCozinha = dadosOrdem?.consolidadoCozinha ?? [];
  const mapaMontagem       = dadosOrdem?.mapaMontagem       ?? [];

  return (
    <>
      <div className="page-header">
        <h1>Pedido — {pedido.cliente?.nome}</h1>
        <div className="btn-group">
          <StatusBadge status={pedido.status} />
          {!['APROVADO', 'CONCLUIDO', 'CANCELADO'].includes(pedido.status) && (
            <Link to={`/pedidos/${id}/editar`} className="btn btn-secondary">
              {pedido.status === 'EM_PRODUCAO' ? '✏️ Editar (em produção)' : 'Editar'}
            </Link>
          )}
          <Link to={`/pedidos/novo?repetirDe=${id}`} className="btn btn-ghost" title="Repetir este pedido">🔄 Repetir</Link>
          <Link to="/pedidos" className="btn btn-outline">Voltar</Link>
        </div>
      </div>

      <div className="page-content">
        {error      && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
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
          {pedido.nutricionista && (
            <div className="detail-item">
              <label>Nutricionista Responsável</label>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>👨‍⚕️ {pedido.nutricionista}</span>
            </div>
          )}
        </div>

        {/* ── Proteínas ── */}
        {pedido.proteinas?.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Distribuição de Proteínas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pedido.proteinas.map((p) => {
                const todosPreparos = p.alimentoBase?.preparos ?? [];
                const preparosSel   = p.preparosIds?.length > 0
                  ? todosPreparos.filter((prep) => p.preparosIds.includes(prep.id))
                  : todosPreparos;
                const cor = GRUPO_COLOR['Proteína'];
                return (
                  <div key={p.id} style={{ padding: '10px 14px', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: preparosSel.length > 0 ? 8 : 0 }}>
                      <span style={{ fontWeight: 600, flex: 1 }}>{p.alimentoBase?.nome}</span>
                      <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{p.gramagem}g</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-dark)', minWidth: 40, textAlign: 'right' }}>{p.quantidadePratos}×</span>
                    </div>
                    {preparosSel.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {preparosSel.map((prep) => (
                          <span key={prep.id} style={{
                            padding: '3px 10px', borderRadius: 14, fontSize: '0.8rem',
                            background: cor.bg, border: `1px solid ${cor.border}`, color: cor.text,
                          }}>
                            {prep.nome}
                          </span>
                        ))}
                        {p.preparosIds?.length === 0 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic', alignSelf: 'center' }}>todos os preparos ativos</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Preparos Selecionados ── */}
        {pedido.itensPermitidos?.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Preparos Selecionados</div>
            {pedido.obsLegumes && (
              <div style={{
                background: '#fffbeb', border: '2px solid #f59e0b',
                borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    Observações importantes
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#78350f' }}>{pedido.obsLegumes}</div>
                </div>
              </div>
            )}
            {['Carboidrato', 'Leguminosa', 'Legumes'].map((grupo) => {
              const itens = pedido.itensPermitidos.filter((i) => i.grupoNome === grupo);
              if (itens.length === 0) return null;
              const cor = GRUPO_COLOR[grupo];
              const gramagem = itens[0]?.gramagemBase;
              const porAlimento = {};
              for (const item of itens) {
                const nomeAlimento = item.preparo?.alimento?.nome ?? item.preparo?.nome ?? '—';
                if (!porAlimento[nomeAlimento]) porAlimento[nomeAlimento] = [];
                porAlimento[nomeAlimento].push(item.preparo?.nome ?? '—');
              }
              return (
                <div key={grupo} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cor.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {grupo}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: cor.text, background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: 10, padding: '1px 8px', fontWeight: 600 }}>
                      {gramagem}g
                      {grupo === 'Carboidrato' && <span style={{ fontWeight: 400, marginLeft: 4 }}>ref. Arroz Branco</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(porAlimento).map(([alimento, preparos]) => (
                      <div key={alimento} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)', minWidth: 100 }}>{alimento}</span>
                        {preparos.map((p, i) => (
                          <span key={i} style={{
                            padding: '3px 12px', borderRadius: 14, fontSize: '0.8rem',
                            background: cor.bg, border: `1px solid ${cor.border}`, color: cor.text,
                          }}>
                            {p}
                          </span>
                        ))}
                      </div>
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

        {/* ── Financeiro ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Financeiro</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--gray-600)', fontWeight: 500 }}>Valor do pedido (R$)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.95rem', color: 'var(--gray-500)' }}>R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
                  placeholder="0,00"
                  style={{
                    width: 110, padding: '6px 10px', borderRadius: 8, fontSize: '1rem',
                    border: '1px solid var(--gray-300)', textAlign: 'right', fontWeight: 600,
                  }}
                />
              </div>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSalvarValor}
                disabled={salvandoValor}
              >
                {salvandoValor ? '...' : 'Salvar'}
              </button>
            </div>
            {pedido.valorTotal != null && (
              <div style={{
                padding: '6px 16px', borderRadius: 20,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                fontSize: '1rem', fontWeight: 700, color: '#166534',
              }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valorTotal)}
              </div>
            )}
          </div>
        </div>

        {/* ── Histórico de Versões + Cardápio ── */}
        {versoes.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-600)' }}>Geração:</span>
              {versoes.map((v) => {
                const ativa      = v.ativo;
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
                      const isEditing = editandoLoteId === lote.id;
                      const isMolhoOpen = molhoModalLoteId === lote.id;

                      const itensOrdenados = [...(lote.itens || [])].sort(
                        (a, b) => GRUPO_ORDER.indexOf(a.grupoNome) - GRUPO_ORDER.indexOf(b.grupoNome)
                      );

                      const molhosDoLote  = itensOrdenados.filter((i) => i.grupoNome === 'Molho');
                      const itensNormais  = itensOrdenados.filter((i) => i.grupoNome !== 'Molho');

                      return (
                        <div key={lote.id} style={{
                          border: `1px solid ${isEditing ? 'var(--primary)' : 'var(--gray-200)'}`,
                          borderRadius: 8, overflow: 'hidden',
                          transition: 'border-color 0.15s',
                        }}>
                          {/* Lote header */}
                          <div style={{ display: 'flex', gap: 16, padding: 14, alignItems: 'flex-start' }}>
                            <div style={{
                              minWidth: 52, height: 52, borderRadius: 8,
                              background: isEditing ? 'var(--primary-dark)' : 'var(--primary)', color: '#fff',
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
                            }}>
                              {lote.quantidade}
                              <span style={{ fontSize: '0.6rem', fontWeight: 400 }}>pratos</span>
                            </div>

                            <div style={{ flex: 1 }}>
                              {/* Normal items */}
                              {itensNormais.map((item) => {
                                const cor = GRUPO_COLOR[item.grupoNome] || {};

                                // Edit mode: campos livres (nome, gramagem, obs)
                                if (isEditing) {
                                  const d = editData[item.id] || { nome: item.preparo?.nome ?? '', gramagem: String(item.gramagem), obs: '' };
                                  const setField = (field, val) =>
                                    setEditData((prev) => ({ ...prev, [item.id]: { ...prev[item.id], [field]: val } }));
                                  return (
                                    <div key={item.id} style={{
                                      paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--gray-100)',
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{
                                          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                          minWidth: 84, color: cor.text || 'var(--primary-dark)', opacity: 0.85, flexShrink: 0,
                                        }}>
                                          {item.grupoNome}
                                        </span>
                                        <input
                                          type="text"
                                          value={d.nome}
                                          onChange={(e) => setField('nome', e.target.value)}
                                          style={{
                                            flex: 1, padding: '3px 8px', borderRadius: 6, fontSize: '0.85rem',
                                            border: `1px solid ${d.nome !== (item.preparo?.nome ?? '') ? 'var(--primary)' : 'var(--gray-300)'}`,
                                            background: d.nome !== (item.preparo?.nome ?? '') ? 'var(--primary-bg)' : '#fff',
                                          }}
                                          placeholder="Nome do preparo"
                                        />
                                        <input
                                          type="number"
                                          value={d.gramagem}
                                          onChange={(e) => setField('gramagem', e.target.value)}
                                          min="0"
                                          style={{
                                            width: 64, padding: '3px 6px', borderRadius: 6, fontSize: '0.85rem',
                                            border: `1px solid ${String(d.gramagem) !== String(item.gramagem) ? 'var(--primary)' : 'var(--gray-300)'}`,
                                            background: String(d.gramagem) !== String(item.gramagem) ? 'var(--primary-bg)' : '#fff',
                                            textAlign: 'right',
                                          }}
                                        />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', flexShrink: 0 }}>g</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 92 }}>
                                        <input
                                          type="text"
                                          value={d.obs}
                                          onChange={(e) => setField('obs', e.target.value)}
                                          placeholder="OBS (opcional)"
                                          style={{
                                            flex: 1, padding: '3px 8px', borderRadius: 6, fontSize: '0.78rem',
                                            border: `1px solid ${d.obs ? '#f59e0b' : 'var(--gray-200)'}`,
                                            background: d.obs ? '#fffbeb' : '#fafafa',
                                            color: d.obs ? '#92400e' : 'var(--gray-500)',
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                }

                                // Normal display
                                const nomeExibido = item.nomeManual || item.preparo?.nome;
                                return (
                                  <div key={item.id} style={{
                                    paddingBottom: 4, marginBottom: 4, borderBottom: '1px solid var(--gray-100)',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                      <span style={{
                                        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                        minWidth: 84, color: cor.text || 'var(--primary-dark)', opacity: 0.85, flexShrink: 0,
                                      }}>
                                        {item.grupoNome}
                                      </span>
                                      <span style={{
                                        fontWeight: 500, flex: 1,
                                        color: item.nomeManual ? 'var(--primary-dark)' : 'inherit',
                                      }}>
                                        {nomeExibido}
                                        {item.nomeManual && (
                                          <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--primary)', fontStyle: 'italic' }}>editado</span>
                                        )}
                                      </span>
                                      {item.gramagem > 0 && (
                                        <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontWeight: 600, flexShrink: 0 }}>
                                          {item.gramagem}g
                                        </span>
                                      )}
                                    </div>
                                    {item.obs && (
                                      <div style={{
                                        paddingLeft: 92, fontSize: '0.78rem', color: '#92400e',
                                        background: '#fffbeb', borderRadius: 4, padding: '2px 8px 2px 92px',
                                        marginTop: 2, fontStyle: 'italic',
                                      }}>
                                        ⚠️ {item.obs}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Molhos do lote */}
                              {molhosDoLote.map((item) => {
                                const cor = GRUPO_COLOR['Molho'];
                                return (
                                  <div key={item.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    paddingBottom: 4, marginBottom: 4, borderBottom: '1px solid var(--gray-100)',
                                  }}>
                                    <span style={{
                                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                      minWidth: 84, color: cor.text, opacity: 0.85,
                                    }}>
                                      Molho
                                    </span>
                                    <span style={{
                                      fontWeight: 500, flex: 1,
                                      padding: '2px 10px', borderRadius: 12, fontSize: '0.85rem',
                                      background: cor.bg, border: `1px solid ${cor.border}`, color: cor.text,
                                      display: 'inline-block',
                                    }}>
                                      {item.preparo?.nome}
                                    </span>
                                    {canEditCardapio && (
                                      <button
                                        onClick={() => handleRemoverMolho(lote.id, item.id)}
                                        title="Remover molho"
                                        style={{
                                          background: 'none', border: 'none', cursor: 'pointer',
                                          color: 'var(--gray-400)', fontSize: '0.85rem', padding: '0 4px',
                                          lineHeight: 1,
                                        }}
                                      >✕</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Action buttons per lote */}
                            {canEditCardapio && !isEditing && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                <button
                                  onClick={() => startEdit(lote)}
                                  style={{
                                    padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem',
                                    border: '1px solid var(--gray-300)', background: '#fff',
                                    cursor: 'pointer', color: 'var(--gray-600)', whiteSpace: 'nowrap',
                                  }}
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  onClick={() => openMolhoModal(lote.id)}
                                  style={{
                                    padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem',
                                    border: `1px solid ${GRUPO_COLOR.Molho.border}`,
                                    background: isMolhoOpen ? GRUPO_COLOR.Molho.bg : '#fff',
                                    cursor: 'pointer', color: GRUPO_COLOR.Molho.text, whiteSpace: 'nowrap',
                                  }}
                                >
                                  🫙 Molho
                                </button>
                              </div>
                            )}

                            {/* Edit mode buttons */}
                            {isEditing && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                <button
                                  onClick={() => saveEdit(lote)}
                                  disabled={savingEdit}
                                  style={{
                                    padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem',
                                    border: 'none', background: 'var(--primary)',
                                    cursor: 'pointer', color: '#fff', whiteSpace: 'nowrap',
                                  }}
                                >
                                  {savingEdit ? '...' : '✓ Salvar'}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  style={{
                                    padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem',
                                    border: '1px solid var(--gray-300)', background: '#fff',
                                    cursor: 'pointer', color: 'var(--gray-600)', whiteSpace: 'nowrap',
                                  }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Molho panel */}
                          {isMolhoOpen && canEditCardapio && (
                            <div style={{
                              borderTop: `1px solid ${GRUPO_COLOR.Molho.border}`,
                              background: GRUPO_COLOR.Molho.bg,
                              padding: '10px 14px',
                            }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: GRUPO_COLOR.Molho.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                🫙 Adicionar Molho à Proteína
                              </div>
                              {loadingMolhos ? (
                                <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>Carregando...</span>
                              ) : molhos.length === 0 ? (
                                <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                                  Nenhum molho cadastrado. Adicione molhos na{' '}
                                  <Link to="/base-alimentar" style={{ color: GRUPO_COLOR.Molho.text }}>Base Alimentar</Link>{' '}
                                  no grupo "Molho".
                                </span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {molhos.flatMap((alimento) =>
                                    alimento.preparos.map((preparo) => {
                                      const jaAdicionado = molhosDoLote.some((m) => m.preparoId === preparo.id);
                                      return (
                                        <button
                                          key={preparo.id}
                                          onClick={() => !jaAdicionado && !addingMolho && handleAdicionarMolho(lote.id, preparo.id)}
                                          disabled={jaAdicionado || addingMolho}
                                          style={{
                                            padding: '5px 14px', borderRadius: 16, fontSize: '0.85rem',
                                            border: `1.5px solid ${jaAdicionado ? 'var(--gray-300)' : GRUPO_COLOR.Molho.border}`,
                                            background: jaAdicionado ? 'var(--gray-100)' : '#fff',
                                            color: jaAdicionado ? 'var(--gray-400)' : GRUPO_COLOR.Molho.text,
                                            cursor: jaAdicionado ? 'default' : 'pointer',
                                            fontWeight: jaAdicionado ? 400 : 500,
                                          }}
                                        >
                                          {jaAdicionado ? '✓ ' : '+ '}{preparo.nome}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          )}
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
