const express = require('express');
const router = express.Router();
const responseController = require('../controllers/responseController');
const authMiddleware = require('../middleware/auth');

router.post('/', responseController.submitResponse);
router.get('/', authMiddleware, responseController.getResponses);
router.get('/analytics', authMiddleware, responseController.getAnalytics);
router.get('/:id', authMiddleware, responseController.getResponseById);
router.delete('/:id', authMiddleware, responseController.deleteResponse);

module.exports = router;
