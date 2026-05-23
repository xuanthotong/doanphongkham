const express = require('express');
const router = express.Router();
const thuocController = require('../controllers/thuocController');

// GET /api/thuoc - Lấy tất cả thuốc (Admin)
router.get('/', thuocController.getAllThuoc);

// GET /api/thuoc/active - Lấy thuốc đang hoạt động (Bác sĩ kê đơn)
router.get('/active', thuocController.getActiveThuoc);

// GET /api/thuoc/:id - Lấy chi tiết 1 thuốc
router.get('/:id', thuocController.getThuocById);

// POST /api/thuoc - Thêm thuốc mới
router.post('/', thuocController.createThuoc);

// PUT /api/thuoc/:id - Sửa thuốc
router.put('/:id', thuocController.updateThuoc);

// DELETE /api/thuoc/:id - Xóa thuốc
router.delete('/:id', thuocController.deleteThuoc);

module.exports = router;
