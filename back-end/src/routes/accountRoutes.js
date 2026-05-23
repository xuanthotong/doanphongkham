const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.get('/', accountController.getAllAccounts);
// API Xóa tài khoản
router.delete('/:id', accountController.deleteAccount);

// API Sửa tài khoản (Dành cho form Sửa)
router.put('/:id', accountController.updateAccount);

// API Cập nhật hồ sơ cá nhân (Dành riêng cho Bệnh nhân)
router.put('/profile/:id', accountController.updateProfile);

// API Khóa/Mở khóa tài khoản
router.put('/:id/toggle-status', accountController.toggleAccountStatus);

module.exports = router;