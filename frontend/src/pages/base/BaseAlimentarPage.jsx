import { useState, useEffect } from 'react';
import { gruposApi, alimentosApi } from '../../services/api';

const GRUPO_CARBOIDRATO = 'Carboidrato';

export default function BaseAlimentarPage() {
  const [grupos, setGrupos] = useState([]);
  const [alimentos, setAlimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal novo alimento
  const [showAlimentoForm, setShowAlimentoForm] = useState(false);
  const [alimentoForm, setAlimentoForm] = useState({ nome: '', grupoId: '', carboidratosPor100g: '' });
  const [savingAlimento, setSavingAlimento] = useState(false);

  // Edição inline de alimento
  const [editAlimento, setEditAlimento] = useState(null);
  const [editAlimentoForm, setEditAlimentoForm] = useState({ nome: '', carboidratosPor100g: '' });
  const [savingEditAlimento, setSavingEditAlimento] = useState(false);

  // Preparo inline
  const [preparoForms, setPreparoForms] = useState({});
  const [savingPreparo, setSavingPreparo] = useState({});

  // Edição de preparo
  const [editPreparo, setEditPreparo] = useState(null);
  const [editPreparoNome, setEditPreparoNome] = useState('');

  const loadData = async () => {
    try {
      const [gRes, aRes] = await Promise.all([gruposApi.listar(), alimentosApi.listar()]);
      setGrupos(gRes.data);
      const alimentosComPreparos = await Promise.all(
        aRes.data.map((a) => alimentosApi.buscar(a.id).then((r) => r.data))
      );
      setAlimentos(alimentosComPreparos);
    } catch {
      setError('Erro ao carregar base alimentar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const showMsg = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // ── Alimento ──────────────────────────────────────────────────────────────

  const grupoNomeById = (grupoId) => grupos.find((g) => g.id === grupoId)?.nome;
  const isCarb = (grupoNome) => grupoNome === GRUPO_CARBOIDRATO;

  const handleCreateAlimento = async (e) => {
    e.preventDefault();
    if (!alimentoForm.nome || !alimentoForm.grupoId) return;
    setSavingAlimento(true);
    try {
      const payload = { nome: alimentoForm.nome, grupoId: alimentoForm.grupoId };
      if (isCarb(grupoNomeById(alimentoForm.grupoId)) && alimentoForm.carboidratosPor100g) {
        payload.carboidratosPor100g = parseFloat(alimentoForm.carboidratosPor100g);
      }
      await alimentosApi.criar(payload);
      setAlimentoForm({ nome: '', grupoId: '', carboidratosPor100g: '' });
      setShowAlimentoForm(false);
      await loadData();
      showMsg('Alimento criado com sucesso!');
    } catch {
      setError('Erro ao criar alimento.');
    } finally {
      setSavingAlimento(false);
    }
  };

  const startEditAlimento = (alimento) => {
    setEditAlimento(alimento.id);
    setEditAlimentoForm({
      nome: alimento.nome,
      carboidratosPor100g: alimento.carboidratosPor100g ?? '',
    });
  };

  const handleSaveEditAlimento = async (alimento) => {
    const nome = editAlimentoForm.nome.trim();
    if (!nome) return;
    setSavingEditAlimento(true);
    try {
      const payload = { nome };
      if (isCarb(alimento.grupo?.nome)) {
        payload.carboidratosPor100g = editAlimentoForm.carboidratosPor100g !== ''
          ? parseFloat(editAlimentoForm.carboidratosPor100g)
          : null;
      }
      await alimentosApi.atualizar(alimento.id, payload);
      const updated = await alimentosApi.buscar(alimento.id);
      setAlimentos((prev) => prev.map((a) => (a.id === alimento.id ? updated.data : a)));
      setEditAlimento(null);
      showMsg('Alimento atualizado!');
    } catch {
      setError('Erro ao atualizar alimento.');
    } finally {
      setSavingEditAlimento(false);
    }
  };

  const handleToggleAlimento = async (alimento) => {
    try {
      await alimentosApi.atualizar(alimento.id, { ativo: !alimento.ativo });
      setAlimentos((prev) =>
        prev.map((a) => (a.id === alimento.id ? { ...a, ativo: !a.ativo } : a))
      );
    } catch {
      setError('Erro ao atualizar alimento.');
    }
  };

  const handleDeleteAlimento = async (id, nome) => {
    if (!window.confirm(`Deseja excluir o alimento "${nome}" e todos os seus preparos?`)) return;
    try {
      await alimentosApi.deletar(id);
      setAlimentos((prev) => prev.filter((a) => a.id !== id));
      showMsg('Alimento excluído.');
    } catch {
      setError('Erro ao excluir alimento. Verifique se não há pedidos vinculados.');
    }
  };

  // ── Preparo ───────────────────────────────────────────────────────────────

  const handleAddPreparo = async (alimentoId) => {
    const nome = (preparoForms[alimentoId] || '').trim();
    if (!nome) return;
    setSavingPreparo((prev) => ({ ...prev, [alimentoId]: true }));
    try {
      await alimentosApi.adicionarPreparo(alimentoId, { nome });
      setPreparoForms((prev) => ({ ...prev, [alimentoId]: '' }));
      const updated = await alimentosApi.buscar(alimentoId);
      setAlimentos((prev) => prev.map((a) => (a.id === alimentoId ? updated.data : a)));
      showMsg('Preparo adicionado!');
    } catch {
      setError('Erro ao adicionar preparo.');
    } finally {
      setSavingPreparo((prev) => ({ ...prev, [alimentoId]: false }));
    }
  };

  const handleTogglePreparo = async (preparoId, alimentoId, ativo) => {
    try {
      await alimentosApi.atualizarPreparo(preparoId, { ativo: !ativo });
      const updated = await alimentosApi.buscar(alimentoId);
      setAlimentos((prev) => prev.map((a) => (a.id === alimentoId ? updated.data : a)));
    } catch {
      setError('Erro ao atualizar preparo.');
    }
  };

  const handleDeletePreparo = async (preparoId, alimentoId, nome) => {
    if (!window.confirm(`Excluir o preparo "${nome}"?`)) return;
    try {
      await alimentosApi.deletarPreparo(preparoId);
      const updated = await alimentosApi.buscar(alimentoId);
      setAlimentos((prev) => prev.map((a) => (a.id === alimentoId ? updated.data : a)));
      showMsg('Preparo excluído.');
    } catch {
      setError('Erro ao excluir preparo.');
    }
  };

  const handleSaveEditPreparo = async (preparoId, alimentoId) => {
    const nome = editPreparoNome.trim();
    if (!nome) return;
    try {
      await alimentosApi.atualizarPreparo(preparoId, { nome });
      const updated = await alimentosApi.buscar(alimentoId);
      setAlimentos((prev) => prev.map((a) => (a.id === alimentoId ? updated.data : a)));
      setEditPreparo(null);
      setEditPreparoNome('');
      showMsg('Preparo atualizado!');
    } catch {
      setError('Erro ao atualizar preparo.');
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;

  const carbTag = (
    <span style={{
      fontSize: '0.7rem', fontWeight: 700, background: '#fefce8',
      border: '1px solid #fde68a', color: '#92400e',
      borderRadius: 10, padding: '1px 7px', marginLeft: 6,
    }}>
      carbs/100g
    </span>
  );

  return (
    <>
      <div className="page-header">
        <h1>Base Alimentar</h1>
        <button className="btn btn-primary" onClick={() => setShowAlimentoForm(!showAlimentoForm)}>
          + Novo Alimento
        </button>
      </div>
      <div className="page-content">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
          </div>
        )}
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

        {/* ── Form novo alimento ── */}
        {showAlimentoForm && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Novo Alimento Base</div>
            <form onSubmit={handleCreateAlimento}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label required">Nome</label>
                  <input
                    type="text" className="form-control"
                    value={alimentoForm.nome}
                    onChange={(e) => setAlimentoForm((prev) => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Arroz Branco" required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">Grupo Alimentar</label>
                  <select
                    className="form-control"
                    value={alimentoForm.grupoId}
                    onChange={(e) => setAlimentoForm((prev) => ({ ...prev, grupoId: e.target.value }))}
                    required
                  >
                    <option value="">Selecione um grupo...</option>
                    {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                {isCarb(grupoNomeById(alimentoForm.grupoId)) && (
                  <div className="form-group">
                    <label className="form-label">Carboidratos por 100g {carbTag}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number" className="form-control"
                        value={alimentoForm.carboidratosPor100g}
                        onChange={(e) => setAlimentoForm((prev) => ({ ...prev, carboidratosPor100g: e.target.value }))}
                        placeholder="Ex: 28" min="0" step="0.1"
                      />
                      <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>g</span>
                    </div>
                    <small style={{ color: 'var(--gray-400)', fontSize: '0.78rem' }}>
                      Usado para ajuste automático de gramagem ao diversificar carboidratos
                    </small>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={savingAlimento}>
                  {savingAlimento ? 'Salvando...' : 'Criar Alimento'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAlimentoForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Lista por grupo ── */}
        {grupos.map((grupo) => {
          const alimentosDoGrupo = alimentos.filter((a) => a.grupoId === grupo.id);
          const grupoIsCarb = isCarb(grupo.nome);
          return (
            <div key={grupo.id} className="card" style={{ marginBottom: 24 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>{grupo.nome}</span>
                <span style={{ fontSize: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary-dark)', borderRadius: 12, padding: '2px 10px', fontWeight: 400 }}>
                  {alimentosDoGrupo.length} alimento(s)
                </span>
                {grupoIsCarb && (
                  <span style={{ fontSize: '0.72rem', color: '#92400e', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '1px 8px', fontWeight: 400 }}>
                    ajuste nutricional por carbs/100g
                  </span>
                )}
              </div>

              {alimentosDoGrupo.length === 0 && (
                <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem', padding: '8px 0' }}>
                  Nenhum alimento cadastrado neste grupo.
                </div>
              )}

              {alimentosDoGrupo.map((alimento) => (
                <div key={alimento.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, padding: 16, marginBottom: 12, opacity: alimento.ativo ? 1 : 0.6 }}>

                  {/* Cabeçalho do alimento */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{alimento.nome}</strong>
                      <span className={`badge ${alimento.ativo ? 'badge-ativo' : 'badge-inativo'}`} style={{ fontSize: '0.7rem' }}>
                        {alimento.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                        {alimento.preparos?.length || 0} preparo(s)
                      </span>
                      {grupoIsCarb && alimento.carboidratosPor100g != null && (
                        <span style={{ fontSize: '0.78rem', background: '#fefce8', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '1px 8px', fontWeight: 600 }}>
                          {alimento.carboidratosPor100g}g carbs/100g
                        </span>
                      )}
                      {grupoIsCarb && alimento.carboidratosPor100g == null && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                          sem dados nutricionais
                        </span>
                      )}
                    </div>
                    <div className="btn-group">
                      <button className="btn btn-sm btn-outline" onClick={() => startEditAlimento(alimento)}>
                        Editar
                      </button>
                      <button className={`btn btn-sm ${alimento.ativo ? 'btn-secondary' : 'btn-success'}`} onClick={() => handleToggleAlimento(alimento)}>
                        {alimento.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteAlimento(alimento.id, alimento.nome)}>
                        Excluir
                      </button>
                    </div>
                  </div>

                  {/* Edição inline do alimento */}
                  {editAlimento === alimento.id && (
                    <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                        <label className="form-label">Nome</label>
                        <input
                          type="text" className="form-control"
                          value={editAlimentoForm.nome}
                          onChange={(e) => setEditAlimentoForm((prev) => ({ ...prev, nome: e.target.value }))}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Escape') setEditAlimento(null); }}
                        />
                      </div>
                      {grupoIsCarb && (
                        <div className="form-group" style={{ width: 180, marginBottom: 0 }}>
                          <label className="form-label">Carboidratos/100g {carbTag}</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number" className="form-control"
                              value={editAlimentoForm.carboidratosPor100g}
                              onChange={(e) => setEditAlimentoForm((prev) => ({ ...prev, carboidratosPor100g: e.target.value }))}
                              placeholder="Ex: 28" min="0" step="0.1"
                            />
                            <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>g</span>
                          </div>
                        </div>
                      )}
                      <button className="btn btn-sm btn-primary" onClick={() => handleSaveEditAlimento(alimento)} disabled={savingEditAlimento}>
                        {savingEditAlimento ? '...' : 'Salvar'}
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditAlimento(null)}>
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* Preparos */}
                  <div style={{ paddingLeft: 8 }}>
                    {alimento.preparos?.map((preparo) => (
                      <div key={preparo.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--gray-100)', opacity: preparo.ativo ? 1 : 0.5 }}>
                        {editPreparo === preparo.id ? (
                          <>
                            <input
                              type="text" className="form-control"
                              style={{ maxWidth: 280, padding: '4px 8px', fontSize: '0.875rem' }}
                              value={editPreparoNome}
                              onChange={(e) => setEditPreparoNome(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditPreparo(preparo.id, alimento.id);
                                if (e.key === 'Escape') { setEditPreparo(null); setEditPreparoNome(''); }
                              }}
                            />
                            <button className="btn btn-sm btn-primary" onClick={() => handleSaveEditPreparo(preparo.id, alimento.id)}>Salvar</button>
                            <button className="btn btn-sm btn-secondary" onClick={() => { setEditPreparo(null); setEditPreparoNome(''); }}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex: 1, fontSize: '0.875rem' }}>
                              {preparo.nome}
                              {!preparo.ativo && <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginLeft: 6 }}>(inativo)</span>}
                            </span>
                            <button className="btn btn-sm btn-outline" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => { setEditPreparo(preparo.id); setEditPreparoNome(preparo.nome); }}>Editar</button>
                            <button className={`btn btn-sm ${preparo.ativo ? 'btn-secondary' : 'btn-success'}`} style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => handleTogglePreparo(preparo.id, alimento.id, preparo.ativo)}>
                              {preparo.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                            <button className="btn btn-sm btn-danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => handleDeletePreparo(preparo.id, alimento.id, preparo.nome)}>Excluir</button>
                          </>
                        )}
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input
                        type="text" className="form-control"
                        style={{ maxWidth: 280, padding: '4px 8px', fontSize: '0.875rem' }}
                        placeholder="Nome do preparo..."
                        value={preparoForms[alimento.id] || ''}
                        onChange={(e) => setPreparoForms((prev) => ({ ...prev, [alimento.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPreparo(alimento.id); } }}
                      />
                      <button className="btn btn-sm btn-primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => handleAddPreparo(alimento.id)} disabled={savingPreparo[alimento.id]}>
                        {savingPreparo[alimento.id] ? '...' : '+ Preparo'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
