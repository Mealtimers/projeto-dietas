const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');

router.get('/', clientesController.listar);
router.post('/', clientesController.criar);
router.delete('/', clientesController.deletarVarios);    // bulk delete — before /:id
router.get('/:id', clientesController.buscarPorId);
router.put('/:id', clientesController.atualizar);
router.delete('/:id', clientesController.deletar);

module.exports = router;
