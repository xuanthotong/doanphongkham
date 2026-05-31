const express = require('express');
const router = express.Router();
const donThuocController = require('../controllers/donThuocController');

// POST /api/don-thuoc - Lưu đơn thuốc cho 1 lịch khám
router.post('/', donThuocController.saveDonThuoc);

// GET /api/don-thuoc/:lichKhamId - Lấy đơn thuốc của 1 lịch khám
router.get('/:lichKhamId', donThuocController.getDonThuocByLichKham);

// PUT /api/don-thuoc/:lichKhamId - Cập nhật đơn thuốc
router.put('/:lichKhamId', donThuocController.updateDonThuoc);

// DELETE /api/don-thuoc/:lichKhamId - Xóa đơn thuốc
router.delete('/:lichKhamId', donThuocController.deleteDonThuoc);

module.exports = router;
