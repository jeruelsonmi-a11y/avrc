import React, { useState, useEffect, useRef } from 'react';
import '../styles/AboutPage.css';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';

function AboutPage({ onNavigate }) {

const [showRegister, setShowRegister] = useState(false);
const [showLogin, setShowLogin] = useState(false);
const [menuOpen, setMenuOpen] = useState(false);

const [animatedStats, setAnimatedStats] = useState({
0:'0',
1:'0',
2:'0',
3:'0'
});

const statsRef = useRef(null);

const features = [
{
title:'Latest Equipment',
description:'Access state-of-the-art audio and visual equipment for your projects',
icon:'🎥'
},
{
title:'Expert Support',
description:'Get guidance from our experienced team of professionals',
icon:'👨‍💼'
},
{
title:'Easy Booking',
description:'Simple and convenient reservation system for all users',
icon:'📅'
},
{
title:'Quality Service',
description:'Guaranteed high-quality service and equipment maintenance',
icon:'⭐'
}
];

const coreValues = [
{
title:'Integrity',
description:'We operate with honesty and transparent practices in all our dealings',
icon:'🤝'
},
{
title:'Innovation',
description:'Continuously updating our technology to stay ahead of industry standards',
icon:'💡'
},
{
title:'Accessibility',
description:'Making professional-grade equipment available to everyone',
icon:'🌍'
},
{
title:'Excellence',
description:'Delivering outstanding service quality in everything we do',
icon:'🏆'
}
];

const stats = [
{ number:'500+', label:'Active Users', icon:'👥' },
{ number:'10,000+', label:'Reservations', icon:'📋' },
{ number:'150+', label:'Equipment Items', icon:'📦' },
{ number:'98%', label:'Satisfaction Rate', icon:'😊' }
];

useEffect(()=>{
window.scrollTo(0,0);
},[]);

useEffect(()=>{

const observer = new IntersectionObserver(entries=>{
if(entries[0].isIntersecting){

const targets=[500,10000,150,98];
const duration=2000;
const startTime=Date.now();

const animate=()=>{
const elapsed=Date.now()-startTime;
const progress=Math.min(elapsed/duration,1);

const newStats={};

targets.forEach((target,index)=>{
const value=Math.floor(target*progress);

if(index===0)newStats[index]=`${value}+`;
else if(index===1)newStats[index]=value.toLocaleString()+'+';
else if(index===2)newStats[index]=`${value}+`;
else if(index===3)newStats[index]=`${value}%`;

});

setAnimatedStats(newStats);

if(progress<1){
requestAnimationFrame(animate);
}
};

animate();
observer.unobserve(statsRef.current);
}
},{threshold:0.3});

if(statsRef.current){
observer.observe(statsRef.current);
}

return()=>observer.disconnect();

},[]);

return(

<div className="about-bg">

<nav className="about-nav">

<div className="about-logo">
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

<ul className={`about-menu ${menuOpen ? "open" : ""}`}>

<li onClick={()=>{
onNavigate && onNavigate('home');
setMenuOpen(false);
}}>
Home
</li>

<li className="active">About</li>

<li onClick={()=>{
onNavigate && onNavigate('services');
setMenuOpen(false);
}}>
Services
</li>

<li onClick={()=>{
onNavigate && onNavigate('contact');
setMenuOpen(false);
}}>
Contact
</li>

</ul>

<div className="about-auth">

<span className="login" onClick={()=>setShowLogin(true)}>
Login
</span>

<span className="register" onClick={()=>setShowRegister(true)}>
Register
</span>

</div>

</nav>

<section className="about-content">

<h1>About Us</h1>

<p className="about-subtitle">
Learn more about Audio Visual Resource Center
</p>

<div className="about-description">

<div className="description-text">

<h2>Our Mission</h2>

<p>
The Audio Visual Resource Center is dedicated to providing top-quality equipment and support for creative projects, educational initiatives, and professional productions.
</p>

<p>
With our comprehensive inventory and knowledgeable team, we ensure every reservation experience is smooth and successful.
</p>

</div>

</div>

<div className="features-grid">

<h2 className="section-title">
Why Choose Us?
</h2>

{features.map((feature,index)=>(
<div key={index} className="feature-card">

<div className="feature-icon">
{feature.icon}
</div>

<h3>{feature.title}</h3>

<p>{feature.description}</p>

</div>
))}

</div>

<div className="core-values-section">

<h2>Our Core Values</h2>

<div className="values-grid">

{coreValues.map((value,index)=>(
<div key={index} className="value-card">

<div className="value-icon">
{value.icon}
</div>

<h3>{value.title}</h3>

<p>{value.description}</p>

</div>
))}

</div>

</div>

<div className="statistics-section" ref={statsRef}>

<h2>By The Numbers</h2>

<div className="stats-grid">

{stats.map((stat,index)=>(
<div key={index} className="stat-card">

<div className="stat-icon">
{stat.icon}
</div>

<h3>{animatedStats[index]}</h3>

<p>{stat.label}</p>

</div>
))}

</div>

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

export default AboutPage;