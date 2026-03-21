const express = require('express');
const router = express.Router();
const gruposController = require('../controllers/grupos.controller');

router.get('/', gruposController.listar);
router.get('/:id', gruposController.buscarPorId);
router.post('/', gruposController.criar);
router.put('/:id', gruposController.atualizar);
router.delete('/:id', gruposController.deletar);

module.exports = router;
