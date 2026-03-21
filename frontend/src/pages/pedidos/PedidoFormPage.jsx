import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { pedidosApi, clientesApi, alimentosApi, gruposApi } from '../../services/api';

export default function PedidoFormPage() {
  const navigate = useNavigate();

  const [clientes, setClientes]   = useState([]);
  const [alimentos, setAlimentos] = useState([]);
  const [grupos, setGrupos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  // Configurações globais
  const [clienteId, setClienteId]                 = useState('');
  const [maxRepeticoes, setMaxRepeticoes]         = useState(3);
  const [minRepeticoesLote, setMinRepeticoesLote] = useState(2);
  const [observacoes, setObservacoes]             = useState('');

  // Proteínas
  const [proteinas, setProteinas] = useState([
    { alimentoBaseId: '', gramagem: '', quantidadePratos: '' },
  ]);

  // Itens permitidos por grupo (todos opcionais)
  const [carboidratos, setCarboidratos] = useState([]);
  const [leguminosas, setLeguminosas]   = useState([]);
  const [legumes, setLegumes]           = useState([]);

  useEffect(() => {
    Promise.all([clientesApi.listar(), alimentosApi.listar(), gruposApi.listar()])
      .then(([cRes, aRes, gRes]) => {
        setClientes(cRes.data);
        setAlimentos(aRes.data.filter((a) => a.ativo !== false));
        setGrupos(gRes.data);
      })
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, []);

  const porGrupo = (nomeGrupo) => {
    const g = grupos.find((g) => g.nome === nomeGrupo);
    return g ? alimentos.filter((a) => a.grupoId === g.id) : [];
  };

  // Proteínas
  const addProteina = () =>
    setProteinas((prev) => [...prev, { alimentoBaseId: '', gramagem: '', quantidadePratos: '' }]);
  const removeProteina = (idx) =>
    setProteinas((prev) => prev.filter((_, i) => i !== idx));
  const updateProteina = (idx, field, value) =>
    setProteinas((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  // Helpers genéricos para listas de itens permitidos
  const makeAdd    = (setter) => () => setter((prev) => [...prev, { alimentoBaseId: '', gramagemBase: '' }]);
  const makeRemove = (setter) => (idx) => setter((prev) => prev.filter((_, i) => i !== idx));
  const makeUpdate = (setter) => (idx, field, value) =>
    setter((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  const addCarb    = makeAdd(setCarboidratos);    const removeCarb    = makeRemove(setCarboidratos);    const updateCarb    = makeUpdate(setCarboidratos);
  const addLeg     = makeAdd(setLeguminosas);     const removeLeg     = makeRemove(setLeguminosas);     const updateLeg     = makeUpdate(setLeguminosas);
  const addLegume  = makeAdd(setLegumes);         const removeLegume  = makeRemove(setLegumes);         const updateLegume  = makeUpdate(setLegumes);

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

    const carbsValidos   = carboidratos.filter((c) => c.alimentoBaseId && parseFloat(c.gramagemBase) > 0);
    const legsValidas    = leguminosas.filter((l) => l.alimentoBaseId && parseFloat(l.gramagemBase) > 0);
    const legumesValidos = legumes.filter((l) => l.alimentoBaseId && parseFloat(l.gramagemBase) > 0);

    setSaving(true);
    try {
      const res = await pedidosApi.criar({
        clienteId,
        totalPratos,
        maxRepeticoes:     parseInt(maxRepeticoes),
        minRepeticoesLote: parseInt(minRepeticoesLote),
        observacoes,
        proteinas: proteinasValidas.map((p) => ({
          alimentoBaseId:   p.alimentoBaseId,
          gramagem:         parseFloat(p.gramagem),
          quantidadePratos: parseInt(p.quantidadePratos),
        })),
        carboidratos: carbsValidos.map((c) => ({
          alimentoBaseId: c.alimentoBaseId,
          gramagemBase:   parseFloat(c.gramagemBase),
        })),
        leguminosas: legsValidas.map((l) => ({
          alimentoBaseId: l.alimentoBaseId,
          gramagemBase:   parseFloat(l.gramagemBase),
        })),
        legumes: legumesValidos.map((l) => ({
          alimentoBaseId: l.alimentoBaseId,
          gramagemBase:   parseFloat(l.gramagemBase),
        })),
      });
      navigate(`/pedidos/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar pedido.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;

  const gramStyle = { display: 'flex', alignItems: 'center', gap: 4 };
  const gSuffix   = <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>g</span>;

  const renderItensPermitidos = ({ titulo, descricao, itens, onAdd, onRemove, onUpdate, grupoNome, obrigatorio = true }) => (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-title">{titulo}</div>
      <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 16 }}>{descricao}</p>

      {itens.map((item, idx) => (
        <div key={idx} style={{
          display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 10,
          padding: 12, border: '1px solid var(--gray-200)', borderRadius: 8,
        }}>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label className="form-label">Alimento</label>
            <select
              className="form-control"
              value={item.alimentoBaseId}
              onChange={(e) => onUpdate(idx, 'alimentoBaseId', e.target.value)}
            >
              <option value="">Selecione...</option>
              {porGrupo(grupoNome).map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ width: 120, marginBottom: 0 }}>
            <label className="form-label">Gramagem</label>
            <div style={gramStyle}>
              <input
                type="number" className="form-control" value={item.gramagemBase}
                onChange={(e) => onUpdate(idx, 'gramagemBase', e.target.value)}
                placeholder="g" min="1"
              />
              {gSuffix}
            </div>
          </div>
          {(itens.length > 1 || !obrigatorio) && (
            <button
              type="button" className="btn btn-secondary"
              style={{ marginBottom: 0, padding: '8px 12px' }}
              onClick={() => onRemove(idx)}
            >✕</button>
          )}
        </div>
      ))}

      <button type="button" className="btn btn-outline" onClick={onAdd}>
        + Adicionar {grupoNome.toLowerCase()}
      </button>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <h1>Novo Pedido</h1>
        <Link to="/pedidos" className="btn btn-secondary">Voltar</Link>
      </div>
      <div className="page-content">
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── Cliente e Configurações ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Cliente e Configurações</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label required">Cliente</label>
                <select
                  className="form-control"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  required
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Máx. pratos por preparo</label>
                <input
                  type="number" className="form-control" value={maxRepeticoes}
                  onChange={(e) => setMaxRepeticoes(e.target.value)} min="1" max="50" required
                />
                <small style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>
                  Teto absoluto por sublote
                </small>
              </div>
              <div className="form-group">
                <label className="form-label required">Mín. pratos por lote</label>
                <input
                  type="number" className="form-control" value={minRepeticoesLote}
                  onChange={(e) => setMinRepeticoesLote(e.target.value)} min="1" max="50" required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea
                className="form-control" value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Instruções especiais..." rows={2}
              />
            </div>
          </div>

          {/* ── Proteínas ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Distribuição de Proteínas</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 16 }}>
              Defina cada proteína, gramagem e quantidade de pratos.
              A soma das quantidades será o total do pedido.
            </p>

            {proteinas.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 10,
                padding: 12, border: '1px solid var(--gray-200)', borderRadius: 8,
              }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label className="form-label required">Proteína base</label>
                  <select
                    className="form-control"
                    value={item.alimentoBaseId}
                    onChange={(e) => updateProteina(idx, 'alimentoBaseId', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {porGrupo('Proteína').map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ width: 110, marginBottom: 0 }}>
                  <label className="form-label required">Gramagem</label>
                  <div style={gramStyle}>
                    <input
                      type="number" className="form-control" value={item.gramagem}
                      onChange={(e) => updateProteina(idx, 'gramagem', e.target.value)}
                      placeholder="g" min="1"
                    />
                    {gSuffix}
                  </div>
                </div>
                <div className="form-group" style={{ width: 110, marginBottom: 0 }}>
                  <label className="form-label required">Qtd pratos</label>
                  <input
                    type="number" className="form-control" value={item.quantidadePratos}
                    onChange={(e) => updateProteina(idx, 'quantidadePratos', e.target.value)}
                    placeholder="pratos" min="1"
                  />
                </div>
                {proteinas.length > 1 && (
                  <button
                    type="button" className="btn btn-secondary"
                    style={{ marginBottom: 0, padding: '8px 12px' }}
                    onClick={() => removeProteina(idx)}
                  >✕</button>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              <button type="button" className="btn btn-outline" onClick={addProteina}>
                + Adicionar proteína
              </button>
              <span style={{
                fontWeight: 600,
                color: totalPratos > 0 ? 'var(--primary-dark)' : 'var(--gray-400)',
                fontSize: '0.9rem',
              }}>
                Total: {totalPratos} pratos
              </span>
            </div>
          </div>

          {/* ── Carboidratos permitidos ── */}
          {renderItensPermitidos({
            titulo: 'Carboidratos Permitidos',
            descricao: 'Carboidratos que podem aparecer neste pedido. O motor inclui equivalências automaticamente. Deixe vazio para pedidos sem carboidrato.',
            itens: carboidratos,
            onAdd: addCarb, onRemove: removeCarb, onUpdate: updateCarb,
            grupoNome: 'Carboidrato',
            obrigatorio: false,
          })}

          {/* ── Leguminosas permitidas ── */}
          {renderItensPermitidos({
            titulo: 'Leguminosas Permitidas',
            descricao: 'Leguminosas que podem aparecer neste pedido. Deixe vazio para pedidos sem leguminosa.',
            itens: leguminosas,
            onAdd: addLeg, onRemove: removeLeg, onUpdate: updateLeg,
            grupoNome: 'Leguminosa',
            obrigatorio: false,
          })}

          {/* ── Legumes permitidos (opcional) ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">Legumes Permitidos <span style={{ fontWeight: 400, fontSize: '0.875rem', color: 'var(--gray-400)' }}>(opcional)</span></div>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 16 }}>
              Deixe vazio para pedidos sem legume.
            </p>

            {legumes.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 10,
                padding: 12, border: '1px solid var(--gray-200)', borderRadius: 8,
              }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label className="form-label">Legume</label>
                  <select
                    className="form-control"
                    value={item.alimentoBaseId}
                    onChange={(e) => updateLegume(idx, 'alimentoBaseId', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {porGrupo('Legume').map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ width: 120, marginBottom: 0 }}>
                  <label className="form-label">Gramagem</label>
                  <div style={gramStyle}>
                    <input
                      type="number" className="form-control" value={item.gramagemBase}
                      onChange={(e) => updateLegume(idx, 'gramagemBase', e.target.value)}
                      placeholder="g" min="1"
                    />
                    {gSuffix}
                  </div>
                </div>
                <button
                  type="button" className="btn btn-secondary"
                  style={{ marginBottom: 0, padding: '8px 12px' }}
                  onClick={() => removeLegume(idx)}
                >✕</button>
              </div>
            ))}

            <button type="button" className="btn btn-outline" onClick={addLegume}>
              + Adicionar legume
            </button>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Criando...' : 'Criar Pedido'}
            </button>
            <Link to="/pedidos" className="btn btn-secondary">Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  );
}
