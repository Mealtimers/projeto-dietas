const express = require('express');
const router = express.Router();

router.use('/grupos', require('./grupos.routes'));
router.use('/alimentos', require('./alimentos.routes'));
router.use('/preparos', require('./preparos.routes'));
router.use('/clientes', require('./clientes.routes'));
router.use('/pedidos', require('./pedidos.routes'));
router.use('/aprovacoes', require('./aprovacoes.routes'));
router.use('/ordens-producao', require('./ordens.routes'));
router.use('/lotes',           require('./lotes.routes'));
router.use('/solicitacoes',    require('./solicitacoes.routes'));
router.use('/admin',           require('./admin.routes'));

module.exports = router;
