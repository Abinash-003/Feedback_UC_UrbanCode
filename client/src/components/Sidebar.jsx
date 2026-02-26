import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MdDashboard, MdQuestionAnswer, MdViewList, MdLogout, MdPeople, MdMenu, MdClose } from 'react-icons/md';
import './Sidebar.css';

const Sidebar = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/admin');
    };

    const toggleSidebar = () => setIsOpen(!isOpen);
    const closeSidebar = () => setIsOpen(false);

    return (
        <>
            <button className="sidebar-toggle" onClick={toggleSidebar}>
                {isOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
            </button>

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Feedback UC</h2>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <MdDashboard size={22} />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/admin/responses" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <MdViewList size={22} />
                        <span>Responses</span>
                    </NavLink>
                    <NavLink to="/admin/questions" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <MdQuestionAnswer size={22} />
                        <span>Questions</span>
                    </NavLink>
                    <NavLink to="/admin/trainers" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeSidebar}>
                        <MdPeople size={22} />
                        <span>Trainers</span>
                    </NavLink>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        <MdLogout size={22} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
        </>
    );
};

export default Sidebar;
