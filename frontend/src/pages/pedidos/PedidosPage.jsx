import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { pedidosApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const POR_PAGINA = 20;

// Bloqueia edição estrutural
const STATUS_BLOQUEADO_EDICAO   = ['APROVADO', 'EM_PRODUCAO', 'CONCLUIDO', 'CANCELADO'];
// Bloqueia exclusão direta (EM_PRODUCAO precisa cancelar antes)
const STATUS_BLOQUEADO_EXCLUSAO = ['APROVADO', 'CONCLUIDO', 'EM_PRODUCAO'];

const STATUS_LABELS = {
  PENDENTE:             'Pendente',
  GERADO:               'Gerado',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  APROVADO:             'Aprovado',
  REPROVADO:            'Reprovado',
  EM_PRODUCAO:          'Em Produção',
  CONCLUIDO:            'Concluído',
  CANCELADO:            'Cancelado',
};

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const items = [];
  let last = 0;
  for (let p = 1; p <= totalPages; p++) {
    const show = p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1);
    if (show) {
      if (last && p - last > 1) items.push('…');
      items.push(p);
      last = p;
    }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 20 }}>
      <button className="btn btn-sm btn-ghost" disabled={page === 1} onClick={() => onChange(page - 1)}>← Ant.</button>
      {items.map((it, i) =>
        it === '…'
          ? <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)' }}>…</span>
          : <button key={it} className={`btn btn-sm ${it === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onChange(it)}>{it}</button>
      )}
      <button className="btn btn-sm btn-ghost" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Próx. →</button>
    </div>
  );
}

export default function PedidosPage() {
  const [pedidos, setPedidos]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [success, setSuccess]           = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca]               = useState('');
  const [pagina, setPagina]             = useState(1);
  const [deleting, setDeleting]         = useState(null);
  const [canceling, setCanceling]       = useState(null);
  const [selected, setSelected]         = useState(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const headerCheckRef                  = useRef(null);

  const load = () => {
    pedidosApi.listar()
      .then((res) => { setPedidos(res.data); setSelected(new Set()); })
      .catch(() => setError('Erro ao carregar pedidos.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showMsg = (type, msg) => {
    type === 'success' ? setSuccess(msg) : setError(msg);
    setTimeout(() => { setSuccess(null); setError(null); }, 3500);
  };

  // Filtro por status
  const pedidosPorStatus = useMemo(() =>
    filtroStatus ? pedidos.filter((p) => p.status === filtroStatus) : pedidos,
    [pedidos, filtroStatus]
  );

  // Filtro por busca (nome do cliente)
  const pedidosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pedidosPorStatus;
    return pedidosPorStatus.filter((p) =>
      (p.cliente?.nome || '').toLowerCase().includes(q)
    );
  }, [pedidosPorStatus, busca]);

  // Reset página ao mudar filtros
  useEffect(() => { setPagina(1); }, [filtroStatus, busca]);

  const totalPages  = Math.max(1, Math.ceil(pedidosFiltrados.length / POR_PAGINA));
  const pedidosPag  = pedidosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Seleção — apenas deletáveis da página atual
  const deletaveisNaPagina = pedidosPag
    .filter((p) => !STATUS_BLOQUEADO_EXCLUSAO.includes(p.status))
    .map((p) => p.id);

  const allSelected  = deletaveisNaPagina.length > 0 && deletaveisNaPagina.every((id) => selected.has(id));
  const someSelected = deletaveisNaPagina.some((id) => selected.has(id));

  useEffect(() => {
    if (headerCheckRef.current) headerCheckRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const s = new Set(prev); deletaveisNaPagina.forEach((id) => s.delete(id)); return s; });
    } else {
      setSelected((prev) => new Set([...prev, ...deletaveisNaPagina]));
    }
  };

  const toggleOne = (id) => {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Confirma o cancelamento deste pedido em produção?')) return;
    setCanceling(id);
    try {
      const res = await pedidosApi.atualizarStatus(id, { status: 'CANCELADO' });
      setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, status: res.data.status } : p));
      showMsg('success', 'Pedido cancelado. Agora você pode excluí-lo se desejar.');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Erro ao cancelar pedido.');
    } finally {
      setCanceling(null);
    }
  };

  const handleDelete = async (id, status) => {
    if (STATUS_BLOQUEADO_EXCLUSAO.includes(status)) {
      showMsg('error', status === 'EM_PRODUCAO'
        ? 'Cancele o pedido primeiro antes de excluir.'
        : `Pedido com status "${STATUS_LABELS[status]}" não pode ser excluído.`);
      return;
    }
    if (!window.confirm('Confirma a exclusão definitiva deste pedido?')) return;
    setDeleting(id);
    try {
      await pedidosApi.deletar(id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
      showMsg('success', 'Pedido excluído.');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Erro ao excluir.');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Confirma a exclusão de ${selected.size} pedido(s) selecionado(s)?`)) return;
    setDeletingBulk(true);
    try {
      const res = await pedidosApi.deletarVarios([...selected]);
      setPedidos((prev) => prev.filter((p) => !selected.has(p.id) || STATUS_BLOQUEADO_EXCLUSAO.includes(p.status)));
      setSelected(new Set());
      showMsg('success', res.data.mensagem);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Erro ao excluir pedidos.');
    } finally {
      setDeletingBulk(false);
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('pt-BR') : '—';

  const statusOptions = Object.keys(STATUS_LABELS);

  return (
    <>
      <div className="page-header">
        <h1>
          Pedidos
          <small> {pedidosFiltrados.length}{busca || filtroStatus ? ' encontrado(s)' : ' registro(s)'}</small>
        </h1>
        <Link to="/pedidos/novo" className="btn btn-primary">+ Novo Pedido</Link>
      </div>

      <div className="page-content">
        {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

        <div className="card">
          {/* Toolbar: busca + filtro status */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Busca */}
            <div style={{ position: 'relative', flex: '0 0 280px' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--gray-400)', pointerEvents: 'none',
              }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar por cliente…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  width: '100%', padding: '8px 32px 8px 36px',
                  border: '1px solid var(--gray-200)', borderRadius: 8,
                  fontSize: '0.9rem', outline: 'none', background: 'var(--gray-50)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={(e)  => (e.target.style.borderColor = 'var(--gray-200)')}
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--gray-400)', fontSize: '1rem', lineHeight: 1,
                  }}
                >✕</button>
              )}
            </div>

            {/* Filtro status */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-500)' }}>Status:</span>
              <button
                onClick={() => setFiltroStatus('')}
                className={`btn btn-sm ${filtroStatus === '' ? 'btn-primary' : 'btn-ghost'}`}
              >Todos</button>
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s === filtroStatus ? '' : s)}
                  className={`btn btn-sm ${filtroStatus === s ? 'btn-primary' : 'btn-ghost'}`}
                >{STATUS_LABELS[s]}</button>
              ))}
            </div>
          </div>

          {/* Barra de seleção em lote */}
          {selected.size > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', marginBottom: 12,
              background: '#dcfce7', border: '1px solid var(--primary)', borderRadius: 8,
            }}>
              <span style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>
                ✅ {selected.size} selecionado(s)
              </span>
              <button className="btn btn-sm btn-danger" onClick={handleDeleteSelected} disabled={deletingBulk}>
                {deletingBulk ? 'Excluindo...' : '🗑️ Excluir selecionados'}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
                Limpar seleção
              </button>
            </div>
          )}

          {loading && <div className="loading">Carregando...</div>}

          {!loading && pedidosFiltrados.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              {busca || filtroStatus
                ? <><p>Nenhum pedido encontrado para os filtros aplicados.</p>
                    <button className="btn btn-ghost" onClick={() => { setBusca(''); setFiltroStatus(''); }}>Limpar filtros</button></>
                : <><p>Nenhum pedido encontrado.</p><Link to="/pedidos/novo" className="btn btn-primary">Criar pedido</Link></>
              }
            </div>
          )}

          {!loading && pedidosPag.length > 0 && (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          ref={headerCheckRef}
                          checked={allSelected}
                          onChange={toggleAll}
                          title="Selecionar deletáveis desta página"
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </th>
                      <th>Cliente</th>
                      <th>Pratos</th>
                      <th>Máx. Rep.</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Aprovação</th>
                      <th className="action-cell">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosPag.map((p) => {
                      const canEdit   = !STATUS_BLOQUEADO_EDICAO.includes(p.status);
                      const canCancel = p.status === 'EM_PRODUCAO';
                      const canDelete = !STATUS_BLOQUEADO_EXCLUSAO.includes(p.status);

                      return (
                        <tr key={p.id} style={selected.has(p.id) ? { background: '#f0fdf4' } : {}}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selected.has(p.id)}
                              onChange={() => toggleOne(p.id)}
                              disabled={!canDelete}
                              title={!canDelete ? `Status "${STATUS_LABELS[p.status]}" não permite exclusão` : ''}
                              style={{ cursor: canDelete ? 'pointer' : 'not-allowed', width: 16, height: 16, opacity: canDelete ? 1 : 0.35 }}
                            />
                          </td>
                          <td>
                            <Link to={`/clientes/${p.cliente?.id}`} style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>
                              {p.cliente?.nome || '—'}
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{p.totalPratos}</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginLeft: 3 }}>pratos</span>
                          </td>
                          <td style={{ color: 'var(--gray-500)' }}>{p.maxRepeticoes}×</td>
                          <td style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{formatDate(p.createdAt)}</td>
                          <td><StatusBadge status={p.status} /></td>
                          <td>
                            {p.aprovacao
                              ? <StatusBadge status={p.aprovacao.status} />
                              : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                          </td>
                          <td className="action-cell">
                            <div className="btn-group">
                              <Link to={`/pedidos/${p.id}`} className="btn btn-xs btn-outline">Ver</Link>
                              {canEdit && (
                                <Link to={`/pedidos/${p.id}/editar`} className="btn btn-xs btn-secondary">Editar</Link>
                              )}
                              <Link to={`/pedidos/novo?repetirDe=${p.id}`} className="btn btn-xs btn-ghost" title="Repetir pedido">🔄</Link>
                              {canCancel && (
                                <button
                                  className="btn btn-xs btn-warning"
                                  onClick={() => handleCancel(p.id)}
                                  disabled={canceling === p.id}
                                >
                                  {canceling === p.id ? '...' : '⛔ Cancelar'}
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  className="btn btn-xs btn-danger"
                                  onClick={() => handleDelete(p.id, p.status)}
                                  disabled={deleting === p.id}
                                >
                                  {deleting === p.id ? '...' : 'Excluir'}
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

              {/* Rodapé paginação */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>
                  Exibindo {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, pedidosFiltrados.length)} de {pedidosFiltrados.length}
                </span>
                <Pagination page={pagina} totalPages={totalPages} onChange={setPagina} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
