const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

router.get('/', reviewController.getAllReviewsAdmin);
router.put('/:id/hide', reviewController.toggleHideReview);
router.delete('/:id', reviewController.deleteReview);
router.put('/:id/reply', reviewController.replyReview);
router.put('/:id', reviewController.editReview);

module.exports = router;
