const STATUS_LABELS = {
  // Pedido
  PENDENTE: 'Pendente',
  GERADO: 'Gerado',
  AGUARDANDO_APROVACAO: 'Aguard. Aprovação',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  EM_PRODUCAO: 'Em Produção',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  // Aprovação
  // (shared with above)
  // Ordem
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
  // Dieta
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  // Solicitação portal
  AGUARDANDO:        'Aguardando',
  EM_ORCAMENTO:      'Em Orçamento',
  ORCAMENTO_ENVIADO: 'Orçamento Enviado',
  // Tipo refeição
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
  CAFE_MANHA: 'Café da Manhã',
  LANCHE_MANHA: 'Lanche Manhã',
  ALMOCO: 'Almoço',
  LANCHE_TARDE: 'Lanche Tarde',
  JANTAR: 'Jantar',
  CEIA: 'Ceia',
};

function StatusBadge({ status }) {
  if (!status) return null;
  const key = status.toLowerCase().replace(/_/g, '-');
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`badge badge-${key}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
