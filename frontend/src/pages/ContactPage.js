import React, { useState } from 'react';
import '../styles/ContactPage.css';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';

function ContactPage({ onNavigate }) {

const [showRegister, setShowRegister] = useState(false);
const [showLogin, setShowLogin] = useState(false);
const [menuOpen, setMenuOpen] = useState(false);

const [formData, setFormData] = useState({
name:'',
email:'',
phone:'',
subject:'',
message:''
});

const [submitSuccess, setSubmitSuccess] = useState(false);

const handleChange = (e)=>{
const {name,value}=e.target;

setFormData(prev=>({
...prev,
[name]:value
}));

};

const handleSubmit=(e)=>{

e.preventDefault();

console.log('Form submitted:',formData);

setSubmitSuccess(true);

setFormData({
name:'',
email:'',
phone:'',
subject:'',
message:''
});

setTimeout(()=>setSubmitSuccess(false),3000);

};

return(

<div className="contact-bg">

<nav className="contact-nav">

<div className="contact-logo">
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

<ul className={`contact-menu ${menuOpen ? "open" : ""}`}>

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

<li onClick={()=>{
onNavigate && onNavigate('services');
setMenuOpen(false);
}}>
Services
</li>

<li className="active">
Contact
</li>

</ul>

<div className="contact-auth">

<span className="login" onClick={()=>setShowLogin(true)}>
Login
</span>

<span className="register" onClick={()=>setShowRegister(true)}>
Register
</span>

</div>

</nav>

<section className="contact-content">

<h1>Contact Us</h1>

<p className="contact-subtitle">
Get in touch with us for equipment rental and room booking inquiries
</p>

<div className="contact-container">

<div className="contact-info">

<div className="info-card">
<div className="info-icon">📍</div>
<h3>Location</h3>
<p>Sacred Heart College of Lucena City Inc.</p>
<p>2nd Floor MM Building</p>
</div>

<div className="info-card">
<div className="info-icon">📞</div>
<h3>Phone</h3>
<p>0912-1238-980</p>
<p>Mon-Fri: 7:30AM - 5:00PM</p>
<p>Saturday: 8:00AM - 12:00PM</p>
</div>

<div className="info-card">
<div className="info-icon">📧</div>
<h3>Email</h3>
<p>shcavrc@shc.edu.ph</p>
</div>

</div>

<form className="contact-form" onSubmit={handleSubmit}>

<div className="form-group">
<input
type="text"
name="name"
placeholder="Your Name"
value={formData.name}
onChange={handleChange}
required
/>
</div>

<div className="form-group">
<input
type="email"
name="email"
placeholder="Your Email"
value={formData.email}
onChange={handleChange}
required
/>
</div>

<div className="form-group">
<input
type="tel"
name="phone"
placeholder="Your Phone Number"
value={formData.phone}
onChange={handleChange}
/>
</div>

<div className="form-group">
<input
type="text"
name="subject"
placeholder="Subject"
value={formData.subject}
onChange={handleChange}
required
/>
</div>

<div className="form-group">
<textarea
name="message"
placeholder="Your Message (Equipment needed, room booking, dates, etc.)"
value={formData.message}
onChange={handleChange}
rows="5"
required
></textarea>
</div>

<button type="submit" className="submit-btn">
Send Message
</button>

{submitSuccess && (
<div className="success-message">
Thank you! We'll get back to you soon.
</div>
)}

</form>

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

export default ContactPage;