const Trainer = require('../models/Trainer');

// Get all trainers (Admin view)
exports.getTrainers = async (req, res) => {
    try {
        const trainers = await Trainer.find().sort({ name: 1 });
        res.json(trainers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get only active trainers (User view - form dropdown)
exports.getActiveTrainers = async (req, res) => {
    try {
        const trainers = await Trainer.find({ active: true }).sort({ name: 1 });
        res.json(trainers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Add new trainer
exports.addTrainer = async (req, res) => {
    try {
        const trainer = new Trainer(req.body);
        await trainer.save();
        res.status(201).json(trainer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Update trainer
exports.updateTrainer = async (req, res) => {
    try {
        const trainer = await Trainer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
        res.json(trainer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Delete trainer
exports.deleteTrainer = async (req, res) => {
    try {
        const trainer = await Trainer.findByIdAndDelete(req.params.id);
        if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
        res.json({ message: 'Trainer deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
