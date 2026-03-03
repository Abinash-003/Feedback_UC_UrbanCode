import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api.config';
import Swal from 'sweetalert2';
import Sidebar from '../components/Sidebar';
import { MdAdd, MdEdit, MdDelete, MdArrowUpward, MdArrowDownward } from 'react-icons/md';
import './QuestionManager.css';

const QuestionManager = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState({
        questionText: '',
        type: 'text',
        options: [],
        rows: [],
        columns: [],
        section: '',
        order: 0,
        required: false,
        isTrainerEval: false,
        isOverallRating: false
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/questions`);
            setQuestions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const { _id, __v, createdAt, updatedAt, ...questionData } = currentQuestion;

            // If adding a new question in the middle, shift others
            if (!isEditing) {
                const conflictingQuestions = questions.filter(q => q.order >= currentQuestion.order);
                if (conflictingQuestions.length > 0) {
                    await Promise.all(conflictingQuestions.map(q =>
                        axios.put(`${API_BASE_URL}/api/questions/${q._id}`, { ...q, order: q.order + 1 }, {
                            headers: { Authorization: `Bearer ${token}` }
                        })
                    ));
                }
            }

            if (isEditing) {
                await axios.put(`${API_BASE_URL}/api/questions/${currentQuestion._id}`, questionData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_BASE_URL}/api/questions`, questionData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            fetchQuestions();
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: `Question ${isEditing ? 'updated' : 'created'} successfully.`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to save question'
            });
        }
    };

    const handleDeleteClick = (id) => {
        Swal.fire({
            title: 'Delete Question?',
            text: "This question will be permanently removed from the form.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const token = localStorage.getItem('token');
                try {
                    await axios.delete(`${API_BASE_URL}/api/questions/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    fetchQuestions();
                    Swal.fire('Deleted!', 'Question removed.', 'success');
                } catch (err) {
                    Swal.fire('Error!', 'Error deleting question.', 'error');
                }
            }
        });
    };

    const moveOrder = async (id, direction) => {
        const targetQ = questions.find(q => q._id === id);
        if (!targetQ) return;

        const sectionQuestions = questions
            .filter(q => q.section === targetQ.section)
            .sort((a, b) => a.order - b.order);

        const index = sectionQuestions.findIndex(q => q._id === id);
        if ((direction === -1 && index === 0) || (direction === 1 && index === sectionQuestions.length - 1)) return;

        const otherQ = sectionQuestions[index + direction];

        const token = localStorage.getItem('token');
        try {
            await Promise.all([
                axios.put(`${API_BASE_URL}/api/questions/${targetQ._id}`, { ...targetQ, order: otherQ.order }, { headers: { Authorization: `Bearer ${token}` } }),
                axios.put(`${API_BASE_URL}/api/questions/${otherQ._id}`, { ...otherQ, order: targetQ.order }, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            fetchQuestions();
        } catch (err) {
            console.error('Failed to update order');
        }
    };

    const moveToSection = async (id, newSection) => {
        const token = localStorage.getItem('token');
        const q = questions.find(item => item._id === id);
        if (!q || q.section === newSection) return;

        let sectionToUse = newSection;

        if (newSection === 'New Section') {
            const { value: sectionName } = await Swal.fire({
                title: 'New Section Name',
                input: 'text',
                inputPlaceholder: 'Enter section name (e.g., Infrastructure)',
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value) return 'You need to write something!';
                }
            });
            if (!sectionName) return;
            sectionToUse = sectionName;
        }

        try {
            await axios.put(`${API_BASE_URL}/api/questions/${id}`, { ...q, section: sectionToUse }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchQuestions();
            Swal.fire({
                icon: 'success',
                title: 'Moved!',
                text: `Question moved to ${cleanSectionTitle(sectionToUse)}`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire('Error', 'Failed to move question', 'error');
        }
    };

    const openEdit = (q) => {
        setCurrentQuestion({
            ...q,
            options: q.options || [],
            rows: q.rows || [],
            columns: q.columns || [],
            required: !!q.required,
            isTrainerEval: !!q.isTrainerEval,
            isOverallRating: !!q.isOverallRating
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const openAdd = (section = 'General', order = null) => {
        if (order === null) {
            order = questions.length > 0
                ? Math.max(...questions.map(q => q.order || 0)) + 1
                : 0;
        }

        setCurrentQuestion({
            questionText: '',
            type: 'text',
            options: [],
            rows: [],
            columns: [],
            section,
            order: order,
            required: false,
            isTrainerEval: false,
            isOverallRating: false
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const addListOption = (field) => {
        setCurrentQuestion({ ...currentQuestion, [field]: [...currentQuestion[field], ''] });
    };

    const handleListOptionChange = (field, index, value) => {
        const newList = [...currentQuestion[field]];
        newList[index] = value;
        setCurrentQuestion({ ...currentQuestion, [field]: newList });
    };

    const removeListOption = (field, index) => {
        setCurrentQuestion({ ...currentQuestion, [field]: currentQuestion[field].filter((_, i) => i !== index) });
    };

    const cleanSectionTitle = (title) => {
        return (title || '').replace(/^\d+[\.\-\s]*/, '').replace(/^SECTION\s*\d+[\.\-\s]*/i, '').trim();
    };

    const groupedBySection = (questions || []).reduce((acc, q) => {
        if (!acc[q.section]) acc[q.section] = [];
        acc[q.section].push(q);
        return acc;
    }, {});

    const sortedSectionKeys = Object.keys(groupedBySection).sort((a, b) => {
        const isFinalA = a.toLowerCase().includes('final');
        const isFinalB = b.toLowerCase().includes('final');
        if (isFinalA && !isFinalB) return 1;
        if (!isFinalA && isFinalB) return -1;
        const numA = parseInt(a.match(/\d+/)?.[0] || 999);
        const numB = parseInt(b.match(/\d+/)?.[0] || 999);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
    });

    const uniqueSections = [...new Set(questions.map(q => q.section))];

    return (
        <div className="admin-layout">
            <Sidebar />
            <main className="admin-content">
                <div className="question-manager-container">
                    <header className="page-header flex-header">
                        <div>
                            <h1>Question Manager</h1>
                            <p>Customize your backend-driven feedback form</p>
                        </div>
                        <button onClick={() => openAdd()} className="btn-primary">
                            <MdAdd size={24} />
                            Add New Question
                        </button>
                    </header>

                    {loading ? (
                        <div className="uc-loader-container">
                            <div className="uc-logo-anim"><span>U</span><span>C</span></div>
                            <div className="uc-loading-text">Loading Questions...</div>
                        </div>
                    ) : (
                        <div className="sections-container">
                            {sortedSectionKeys.map(section => (
                                <div key={section} className="section-group">
                                    <div className="section-group-header">
                                        <h2>{cleanSectionTitle(section)}</h2>
                                        <button onClick={() => openAdd(section)} className="add-in-section">
                                            <MdAdd size={20} />
                                            Add Question
                                        </button>
                                    </div>
                                    <div className="questions-grid">
                                        {groupedBySection[section].sort((a, b) => a.order - b.order).map((q, idx, arr) => (
                                            <React.Fragment key={q._id}>
                                                <div className="question-item-card">
                                                    <div className="q-card-top">
                                                        <div className="badges">
                                                            <span className="type-badge-alt clickable" onClick={() => openEdit(q)} title="Click to edit type">{q.type}</span>
                                                            {q.required && <span className="req-badge clickable" onClick={() => openEdit(q)} title="Click to edit requirement">Required</span>}
                                                        </div>

                                                        <div className="section-mover">
                                                            <span>Move to:</span>
                                                            <select
                                                                value={q.section}
                                                                onChange={(e) => moveToSection(q._id, e.target.value)}
                                                            >
                                                                {sortedSectionKeys.map(s => (
                                                                    <option key={s} value={s}>{cleanSectionTitle(s)}</option>
                                                                ))}
                                                                <option value="New Section">+ New Section...</option>
                                                            </select>
                                                        </div>

                                                        <div className="order-controls">
                                                            <span className="order-badge">#{q.order}</span>
                                                            <button
                                                                onClick={() => moveOrder(q._id, -1)}
                                                                disabled={idx === 0}
                                                                title="Move Up"
                                                            >
                                                                <MdArrowUpward size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => moveOrder(q._id, 1)}
                                                                disabled={idx === arr.length - 1}
                                                                title="Move Down"
                                                            >
                                                                <MdArrowDownward size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="q-card-text" onClick={() => openEdit(q)} title="Click to edit question">
                                                        {q.questionText}
                                                    </div>

                                                    <div className="q-preview-area">
                                                        {q.type === 'text' && <input type="text" disabled placeholder="Short Text" className="preview-input" />}
                                                        {q.type === 'textarea' && <textarea disabled placeholder="Paragraph Text" className="preview-input textarea"></textarea>}
                                                        {q.type === 'radio' && (
                                                            <div className="preview-options">
                                                                {q.options.map((opt, i) => (
                                                                    <div key={i} className="preview-opt"><div className="radio-circle"></div> {opt}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {q.type === 'checkbox' && (
                                                            <div className="preview-options">
                                                                {q.options.map((opt, i) => (
                                                                    <div key={i} className="preview-opt"><div className="check-box"></div> {opt}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {q.type === 'trainer-select' && (
                                                            <select disabled className="preview-input">
                                                                <option>-- Select Trainer (Auto-populated) --</option>
                                                            </select>
                                                        )}
                                                        {q.type === 'matrix' && (
                                                            <div className="mini-matrix-wrapper">
                                                                <table className="mini-matrix">
                                                                    <thead>
                                                                        <tr>
                                                                            <th></th>
                                                                            {q.columns.map(c => <th key={c}>{c}</th>)}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {q.rows.slice(0, 3).map(r => (
                                                                            <tr key={r}>
                                                                                <td>{r}</td>
                                                                                {q.columns.map(c => <td key={c}><div className="radio-circle"></div></td>)}
                                                                            </tr>
                                                                        ))}
                                                                        {q.rows.length > 3 && <tr><td colSpan={q.columns.length + 1}>...</td></tr>}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="q-card-actions">
                                                        <div className="stats-info">
                                                            {q.type === 'matrix' ? `${q.rows?.length || 0} Criteria` : (q.options?.length ? `${q.options.length} Options` : 'Free Text')}
                                                        </div>
                                                        <div className="btns">
                                                            <button onClick={() => openEdit(q)} className="btn-icon-alt edit" title="Edit"><MdEdit size={18} /></button>
                                                            <button onClick={() => handleDeleteClick(q._id)} className="btn-icon-alt delete" title="Delete"><MdDelete size={18} /></button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {idx < arr.length - 1 && (
                                                    <div className="insert-divider">
                                                        <div className="insert-line"></div>
                                                        <button
                                                            className="insert-btn"
                                                            onClick={() => openAdd(section, q.order + 1)}
                                                            title="Insert Question Here"
                                                        >
                                                            <MdAdd size={20} />
                                                        </button>
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {showModal && (
                        <div className="modal-overlay">
                            <div className="modal-content admin-modal">
                                <form onSubmit={handleSave}>
                                    <div className="modal-header">
                                        <h2>{isEditing ? 'Edit Question' : 'Create Question'}</h2>
                                        <button type="button" onClick={() => setShowModal(false)} className="close-btn">&times;</button>
                                    </div>
                                    <div className="modal-body-alt">
                                        <div className="form-grid">
                                            <div className="form-group-alt full-col">
                                                <label>Question Text</label>
                                                <textarea
                                                    value={currentQuestion.questionText}
                                                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, questionText: e.target.value })}
                                                    required
                                                    placeholder="Example: How would you rate the training infrastructure?"
                                                    rows="3"
                                                ></textarea>
                                            </div>

                                            <div className="form-group-alt">
                                                <label>Section Name</label>
                                                <input
                                                    list="sections-list"
                                                    value={currentQuestion.section}
                                                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, section: e.target.value })}
                                                    required
                                                    placeholder="e.g. Infrastructure"
                                                />
                                                <datalist id="sections-list">
                                                    {uniqueSections.map(s => <option key={s} value={s} />)}
                                                </datalist>
                                            </div>

                                            <div className="form-group-alt">
                                                <label>Display Order</label>
                                                <input
                                                    type="number"
                                                    value={currentQuestion.order}
                                                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, order: parseInt(e.target.value) })}
                                                    required
                                                />
                                            </div>

                                            <div className="form-group-alt">
                                                <label>Component Type</label>
                                                <select
                                                    value={currentQuestion.type}
                                                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, type: e.target.value })}
                                                >
                                                    <option value="text">Input Box (Short)</option>
                                                    <option value="textarea">Paragraph Box (Long)</option>
                                                    <option value="radio">Selection (Radio)</option>
                                                    <option value="checkbox">Multi-Select (Checkbox)</option>
                                                    <option value="matrix">Matrix Grid (Criteria)</option>
                                                    <option value="trainer-select">Trainer Dropdown (Auto-populated)</option>
                                                </select>
                                            </div>

                                            <div className="form-group-alt">
                                                <label>Required Field</label>
                                                <label className="switch-label">
                                                    <span>Mandatory</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={currentQuestion.required}
                                                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, required: e.target.checked })}
                                                    />
                                                </label>
                                            </div>

                                            <div className="form-group-alt">
                                                <label>Form Bridge Tags</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <label className="switch-label">
                                                        <span>Trainer Eval Block</span>
                                                        <input
                                                            type="checkbox"
                                                            checked={currentQuestion.isTrainerEval}
                                                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, isTrainerEval: e.target.checked })}
                                                        />
                                                    </label>
                                                    <label className="switch-label">
                                                        <span>Overall Performance Rating</span>
                                                        <input
                                                            type="checkbox"
                                                            checked={currentQuestion.isOverallRating}
                                                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, isOverallRating: e.target.checked })}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {(currentQuestion.type === 'radio' || currentQuestion.type === 'checkbox') && (
                                            <div className="builder-area">
                                                <div className="builder-header"><span>Selection Options</span></div>
                                                {(currentQuestion.options || []).map((opt, i) => (
                                                    <div key={i} className="dynamic-row">
                                                        <div className="form-group-alt" style={{ flex: 1 }}>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => handleListOptionChange('options', i, e.target.value)}
                                                                placeholder={`Option ${i + 1}`}
                                                                required
                                                            />
                                                        </div>
                                                        <button type="button" onClick={() => removeListOption('options', i)} className="btn-remove-row"><MdDelete size={20} /></button>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => addListOption('options')} className="btn-add-item"><MdAdd /> Add Option</button>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'matrix' && (
                                            <div className="matrix-builder-container">
                                                <div className="builder-area">
                                                    <div className="builder-header"><span>Row Questions</span></div>
                                                    {(currentQuestion.rows || []).map((row, i) => (
                                                        <div key={i} className="dynamic-row">
                                                            <div className="form-group-alt" style={{ flex: 1 }}>
                                                                <input
                                                                    type="text"
                                                                    value={row}
                                                                    onChange={(e) => handleListOptionChange('rows', i, e.target.value)}
                                                                    placeholder="Rating criteria..."
                                                                    required
                                                                />
                                                            </div>
                                                            <button type="button" onClick={() => removeListOption('rows', i)} className="btn-remove-row"><MdDelete size={20} /></button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addListOption('rows')} className="btn-add-item"><MdAdd /> Add Row</button>
                                                </div>
                                                <div className="builder-area">
                                                    <div className="builder-header"><span>Column Values</span></div>
                                                    {(currentQuestion.columns || []).map((col, i) => (
                                                        <div key={i} className="dynamic-row">
                                                            <div className="form-group-alt" style={{ flex: 1 }}>
                                                                <input
                                                                    type="text"
                                                                    value={col}
                                                                    onChange={(e) => handleListOptionChange('columns', i, e.target.value)}
                                                                    placeholder="Rating scale..."
                                                                    required
                                                                />
                                                            </div>
                                                            <button type="button" onClick={() => removeListOption('columns', i)} className="btn-remove-row"><MdDelete size={20} /></button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => addListOption('columns')} className="btn-add-item"><MdAdd /> Add Column</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="modal-footer-alt">
                                        <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                                        <button type="submit" className="btn-save-main">
                                            {isEditing ? 'Save Changes' : 'Create Question'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default QuestionManager;
