const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');

router.get('/', clientesController.listar);
router.get('/:id', clientesController.buscarPorId);
router.post('/', clientesController.criar);
router.put('/:id', clientesController.atualizar);
router.delete('/:id', clientesController.deletar);

module.exports = router;
