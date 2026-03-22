const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidos.controller');

router.get('/', pedidosController.listar);
router.post('/', pedidosController.criar);
router.delete('/', pedidosController.deletarVarios);       // bulk delete — before /:id
router.get('/:id', pedidosController.buscarPorId);
router.put('/:id', pedidosController.atualizar);
router.delete('/:id', pedidosController.deletar);
router.post('/:id/gerar', pedidosController.gerarCardapio);
router.put('/:id/status', pedidosController.atualizarStatus);
router.patch('/:id/valor', pedidosController.atualizarValor);

module.exports = router;
