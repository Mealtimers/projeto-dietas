import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clientesApi } from '../../services/api';

const POR_PAGINA = 20;

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

export default function ClientesPage() {
  const [clientes, setClientes]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [success, setSuccess]           = useState(null);
  const [busca, setBusca]               = useState('');
  const [pagina, setPagina]             = useState(1);
  const [selected, setSelected]         = useState(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const headerCheckRef                  = useRef(null);

  const showMsg = (type, msg) => {
    type === 'success' ? setSuccess(msg) : setError(msg);
    setTimeout(() => { setSuccess(null); setError(null); }, 3500);
  };

  useEffect(() => {
    clientesApi.listar()
      .then((res) => setClientes(res.data))
      .catch(() => setError('Erro ao carregar clientes.'))
      .finally(() => setLoading(false));
  }, []);

  // Filtro de busca
  const clientesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      c.nome.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.telefone || '').toLowerCase().includes(q)
    );
  }, [clientes, busca]);

  // Reset página ao mudar busca
  useEffect(() => { setPagina(1); }, [busca]);

  const totalPages   = Math.max(1, Math.ceil(clientesFiltrados.length / POR_PAGINA));
  const clientesPag  = clientesFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Seleção — opera sobre a página atual
  const allSelected  = clientesPag.length > 0 && clientesPag.every((c) => selected.has(c.id));
  const someSelected = clientesPag.some((c) => selected.has(c.id));

  useEffect(() => {
    if (headerCheckRef.current) headerCheckRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const s = new Set(prev); clientesPag.forEach((c) => s.delete(c.id)); return s; });
    } else {
      setSelected((prev) => new Set([...prev, ...clientesPag.map((c) => c.id)]));
    }
  };

  const toggleOne = (id) => {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Deseja excluir o cliente "${nome}"?`)) return;
    try {
      await clientesApi.deletar(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
      showMsg('success', `Cliente "${nome}" excluído.`);
    } catch {
      showMsg('error', 'Erro ao excluir cliente.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Confirma a exclusão de ${selected.size} cliente(s)? Todos os pedidos vinculados também serão removidos.`)) return;
    setDeletingBulk(true);
    try {
      const res = await clientesApi.deletarVarios([...selected]);
      setClientes((prev) => prev.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
      showMsg('success', res.data.mensagem);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Erro ao excluir clientes.');
    } finally {
      setDeletingBulk(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>
          Clientes
          <small> {clientesFiltrados.length}{busca ? ` encontrado(s)` : ` registro(s)`}</small>
        </h1>
        <Link to="/clientes/novo" className="btn btn-primary">+ Novo Cliente</Link>
      </div>

      <div className="page-content">
        {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

        <div className="card">
          {/* Barra de busca */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', maxWidth: 360 }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--gray-400)', fontSize: '1rem', pointerEvents: 'none',
              }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou telefone…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  width: '100%', padding: '8px 36px 8px 36px',
                  border: '1px solid var(--gray-200)', borderRadius: 8,
                  fontSize: '0.9rem', outline: 'none',
                  background: 'var(--gray-50)',
                  transition: 'border-color .2s',
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
                  title="Limpar busca"
                >✕</button>
              )}
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

          {!loading && !error && clientesFiltrados.length === 0 && (
            <div className="empty-state">
              {busca
                ? <><div className="empty-state-icon">🔍</div><p>Nenhum cliente encontrado para "{busca}".</p><button className="btn btn-ghost" onClick={() => setBusca('')}>Limpar busca</button></>
                : <><p>Nenhum cliente cadastrado.</p><Link to="/clientes/novo" className="btn btn-primary">Cadastrar primeiro cliente</Link></>
              }
            </div>
          )}

          {!loading && clientesPag.length > 0 && (
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
                          title="Selecionar todos desta página"
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Telefone</th>
                      <th>Pedidos</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesPag.map((c) => (
                      <tr key={c.id} style={selected.has(c.id) ? { background: '#f0fdf4' } : {}}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggleOne(c.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                        <td><Link to={`/clientes/${c.id}`} style={{ fontWeight: 600 }}>{c.nome}</Link></td>
                        <td>{c.email}</td>
                        <td>{c.telefone || '-'}</td>
                        <td>{c._count?.pedidos ?? 0}</td>
                        <td>
                          <div className="btn-group">
                            <Link to={`/clientes/${c.id}`} className="btn btn-sm btn-outline">Ver</Link>
                            <Link to={`/clientes/${c.id}/editar`} className="btn btn-sm btn-secondary">Editar</Link>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id, c.nome)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Rodapé paginação */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>
                  Exibindo {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, clientesFiltrados.length)} de {clientesFiltrados.length}
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
