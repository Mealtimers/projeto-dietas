const express = require('express');
const router = express.Router();
const ordensController = require('../controllers/ordens.controller');

router.get('/', ordensController.listar);
router.get('/:id', ordensController.buscarPorId);
router.post('/:pedidoId', ordensController.gerar);
router.put('/:id/status', ordensController.atualizarStatus);

module.exports = router;
