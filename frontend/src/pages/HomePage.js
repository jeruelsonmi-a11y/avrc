import React, { useState, useEffect } from 'react';
import '../styles/HomePage.css';

import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';
import UserDashboard from './UserDashboard';
import AdminDashboard from './AdminDashboard';
import AboutPage from './AboutPage';
import ServicesPage from './ServicesPage';
import ContactPage from './ContactPage';

function HomePage() {

  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');

  const [menuOpen, setMenuOpen] = useState(false); // ⭐ hamburger state

  useEffect(() => {
    // Check if user has a valid session (already logged in)
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');

    if (token && role) {
      // User is already logged in - restore session (for page refresh)
      setIsLoggedIn(true);
      setUserRole(role);
    } else {
      // No valid session - show homepage (first time or after logout)
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_fullname');
      localStorage.removeItem('user_id');
      setIsLoggedIn(false);
      setUserRole(null);
    }
  }, []);

  const handleLogout = () => {
    // Clear all auth-related data
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_fullname');
    localStorage.removeItem('user_id');
    
    // Reset state
    setIsLoggedIn(false);
    setUserRole(null);
    setCurrentPage('home');
  };

  const handleLoginSuccess = () => {
    const role = localStorage.getItem('user_role');
    setUserRole(role);
    setIsLoggedIn(true);
  };

  return (
    <>
      {isLoggedIn ? (
        userRole === 'admin' ? (
          <AdminDashboard onLogout={handleLogout} />
        ) : (
          <UserDashboard onLogout={handleLogout} />
        )
      ) : currentPage === 'about' ? (
        <AboutPage onNavigate={setCurrentPage} />
      ) : currentPage === 'services' ? (
        <ServicesPage onNavigate={setCurrentPage} />
      ) : currentPage === 'contact' ? (
        <ContactPage onNavigate={setCurrentPage} />
      ) : (
        <div className="homepage-bg">

          <nav className="homepage-nav">

            <div className="homepage-logo">
              <img src="/logo.png" alt="Audio Visual Resource Center"/>
            </div>

            {/* ⭐ Hamburger button */}
            <div 
              className={`hamburger ${menuOpen ? "active" : ""}`} 
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </div>

            {/* ⭐ Menu */}
            <ul className={`homepage-menu ${menuOpen ? "open" : ""}`}>
              <li onClick={() => {setCurrentPage('home'); setMenuOpen(false);}}>Home</li>
              <li onClick={() => {setCurrentPage('about'); setMenuOpen(false);}}>About</li>
              <li onClick={() => {setCurrentPage('services'); setMenuOpen(false);}}>Services</li>
              <li onClick={() => {setCurrentPage('contact'); setMenuOpen(false);}}>Contact</li>
            </ul>

            <div className="homepage-auth">
              <span className="login" onClick={() => setShowLogin(true)}>Login</span>
              <span className="register" onClick={() => setShowRegister(true)}>Register</span>
            </div>

          </nav>

          <section className="homepage-hero">
            <h1>AUDIO VISUAL RESOURCE CENTER</h1>
            <p>Where Ideas Come to Life Through Sound and Vision</p>
            <button className="reserve-btn" onClick={() => setShowLogin(true)}>Reserve Now!</button>
          </section>

          <div className="bubble bubble1"></div>
          <div className="bubble bubble2"></div>

          {showRegister && (
            <RegistrationForm
              onClose={() => setShowRegister(false)}
              onOpenLogin={() => { setShowRegister(false); setShowLogin(true); }}
            />
          )}

          {showLogin && (
            <LoginForm
              onClose={() => setShowLogin(false)}
              onRegister={() => { setShowLogin(false); setShowRegister(true); }}
              onLoginSuccess={handleLoginSuccess}
            />
          )}

        </div>
      )}
    </>
  );
}

export default HomePage;