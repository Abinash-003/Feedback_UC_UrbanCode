import { useState, useEffect } from 'react';
import axios from 'axios';
import { MdCheckCircle, MdError, MdHourglassEmpty } from 'react-icons/md';
import Swal from 'sweetalert2';
import './FeedbackForm.css';

const FeedbackForm = () => {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({}); // { questionId: value }
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [trainers, setTrainers] = useState([]);
    const [trainerEvaluations, setTrainerEvaluations] = useState([
        { trainerId: '', trainerName: '', trainerType: 'Course Training', ratings: {} }
    ]);

    const addTrainer = () => {
        setTrainerEvaluations([...trainerEvaluations, { trainerId: '', trainerName: '', trainerType: 'Course Training', ratings: {} }]);
    };

    const removeTrainer = (index) => {
        const newEvaluations = [...trainerEvaluations];
        newEvaluations.splice(index, 1);
        setTrainerEvaluations(newEvaluations);
    };

    const updateTrainerSelection = (index, trainerId) => {
        const selectedTrainer = trainers.find(t => t._id === trainerId);
        setTrainerEvaluations(prev => prev.map((item, i) =>
            i === index ? { ...item, trainerId, trainerName: selectedTrainer ? selectedTrainer.name : '' } : item
        ));
    };

    const updateTrainerType = (index, type) => {
        setTrainerEvaluations(prev => prev.map((item, i) =>
            i === index ? { ...item, trainerType: type } : item
        ));
    };

    const updateTrainerRating = (index, row, value) => {
        setTrainerEvaluations(prev => prev.map((item, i) =>
            i === index ? { ...item, ratings: { ...item.ratings, [row]: value } } : item
        ));
    };

    useEffect(() => {
        const hasSubmitted = localStorage.getItem('urbanCode_feedback_submitted');
        if (hasSubmitted) {
            setSubmitted(true);
        }
        fetchQuestions();
        fetchActiveTrainers();
    }, []);

    const fetchActiveTrainers = async () => {
        try {
            const res = await axios.get('https://feedback-uc-urbancode.onrender.com/api/trainers/active');
            setTrainers(res.data);
        } catch (err) {
            console.error("Error fetching trainers:", err);
        }
    };

    const fetchQuestions = async () => {
        try {
            const res = await axios.get('https://feedback-uc-urbancode.onrender.com/api/questions');
            setQuestions(res.data);
        } catch (err) {
            setError('Failed to load form questions. Please try again later.');
        } finally {
            setLoading(false);
        }
    };


    const handleAnswerChange = (questionId, value) => {
        setAnswers({ ...answers, [questionId]: value });
    };

    const handleMatrixChange = (questionId, row, col) => {
        const currentMatrix = answers[questionId] || {};
        const updatedMatrix = { ...currentMatrix, [row]: col };
        setAnswers({ ...answers, [questionId]: updatedMatrix });
    };

    const handleCheckboxChange = (questionId, option) => {
        const currentOptions = answers[questionId] || [];
        const updatedOptions = currentOptions.includes(option)
            ? currentOptions.filter(o => o !== option)
            : [...currentOptions, option];
        setAnswers({ ...answers, [questionId]: updatedOptions });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Find specific participant detail answers by question text
        // Helper to find question value by keywords (resilient to renaming)
        const findVal = (keywords) => {
            const q = questions.find(q =>
                keywords.some(k => q.questionText.toLowerCase().includes(k.toLowerCase()))
            );
            return q ? answers[q._id] : '';
        };

        const emailVal = findVal(['email']);
        if (!emailVal) {
            setError('Email Address is required');
            return;
        }

        const participantInfo = {
            email: emailVal,
            name: findVal(['name', 'participant']),
            courseName: findVal(['course', 'program']),
            batch: findVal(['batch', 'duration', 'time']),
            trainerName: trainerEvaluations[0]?.trainerName || findVal(['trainer name'])
        };

        // Validate required questions (Excluding the hardcoded trainer evaluation block which is handled below)
        const isQuestionAnswered = (q) => {
            const answer = answers[q._id];
            if (!answer) return false;

            if (q.type === 'checkbox') {
                return Array.isArray(answer) && answer.length > 0;
            }
            if (q.type === 'matrix') {
                const answeredRows = Object.keys(answer).length;
                return answeredRows >= q.rows.length;
            }
            return answer.toString().trim() !== '';
        };

        const missingRequired = questions.filter(q => {
            if (!q.required) return false;

            // Special cases handled separately
            if (q.questionText.toLowerCase().includes('trainer evaluation')) return false;
            if (q.questionText.toLowerCase().includes('trainer name')) return false; // Handled by trainerEvaluations

            return !isQuestionAnswered(q);
        });

        if (missingRequired.length > 0) {
            setError(`Please answer the required question: ${missingRequired[0].questionText}`);
            return;
        }

        // Validate Trainer Evaluations
        if (trainerEvaluations.length === 0) {
            setError('Please add at least one trainer evaluation.');
            return;
        }

        const invalidTrainerSelection = trainerEvaluations.find(t => !t.trainerId);
        if (invalidTrainerSelection) {
            setError('Please select a trainer for all evaluation blocks.');
            return;
        }

        // Check if matrix is completed for all trainers (specifically for the matrix question representing 'Trainer Evaluation')
        const trainerMatrixQ = questions.find(q => q.questionText.toLowerCase().includes('trainer evaluation'));
        if (trainerMatrixQ && trainerMatrixQ.required) {
            for (let i = 0; i < trainerEvaluations.length; i++) {
                const trainer = trainerEvaluations[i];
                const answeredRows = Object.keys(trainer.ratings || {}).length;
                const totalRows = trainerMatrixQ.rows.length;
                if (answeredRows < totalRows) {
                    setError(`Please complete all ratings for Trainer ${i + 1}`);
                    return;
                }
            }
        }

        setSubmitting(true);
        setError('');
        try {
            const dynamicAnswers = Object.entries(answers)
                .filter(([qid]) => {
                    const q = questions.find(question => question._id === qid);
                    // Filter out Trainer Evaluation answers from standard dynamicAnswers
                    return q && !q.questionText.toLowerCase().includes('trainer evaluation') && !q.questionText.toLowerCase().includes('trainer name');
                })
                .map(([qid, val]) => {
                    const q = questions.find(question => question._id === qid);
                    return {
                        questionId: qid,
                        questionText: q ? q.questionText : 'Unknown Question',
                        type: q ? q.type : 'text',
                        section: q ? q.section : 'General',
                        options: q ? q.options : [],
                        rows: q ? q.rows : [],
                        columns: q ? q.columns : [],
                        value: val
                    };
                });

            await axios.post('https://feedback-uc-urbancode.onrender.com/api/responses', {
                participantDetails: participantInfo,
                dynamicAnswers,
                trainerEvaluations
            });

            localStorage.setItem('urbanCode_feedback_submitted', 'true');
            Swal.fire({
                icon: 'success',
                title: 'Submitted!',
                text: 'Thank you for your feedback.',
                timer: 3000,
                showConfirmButton: false
            });
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
            setError(msg);
            Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: msg
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="loading-container" style={{ minHeight: '100vh' }}>
            <div className="uc-loader-container">
                <div className="uc-logo-anim"><span>U</span><span>C</span></div>
                <div className="uc-loading-text">Loading Feedback Form...</div>
            </div>
        </div>
    );

    if (submitted) {
        return (
            <div className="success-container animated-fade">
                <div className="thank-you-card">
                    <div className="success-icon-wrapper">
                        <MdCheckCircle size={100} color="#10b981" />
                    </div>
                    <h1>Thank You!</h1>
                    <p className="success-msg">Your feedback has been successfully recorded.</p>
                    <p className="detail-msg">We appreciate you taking the time to help us improve our training standards. Your response is valuable to the UrbanCode community.</p>
                    <div className="success-divider"></div>
                    <p className="note">You have already submitted your response for this session.</p>
                </div>
            </div>
        );
    }

    // Group questions by section
    const groupedQuestions = (Array.isArray(questions) ? questions : []).reduce((acc, q) => {
        if (!acc[q.section]) acc[q.section] = [];
        acc[q.section].push(q);
        return acc;
    }, {});

    // Helper to clean section title (remove numbers like "01. " or "Section 1")
    const cleanSectionTitle = (title) => {
        return title.replace(/^\d+[\.\-\s]*/, '').replace(/^SECTION\s*\d+[\.\-\s]*/i, '').trim();
    };

    // Sort sections so "Final Comments" is always last and numbers are sorted correctly
    const sortedSections = Object.keys(groupedQuestions).sort((a, b) => {
        const isFinalA = a === 'Final Comments' || a === 'SECTION 10' || a.toLowerCase().includes('final comments');
        const isFinalB = b === 'Final Comments' || b === 'SECTION 10' || b.toLowerCase().includes('final comments');

        // Final Comments always last
        if (isFinalA && !isFinalB) return 1;
        if (!isFinalA && isFinalB) return -1;

        const numA = parseInt(a.match(/\d+/)?.[0]);
        const numB = parseInt(b.match(/\d+/)?.[0]);

        // If both are numbered, sort by number
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }

        // Numbered sections come before non-numbered sections
        if (!isNaN(numA) && isNaN(numB)) return -1;
        if (isNaN(numA) && !isNaN(numB)) return 1;

        // Both non-numbered, fallback to alphabetical
        return a.localeCompare(b);
    });

    const renderQuestion = (q) => {
        switch (q.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={answers[q._id] || ''}
                        onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                        required={q.required}
                    />
                );
            case 'textarea':
                return (
                    <textarea
                        value={answers[q._id] || ''}
                        onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                        required={q.required}
                    ></textarea>
                );
            case 'radio':
                return (
                    <div className="radio-group-horizontal">
                        {q.options.map(opt => (
                            <label key={opt} className={`radio-pill ${answers[q._id] === opt ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name={q._id}
                                    value={opt}
                                    checked={answers[q._id] === opt}
                                    onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                                    required={q.required}
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                );
            case 'checkbox':
                return (
                    <div className="checkbox-grid">
                        {q.options.map(opt => (
                            <label key={opt} className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={(answers[q._id] || []).includes(opt)}
                                    onChange={() => handleCheckboxChange(q._id, opt)}
                                />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'matrix':
                return (
                    <div className="matrix-table-container">
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th>Criteria</th>
                                    {q.columns.map(col => <th key={col}>{col}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {q.rows.map(row => (
                                    <tr key={row}>
                                        <td className="criteria-label">{row}</td>
                                        {q.columns.map(col => (
                                            <td key={col} className="radio-cell">
                                                <input
                                                    type="radio"
                                                    name={`${q._id}-${row}`}
                                                    checked={(answers[q._id] || {})[row] === col}
                                                    onChange={() => handleMatrixChange(q._id, row, col)}
                                                    required={q.required}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'trainer-select':
                return (
                    <select
                        value={answers[q._id] || ''}
                        onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                        required={q.required}
                        className="dynamic-select"
                    >
                        <option value="">-- Choose a Trainer --</option>
                        {trainers.map(t => (
                            <option key={t._id} value={t.name}>
                                {t.name} {t.specialization ? `(${t.specialization})` : ''}
                            </option>
                        ))}
                    </select>
                );
            default:
                return null;
        }
    };

    return (
        <div className="feedback-container">
            <header className="form-header header-card card-style">
                <div className="header-stripe"></div>
                <h1>Training Feedback Form</h1>
                <p>Please share your honest feedback about your experience with UrbanCode.</p>
            </header>

            <form onSubmit={handleSubmit} className="feedback-form">
                {error && <div className="error-banner"><MdError /> {error}</div>}

                {/* Render All Dynamic Sections */}
                {sortedSections.map((section, idx) => {
                    const sectionTitle = cleanSectionTitle(section);

                    // Custom Render for Trainer Evaluation Section
                    const sectionQuestions = groupedQuestions[section] || [];
                    const matrixQ = sectionQuestions.find(q => q.questionText.toLowerCase().includes('trainer evaluation') || q.type === 'matrix');
                    const isTrainerSection = sectionTitle.toLowerCase().includes('trainer evaluation') || section.toLowerCase().includes('section 3') || (matrixQ && matrixQ.questionText.toLowerCase().includes('trainer'));

                    if (isTrainerSection && matrixQ) {
                        const otherQuestions = sectionQuestions.filter(q =>
                            !q.questionText.toLowerCase().includes('trainer evaluation') &&
                            !q.questionText.toLowerCase().includes('trainer name') &&
                            q.type !== 'trainer-select'
                        );

                        return (
                            <div key={section} className="section-group">
                                {matrixQ && (
                                    <div className="trainer-evaluation-wrapper">
                                        {trainerEvaluations.map((trainer, tIndex) => (
                                            <div key={tIndex} className="trainer-block-card card-style">
                                                <div className="trainer-header">
                                                    <div className="trainer-label">
                                                        <span className="trainer-count">{tIndex + 1}</span>
                                                        <span>Trainer Evaluation</span>
                                                    </div>
                                                    {trainerEvaluations.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="t-remove-btn"
                                                            onClick={() => removeTrainer(tIndex)}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="t-input-group" style={{ marginBottom: '1.5rem' }}>
                                                    <label>Select Trainer Type <span className="required">*</span></label>
                                                    <div className="radio-group-horizontal-google">
                                                        {['Course Training', 'Placement'].map(type => (
                                                            <div
                                                                key={type}
                                                                className={`radio-pill-google ${trainer.trainerType === type ? 'active' : ''}`}
                                                                onClick={() => updateTrainerType(tIndex, type)}
                                                            >
                                                                <span className="radio-circle-google"></span>
                                                                {type}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="t-input-group" style={{ marginBottom: '1.5rem' }}>
                                                    <label>Select Trainer {matrixQ.required && <span className="required">*</span>}</label>
                                                    <select
                                                        value={trainer.trainerId}
                                                        onChange={(e) => updateTrainerSelection(tIndex, e.target.value)}
                                                        required={matrixQ.required}
                                                    >
                                                        <option value="">-- Choose a Trainer --</option>
                                                        {trainers.map(t => (
                                                            <option key={t._id} value={t._id}>
                                                                {t.name} {t.specialization ? `(${t.specialization})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="form-group dynamic-question">
                                                    <label>
                                                        {matrixQ.questionText}
                                                        {matrixQ.required && <span className="required">*</span>}
                                                    </label>
                                                    <div className="matrix-table-container">
                                                        <table className="matrix-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Criteria</th>
                                                                    {matrixQ.columns.map(col => <th key={col}>{col}</th>)}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {matrixQ.rows.map(row => (
                                                                    <tr key={row}>
                                                                        <td className="criteria-label">{row}</td>
                                                                        {matrixQ.columns.map(col => (
                                                                            <td key={col} className="radio-cell">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`t-${tIndex}-${matrixQ._id}-${row}`}
                                                                                    checked={trainer.ratings[row] === col}
                                                                                    onChange={() => updateTrainerRating(tIndex, row, col)}
                                                                                    required={matrixQ.required}
                                                                                />
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <div style={{ padding: '0 1rem' }}>
                                            <button type="button" className="add-trainer-btn" onClick={addTrainer}>
                                                + Add Another Trainer
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Standard Render for other sections
                    return (
                        <div key={section} className="section-group">
                            <div className="section-title-card card-style">
                                <h2 className="section-title">{sectionTitle}</h2>
                            </div>

                            {groupedQuestions[section]
                                .filter(q => {
                                    const txt = q.questionText.toLowerCase();
                                    return !txt.includes('trainer name') && !txt.includes('trainer evaluation');
                                })
                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                .map(q => (
                                    <div key={q._id} className="question-card card-style">
                                        <div className="form-group dynamic-question">
                                            <label>
                                                {q.questionText === 'Email Address' ? 'Email' : q.questionText}
                                                {q.required && <span className="required">*</span>}
                                            </label>
                                            <div className="question-content">
                                                {renderQuestion(q)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    );
                })}

                <div className="form-footer">
                    <button type="submit" className="submit-btn" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                    <p className="footer-note">Your feedback is confidential.</p>
                </div>
            </form>
        </div>
    );
};

export default FeedbackForm;
