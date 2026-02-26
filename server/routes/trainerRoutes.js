const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');
const authMiddleware = require('../middleware/auth');

// Public route for the feedback form
router.get('/active', trainerController.getActiveTrainers);

// Protected routes for the admin panel
router.get('/', authMiddleware, trainerController.getTrainers);
router.post('/', authMiddleware, trainerController.addTrainer);
router.put('/:id', authMiddleware, trainerController.updateTrainer);
router.delete('/:id', authMiddleware, trainerController.deleteTrainer);

module.exports = router;
