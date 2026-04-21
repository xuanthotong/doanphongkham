const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qaController');

// GET /api/questions -> Lấy tất cả câu hỏi
router.get('/', qaController.getAllQuestions);
router.post('/', qaController.createQuestion);
router.put('/:id/reply', qaController.replyQuestion);
router.delete('/:id', qaController.deleteQuestion);

module.exports = router;