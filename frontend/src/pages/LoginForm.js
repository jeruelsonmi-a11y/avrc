import React, { useState } from 'react';
import '../styles/LoginForm.css';

function LoginForm({ onClose, onRegister, onLoginSuccess }) {
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const formatApiError = (err) => {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (Array.isArray(err)) return err.map(item => item?.msg || item?.detail || JSON.stringify(item)).join('; ');
    if (typeof err === 'object') return err.detail ? formatApiError(err.detail) : err.msg || JSON.stringify(err);
    return String(err);
  };

  async function handleSubmit(e){
    e.preventDefault();
    setError('');
    if(!idNumber.trim() || !password) { setError('ID and password are required'); return; }
    setLoading(true);
    try{
      const res = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id_number: idNumber, password })
      });
      const data = await res.json();
      if(!res.ok){ setError(formatApiError(data.detail || data) || 'Login failed'); setLoading(false); return; }
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_fullname', data.fullname);
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('user_role', data.role);
      setLoading(false);
      setSuccess('Login successfully!');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
        onClose();
      }, 2000);
    }catch(err){ setError('Network error'); setLoading(false); }
  }

  return (
    <div className="loginform-modal-bg">
      <div className="loginform-modal" style={{ minWidth: 320, maxWidth: 400 }}>
        <button className="btn-close position-absolute end-0 top-0 m-2" aria-label="Close" onClick={onClose}></button>
        <h2 className="loginform-title text-center mb-3 mt-2">LOGIN FORM</h2>
        <form className="loginform-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">ID NUMBER</label>
            <input type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="form-control form-control-sm rounded-pill" placeholder="" />
          </div>
          <div className="mb-3">
            <label className="form-label">PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="loginform-input" />
          </div>
          {error && <div style={{color:'#c53030', marginBottom:8}}>{error}</div>}
          {success && <div style={{color:'#276749', marginBottom:8}}>{success}</div>}
          <button type="submit" className="btn btn-primary w-100 rounded-pill mt-2 mb-1" style={{fontWeight:600, fontSize:'1.08rem'}} disabled={loading || success}>{loading ? 'Signing in...' : 'Login'}</button>
        </form>
        <div className="text-center mt-2" style={{fontSize: '0.95rem'}}>
          Don't have an account? <span style={{color:'#1a73e8', cursor:'pointer', fontWeight:600}} onClick={() => { onClose(); if (onRegister) onRegister(); }}>Register now</span>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
