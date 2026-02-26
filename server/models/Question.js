const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'radio', 'checkbox', 'textarea', 'matrix', 'trainer-select'],
        required: true
    },
    options: [String], // For radio, checkbox, etc.
    rows: [String],    // For matrix type
    columns: [String], // For matrix type
    section: { type: String, required: true },
    order: { type: Number, default: 0 },
    required: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
