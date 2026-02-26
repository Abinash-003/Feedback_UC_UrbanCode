const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Question = require('./models/Question');

dotenv.config();

const questions = [
    // SECTION 1: Participant Details
    {
        questionText: "Email Address",
        type: "text",
        section: "SECTION 1",
        order: 1,
        required: true
    },
    {
        questionText: "Course Name",
        type: "text",
        section: "SECTION 1",
        order: 2,
        required: false
    },
    {
        questionText: "Batch / Duration",
        type: "text",
        section: "SECTION 1",
        order: 3,
        required: false
    },
    {
        questionText: "Trainer Name",
        type: "text",
        section: "SECTION 1",
        order: 4,
        required: false
    },
    // SECTION 2
    {
        questionText: "Overall Training Experience",
        type: "radio",
        options: ["Very Bad", "Bad", "Average", "Good", "Excellent"],
        section: "SECTION 2",
        order: 5,
        required: true
    },
    // SECTION 3
    {
        questionText: "Trainer Evaluation",
        type: "matrix",
        rows: [
            "Subject Knowledge",
            "Communication Skills",
            "Clarity of Explanation",
            "Practical Examples",
            "Doubt Clarification",
            "Engagement & Interaction"
        ],
        columns: ["Very Poor", "Poor", "Average", "Good", "Excellent"],
        section: "SECTION 3",
        order: 6,
        required: true
    },
    // SECTION 4
    {
        questionText: "What did you like most about the training? (Positive Feedback)",
        type: "textarea",
        section: "SECTION 4",
        order: 7,
        required: false
    },
    // SECTION 5
    {
        questionText: "What areas need improvement? (Negative Feedback)",
        type: "textarea",
        section: "SECTION 5",
        order: 8,
        required: false
    },
    // SECTION 6
    {
        questionText: "Course Content & Learning",
        type: "matrix",
        rows: [
            "Course Structure",
            "Relevance to Industry",
            "Hands-on Practice",
            "Learning Materials",
            "Assignments & Projects"
        ],
        columns: ["Very Poor", "Poor", "Average", "Good", "Excellent"],
        section: "SECTION 6",
        order: 9,
        required: true
    },
    // SECTION 7
    {
        questionText: "Ambience & Infrastructure",
        type: "matrix",
        rows: [
            "Classroom Cleanliness",
            "Seating & Comfort",
            "Lighting & Ventilation",
            "Audio/Visual Setup",
            "Internet & System Facilities"
        ],
        columns: ["Very Poor", "Poor", "Average", "Good", "Excellent"],
        section: "SECTION 7",
        order: 10,
        required: true
    },
    {
        questionText: "Suggestions for Infrastructure Improvement",
        type: "checkbox",
        options: [
            "Better seating", "Improved lighting", "Noise reduction",
            "Better system config", "Cleanliness", "Spacious classrooms",
            "Pantry", "Breakout areas"
        ],
        section: "SECTION 7",
        order: 11,
        required: false
    },
    {
        questionText: "Additional Ambience Comments",
        type: "textarea",
        section: "SECTION 7",
        order: 12,
        required: false
    },
    // SECTION 8
    {
        questionText: "Administrative Support Rating",
        type: "radio",
        options: ["Very Poor", "Poor", "Average", "Good", "Excellent"],
        section: "SECTION 8",
        order: 13,
        required: false
    },
    {
        questionText: "Administrative Support Comments",
        type: "textarea",
        section: "SECTION 8",
        order: 14,
        required: false
    },
    // SECTION 9
    {
        questionText: "Would you recommend UrbanCode to others?",
        type: "radio",
        options: ["Yes definitely", "Maybe", "Not sure", "No"],
        section: "SECTION 9",
        order: 15,
        required: true
    },
    // SECTION 10
    {
        questionText: "Final Comments",
        type: "textarea",
        section: "SECTION 10",
        order: 16,
        required: false
    }
];

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB for seeding...');
        await Question.deleteMany({});
        await Question.insertMany(questions);
        console.log('Database seeded successfully!');
        process.exit();
    })
    .catch(err => {
        console.error('Seeding error:', err);
        process.exit(1);
    });
