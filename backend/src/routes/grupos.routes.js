const express = require('express');
const router = express.Router();
const gruposController = require('../controllers/grupos.controller');
const validate = require('../middlewares/validate');
const { criarGrupo } = require('../schemas/grupos.schema');

router.get('/', gruposController.listar);
router.get('/:id', gruposController.buscarPorId);
router.post('/', validate(criarGrupo), gruposController.criar);
router.put('/:id', validate(criarGrupo), gruposController.atualizar);
router.delete('/:id', gruposController.deletar);

module.exports = router;
