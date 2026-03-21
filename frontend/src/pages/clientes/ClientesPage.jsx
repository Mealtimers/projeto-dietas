import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clientesApi } from '../../services/api';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    clientesApi.listar()
      .then((res) => setClientes(res.data))
      .catch(() => setError('Erro ao carregar clientes.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Deseja excluir o cliente "${nome}"?`)) return;
    try {
      await clientesApi.deletar(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Erro ao excluir cliente.');
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Clientes</h1>
        <Link to="/clientes/novo" className="btn btn-primary">+ Novo Cliente</Link>
      </div>
      <div className="page-content">
        <div className="card">
          {loading && <div className="loading">Carregando...</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && clientes.length === 0 && (
            <div className="empty-state">
              <p>Nenhum cliente cadastrado.</p>
              <Link to="/clientes/novo" className="btn btn-primary">Cadastrar primeiro cliente</Link>
            </div>
          )}
          {!loading && clientes.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Pedidos</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/clientes/${c.id}`} style={{ fontWeight: 600 }}>{c.nome}</Link>
                      </td>
                      <td>{c.email}</td>
                      <td>{c.telefone || '-'}</td>
                      <td>{c._count?.pedidos ?? 0}</td>
                      <td>
                        <div className="btn-group">
                          <Link to={`/clientes/${c.id}`} className="btn btn-sm btn-outline">Ver</Link>
                          <Link to={`/clientes/${c.id}/editar`} className="btn btn-sm btn-secondary">Editar</Link>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(c.id, c.nome)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
