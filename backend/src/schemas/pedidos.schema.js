'use strict';

const { z } = require('zod');

const proteinaItem = z.object({
  alimentoBaseId:   z.string().min(1, 'alimentoBaseId é obrigatório'),
  gramagem:         z.coerce.number().positive('Gramagem deve ser positiva'),
  quantidadePratos: z.coerce.number().int().positive('quantidadePratos deve ser positivo'),
  preparosIds:      z.array(z.string()).default([]),
});

const grupoAcompanhamento = z.object({
  gramagem: z.coerce.number().min(0),
  preparos: z.array(z.string()).default([]),
}).optional().nullable();

const criarPedido = z.object({
  body: z.object({
    clienteId:        z.string().min(1, 'clienteId é obrigatório'),
    tipoRefeicao:     z.enum(['ALMOCO', 'JANTAR']).default('ALMOCO'),
    totalPratos:      z.coerce.number().int().min(5, 'Mínimo de 5 pratos'),
    maxRepeticoes:    z.coerce.number().int().positive('maxRepeticoes deve ser positivo'),
    minRepeticoesLote: z.coerce.number().int().positive().default(2),
    observacoes:      z.string().max(2000).optional().nullable(),
    obsLegumes:       z.string().max(2000).optional().nullable(),
    nutricionista:    z.string().max(200).optional().nullable(),
    proteinas:        z.array(proteinaItem).min(1, 'Informe ao menos uma proteína'),
    carboidratos:     grupoAcompanhamento,
    leguminosas:      grupoAcompanhamento,
    legumes:          grupoAcompanhamento,
  }).passthrough().refine(
    data => {
      const soma = data.proteinas.reduce((s, p) => s + p.quantidadePratos, 0);
      return soma === data.totalPratos;
    },
    { message: 'Soma das proteínas deve ser igual a totalPratos' },
  ),
});

const atualizarStatus = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status:      z.string().min(1, 'Status é obrigatório'),
    observacoes: z.string().max(2000).optional().nullable(),
  }),
});

const atualizarValor = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    valorTotal: z.coerce.number().min(0, 'Valor não pode ser negativo').nullable(),
  }),
});

const deletarVarios = z.object({
  body: z.object({
    ids: z.array(z.string().min(1)).min(1, 'Informe ao menos um ID'),
  }),
});

const atualizarPedido = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    totalPratos:       z.coerce.number().int().min(5, 'Mínimo de 5 pratos'),
    maxRepeticoes:     z.coerce.number().int().positive('maxRepeticoes deve ser positivo'),
    minRepeticoesLote: z.coerce.number().int().positive().default(2),
    observacoes:       z.string().max(2000).optional().nullable(),
    obsLegumes:        z.string().max(2000).optional().nullable(),
    nutricionista:     z.string().max(200).optional().nullable(),
    proteinas:         z.array(proteinaItem).min(1, 'Informe ao menos uma proteína'),
    carboidratos:      grupoAcompanhamento,
    leguminosas:       grupoAcompanhamento,
    legumes:           grupoAcompanhamento,
  }).passthrough().refine(
    data => {
      const soma = data.proteinas.reduce((s, p) => s + p.quantidadePratos, 0);
      return soma === data.totalPratos;
    },
    { message: 'Soma das proteínas deve ser igual a totalPratos' },
  ),
});

module.exports = { criarPedido, atualizarPedido, atualizarStatus, atualizarValor, deletarVarios };
