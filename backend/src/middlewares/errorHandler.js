function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflito: registro duplicado.',
        details: err.meta,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Registro não encontrado.',
        details: err.meta,
      });
    }
  }

  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos fornecidos.',
      details: err.message,
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor.';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
