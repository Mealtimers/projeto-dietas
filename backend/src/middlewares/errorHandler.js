function errorHandler(err, req, res, next) {
  // Log completo no servidor (nunca expor ao cliente)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...(err.meta && { meta: err.meta }),
  });

  // ── Erros de validação (Zod) ──────────────────────────────────
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados inválidos.',
      fields: err.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    });
  }

  // ── Erros Prisma conhecidos ───────────────────────────────────
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Conflito: registro duplicado.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }
  }

  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({ error: 'Dados inválidos fornecidos.' });
  }

  // ── Erro de negócio com status explícito ──────────────────────
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }

  res.status(status).json({ error: err.message || 'Erro inesperado.' });
}

module.exports = errorHandler;
