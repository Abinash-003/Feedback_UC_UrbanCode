const mongoose = require('mongoose');
const Question = require('./models/Question');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to DB');
    const update1 = await Question.updateMany(
        { section: 'SECTION 3: Trainer Evaluation', type: 'matrix' },
        { $set: { isTrainerEval: true } }
    );
    console.log('Matrix updated:', update1.modifiedCount);

    const update2 = await Question.updateMany(
        { section: 'SECTION 3: Trainer Evaluation', questionText: 'Select Trainer' },
        { $set: { isTrainerEval: true } }
    );
    console.log('Select Trainer updated:', update2.modifiedCount);

    const update3 = await Question.updateMany(
        { section: 'SECTION 3: Trainer Evaluation', questionText: 'Select Trainer Type' },
        { $set: { isTrainerEval: true } }
    );
    console.log('Select Trainer Type updated:', update3.modifiedCount);

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
