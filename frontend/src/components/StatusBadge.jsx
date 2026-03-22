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
  // Tipo refeição
  CAFE_MANHA: 'Café da Manhã',
  LANCHE_MANHA: 'Lanche Manhã',
  ALMOCO: 'Almoço',
  LANCHE_TARDE: 'Lanche Tarde',
  JANTAR: 'Jantar',
  CEIA: 'Ceia',
};

function StatusBadge({ status }) {
  if (!status) return null;
  const key = status.toLowerCase().replace(/_/g, '_');
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`badge badge-${key}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
