const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');

router.put('/reset', passwordController.resetPassword);

module.exports = router;