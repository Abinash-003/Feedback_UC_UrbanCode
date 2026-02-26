const Response = require('../models/Response');
const Question = require('../models/Question');

exports.submitResponse = async (req, res) => {
    try {
        const { participantDetails, dynamicAnswers, trainerEvaluations } = req.body;

        // Check for existing response
        const existing = await Response.findOne({ 'participantDetails.email': participantDetails.email });
        if (existing) {
            return res.status(400).json({ message: 'Response already submitted with this email' });
        }

        if ((!dynamicAnswers || dynamicAnswers.length === 0) && (!trainerEvaluations || trainerEvaluations.length === 0)) {
            return res.status(400).json({ message: 'No answers provided' });
        }

        const response = new Response({
            participantDetails,
            dynamicAnswers,
            trainerEvaluations
        });

        await response.save();
        res.status(201).json(response);
    } catch (err) {
        console.error("Submission Error:", err);
        res.status(400).json({ message: err.message });
    }
};

exports.getResponses = async (req, res) => {
    try {
        const responses = await Response.find().sort({ createdAt: -1 });
        res.json(responses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getResponseById = async (req, res) => {
    try {
        const response = await Response.findById(req.params.id);
        res.json(response);
    } catch (err) {
        res.status(404).json({ message: 'Response not found' });
    }
};

exports.deleteResponse = async (req, res) => {
    try {
        await Response.findByIdAndDelete(req.params.id);
        res.json({ message: 'Response deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const responses = await Response.find().sort({ createdAt: -1 });
        const total = responses.length;

        // --- Rating Mapping ---
        const ratingMap = { 'Excellent': 5, 'Good': 4, 'Average': 3, 'Bad': 2, 'Very Bad': 1 };

        let totalRatingSum = 0;
        let totalRatingCount = 0;
        let totalRecCount = 0;

        // --- Data Aggregators ---
        const trainerStats = {}; // { TrainerId: { name: string, totalRating: number, ratingCount: number, recCount: number, responses: number } }
        const negativeKeywords = {};
        const lowRatedCriteria = {};
        const suggestions = {};

        // --- Process Each Response ---
        responses.forEach(r => {
            // Determine Trainers for this response
            let trainersForResponse = [];
            if (r.trainerEvaluations && r.trainerEvaluations.length > 0) {
                // Use new multi-trainer format
                trainersForResponse = r.trainerEvaluations.map(te => ({
                    id: te.trainerId ? te.trainerId.toString() : te.trainerName, // Fallback to name for older responses
                    name: te.trainerName,
                    ratings: te.ratings
                }));
            } else {
                // Legacy support
                const name = r.participantDetails.trainerName || 'Unknown';
                trainersForResponse = [{
                    id: name,
                    name: name,
                    ratings: null
                }];
            }

            // Process stats per trainer
            trainersForResponse.forEach(trainerObj => {
                const tId = trainerObj.id;
                if (!trainerStats[tId]) {
                    trainerStats[tId] = { name: trainerObj.name, totalRating: 0, ratingCount: 0, recCount: 0, responses: 0 };
                }
                trainerStats[tId].responses++;

                // 1. Overall Rating
                const overallAns = r.dynamicAnswers.find(a => {
                    const txt = a.questionText?.toLowerCase();
                    return (txt?.includes('overall') || txt?.includes('experience') || txt?.includes('rating') || a.section?.includes('SECTION 2')) && ratingMap[a.value];
                });

                if (overallAns) {
                    const score = ratingMap[overallAns.value] || 0;
                    trainerStats[tId].totalRating += score;
                    trainerStats[tId].ratingCount++;

                    // Update global stats
                    totalRatingSum += score;
                    totalRatingCount++;
                }

                // 2. Recommendation
                const recAns = r.dynamicAnswers.find(a => {
                    const txt = a.questionText?.toLowerCase();
                    return txt?.includes('recommend') || a.section?.includes('SECTION 9');
                });

                if (recAns && (recAns.value === 'Yes definitely' || recAns.value === 'Yes')) {
                    trainerStats[tId].recCount++;

                    // Update global stats (only count once per response)
                    if (trainersForResponse.indexOf(trainerObj) === 0) {
                        totalRecCount++;
                    }
                }
            });

            // 3. Negative Feedback & Improvements extraction
            const negAns = r.dynamicAnswers.find(a => a.questionText?.toLowerCase().includes('negative') || a.questionText?.toLowerCase().includes('improve'));
            if (negAns && negAns.value && typeof negAns.value === 'string' && negAns.value.length > 3) {
                const words = negAns.value.toLowerCase().split(/\s+/).filter(w => w.length > 4);
                words.forEach(w => negativeKeywords[w] = (negativeKeywords[w] || 0) + 1);
            }

            // 4. Low Rated Criteria (Matrix)
            if (r.trainerEvaluations && r.trainerEvaluations.length > 0) {
                r.trainerEvaluations.forEach(te => {
                    if (te.ratings) {
                        Object.entries(te.ratings).forEach(([criteria, rating]) => {
                            if (rating === 'Bad' || rating === 'Very Bad' || rating === 'Average' || rating === 'Poor') {
                                lowRatedCriteria[`${criteria} (${te.trainerName})`] = (lowRatedCriteria[`${criteria} (${te.trainerName})`] || 0) + 1;
                            }
                        });
                    }
                });
            } else {
                r.dynamicAnswers.forEach(ans => {
                    if (ans.type === 'matrix' && typeof ans.value === 'object') {
                        Object.entries(ans.value).forEach(([criteria, rating]) => {
                            if (rating === 'Bad' || rating === 'Very Bad' || rating === 'Average') {
                                lowRatedCriteria[criteria] = (lowRatedCriteria[criteria] || 0) + 1;
                            }
                        });
                    }
                });
            }

            // 5. Ambience Suggestions (Checkbox)
            const suggestionAns = r.dynamicAnswers.find(a => a.questionText?.toLowerCase().includes('suggestions') && Array.isArray(a.value));
            if (suggestionAns) {
                suggestionAns.value.forEach(s => suggestions[s] = (suggestions[s] || 0) + 1);
            }
        });

        // --- Calculate Global Stats ---
        const avgRating = totalRatingCount > 0 ? (totalRatingSum / totalRatingCount).toFixed(1) : 0;
        const recPercentage = total > 0 ? ((totalRecCount / total) * 100).toFixed(0) : 0;

        // --- Calculate Trainer Rankings ---
        const trainersList = Object.keys(trainerStats).map(id => {
            const t = trainerStats[id];
            const avg = t.ratingCount > 0 ? (t.totalRating / t.ratingCount) : 0;
            const recPct = t.responses > 0 ? (t.recCount / t.responses) * 100 : 0;
            return { id, name: t.name, ...t, avg, recPct };
        });

        const topTrainer = trainersList.sort((a, b) => b.recPct - a.recPct)[0] || null;
        const mostRatedTrainer = trainersList.sort((a, b) => b.responses - a.responses)[0] || null;
        const highestRatedTrainer = trainersList.sort((a, b) => b.avg - a.avg)[0] || null;
        const leastFavTrainer = trainersList.sort((a, b) => a.avg - b.avg)[0] || null;

        // --- Insights ---
        const topImprovements = [
            ...Object.entries(lowRatedCriteria).sort((a, b) => b[1] - a[1]).slice(0, 3).map(k => `Improve: ${k[0]}`),
            ...Object.entries(suggestions).sort((a, b) => b[1] - a[1]).slice(0, 2).map(k => `Suggestion: ${k[0]}`)
        ];

        res.json({
            totalResponses: total,
            averageRating: avgRating,
            recommendationPercentage: recPercentage,
            trainerStats: trainersList.reduce((acc, t) => {
                acc[t.name] = { total: t.totalRating, count: t.ratingCount };
                return acc;
            }, {}),
            rankings: {
                topTrainer: topTrainer?.name || 'N/A',
                mostRatedTrainer: mostRatedTrainer?.name || 'N/A',
                highestRatedTrainer: highestRatedTrainer?.name || 'N/A',
                leastFavTrainer: leastFavTrainer?.name || 'N/A'
            },
            improvements: topImprovements.length ? topImprovements : ['No significant data yet']
        });

    } catch (err) {
        console.error("Analytics Error:", err);
        res.status(500).json({ message: err.message });
    }
};
