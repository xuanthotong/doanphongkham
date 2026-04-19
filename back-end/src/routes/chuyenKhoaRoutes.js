const express = require('express');
const router = express.Router();
const chuyenKhoaController = require('../controllers/chuyenKhoaController');

router.get('/', chuyenKhoaController.getAllSpecialties);
router.post('/', chuyenKhoaController.createSpecialty);
router.put('/:id', chuyenKhoaController.updateSpecialty);
router.delete('/:id', chuyenKhoaController.deleteSpecialty);

module.exports = router;