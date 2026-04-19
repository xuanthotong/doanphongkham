const express = require('express');
const router = express.Router();
const danhMucController = require('../controllers/danhMucController');

router.get('/', danhMucController.getAllCategories);
router.post('/', danhMucController.createCategory);
router.put('/:id', danhMucController.updateCategory);
router.delete('/:id', danhMucController.deleteCategory);

module.exports = router;