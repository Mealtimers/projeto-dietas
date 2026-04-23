'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/solicitacoes.controller');

router.get('/',           ctrl.listar);
router.get('/contagem',   ctrl.contar);
router.delete('/',        ctrl.deletarVarias);
router.get('/:id',        ctrl.buscarPorId);
router.put('/:id/status', ctrl.atualizarStatus);
router.delete('/:id',     ctrl.deletar);

module.exports = router;
