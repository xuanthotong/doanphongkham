const express = require('express');
const router = express.Router();
const { sendMessage, resetChat, getChatHistory } = require('../controllers/chatbotController');

// Gửi tin nhắn cho chatbot
router.post('/send', sendMessage);

// Reset cuộc hội thoại
router.post('/reset', resetChat);

// Lấy lịch sử chat theo phiên
router.get('/history/:phien_id', getChatHistory);

module.exports = router;
