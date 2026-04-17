const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.registerPatient);
router.post('/login', authController.login);

module.exports = router;