
import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Sidebar from '../components/Sidebar';
import { MdAdd, MdEdit, MdDelete, MdPerson, MdCheckCircle, MdCancel, MdSearch } from 'react-icons/md';
import './TrainerManager.css';

const API_BASE_URL = 'https://feedback-uc-urbancode.onrender.com';

const TrainerManager = () => {
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTrainer, setEditingTrainer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        specialization: '',
        active: true
    });

    const fetchTrainers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/trainers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTrainers(res.data);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to fetch trainers', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrainers();
    }, []);

    const handleOpenAdd = () => {
        setEditingTrainer(null);
        setFormData({ name: '', specialization: '', active: true });
        setShowModal(true);
    };

    const handleOpenEdit = (trainer) => {
        setEditingTrainer(trainer);
        setFormData({
            name: trainer.name,
            specialization: trainer.specialization || '',
            active: trainer.active
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTrainer(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            if (editingTrainer) {
                await axios.put(`${API_BASE_URL}/api/trainers/${editingTrainer._id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Updated!', 'Trainer details updated.', 'success');
            } else {
                await axios.post(`${API_BASE_URL}/api/trainers`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Added!', 'New trainer added.', 'success');
            }
            fetchTrainers();
            handleCloseModal();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Action failed', 'error');
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Delete Trainer?',
            text: "This will permanently remove this trainer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_BASE_URL}/api/trainers/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    Swal.fire('Deleted!', 'Trainer has been removed.', 'success');
                    fetchTrainers();
                } catch (err) {
                    Swal.fire('Error', 'Delete failed', 'error');
                }
            }
        });
    };

    const toggleStatus = async (trainer) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/api/trainers/${trainer._id}`, { active: !trainer.active }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTrainers();
        } catch (err) {
            Swal.fire('Error', 'Failed to update status', 'error');
        }
    };

    const filteredTrainers = trainers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-layout">
            <Sidebar />
            <main className="admin-content">
                <div className="trainer-manager-container">
                    <header className="page-header flex-header">
                        <div className="header-titles">
                            <h1>Trainer Management</h1>
                            <p>Manage courses trainers and placement coordinators</p>
                        </div>
                        <button className="btn-primary" onClick={handleOpenAdd}>
                            <MdAdd size={24} />
                            <span>Add New Trainer</span>
                        </button>
                    </header>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon total">
                                <MdPerson size={28} />
                            </div>
                            <div className="stat-info">
                                <h3>Total Trainers</h3>
                                <p>{trainers.length}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon active">
                                <MdCheckCircle size={28} />
                            </div>
                            <div className="stat-info">
                                <h3>Active</h3>
                                <p>{trainers.filter(t => t.active).length}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon inactive">
                                <MdCancel size={28} />
                            </div>
                            <div className="stat-info">
                                <h3>Inactive</h3>
                                <p>{trainers.filter(t => !t.active).length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="trainer-controls">
                        <div className="search-container">
                            <MdSearch className="search-icon" size={22} />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search specialization..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-dropdown-container">
                            <select
                                className="trainer-select-dropdown"
                                onChange={(e) => setSearchTerm(e.target.value)}
                                value={searchTerm}
                            >
                                <option value="">-- All Trainers (Dropdown) --</option>
                                {trainers.map(t => (
                                    <option key={t._id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="table-wrapper">
                        <table className="trainer-table">
                            <thead>
                                <tr>
                                    <th>Trainer Details</th>
                                    <th>Specialization</th>
                                    <th>Status</th>
                                    <th>Added On</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5">
                                            <div className="uc-loader-container" style={{ minHeight: '150px' }}>
                                                <div className="uc-logo-anim" style={{ fontSize: '2.5rem' }}><span>U</span><span>C</span></div>
                                                <div className="uc-loading-text">Loading Trainers...</div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTrainers.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center">No trainers found.</td></tr>
                                ) : (
                                    filteredTrainers.map(trainer => (
                                        <tr key={trainer._id}>
                                            <td>
                                                <div className="trainer-profile-cell">
                                                    <div className="avatar-circle">
                                                        {trainer.name.charAt(0)}
                                                    </div>
                                                    <div className="trainer-main-info">
                                                        <span className="trainer-name-text">{trainer.name}</span>
                                                        <span className="trainer-sub-text">Trainer</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="spec-badge">{trainer.specialization || 'General'}</span>
                                            </td>
                                            <td>
                                                <button
                                                    className={`status-pill ${trainer.active ? 'active' : 'inactive'}`}
                                                    onClick={() => toggleStatus(trainer)}
                                                >
                                                    {trainer.active ? <MdCheckCircle /> : <MdCancel />}
                                                    {trainer.active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td>
                                                <span className="trainer-sub-text">
                                                    {new Date(trainer.createdAt).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="action-group">
                                                    <button className="btn-icon edit" title="Edit" onClick={() => handleOpenEdit(trainer)}>
                                                        <MdEdit size={18} />
                                                    </button>
                                                    <button className="btn-icon delete" title="Delete" onClick={() => handleDelete(trainer._id)}>
                                                        <MdDelete size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content admin-modal">
                        <div className="modal-header">
                            <h2>{editingTrainer ? 'Edit Trainer' : 'Add New Trainer'}</h2>
                            <button className="close-btn" onClick={handleCloseModal}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body-alt">
                                <div className="form-grid">
                                    <div className="form-group-alt full-col">
                                        <label>Full Name*</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter trainer's full name"
                                        />
                                    </div>
                                    <div className="form-group-alt full-col">
                                        <label>Specialization (Optional)</label>
                                        <input
                                            type="text"
                                            value={formData.specialization}
                                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                            placeholder="e.g. MERN Stack, Python, Placements"
                                        />
                                    </div>
                                    <div className="form-group-alt full-col">
                                        <label>Availability</label>
                                        <label className="switch-label">
                                            <span>Active Trainer Status</span>
                                            <input
                                                type="checkbox"
                                                checked={formData.active}
                                                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer-alt">
                                <button type="button" className="btn-ghost" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn-save-main">
                                    {editingTrainer ? 'Save Changes' : 'Create Trainer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainerManager;
