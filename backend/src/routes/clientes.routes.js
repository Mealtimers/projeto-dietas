const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const validate = require('../middlewares/validate');
const { criarCliente, atualizarCliente, deletarVarios } = require('../schemas/clientes.schema');

router.get('/', clientesController.listar);
router.post('/', validate(criarCliente), clientesController.criar);
router.delete('/', validate(deletarVarios), clientesController.deletarVarios);
router.get('/:id', clientesController.buscarPorId);
router.put('/:id', validate(atualizarCliente), clientesController.atualizar);
router.delete('/:id', clientesController.deletar);

module.exports = router;
