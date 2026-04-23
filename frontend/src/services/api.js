import axios from 'axios';
import { getToken, clearSession } from '../auth';
import { getGlobalToast } from '../components/Toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// Envia token JWT em toda requisição
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Tratamento centralizado de erros
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const toast = getGlobalToast();
    const status = err.response?.status;
    const data   = err.response?.data;

    if (status === 401) {
      clearSession();
      // Dispara evento para o App redirecionar via router (sem hard reload)
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(err);
    }

    if (status === 429) {
      toast?.warning(data?.error || 'Muitas requisições. Aguarde um momento.');
    } else if (status === 400 && data?.fields) {
      // Erros de validação Zod — mostra o primeiro campo
      const firstField = data.fields[0];
      toast?.error(firstField ? `${firstField.campo}: ${firstField.mensagem}` : data.error);
    } else if (status >= 400 && status < 500) {
      toast?.error(data?.error || 'Erro na requisição.');
    } else if (status >= 500) {
      toast?.error('Erro no servidor. Tente novamente.');
    } else if (!err.response) {
      toast?.error('Sem conexão com o servidor. Verifique sua internet.');
    }

    return Promise.reject(err);
  }
);

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
  deletarVarios: (ids) => api.delete('/clientes', { data: { ids } }),
};

export const pedidosApi = {
  listar: () => api.get('/pedidos'),
  buscar: (id) => api.get(`/pedidos/${id}`),
  criar: (data) => api.post('/pedidos', data),
  atualizar: (id, data) => api.put(`/pedidos/${id}`, data),
  deletar: (id) => api.delete(`/pedidos/${id}`),
  deletarVarios: (ids) => api.delete('/pedidos', { data: { ids } }),
  gerarCardapio: (id) => api.post(`/pedidos/${id}/gerar`),
  atualizarStatus: (id, data) => api.put(`/pedidos/${id}/status`, data),
  atualizarValor:  (id, data) => api.patch(`/pedidos/${id}/valor`, data),
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

export const solicitacoesApi = {
  listar:          (status) => api.get('/solicitacoes', { params: status ? { status } : {} }),
  buscar:          (id)     => api.get(`/solicitacoes/${id}`),
  contagem:        ()       => api.get('/solicitacoes/contagem'),
  atualizarStatus: (id, data) => api.put(`/solicitacoes/${id}/status`, data),
  deletar:         (id) => api.delete(`/solicitacoes/${id}`),
  deletarVarias:   (ids) => api.delete('/solicitacoes', { data: { ids } }),
};

// API pública do portal (sem auth)
const portalApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
export const portalPublicApi = {
  opcoes:    ()     => portalApi.get('/portal/opcoes'),
  solicitar: (data) => portalApi.post('/portal/solicitar', data),
};

export const lotesApi = {
  molhos:        ()                     => api.get('/lotes/molhos'),
  atualizarItem: (loteId, itemId, data) => api.put(`/lotes/${loteId}/itens/${itemId}`, data),
  adicionarMolho:(loteId, data)         => api.post(`/lotes/${loteId}/molho`, data),
  removerItem:   (loteId, itemId)       => api.delete(`/lotes/${loteId}/itens/${itemId}`),
};

export default api;
