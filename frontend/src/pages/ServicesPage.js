import React, { useState } from 'react';
import '../styles/ServicesPage.css';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';

function ServicesPage({ onNavigate }) {

const [showRegister, setShowRegister] = useState(false);
const [showLogin, setShowLogin] = useState(false);
const [menuOpen, setMenuOpen] = useState(false);

return (

<div className="services-bg">

<nav className="services-nav">

<div className="services-logo">
<img src="/logo.png" alt="Audio Visual Resource Center"/>
</div>

<div
className={`hamburger ${menuOpen ? "active" : ""}`}
onClick={()=>setMenuOpen(!menuOpen)}
>
<span></span>
<span></span>
<span></span>
</div>

<ul className={`services-menu ${menuOpen ? "open" : ""}`}>

<li onClick={()=>{
onNavigate && onNavigate('home');
setMenuOpen(false);
}}>
Home
</li>

<li onClick={()=>{
onNavigate && onNavigate('about');
setMenuOpen(false);
}}>
About
</li>

<li className="active">
Services
</li>

<li onClick={()=>{
onNavigate && onNavigate('contact');
setMenuOpen(false);
}}>
Contact
</li>

</ul>

<div className="services-auth">

<span className="login" onClick={()=>setShowLogin(true)}>
Login
</span>

<span className="register" onClick={()=>setShowRegister(true)}>
Register
</span>

</div>

</nav>

<section className="services-content">

<h1>Our Services</h1>

<p className="services-subtitle">
Equipment rental and room availability for meetings, events, and presentations
</p>

<div className="services-grid">

<div className="service-card">
<div className="service-icon">🎥</div>
<h3>Equipment Reservations</h3>
<p>
Reserve professional audio and visual equipment for presentations, events, and productions.
</p>

<div className="service-features">
<span className="feature-tag">Cameras</span>
<span className="feature-tag">Projectors</span>
<span className="feature-tag">Microphones</span>
</div>

</div>

<div className="service-card">

<div className="service-icon">🏢</div>

<h3>Room Reservations</h3>

<p>
Book AV-equipped rooms for meetings, conferences, and workshops.
</p>

<div className="service-features">
<span className="feature-tag">Meeting Rooms</span>
<span className="feature-tag">Conference Rooms</span>
<span className="feature-tag">Presentation Areas</span>
</div>

</div>

<div className="service-card">

<div className="service-icon">🛠</div>

<h3>Technical Support</h3>

<p>
Our team assists with equipment setup and technical troubleshooting.
</p>

<div className="service-features">
<span className="feature-tag">Setup Help</span>
<span className="feature-tag">Troubleshooting</span>
<span className="feature-tag">Guidance</span>
</div>

</div>

</div>

<div className="cta-section">

<h2>Ready to Reserve Equipment?</h2>

<p>
Create an account and start booking equipment or rooms easily.
</p>

<button className="cta-button">
Reserve Now
</button>

</div>

</section>

<div className="bubble bubble1"></div>
<div className="bubble bubble2"></div>

{showRegister && (
<RegistrationForm
onClose={()=>setShowRegister(false)}
onOpenLogin={()=>{
setShowRegister(false);
setShowLogin(true);
}}
/>
)}

{showLogin && (
<LoginForm
onClose={()=>setShowLogin(false)}
onRegister={()=>{
setShowLogin(false);
setShowRegister(true);
}}
/>
)}

</div>

);

}

export default ServicesPage;