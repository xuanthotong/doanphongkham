const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.get('/', accountController.getAllAccounts);
// API Xóa tài khoản
router.delete('/:id', accountController.deleteAccount);

// API Sửa tài khoản (Dành cho form Sửa)
router.put('/:id', accountController.updateAccount);

module.exports = router;