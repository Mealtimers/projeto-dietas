const express = require('express');
const router = express.Router();
const alimentosController = require('../controllers/alimentos.controller');
const validate = require('../middlewares/validate');
const { criarAlimento, criarPreparo } = require('../schemas/alimentos.schema');

router.get('/', alimentosController.listar);
router.get('/:id', alimentosController.buscarPorId);
router.post('/', validate(criarAlimento), alimentosController.criar);
router.put('/:id', validate(criarAlimento), alimentosController.atualizar);
router.delete('/:id', alimentosController.deletar);
router.post('/:id/preparos', validate(criarPreparo), alimentosController.adicionarPreparo);
router.put('/preparos/:preparoId', alimentosController.atualizarPreparo);
router.delete('/preparos/:preparoId', alimentosController.deletarPreparo);

module.exports = router;
