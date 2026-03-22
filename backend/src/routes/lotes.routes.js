'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/lotes.controller');

router.get('/molhos',                    ctrl.listarMolhos);
router.put('/:loteId/itens/:itemId',     ctrl.atualizarItem);
router.post('/:loteId/molho',            ctrl.adicionarMolho);
router.delete('/:loteId/itens/:itemId',  ctrl.removerItem);

module.exports = router;
