import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { pedidosApi, clientesApi, alimentosApi, gruposApi } from '../../services/api';

const STATUS_BLOQUEADO = ['APROVADO', 'EM_PRODUCAO', 'CONCLUIDO', 'CANCELADO'];

export default function PedidoFormPage() {
  const navigate = useNavigate();
  const { id: editId }          = useParams();               // /pedidos/:id/editar
  const [searchParams]          = useSearchParams();
  const repetirDeId             = searchParams.get('repetirDe');
  const clienteIdParam          = searchParams.get('clienteId');

  const isEdit   = Boolean(editId);
  const isRepeat = Boolean(repetirDeId) && !isEdit;

  const [clientes, setClientes]   = useState([]);
  const [alimentos, setAlimentos] = useState([]);
  const [grupos, setGrupos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const [clienteId, setClienteId]                 = useState(clienteIdParam || '');
  const [maxRepeticoes, setMaxRepeticoes]         = useState(3);
  const [minRepeticoesLote, setMinRepeticoesLote] = useState(2);
  const [observacoes, setObservacoes]             = useState('');

  const [proteinas, setProteinas] = useState([
    { alimentoBaseId: '', gramagem: '', quantidadePratos: '', preparosIds: new Set() },
  ]);

  const [carboidrato, setCarboidrato] = useState({ ativo: false, gramagem: '', preparos: new Set() });
  const [leguminosa,  setLeguminosa]  = useState({ ativo: false, gramagem: '', preparos: new Set() });
  const [legume,      setLegume]      = useState({ ativo: false, gramagem: '', preparos: new Set() });
  const [obsLegumes,  setObsLegumes]  = useState('');
  const [nutricionista, setNutricionista] = useState('');

  // Pre-fill state from a loaded pedido (edit or repeat)
  const initFromPedido = (pedido) => {
    setClienteId(pedido.clienteId);
    setMaxRepeticoes(pedido.maxRepeticoes);
    setMinRepeticoesLote(pedido.minRepeticoesLote);
    setObservacoes(pedido.observacoes || '');

    setProteinas(
      (pedido.proteinas || []).map((p) => ({
        alimentoBaseId:   p.alimentoBaseId,
        gramagem:         String(p.gramagem),
        quantidadePratos: String(p.quantidadePratos),
        preparosIds:      new Set(p.preparosIds || []),
      }))
    );

    const grupoFromItems = (grupoNome) => {
      const itens = (pedido.itensPermitidos || []).filter((i) => i.grupoNome === grupoNome);
      if (itens.length === 0) return { ativo: false, gramagem: '', preparos: new Set() };
      return {
        ativo:    true,
        gramagem: String(itens[0].gramagemBase),
        preparos: new Set(itens.map((i) => i.preparoId)),
      };
    };

    setCarboidrato(grupoFromItems('Carboidrato'));
    setLeguminosa(grupoFromItems('Leguminosa'));
    setLegume(grupoFromItems('Legumes'));
    setObsLegumes(pedido.obsLegumes || '');
    setNutricionista(pedido.nutricionista || '');
  };

  useEffect(() => {
    const pedidoSource = isEdit ? editId : repetirDeId;

    const promises = [clientesApi.listar(), alimentosApi.listar(), gruposApi.listar()];
    if (pedidoSource) promises.push(pedidosApi.buscar(pedidoSource));

    Promise.all(promises)
      .then(([cRes, aRes, gRes, pRes]) => {
        setClientes(cRes.data);
        setAlimentos(aRes.data.filter((a) => a.ativo !== false));
        setGrupos(gRes.data);
        if (pRes) {
          const pedido = pRes.data;
          if (isEdit && STATUS_BLOQUEADO.includes(pedido.status)) {
            setError(`Pedido com status "${pedido.status}" não pode ser editado.`);
          } else {
            initFromPedido(pedido);
          }
        } else if (clienteIdParam) {
          setClienteId(clienteIdParam);
        }
      })
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const porGrupo = (nomeGrupo) => {
    const g = grupos.find((gr) => gr.nome === nomeGrupo);
    return g ? alimentos.filter((a) => a.grupoId === g.id) : [];
  };

  // Proteínas
  const addProteina = () =>
    setProteinas((prev) => [...prev, { alimentoBaseId: '', gramagem: '', quantidadePratos: '', preparosIds: new Set() }]);
  const removeProteina = (idx) =>
    setProteinas((prev) => prev.filter((_, i) => i !== idx));
  const updateProteina = (idx, field, value) =>
    setProteinas((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'alimentoBaseId') return { ...item, [field]: value, preparosIds: new Set() };
      return { ...item, [field]: value };
    }));
  const toggleProteinaPreparo = (idx, preparoId) =>
    setProteinas((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const next = new Set(item.preparosIds);
      next.has(preparoId) ? next.delete(preparoId) : next.add(preparoId);
      return { ...item, preparosIds: next };
    }));
  const toggleTodosProteinaPreparo = (idx, todosIds) =>
    setProteinas((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const todosMarcados = todosIds.every((id) => item.preparosIds.has(id));
      return { ...item, preparosIds: todosMarcados ? new Set() : new Set(todosIds) };
    }));

  const togglePreparo = (setter, preparoId) =>
    setter((prev) => {
      const next = new Set(prev.preparos);
      next.has(preparoId) ? next.delete(preparoId) : next.add(preparoId);
      return { ...prev, preparos: next };
    });

  const totalPratos = proteinas.reduce((s, p) => s + (parseInt(p.quantidadePratos) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!clienteId) return setError('Selecione um cliente.');

    const proteinasValidas = proteinas.filter(
      (p) => p.alimentoBaseId && parseFloat(p.gramagem) > 0 && parseInt(p.quantidadePratos) > 0
    );
    if (proteinasValidas.length === 0)
      return setError('Informe ao menos uma proteína com gramagem e quantidade de pratos.');

    const toGrupo = (g) =>
      g.ativo && g.preparos.size > 0 && parseFloat(g.gramagem) > 0
        ? { gramagem: parseFloat(g.gramagem), preparos: Array.from(g.preparos) }
        : { gramagem: 0, preparos: [] };

    const payload = {
      totalPratos,
      maxRepeticoes:     parseInt(maxRepeticoes),
      minRepeticoesLote: parseInt(minRepeticoesLote),
      observacoes,
      proteinas: proteinasValidas.map((p) => ({
        alimentoBaseId:   p.alimentoBaseId,
        gramagem:         parseFloat(p.gramagem),
        quantidadePratos: parseInt(p.quantidadePratos),
        preparosIds:      Array.from(p.preparosIds),
      })),
      carboidratos: toGrupo(carboidrato),
      leguminosas:  toGrupo(leguminosa),
      legumes:      toGrupo(legume),
      obsLegumes:   obsLegumes.trim() || null,
      nutricionista: nutricionista.trim() || null,
    };

    setSaving(true);
    try {
      let res;
      if (isEdit) {
        res = await pedidosApi.atualizar(editId, payload);
      } else {
        res = await pedidosApi.criar({ ...payload, clienteId });
      }
      navigate(`/pedidos/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar pedido.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;

  const gramStyle = { display: 'flex', alignItems: 'center', gap: 4 };
  const gSuffix   = <span style={{ fontSize: '0.875rem', color: 'var(--gray-400)' }}>g</span>;

  const pageTitle = isEdit ? 'Editar Pedido' : isRepeat ? 'Repetir Pedido' : 'Novo Pedido';

  const renderGrupoOpcional = ({ titulo, grupoNome, grupoDbNome, estado, setEstado }) => {
    const alimentosGrupo = porGrupo(grupoDbNome || grupoNome);
    const totalPreparos  = alimentosGrupo.reduce((s, a) => s + (a.preparos?.length || 0), 0);
    const isCarb         = grupoNome === 'Carboidrato';

    const toggleTodosAlimento = (alimento) => {
      const ids = alimento.preparos.map((p) => p.id);
      const todosMarcados = ids.every((id) => estado.preparos.has(id));
      setEstado((prev) => {
        const next = new Set(prev.preparos);
        if (todosMarcados) ids.forEach((id) => next.delete(id));
        else ids.forEach((id) => next.add(id));
        return { ...prev, preparos: next };
      });
    };

    const toggleTodosGrupo = () => {
      const todosIds = alimentosGrupo.flatMap((a) => a.preparos.map((p) => p.id));
      const todosMarcados = todosIds.every((id) => estado.preparos.has(id));
      setEstado((prev) => ({
        ...prev,
        preparos: todosMarcados ? new Set() : new Set(todosIds),
      }));
    };

    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: estado.ativo ? 16 : 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox" checked={estado.ativo}
              onChange={(e) => setEstado((prev) => ({ ...prev, ativo: e.target.checked }))}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}>{titulo}</span>
          </label>
          {!estado.ativo && (
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
              desabilitado — pratos sem {grupoNome.toLowerCase()}
            </span>
          )}
        </div>

        {estado.ativo && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ width: 200, marginBottom: 0 }}>
                <label className="form-label required">
                  {isCarb ? 'Gramagem (ref. Arroz Branco)' : `Gramagem (${grupoNome.toLowerCase()})`}
                </label>
                <div style={gramStyle}>
                  <input
                    type="number" className="form-control" value={estado.gramagem}
                    onChange={(e) => setEstado((prev) => ({ ...prev, gramagem: e.target.value }))}
                    placeholder="g" min="1"
                  />
                  {gSuffix}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 20, maxWidth: 260 }}>
                {isCarb
                  ? 'Demais carboidratos terão gramagem ajustada automaticamente pela tabela TACO'
                  : 'Aplicada a todos os preparos selecionados'}
              </div>
            </div>

            {alimentosGrupo.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                Nenhum {grupoNome.toLowerCase()} cadastrado.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    {estado.preparos.size} de {totalPreparos} preparo(s) selecionado(s)
                  </span>
                  {totalPreparos > 1 && (
                    <button
                      type="button" onClick={toggleTodosGrupo}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8rem', textDecoration: 'underline', padding: 0 }}
                    >
                      {alimentosGrupo.flatMap((a) => a.preparos.map((p) => p.id)).every((id) => estado.preparos.has(id))
                        ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  )}
                </div>

                {alimentosGrupo.map((alimento) => {
                  if (!alimento.preparos || alimento.preparos.length === 0) return null;
                  const todosMarcados = alimento.preparos.every((p) => estado.preparos.has(p.id));
                  const algumMarcado  = alimento.preparos.some((p) => estado.preparos.has(p.id));

                  return (
                    <div key={alimento.id} style={{
                      border: `1px solid ${algumMarcado ? 'var(--primary)' : 'var(--gray-200)'}`,
                      borderRadius: 8, padding: '10px 14px', marginBottom: 8,
                      background: algumMarcado ? 'var(--primary-bg)' : '#fff',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: algumMarcado ? 'var(--primary-dark)' : 'var(--gray-700)' }}>
                          {alimento.nome}
                          {isCarb && alimento.carboidratosPor100g != null && (
                            <span style={{ marginLeft: 8, fontSize: '0.72rem', fontWeight: 400, color: '#92400e', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '1px 6px' }}>
                              {alimento.carboidratosPor100g}g carbs/100g
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleTodosAlimento(alimento)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.75rem', textDecoration: 'underline', padding: 0 }}
                        >
                          {todosMarcados ? 'Desmarcar' : 'Selecionar todos'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {alimento.preparos.map((preparo) => {
                          const sel = estado.preparos.has(preparo.id);
                          return (
                            <label key={preparo.id} style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '4px 12px', borderRadius: 16, cursor: 'pointer',
                              border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--gray-300)'}`,
                              background: sel ? 'var(--primary)' : '#fff',
                              color: sel ? '#fff' : 'var(--gray-600)',
                              fontSize: '0.85rem', fontWeight: sel ? 600 : 400,
                              userSelect: 'none', transition: 'all 0.12s',
                            }}>
                              <input type="checkbox" checked={sel} onChange={() => togglePreparo(setEstado, preparo.id)} style={{ display: 'none' }} />
                              {preparo.nome}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <h1>
          {pageTitle}
          {isRepeat && <small>cópia de pedido anterior</small>}
        </h1>
        <Link to={isEdit ? `/pedidos/${editId}` : '/pedidos'} className="btn btn-ghost">← Voltar</Link>
      </div>
      <div className="page-content">
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
        {isRepeat && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            📋 Os dados do pedido anterior foram pré-preenchidos. Ajuste o que precisar antes de salvar.
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ── Cliente e Configurações ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Cliente e Configurações</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label required">Cliente</label>
                {isEdit ? (
                  <select className="form-control" value={clienteId} disabled>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                ) : (
                  <select className="form-control" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                    <option value="">Selecione um cliente...</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="form-label required">Máx. pratos por preparo</label>
                <input type="number" className="form-control" value={maxRepeticoes} onChange={(e) => setMaxRepeticoes(e.target.value)} min="1" max="50" required />
                <small style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>Teto absoluto por sublote</small>
              </div>
              <div className="form-group">
                <label className="form-label required">Mín. pratos por lote</label>
                <input type="number" className="form-control" value={minRepeticoesLote} onChange={(e) => setMinRepeticoesLote(e.target.value)} min="1" max="50" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-control" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Instruções especiais..." rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Nutricionista Responsável</label>
              <input
                type="text"
                className="form-control"
                value={nutricionista}
                onChange={(e) => setNutricionista(e.target.value)}
                placeholder="Nome do nutricionista (opcional)"
              />
            </div>
          </div>

          {/* ── Proteínas ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Distribuição de Proteínas</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 16 }}>
              Defina cada proteína, gramagem e quantidade de pratos. A soma será o total do pedido.
            </p>

            {proteinas.map((item, idx) => {
              const alimentoSel  = alimentos.find((a) => a.id === item.alimentoBaseId);
              const preparosDisp = alimentoSel?.preparos?.filter((p) => p.ativo !== false) ?? [];
              const todosIds     = preparosDisp.map((p) => p.id);
              const qtdSel       = item.preparosIds.size;
              const todosMarcados = todosIds.length > 0 && todosIds.every((id) => item.preparosIds.has(id));

              return (
                <div key={idx} style={{ marginBottom: 10, padding: 12, border: '1px solid var(--gray-200)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                      <label className="form-label required">Proteína base</label>
                      <select className="form-control" value={item.alimentoBaseId} onChange={(e) => updateProteina(idx, 'alimentoBaseId', e.target.value)}>
                        <option value="">Selecione...</option>
                        {porGrupo('Proteína').map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ width: 110, marginBottom: 0 }}>
                      <label className="form-label required">Gramagem</label>
                      <div style={gramStyle}>
                        <input type="number" className="form-control" value={item.gramagem} onChange={(e) => updateProteina(idx, 'gramagem', e.target.value)} placeholder="g" min="1" />
                        {gSuffix}
                      </div>
                    </div>
                    <div className="form-group" style={{ width: 110, marginBottom: 0 }}>
                      <label className="form-label required">Qtd pratos</label>
                      <input type="number" className="form-control" value={item.quantidadePratos} onChange={(e) => updateProteina(idx, 'quantidadePratos', e.target.value)} placeholder="pratos" min="1" />
                    </div>
                    {proteinas.length > 1 && (
                      <button type="button" className="btn btn-secondary" style={{ marginBottom: 0, padding: '8px 12px' }} onClick={() => removeProteina(idx)}>✕</button>
                    )}
                  </div>

                  {preparosDisp.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                          Preparos: {qtdSel === 0 ? <em style={{ color: 'var(--gray-400)' }}>todos ativos serão usados</em> : `${qtdSel} selecionado(s)`}
                        </span>
                        {preparosDisp.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleTodosProteinaPreparo(idx, todosIds)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.75rem', textDecoration: 'underline', padding: 0 }}
                          >
                            {todosMarcados ? 'Desmarcar todos' : 'Selecionar todos'}
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {preparosDisp.map((preparo) => {
                          const sel = item.preparosIds.has(preparo.id);
                          return (
                            <label key={preparo.id} style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '4px 12px', borderRadius: 16, cursor: 'pointer',
                              border: `1.5px solid ${sel ? '#c2410c' : 'var(--gray-300)'}`,
                              background: sel ? '#fff7ed' : '#fff',
                              color: sel ? '#c2410c' : 'var(--gray-600)',
                              fontSize: '0.85rem', fontWeight: sel ? 600 : 400,
                              userSelect: 'none', transition: 'all 0.12s',
                            }}>
                              <input type="checkbox" checked={sel} onChange={() => toggleProteinaPreparo(idx, preparo.id)} style={{ display: 'none' }} />
                              {preparo.nome}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              <button type="button" className="btn btn-outline" onClick={addProteina}>+ Adicionar proteína</button>
              <span style={{ fontWeight: 600, color: totalPratos > 0 ? 'var(--primary-dark)' : 'var(--gray-400)', fontSize: '0.9rem' }}>
                Total: {totalPratos} pratos
              </span>
            </div>
          </div>

          {/* ── Grupos opcionais ── */}
          {renderGrupoOpcional({ titulo: 'Carboidrato', grupoNome: 'Carboidrato', estado: carboidrato, setEstado: setCarboidrato })}
          {renderGrupoOpcional({ titulo: 'Leguminosa',  grupoNome: 'Leguminosa',  estado: leguminosa,  setEstado: setLeguminosa })}
          {renderGrupoOpcional({ titulo: 'Legumes', grupoNome: 'Legumes', grupoDbNome: 'Legume', estado: legume, setEstado: setLegume })}

          {/* OBS de Legumes — aparece sempre que o grupo Legumes está ativo */}
          {legume.ativo && (
            <div className="card" style={{ marginBottom: 20, border: '2px solid #f59e0b', background: '#fffbeb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span className="card-title" style={{ margin: 0, border: 'none', padding: 0, color: '#92400e' }}>
                  OBS — Mix / Legumes proibidos neste pedido
                </span>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: '#92400e' }}>
                  Informe o mix de legumes e/ou quais legumes <strong>NÃO podem ir</strong> nos pratos deste cliente
                </label>
                <textarea
                  className="form-control"
                  value={obsLegumes}
                  onChange={(e) => setObsLegumes(e.target.value)}
                  placeholder="Ex: Mix de legumes (brócolis, cenoura, vagem). Sem chuchu, sem pimentão..."
                  rows={3}
                  style={{ borderColor: '#f59e0b', background: '#fff' }}
                />
                <small style={{ color: '#92400e', fontSize: '0.78rem' }}>
                  Esta informação ficará destacada na ordem de produção para orientar a cozinha.
                </small>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Pedido'}
            </button>
            <Link to={isEdit ? `/pedidos/${editId}` : '/pedidos'} className="btn btn-secondary">Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  );
}
