import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { solicitacoesApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const STATUS_TRANSITIONS = {
  AGUARDANDO:        ['EM_ORCAMENTO', 'REPROVADO'],
  EM_ORCAMENTO:      ['ORCAMENTO_ENVIADO', 'REPROVADO'],
  ORCAMENTO_ENVIADO: ['APROVADO', 'REPROVADO'],
  APROVADO:          [],
  REPROVADO:         ['AGUARDANDO'],
};

const STATUS_LABELS = {
  EM_ORCAMENTO:      'Iniciar Orçamento',
  ORCAMENTO_ENVIADO: 'Marcar Orçamento Enviado',
  APROVADO:          'Marcar como Aprovado',
  REPROVADO:         'Reprovar',
  AGUARDANDO:        'Reabrir',
};

const STATUS_BTN = {
  EM_ORCAMENTO:      'btn-primary',
  ORCAMENTO_ENVIADO: 'btn-secondary',
  APROVADO:          'btn-success',
  REPROVADO:         'btn-danger',
  AGUARDANDO:        'btn-ghost',
};

export default function SolicitacaoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sol, setSol]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    solicitacoesApi.buscar(id)
      .then(res => setSol(res.data))
      .catch(() => setError('Erro ao carregar solicitação.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (novoStatus) => {
    setAtualizando(true);
    setError(null);
    try {
      await solicitacoesApi.atualizarStatus(id, { status: novoStatus });
      setSuccess('Status atualizado!');
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar status.');
    } finally {
      setAtualizando(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString('pt-BR') : '—';

  if (loading) return <div className="loading">Carregando...</div>;
  if (!sol)    return <div className="page-content"><div className="alert alert-error">Solicitação não encontrada.</div></div>;

  const proteinas   = Array.isArray(sol.proteinas) ? sol.proteinas : [];
  const carboidrato = sol.carboidrato;
  const leguminosa  = sol.leguminosa;
  const legume      = sol.legume;
  const molhos      = Array.isArray(sol.molhos) ? sol.molhos : [];
  const proxStatus  = STATUS_TRANSITIONS[sol.status] || [];

  return (
    <>
      <div className="page-header">
        <h1>Solicitação — {sol.nome}</h1>
        <div className="btn-group">
          <Link to="/solicitacoes" className="btn btn-ghost">← Voltar</Link>
        </div>
      </div>

      <div className="page-content">
        {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Dados do cliente */}
          <div className="card">
            <div className="card-title">Dados do Cliente</div>
            <div className="detail-grid">
              <div className="detail-item"><label>Nome</label><span style={{ fontWeight: 600 }}>{sol.nome}</span></div>
              <div className="detail-item"><label>E-mail</label>
                <span>
                  {sol.email ? (
                    <a href={`mailto:${sol.email}`} style={{ color: 'var(--primary)' }}>{sol.email}</a>
                  ) : '—'}
                </span>
              </div>
              <div className="detail-item"><label>Telefone</label><span>{sol.telefone || '—'}</span></div>
              <div className="detail-item"><label>Recebido em</label><span>{formatDate(sol.createdAt)}</span></div>
              <div className="detail-item"><label>Status</label><span><StatusBadge status={sol.status} /></span></div>
            </div>
            {sol.observacoes && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.85rem', color: '#92400e' }}>
                <b>Obs:</b> {sol.observacoes}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="card">
            <div className="card-title">Ações</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 12 }}>
              Atualize o status conforme o andamento do orçamento.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {proxStatus.map(s => (
                <button
                  key={s}
                  className={`btn ${STATUS_BTN[s] || 'btn-secondary'}`}
                  onClick={() => handleStatus(s)}
                  disabled={atualizando}
                >
                  {STATUS_LABELS[s] || s}
                </button>
              ))}
              {proxStatus.length === 0 && (
                <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Nenhuma ação disponível.</p>
              )}
            </div>

            {/* Atalho para criar pedido */}
            {sol.status !== 'REPROVADO' && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                <Link
                  to={`/pedidos/novo?solicitacaoId=${sol.id}`}
                  className="btn btn-outline"
                  style={{ width: '100%', textAlign: 'center', display: 'block' }}
                >
                  Criar Pedido a partir desta solicitação
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Distribuição alimentar */}
        <div className="card">
          <div className="card-title">Distribuição Solicitada — {sol.totalPratos} marmitas</div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Alimento(s)</th>
                  <th>Gramagem</th>
                  <th>Obs</th>
                </tr>
              </thead>
              <tbody>
                {/* Proteínas */}
                {proteinas.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.8rem', textTransform: 'uppercase' }}>Proteína</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.alimentoNome}</td>
                    <td>{p.gramagem}g × {p.quantidade} pratos</td>
                    <td>—</td>
                  </tr>
                ))}
                {/* Carboidrato */}
                {carboidrato && (
                  <tr>
                    <td><span style={{ fontWeight: 700, color: '#d97706', fontSize: '0.8rem', textTransform: 'uppercase' }}>Carboidrato</span></td>
                    <td>{(carboidrato.alimentoNomes || []).join(', ') || '—'}</td>
                    <td>{carboidrato.gramagem}g</td>
                    <td>—</td>
                  </tr>
                )}
                {/* Leguminosa */}
                {leguminosa && (
                  <tr>
                    <td><span style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.8rem', textTransform: 'uppercase' }}>Leguminosa</span></td>
                    <td>{(leguminosa.alimentoNomes || []).join(', ') || '—'}</td>
                    <td>{leguminosa.gramagem}g</td>
                    <td>—</td>
                  </tr>
                )}
                {/* Legume */}
                {legume && (
                  <tr>
                    <td><span style={{ fontWeight: 700, color: '#059669', fontSize: '0.8rem', textTransform: 'uppercase' }}>Legume</span></td>
                    <td>{(legume.alimentoNomes || []).join(', ') || '—'}</td>
                    <td>{legume.gramagem}g</td>
                    <td style={{ color: '#92400e' }}>{legume.obs || '—'}</td>
                  </tr>
                )}
                {/* Molhos */}
                {molhos.length > 0 && (
                  <tr>
                    <td><span style={{ fontWeight: 700, color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase' }}>Molho</span></td>
                    <td colSpan={3}>{molhos.join(', ')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
