import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api.config';
import { MdCheckCircle, MdError, MdLanguage, MdCall } from 'react-icons/md';
import { FaInstagram, FaLinkedin, FaYoutube, FaFacebook, FaWhatsapp } from 'react-icons/fa';
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
        if (trainerEvaluations.length <= 1) return;

        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to remove this trainer's evaluation?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ff7e5f',
            cancelButtonColor: '#ffb9a0',
            confirmButtonText: 'Yes, remove',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                const newEvaluations = [...trainerEvaluations];
                newEvaluations.splice(index, 1);
                setTrainerEvaluations(newEvaluations);
            }
        });
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
            const res = await axios.get(`${API_BASE_URL}/api/trainers/active`);
            setTrainers(res.data);
        } catch (err) {
            console.error("Error fetching trainers:", err);
        }
    };

    const fetchQuestions = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/questions`);
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

    const isQuestionAnswered = (q) => {
        const answer = answers[q._id];
        if (!answer) return false;

        if (q.type === 'checkbox') {
            return Array.isArray(answer) && answer.length > 0;
        }
        if (q.type === 'matrix') {
            const answeredRows = Object.keys(answer).length;
            const totalRows = (q.rows || []).length;
            return totalRows === 0 || answeredRows >= totalRows;
        }
        return answer.toString().trim() !== '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Helper to find question value by keywords
        const findVal = (keywords) => {
            const q = questions.find(q =>
                keywords.some(k => q.questionText.toLowerCase().includes(k.toLowerCase()))
            );
            return q ? answers[q._id] : '';
        };

        const emailQ = questions.find(q => q.questionText.toLowerCase().includes('email'));
        const emailVal = emailQ ? answers[emailQ._id] : '';

        if (!emailVal) {
            Swal.fire({
                icon: 'warning',
                title: 'Required Field',
                text: 'Email Address is required to identify your feedback.',
                confirmButtonColor: '#ff7e5f'
            }).then(() => {
                if (emailQ) {
                    document.getElementById(`q-${emailQ._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            return;
        }

        const participantInfo = {
            email: emailVal,
            name: findVal(['name', 'participant']),
            courseName: findVal(['course', 'program']),
            batch: findVal(['batch', 'duration', 'time']),
            trainerName: trainerEvaluations[0]?.trainerName || findVal(['trainer name'])
        };

        // 1. Validate required standard questions
        const missingRequired = questions.filter(q => {
            if (!q.required) return false;

            // EXCLUDE questions handled in the special Trainer Evaluation block
            if (q.isTrainerEval) return false;

            const txt = q.questionText.toLowerCase();
            if (txt.includes('trainer evaluation')) return false;
            if (txt.includes('trainer name')) return false;
            if (txt.includes('select trainer')) return false;

            return !isQuestionAnswered(q);
        });

        if (missingRequired.length > 0) {
            const firstMissing = missingRequired[0];
            let errorMsg = `Please answer: ${firstMissing.questionText}`;
            if (firstMissing.type === 'matrix') {
                errorMsg = `Please complete all rows in the table: ${firstMissing.questionText}`;
            }

            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Section',
                text: errorMsg,
                confirmButtonColor: '#ff7e5f'
            }).then(() => {
                const el = document.getElementById(`q-${firstMissing._id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Optional: add a temporary shake or highlight effect
                    el.classList.add('missing-pulse');
                    setTimeout(() => el.classList.remove('missing-pulse'), 3000);
                }
            });
            return;
        }

        // 2. Validate Trainer Evaluations
        if (trainerEvaluations.length === 0) {
            setError('Please add at least one trainer evaluation.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        for (let i = 0; i < trainerEvaluations.length; i++) {
            const t = trainerEvaluations[i];
            if (!t.trainerId) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select Trainer',
                    text: `Please select a trainer for evaluation #${i + 1}`,
                    confirmButtonColor: '#ff7e5f'
                }).then(() => {
                    document.getElementById(`trainer-block-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
                return;
            }
        }

        // 3. Validate Trainer Matrix
        const trainerEvalMatrixQ = questions.find(q =>
            (q.isTrainerEval || q.questionText.toLowerCase().includes('trainer evaluation')) &&
            q.type === 'matrix' &&
            q.section.toLowerCase().includes('trainer')
        ) || questions.find(q => q.isTrainerEval && q.type === 'matrix');

        if (trainerEvalMatrixQ && trainerEvalMatrixQ.required) {
            for (let i = 0; i < trainerEvaluations.length; i++) {
                const trainer = trainerEvaluations[i];
                const answeredRows = Object.keys(trainer.ratings || {}).length;
                const totalRows = (trainerEvalMatrixQ.rows || []).length;
                if (answeredRows < totalRows) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Incomplete Rating',
                        text: `Please complete all ratings for: ${trainer.trainerName || '#' + (i + 1)}`,
                        confirmButtonColor: '#ff7e5f'
                    }).then(() => {
                        document.getElementById(`trainer-block-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    });
                    return;
                }
            }
        }

        setSubmitting(true);
        try {
            const dynamicAnswers = questions
                .filter(q => {
                    const txt = q.questionText.toLowerCase();
                    const isTrainerItem = q.isTrainerEval || txt.includes('trainer name') || txt.includes('trainer evaluation');
                    return !isTrainerItem;
                })
                .map(q => ({
                    questionId: q._id,
                    questionText: q.questionText,
                    type: q.type,
                    section: q.section,
                    value: answers[q._id]
                }));

            await axios.post(`${API_BASE_URL}/api/responses`, {
                participantDetails: participantInfo,
                dynamicAnswers,
                trainerEvaluations
            });

            localStorage.setItem('urbanCode_feedback_submitted', 'true');
            Swal.fire({ icon: 'success', title: 'Submitted!', text: 'Thank you for your feedback.', timer: 3000, showConfirmButton: false });
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
            setError(msg);
            Swal.fire({ icon: 'error', title: 'Submission Failed', text: msg });
        } finally {
            setSubmitting(false);
        }
    };

    const getSectionTitle = (section) => {
        return section.replace(/^[\d\.\-\s:]*/, '').replace(/^SECTION\s*\d+[\.\-\s:]*/i, '').trim();
    };

    if (loading) return (
        <div className="loading-container">
            <div className="uc-loader-container">
                <div className="uc-logo-anim"><span>U</span><span>C</span></div>
                <div className="uc-loading-text">Loading...</div>
            </div>
        </div>
    );

    if (submitted) {
        return (
            <div className="success-container animated-fade">
                <div className="thank-you-card">
                    <MdCheckCircle size={100} color="#10b981" />
                    <h1>Thank You!</h1>
                    <p>Your feedback has been recorded.</p>
                </div>
            </div>
        );
    }

    const groupedQuestions = (questions || []).reduce((acc, q) => {
        if (!acc[q.section]) acc[q.section] = [];
        acc[q.section].push(q);
        return acc;
    }, {});

    const sortedSections = Object.keys(groupedQuestions).sort((a, b) => {
        const minOrderA = Math.min(...groupedQuestions[a].map(q => q.order || 0));
        const minOrderB = Math.min(...groupedQuestions[b].map(q => q.order || 0));
        return minOrderA - minOrderB;
    });

    const renderQuestion = (q) => {
        const val = answers[q._id];
        switch (q.type) {
            case 'text': return <input type="text" value={val || ''} onChange={(e) => handleAnswerChange(q._id, e.target.value)} />;
            case 'textarea': return <textarea value={val || ''} onChange={(e) => handleAnswerChange(q._id, e.target.value)}></textarea>;
            case 'radio':
                return (
                    <div className="radio-group-horizontal">
                        {q.options.map(opt => (
                            <label key={opt} className={`radio-pill ${val === opt ? 'active' : ''}`}>
                                <input type="radio" checked={val === opt} onChange={() => handleAnswerChange(q._id, opt)} />
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
                                <input type="checkbox" checked={(val || []).includes(opt)} onChange={() => handleCheckboxChange(q._id, opt)} />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'matrix':
                return (
                    <div className="matrix-table-container">
                        <table className="matrix-table">
                            <thead><tr><th>Criteria</th>{q.columns.map(col => <th key={col}>{col}</th>)}</tr></thead>
                            <tbody>
                                {q.rows.map(row => (
                                    <tr key={row}>
                                        <td className="criteria-label">{row}</td>
                                        {q.columns.map(col => (
                                            <td key={col} className="radio-cell">
                                                <input type="radio" name={`${q._id}-${row}`} checked={(val || {})[row] === col} onChange={() => handleMatrixChange(q._id, row, col)} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="feedback-container">
            <div className="banner-contact-card">
                <div className="banner-content">
                    <h1 className="banner-title">URBAN CODE</h1>
                    <p className="banner-tagline">Your search for upskilling ends here</p>
                    <div className="contact-links-grid">
                        <a href="https://www.urbancode.in/" target="_blank" rel="noopener noreferrer" className="contact-link-item">
                            <MdLanguage size={16} /> <span>www.urbancode.in</span>
                        </a>
                        <a href="tel:+919878798797" className="contact-link-item">
                            <MdCall size={16} /> <span>+91 98787 98797</span>
                        </a>
                        <div className="social-links-row">
                            <a href="https://www.instagram.com/urbancode_edutech/" target="_blank" rel="noopener noreferrer" title="Instagram">
                                <FaInstagram size={18} />
                            </a>
                            <a href="https://www.linkedin.com/company/urbanc0de/" target="_blank" rel="noopener noreferrer" title="LinkedIn">
                                <FaLinkedin size={18} />
                            </a>
                            <a href="https://www.facebook.com/people/Urbancode/61563183054002/" target="_blank" rel="noopener noreferrer" title="Facebook">
                                <FaFacebook size={18} />
                            </a>
                            <a href="https://www.youtube.com/channel/UC7ngZ5r2ov-qoXJRjaXJGKA" target="_blank" rel="noopener noreferrer" title="YouTube">
                                <FaYoutube size={20} />
                            </a>
                            <a href="https://api.whatsapp.com/send/?phone=919429694123&text=Hello+Team+Urbancode&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" title="WhatsApp">
                                <FaWhatsapp size={20} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <header className="form-header header-card card-style">
                <div className="header-stripe"></div>
                <h1>Training Feedback Form</h1>
                <p>Please share your honest feedback about your experience with UrbanCode.</p>
            </header>

            <form onSubmit={handleSubmit} className="feedback-form">
                {error && <div className="error-banner"><MdError /> {error}</div>}

                {sortedSections.map(section => {
                    const sectionQuestions = (groupedQuestions[section] || []).sort((a, b) => (a.order || 0) - (b.order || 0));
                    const trainerEvalQuestions = sectionQuestions.filter(q =>
                        q.isTrainerEval || q.questionText.toLowerCase().includes('trainer evaluation') || q.questionText.toLowerCase().includes('select trainer')
                    );
                    const otherQuestions = sectionQuestions.filter(q => !trainerEvalQuestions.includes(q));
                    const isTrainerSection = trainerEvalQuestions.length > 0;
                    const matrixQ = trainerEvalQuestions.find(q => q.type === 'matrix');

                    return (
                        <div key={section} className="section-group">
                            <div className="section-title-card card-style">
                                <h2 className="section-title">{getSectionTitle(section)}</h2>
                            </div>

                            {isTrainerSection && (
                                <div className="trainer-evaluation-wrapper">
                                    {trainerEvaluations.map((trainer, tIndex) => (
                                        <div key={tIndex} id={`trainer-block-${tIndex}`} className="trainer-block-card card-style">
                                            <div className="trainer-header">
                                                <div className="trainer-label">
                                                    <span className="trainer-count">{tIndex + 1}</span>
                                                    <span>Trainer Evaluation</span>
                                                </div>
                                                {trainerEvaluations.length > 1 && (
                                                    <button type="button" className="t-remove-btn" onClick={() => removeTrainer(tIndex)}>Remove</button>
                                                )}
                                            </div>

                                            <div className="form-group dynamic-question">
                                                <label>Select Trainer Type <span className="required">*</span></label>
                                                <div className="radio-group-horizontal">
                                                    {['Course Training', 'Placement'].map(type => (
                                                        <label key={type} className={`radio-pill ${trainer.trainerType === type ? 'active' : ''}`} onClick={() => updateTrainerType(tIndex, type)}>
                                                            <input type="radio" checked={trainer.trainerType === type} onChange={() => { }} />
                                                            {type}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="form-group dynamic-question">
                                                <label>Select Trainer <span className="required">*</span></label>
                                                <select value={trainer.trainerId} onChange={(e) => updateTrainerSelection(tIndex, e.target.value)} required className="dynamic-select">
                                                    <option value="">-- Choose a Trainer --</option>
                                                    {trainers.map(t => <option key={t._id} value={t._id}>{t.name} {t.specialization ? `(${t.specialization})` : ''}</option>)}
                                                </select>
                                            </div>

                                            {matrixQ && (
                                                <div className="form-group dynamic-question">
                                                    {matrixQ.questionText.trim() !== '.' && <label>{matrixQ.questionText} <span className="required">*</span></label>}
                                                    <div className="matrix-table-container">
                                                        <table className="matrix-table">
                                                            <thead><tr><th>CRITERIA</th>{matrixQ.columns.map(col => <th key={col}>{col}</th>)}</tr></thead>
                                                            <tbody>
                                                                {matrixQ.rows.map(row => (
                                                                    <tr key={row}>
                                                                        <td className="criteria-label">{row}</td>
                                                                        {matrixQ.columns.map(col => (
                                                                            <td key={col} className="radio-cell">
                                                                                <input type="radio" checked={trainer.ratings[row] === col} onChange={() => updateTrainerRating(tIndex, row, col)} />
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div className="add-trainer-section">
                                        <button type="button" className="add-trainer-btn" onClick={addTrainer}>+ Add Another Trainer</button>
                                    </div>
                                </div>
                            )}

                            {otherQuestions.filter(q => !q.questionText.toLowerCase().includes('trainer name')).map(q => (
                                <div key={q._id} id={`q-${q._id}`} className="question-card card-style">
                                    <div className="form-group dynamic-question">
                                        <label>{q.questionText} {q.required && <span className="required">*</span>}</label>
                                        <div className="question-content">{renderQuestion(q)}</div>
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
                </div>
            </form>
        </div>
    );
};

export default FeedbackForm;
