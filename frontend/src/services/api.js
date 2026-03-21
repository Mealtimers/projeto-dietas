import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const gruposApi = {
  listar: () => api.get('/grupos'),
  buscar: (id) => api.get(`/grupos/${id}`),
  criar: (data) => api.post('/grupos', data),
  atualizar: (id, data) => api.put(`/grupos/${id}`, data),
  deletar: (id) => api.delete(`/grupos/${id}`),
};

export const alimentosApi = {
  listar: (grupoId) => api.get('/alimentos', { params: grupoId ? { grupoId } : {} }),
  buscar: (id) => api.get(`/alimentos/${id}`),
  criar: (data) => api.post('/alimentos', data),
  atualizar: (id, data) => api.put(`/alimentos/${id}`, data),
  deletar: (id) => api.delete(`/alimentos/${id}`),
  adicionarPreparo: (id, data) => api.post(`/alimentos/${id}/preparos`, data),
  atualizarPreparo: (preparoId, data) => api.put(`/alimentos/preparos/${preparoId}`, data),
  deletarPreparo: (preparoId) => api.delete(`/alimentos/preparos/${preparoId}`),
};

export const preparosApi = {
  listar: () => api.get('/preparos'),
};

export const clientesApi = {
  listar: () => api.get('/clientes'),
  buscar: (id) => api.get(`/clientes/${id}`),
  criar: (data) => api.post('/clientes', data),
  atualizar: (id, data) => api.put(`/clientes/${id}`, data),
  deletar: (id) => api.delete(`/clientes/${id}`),
};

export const pedidosApi = {
  listar: () => api.get('/pedidos'),
  buscar: (id) => api.get(`/pedidos/${id}`),
  criar: (data) => api.post('/pedidos', data),
  deletar: (id) => api.delete(`/pedidos/${id}`),
  gerarCardapio: (id) => api.post(`/pedidos/${id}/gerar`),
  atualizarStatus: (id, data) => api.put(`/pedidos/${id}/status`, data),
};

export const aprovacoesApi = {
  listar: () => api.get('/aprovacoes'),
  buscar: (pedidoId) => api.get(`/aprovacoes/${pedidoId}`),
  aprovarOuReprovar: (pedidoId, data) => api.post(`/aprovacoes/${pedidoId}`, data),
};

export const ordensApi = {
  listar: () => api.get('/ordens-producao'),
  buscar: (id) => api.get(`/ordens-producao/${id}`),
  gerar: (pedidoId) => api.post(`/ordens-producao/${pedidoId}`),
  atualizarStatus: (id, data) => api.put(`/ordens-producao/${id}/status`, data),
};

export default api;
