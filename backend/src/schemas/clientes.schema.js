'use strict';

const { z } = require('zod');

const criarCliente = z.object({
  body: z.object({
    nome:        z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(200),
    email:       z.string().email('Email inválido'),
    telefone:    z.string().min(8, 'Telefone deve ter no mínimo 8 caracteres').max(20),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
});

const atualizarCliente = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    nome:        z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(200),
    email:       z.string().email('Email inválido').optional(),
    telefone:    z.string().min(8, 'Telefone deve ter no mínimo 8 caracteres').max(20),
    observacoes: z.string().max(1000).optional().nullable(),
  }),
});

const deletarVarios = z.object({
  body: z.object({
    ids: z.array(z.string().min(1)).min(1, 'Informe ao menos um ID'),
  }),
});

module.exports = { criarCliente, atualizarCliente, deletarVarios };
