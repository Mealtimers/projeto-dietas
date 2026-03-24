import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { solicitacoesApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'AGUARDANDO', label: 'Aguardando' },
  { value: 'EM_ORCAMENTO', label: 'Em Orçamento' },
  { value: 'ORCAMENTO_ENVIADO', label: 'Orçamento Enviado' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REPROVADO', label: 'Reprovado' },
];

export default function SolicitacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    solicitacoesApi.listar(filtroStatus || undefined)
      .then(res => setSolicitacoes(res.data))
      .catch(() => setError('Erro ao carregar solicitações.'))
      .finally(() => setLoading(false));
  }, [filtroStatus]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <>
      <div className="page-header">
        <h1>Solicitações de Orçamento
          <span style={{ marginLeft: 10, fontSize: '0.85rem', fontWeight: 400, color: 'var(--gray-400)' }}>
            {solicitacoes.length} registro(s)
          </span>
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href="/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            Ver Portal do Cliente
          </a>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`btn btn-sm ${filtroStatus === opt.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFiltroStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : solicitacoes.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📥</div>
              <p>Nenhuma solicitação {filtroStatus ? 'com este status' : 'ainda'}.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                Compartilhe o link do portal com seus clientes:<br />
                <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                  {window.location.origin}/portal
                </code>
              </p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Contato</th>
                    <th>Pratos</th>
                    <th>Proteínas</th>
                    <th>Status</th>
                    <th className="action-cell">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitacoes.map(sol => {
                    const proteinas = Array.isArray(sol.proteinas) ? sol.proteinas : [];
                    return (
                      <tr key={sol.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                          {formatDate(sol.createdAt)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{sol.nome}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{sol.email}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                          {sol.telefone || '—'}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>{sol.totalPratos}</span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--gray-600)', maxWidth: 160 }}>
                          {proteinas.map(p => p.alimentoNome).filter(Boolean).join(', ') || '—'}
                        </td>
                        <td><StatusBadge status={sol.status} /></td>
                        <td className="action-cell">
                          <Link to={`/solicitacoes/${sol.id}`} className="btn btn-xs btn-outline">
                            Ver detalhes
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Link do portal */}
        <div className="card" style={{ marginTop: 20, background: '#fff5f5', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '1.5rem' }}>🔗</div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>Link do Portal para Clientes</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                Compartilhe este link para seus clientes enviarem solicitações de orçamento:
              </div>
              <code style={{ display: 'inline-block', marginTop: 4, background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: '0.82rem', color: 'var(--gray-700)' }}>
                {window.location.origin}/portal
              </code>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginLeft: 'auto' }}
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portal`); }}
            >
              Copiar link
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
