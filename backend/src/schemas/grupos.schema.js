'use strict';

const { z } = require('zod');

const criarGrupo = z.object({
  body: z.object({
    nome:      z.string().min(1, 'Nome é obrigatório').max(100),
    descricao: z.string().max(500).optional().nullable(),
    ordem:     z.coerce.number().int().default(0),
  }),
});

module.exports = { criarGrupo };
