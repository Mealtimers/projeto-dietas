const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidos.controller');

router.get('/', pedidosController.listar);
router.get('/:id', pedidosController.buscarPorId);
router.post('/', pedidosController.criar);
router.delete('/:id', pedidosController.deletar);
router.post('/:id/gerar', pedidosController.gerarCardapio);
router.put('/:id/status', pedidosController.atualizarStatus);

module.exports = router;
