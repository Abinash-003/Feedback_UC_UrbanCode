const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    participantDetails: {
        email: { type: String, required: true, unique: true },
        // These can be dynamic too, but usually kept for easy filtering
        name: String,
        courseName: String,
        batch: String,
        trainerName: String // Deprecated in favor of trainerEvaluations, kept for legacy
    },
    trainerEvaluations: [{
        trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },
        trainerName: { type: String, required: true },
        trainerType: { type: String, required: true, enum: ['Placement', 'Course Training'], default: 'Course Training' },
        ratings: { type: Object }
    }],
    dynamicAnswers: [{
        questionId: { type: String },
        questionText: { type: String, required: true },
        type: { type: String, required: true },
        section: { type: String },
        options: [String],
        rows: [String],
        columns: [String],
        value: mongoose.Schema.Types.Mixed
    }]
}, { timestamps: true });

module.exports = mongoose.model('Response', responseSchema);
