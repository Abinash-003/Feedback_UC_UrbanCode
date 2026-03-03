const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const Question = require('./models/Question');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const qs = await Question.find().sort({ section: 1, order: 1 });
    qs.forEach(q => {
        console.log(`[${q.section}] ${q.questionText} (${q.type}) req=${q.required} eval=${q.isTrainerEval}`);
    });
    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
