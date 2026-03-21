import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { clientesApi } from '../../services/api';

export default function ClienteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    observacoes: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      clientesApi.buscar(id)
        .then((res) => {
          const c = res.data;
          setForm({
            nome: c.nome || '',
            email: c.email || '',
            telefone: c.telefone || '',
            observacoes: c.observacoes || '',
          });
        })
        .catch(() => setError('Erro ao carregar dados do cliente.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.nome.trim() || !form.email.trim()) {
      setError('Nome e email são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        await clientesApi.atualizar(id, form);
        navigate(`/clientes/${id}`);
      } else {
        const res = await clientesApi.criar(form);
        navigate(`/clientes/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar cliente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <>
      <div className="page-header">
        <h1>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h1>
        <Link to="/clientes" className="btn btn-secondary">Voltar</Link>
      </div>
      <div className="page-content">
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label required">Nome</label>
                <input
                  type="text"
                  name="nome"
                  className="form-control"
                  value={form.nome}
                  onChange={handleChange}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label required">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="text"
                  name="telefone"
                  className="form-control"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea
                name="observacoes"
                className="form-control"
                value={form.observacoes}
                onChange={handleChange}
                placeholder="Objetivos, alergias, preferências alimentares..."
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Cliente'}
              </button>
              <Link to="/clientes" className="btn btn-secondary">Cancelar</Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
