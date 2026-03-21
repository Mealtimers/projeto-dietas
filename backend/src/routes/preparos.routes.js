const express = require('express');
const router = express.Router();
const preparosController = require('../controllers/preparos.controller');

router.get('/', preparosController.listar);

module.exports = router;
