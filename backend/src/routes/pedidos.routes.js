const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidos.controller');
const validate = require('../middlewares/validate');
const { criarPedido, atualizarStatus, atualizarValor, deletarVarios } = require('../schemas/pedidos.schema');

router.get('/', pedidosController.listar);
router.post('/', validate(criarPedido), pedidosController.criar);
router.delete('/', validate(deletarVarios), pedidosController.deletarVarios);
router.get('/:id', pedidosController.buscarPorId);
router.put('/:id', pedidosController.atualizar);
router.delete('/:id', pedidosController.deletar);
router.post('/:id/gerar', pedidosController.gerarCardapio);
router.put('/:id/status', validate(atualizarStatus), pedidosController.atualizarStatus);
router.patch('/:id/valor', validate(atualizarValor), pedidosController.atualizarValor);

module.exports = router;
