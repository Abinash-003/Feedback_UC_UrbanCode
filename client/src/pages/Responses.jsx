
import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api.config';
import Sidebar from '../components/Sidebar';
import { MdSearch, MdFilterList, MdVisibility, MdDelete, MdDownload, MdCheckCircle, MdCancel } from 'react-icons/md';
import Swal from 'sweetalert2';
import './Responses.css';

const Responses = () => {
    const [responses, setResponses] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [filteredResponses, setFilteredResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTrainer, setFilterTrainer] = useState('');
    const [selectedResponse, setSelectedResponse] = useState(null);

    const [questions, setQuestions] = useState([]);

    useEffect(() => {
        fetchResponses();
        fetchTrainers();
        fetchQuestions();
    }, []);

    useEffect(() => {
        handleSearchAndFilter();
    }, [searchTerm, filterTrainer, responses]);

    const fetchResponses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/responses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResponses(res.data);
            setFilteredResponses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTrainers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/trainers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTrainers(res.data);
        } catch (err) {
            console.error("Error fetching trainers:", err);
        }
    };

    const fetchQuestions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/questions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuestions(res.data);
        } catch (err) {
            console.error("Error fetching questions:", err);
        }
    };

    const handleSearchAndFilter = () => {
        let temp = [...responses];
        if (searchTerm) {
            temp = temp.filter(r =>
                r.participantDetails?.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (filterTrainer) {
            temp = temp.filter(r => r.participantDetails?.trainerName === filterTrainer);
        }
        setFilteredResponses(temp);
    };

    const getOverallRating = (res) => {
        const ans = res.dynamicAnswers?.find(a => {
            const txt = a.questionText?.toLowerCase();
            return txt?.includes('overall') || txt?.includes('experience') || txt?.includes('rating') || a.section?.includes('SECTION 2');
        });
        return ans?.value || 'N/A';
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Response?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_BASE_URL}/api/responses/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResponses(responses.filter(r => r._id !== id));
                Swal.fire('Deleted!', 'Response has been removed.', 'success');
            } catch (err) {
                Swal.fire('Error!', 'Failed to delete response.', 'error');
            }
        }
    };

    const downloadCSV = () => {
        const allQuestions = new Set();
        filteredResponses.forEach(r => {
            r.dynamicAnswers?.forEach(ans => {
                const txt = ans.questionText;
                if (txt) allQuestions.add(txt);
            });
        });
        const questionHeaders = Array.from(allQuestions);
        const headers = ['Date', 'Email', 'Trainer', 'Course', 'Trainer Evaluations (Multi)', ...questionHeaders];

        const csvContent = [
            headers.join(','),
            ...filteredResponses.map(r => {
                const trainerEvalStr = (r.trainerEvaluations || []).map(t =>
                    `Type: ${t.trainerType || 'N/A'} - Trainer: ${t.trainerName} [${Object.entries(t.ratings || {}).map(([k, v]) => `${k}:${v}`).join('|')}]`
                ).join('; ');

                const row = [
                    new Date(r.createdAt).toLocaleDateString(),
                    `"${r.participantDetails?.email || ''}"`,
                    `"${r.participantDetails?.trainerName || ''}"`,
                    `"${r.participantDetails?.courseName || ''}"`,
                    `"${trainerEvalStr}"`
                ];

                questionHeaders.forEach(qText => {
                    const ans = r.dynamicAnswers?.find(a => a.questionText === qText);
                    if (!ans) {
                        row.push('""');
                    } else if (typeof ans.value === 'object' && ans.value !== null && !Array.isArray(ans.value)) {
                        const matrixStr = Object.entries(ans.value).map(([key, val]) => `${key}: ${val}`).join(' | ');
                        row.push(`"${matrixStr}"`);
                    } else if (Array.isArray(ans.value)) {
                        row.push(`"${ans.value.join(', ')}"`);
                    } else {
                        row.push(`"${ans.value || ''}"`);
                    }
                });
                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `feedback_responses_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
    };

    const renderAnswer = (ans) => {
        const type = ans.type;
        if (type === 'matrix') {
            if (!ans.value || typeof ans.value !== 'object' || Array.isArray(ans.value)) {
                return <span>{ans.value?.toString() || 'N/A'}</span>;
            }
            return (
                <div className="matrix-display">
                    {Object.entries(ans.value).map(([row, col]) => (
                        <div key={row} className="matrix-row-val">
                            <strong>{row}:</strong> {col}
                        </div>
                    ))}
                </div>
            );
        }
        if (Array.isArray(ans.value)) {
            return <span>{ans.value.join(', ')}</span>;
        }
        return <span>{ans.value}</span>;
    };

    const cleanSectionTitle = (title) => {
        return (title || '').replace(/^\d+[\.\-\s]*/, '').replace(/^SECTION\s*\d+[\.\-\s]*/i, '').trim();
    };

    const getSectionTitle = (section) => {
        return cleanSectionTitle(section) || section;
    };

    return (
        <div className="admin-layout">
            <Sidebar />
            <main className="admin-content">
                <div className="responses-manager-container">
                    <header className="page-header flex-header">
                        <div>
                            <h1>Responses</h1>
                            <p>Manage and view all participants feedback</p>
                        </div>
                        <button onClick={downloadCSV} className="btn-secondary">
                            <MdDownload size={20} />
                            <span>Export CSV</span>
                        </button>
                    </header>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon total">
                                <MdVisibility size={28} />
                            </div>
                            <div className="stat-info">
                                <h3>Total Responses</h3>
                                <p>{responses.length}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon excellent">
                                <MdCheckCircle size={28} />
                            </div>
                            <div className="stat-info">
                                <h3>Positive Feedback</h3>
                                <p>{responses.filter(r => ['Excellent', 'Good'].includes(getOverallRating(r))).length}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon poor">
                                <MdCancel size={28} />
                            </div>
                            <div className="stat-info">
                                <h3>Critical Feedback</h3>
                                <p>{responses.filter(r => ['Bad', 'Very Bad'].includes(getOverallRating(r))).length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="table-controls">
                        <div className="search-container">
                            <MdSearch size={22} />
                            <input
                                type="text"
                                placeholder="Search by email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-box">
                            <MdFilterList size={20} />
                            <select onChange={(e) => setFilterTrainer(e.target.value)} value={filterTrainer}>
                                <option value="">All Trainers</option>
                                {trainers.map(t => (
                                    <option key={t._id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Participant (Email)</th>
                                    <th>Trainer</th>
                                    <th>Course</th>
                                    <th>Rating</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6">
                                            <div className="uc-loader-container" style={{ minHeight: '150px' }}>
                                                <div className="uc-logo-anim" style={{ fontSize: '2.5rem' }}><span>U</span><span>C</span></div>
                                                <div className="uc-loading-text">Loading Responses...</div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredResponses.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center">No responses found.</td></tr>
                                ) : (
                                    filteredResponses.map(res => {
                                        const rating = getOverallRating(res);
                                        return (
                                            <tr key={res._id}>
                                                <td className="date-cell">{new Date(res.createdAt).toLocaleDateString()}</td>
                                                <td className="email-cell">{res.participantDetails?.email}</td>
                                                <td>
                                                    <div className="trainer-cell-info">
                                                        {res.trainerEvaluations && res.trainerEvaluations.length > 0 ? (
                                                            res.trainerEvaluations.map((t, i) => (
                                                                <div key={i} className="trainer-item">
                                                                    <span className="trainer-name-bold">{t.trainerName}</span>
                                                                    <span className="trainer-type-small">({t.trainerType || 'Course Training'})</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="trainer-name-bold">{res.participantDetails?.trainerName || 'N/A'}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="course-cell">{res.participantDetails?.courseName || 'N/A'}</td>
                                                <td>
                                                    <span className={`badge rating-${(rating || 'N/A').toString().toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {rating}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <div className="action-group">
                                                        <button className="btn-icon view" onClick={() => setSelectedResponse(res)} title="View">
                                                            <MdVisibility size={18} />
                                                        </button>
                                                        <button className="btn-icon delete" onClick={() => handleDelete(res._id)} title="Delete">
                                                            <MdDelete size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {selectedResponse && (
                    <div className="modal-overlay">
                        <div className="modal-content admin-modal">
                            <div className="modal-header">
                                <h2>Response Details</h2>
                                <button onClick={() => setSelectedResponse(null)} className="close-btn">&times;</button>
                            </div>
                            <div className="modal-body-alt">
                                <section className="response-section">
                                    <h3>Participant Info</h3>
                                    <div className="info-grid">
                                        <p><strong>Email:</strong> {selectedResponse.participantDetails?.email || 'N/A'}</p>
                                        <p><strong>Course:</strong> {selectedResponse.participantDetails?.courseName || 'N/A'}</p>
                                        <p><strong>Trainer:</strong> {selectedResponse.participantDetails?.trainerName || 'N/A'}</p>
                                        <p><strong>Batch:</strong> {selectedResponse.participantDetails?.batch || 'N/A'}</p>
                                    </div>
                                </section>

                                <section className="response-section">
                                    <h3>Form Content</h3>
                                    <div className="sections-display">
                                        {selectedResponse.trainerEvaluations && selectedResponse.trainerEvaluations.length > 0 && (
                                            <div className="response-group-block">
                                                <h4 className="response-section-title">{getSectionTitle('Trainer Evaluation')}</h4>
                                                <div className="answers-list">
                                                    {selectedResponse.trainerEvaluations.map((evalItem, idx) => (
                                                        <div key={idx} className="trainer-response-block">
                                                            <div className="answer-item" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                                                <span className="trainer-label-display">
                                                                    Trainer: {evalItem.trainerName}
                                                                    <span className="trainer-type-suffix">
                                                                        ({evalItem.trainerType || 'Course Training'})
                                                                    </span>
                                                                </span>
                                                                <div className="matrix-display">
                                                                    {evalItem.ratings && Object.entries(evalItem.ratings).map(([criteria, rating]) => (
                                                                        <div key={criteria} className="matrix-row-val">
                                                                            <strong>{criteria}:</strong> {rating}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {(() => {
                                            const grouped = (selectedResponse.dynamicAnswers || []).reduce((acc, ans) => {
                                                // Map to current question meta if available
                                                const currentQ = questions.find(q => q._id === ans.questionId);
                                                const section = currentQ ? currentQ.section : (ans.section || 'Other');
                                                const text = currentQ ? currentQ.questionText : (ans.questionText || 'Deleted Question');

                                                if (!acc[section]) acc[section] = [];
                                                acc[section].push({ ...ans, section, questionText: text });
                                                return acc;
                                            }, {});

                                            return Object.keys(grouped).sort((a, b) => {
                                                const cleanA = a.toLowerCase();
                                                const cleanB = b.toLowerCase();
                                                if (cleanA.includes('final')) return 1;
                                                if (cleanB.includes('final')) return -1;
                                                const numA = parseInt(a.match(/\d+/)?.[0] || 999);
                                                const numB = parseInt(b.match(/\d+/)?.[0] || 999);
                                                if (numA !== numB) return numA - numB;
                                                return cleanA.localeCompare(cleanB);
                                            }).map(section => (
                                                <div key={section} className="response-group-block">
                                                    <h4 className="response-section-title">{getSectionTitle(section)}</h4>
                                                    <div className="answers-list">
                                                        {grouped[section].map((ans, idx) => (
                                                            <div key={idx} className="answer-item">
                                                                <label>{ans.questionText || 'Deleted Question'}</label>
                                                                <div className="answer-content">
                                                                    {renderAnswer(ans)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </section>
                            </div>
                            <div className="modal-footer-alt">
                                <button onClick={() => setSelectedResponse(null)} className="btn-ghost">Close</button>
                                <button onClick={() => window.print()} className="btn-submit-main"><MdDownload /> Print PDF</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Responses;
