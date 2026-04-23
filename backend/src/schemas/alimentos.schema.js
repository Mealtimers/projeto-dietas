'use strict';

const { z } = require('zod');

const criarAlimento = z.object({
  body: z.object({
    nome:                z.string().min(1, 'Nome é obrigatório').max(200),
    grupoId:             z.string().min(1, 'grupoId é obrigatório'),
    ativo:               z.boolean().default(true),
    carboidratosPor100g: z.coerce.number().min(0).optional().nullable(),
  }),
});

const criarPreparo = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    nome:      z.string().min(1, 'Nome do preparo é obrigatório').max(200),
    descricao: z.string().max(500).optional().nullable(),
    ativo:     z.boolean().default(true),
  }),
});

module.exports = { criarAlimento, criarPreparo };
