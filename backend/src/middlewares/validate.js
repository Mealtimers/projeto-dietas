'use strict';

/**
 * Middleware de validação genérico usando Zod.
 * Valida body, params e/ou query conforme o schema fornecido.
 *
 * Uso: router.post('/rota', validate(schema), controller)
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body:   req.body,
        params: req.params,
        query:  req.query,
      });
      req.body   = parsed.body   ?? req.body;
      req.params = parsed.params ?? req.params;
      req.query  = parsed.query  ?? req.query;
      next();
    } catch (err) {
      err.name = 'ZodError';
      next(err);
    }
  };
}

module.exports = validate;
