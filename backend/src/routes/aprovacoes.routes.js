const express = require('express');
const router = express.Router();
const aprovacoesController = require('../controllers/aprovacoes.controller');

router.get('/', aprovacoesController.listar);
router.get('/:pedidoId', aprovacoesController.buscarPorPedido);
router.post('/:pedidoId', aprovacoesController.aprovarOuReprovar);

module.exports = router;
