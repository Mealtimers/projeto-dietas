const express = require('express');
const router = express.Router();
const alimentosController = require('../controllers/alimentos.controller');

router.get('/', alimentosController.listar);
router.get('/:id', alimentosController.buscarPorId);
router.post('/', alimentosController.criar);
router.put('/:id', alimentosController.atualizar);
router.delete('/:id', alimentosController.deletar);
router.post('/:id/preparos', alimentosController.adicionarPreparo);
router.put('/preparos/:preparoId', alimentosController.atualizarPreparo);
router.delete('/preparos/:preparoId', alimentosController.deletarPreparo);

module.exports = router;
