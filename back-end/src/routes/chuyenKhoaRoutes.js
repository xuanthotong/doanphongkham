const express = require('express');
const router = express.Router();
const chuyenKhoaController = require('../controllers/chuyenKhoaController');

router.get('/', chuyenKhoaController.getAllSpecialties);

module.exports = router;