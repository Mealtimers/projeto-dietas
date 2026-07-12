import { useState, useEffect, useMemo } from 'react';
import { alimentosApi, mealcontrolApi } from '../services/api';

// Estado visual do vínculo — badge ao lado do preparo
export function LinkBadge({ preparo }) {
  if (!preparo.mealcontrolRecipeId) {
    return (
      <span style={{
        fontSize: '0.7rem', color: 'var(--gray-500)',
        background: '#f3f4f6', border: '1px dashed #d1d5db',
        borderRadius: 10, padding: '1px 8px', fontWeight: 500,
      }}>
        sem vínculo MC
      </span>
    );
  }
  if (preparo.mealcontrolIsRepresentative) {
    return (
      <span title={`Representativo · #${preparo.mealcontrolRecipeId} ${preparo.mealcontrolRecipeName}`} style={{
        fontSize: '0.7rem', color: '#92400e',
        background: '#fef3c7', border: '1px solid #f59e0b',
        borderRadius: 10, padding: '1px 8px', fontWeight: 600,
      }}>
        ≈ {preparo.mealcontrolRecipeName}
      </span>
    );
  }
  return (
    <span title={`Vinculado · #${preparo.mealcontrolRecipeId} ${preparo.mealcontrolRecipeName}`} style={{
      fontSize: '0.7rem', color: '#166534',
      background: '#dcfce7', border: '1px solid #16a34a',
      borderRadius: 10, padding: '1px 8px', fontWeight: 600,
    }}>
      ✓ {preparo.mealcontrolRecipeName}
    </span>
  );
}

// Modal com busca de receitas do MC
export function LinkModal({ preparo, onClose, onSaved }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [busca, setBusca]     = useState(preparo.nome);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    mealcontrolApi.listarReceitas()
      .then((res) => setRecipes(res.data.recipes || []))
      .catch((err) => {
        const status = err.response?.status;
        if (status === 502) setError('Meal Control indisponível (502).');
        else if (status === 500) setError(err.response?.data?.error || 'Erro no proxy do Meal Control.');
        else setError('Erro ao buscar receitas do Meal Control.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return recipes.slice(0, 50);
    return recipes.filter((r) => (r.name || '').toLowerCase().includes(q)).slice(0, 50);
  }, [recipes, busca]);

  const vincular = async (recipe, isRepresentative) => {
    setSaving(true);
    try {
      const res = await alimentosApi.vincularMealcontrol(preparo.id, {
        recipeId:         recipe.id,
        recipeName:       recipe.name,
        isRepresentative,
      });
      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar vínculo.');
    } finally {
      setSaving(false);
    }
  };

  const desvincular = async () => {
    if (!window.confirm('Remover vínculo com Meal Control?')) return;
    setSaving(true);
    try {
      const res = await alimentosApi.desvincularMealcontrol(preparo.id);
      onSaved(res.data);
      onClose();
    } catch {
      setError('Erro ao remover vínculo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 20, width: '92%', maxWidth: 620,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Vincular com Meal Control</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: 2 }}>
              Preparo: <b>{preparo.nome}</b>
            </div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button>
        </div>

        {preparo.mealcontrolRecipeId && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, fontSize: '0.85rem' }}>
            Vinculado a: <b>{preparo.mealcontrolRecipeName}</b>
            {preparo.mealcontrolIsRepresentative && <span style={{ marginLeft: 6, color: '#92400e' }}>(representativo)</span>}
            <button className="btn btn-sm btn-danger" style={{ marginLeft: 10, padding: '2px 10px', fontSize: '0.75rem' }} onClick={desvincular} disabled={saving}>
              Remover vínculo
            </button>
          </div>
        )}

        <input
          type="text"
          className="form-control"
          placeholder="Buscar receita por nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
          style={{ marginBottom: 10 }}
        />

        {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
          {loading && <div style={{ padding: 16, color: 'var(--gray-500)' }}>Carregando receitas…</div>}
          {!loading && filtradas.length === 0 && (
            <div style={{ padding: 16, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
              Nenhuma receita encontrada com "{busca}". Digite outra busca ou marque como sem vínculo.
            </div>
          )}
          {!loading && filtradas.map((r) => {
            const jaVinculado = preparo.mealcontrolRecipeId === r.id;
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderBottom: '1px solid var(--gray-100)',
                background: jaVinculado ? '#f0fdf4' : 'transparent',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    #{r.id} {r.name}
                  </div>
                  {(r.portion_g || r.yield_qty) && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                      {r.portion_g ? `Porção ${r.portion_g}g` : ''}
                      {r.portion_g && r.yield_qty ? ' · ' : ''}
                      {r.yield_qty ? `Rende ${r.yield_qty}${r.yield_unit || ''}` : ''}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-sm btn-success"
                  style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                  onClick={() => vincular(r, false)}
                  disabled={saving}
                  title="Vincular como receita exata"
                >
                  ✓ Exato
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    padding: '3px 10px', fontSize: '0.75rem',
                    background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e',
                  }}
                  onClick={() => vincular(r, true)}
                  disabled={saving}
                  title="Vincular como representativo (aproximação)"
                >
                  ≈ Representativo
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
