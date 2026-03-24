import React, { useState } from 'react';
import '../styles/RegistrationForm.css';
import { API_BASE_URL } from '../config';

const departments = [
  '',
  'BED',
  'HED',
  'FACULTY',
  'NTP'
];

function RegistrationForm({ onClose, onOpenLogin }) {
          const [departmentSelected, setDepartmentSelected] = useState('');
  const [subSelected, setSubSelected] = useState('');

  // form fields
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  function validate() {
    setError('');
    if (!fullname.trim()) return 'Fullname is required';
    if (!email.trim()) return 'Email is required';
    if (!email.endsWith('@shc.edu.ph')) return 'Email must end with @shc.edu.ph';
    if (!idNumber.trim()) return 'ID Number is required';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password.length > 72) return 'Password cannot be longer than 72 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    try {
      const body = { fullname, email, id_number: idNumber, department: departmentSelected, sub: subSelected, password };
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(formatApiError(data.detail || data) || 'Registration failed');
        setLoading(false);
        return;
      }
      // success
      setLoading(false);
      setSuccess('Registration Successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError('Network error');
      setLoading(false);
    }
  };

  return (
    <div className="regform-modal-bg">
      <div className="regform-modal">
                <h2 className="regform-title">REGISTRATION FORM</h2>
                <form className="regform-form" onSubmit={handleSubmit}>
                  <label>FULLNAME
                    <input type="text" value={fullname} onChange={e => setFullname(e.target.value)} className="regform-input" placeholder="" />
                  </label>
                  <label>DOMAIN ACCOUNT
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="regform-input" placeholder="name@shc.edu.ph" />
                  </label>
                  <label>ID NUMBER
                    <input type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="regform-input" placeholder="" />
                  </label>
                  <label>DEPARTMENT
                    <select className="form-select form-select-sm rounded-pill" value={departmentSelected} onChange={(e) => { setDepartmentSelected(e.target.value); setSubSelected(''); }}>
                      {departments.map((dept, i) => (
                        <option key={i} value={dept}>{dept ? dept : 'Select Department'}</option>
                      ))}
                    </select>
                  </label>

                  {departmentSelected === 'BED' && (
                    <div className="mb-2">
                      <label className="form-label">GRADE</label>
                      <select className="form-select form-select-sm rounded-pill" value={subSelected} onChange={e => setSubSelected(e.target.value)}>
                        <option value="">Select Grade Level</option>
                        <option>Grade 7</option>
                        <option>Grade 8</option>
                        <option>Grade 9</option>
                        <option>Grade 10</option>
                        <option>Grade 11</option>
                        <option>Grade 12</option>
                      </select>
                    </div>
                  )}

                  {departmentSelected === 'HED' && (
                    <div className="mb-2">
                      <label className="form-label">PROGRAM</label>
                      <select className="form-select form-select-sm rounded-pill" value={subSelected} onChange={e => setSubSelected(e.target.value)}>
                        <option value="">Select Course</option>
                        <option>BS Computer Science</option>
                        <option>BS Business Administration</option>
                        <option>BS Accountancy</option>
                        <option>BS Management Accounting</option>
                        <option>BS Social Work</option>
                        <option>BS Ab Communication</option>
                        <option>BS Psychology</option>
                        <option>BS Teacher Education</option>
                        <option>BS Nursing</option>
                        <option>BS Pharmacy</option>
                      </select>
                    </div>
                  )}
                  <label>PASSWORD
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="regform-input" />
                  </label>
                  <label>CONFIRM PASSWORD
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="regform-input" />
                  </label>
                  <div>
                    {error && <div style={{color: '#c53030', fontSize: '0.9rem', marginBottom: 10, padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', borderLeft: '3px solid #c53030'}}>{error}</div>}
                    {success && <div style={{color: '#276749', fontSize: '0.9rem', marginBottom: 10, padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px', borderLeft: '3px solid #276749'}}>{success}</div>}
                    <button type="submit" className="regform-btn" disabled={loading || success}>{loading ? 'Registering...' : 'Register Now'}</button>
                  </div>
                </form>
                <div className="regform-footer">
                  Already have an Account?{' '}
                  <span className="regform-login-link" onClick={() => { if (onOpenLogin) onOpenLogin(); else onClose(); }}>Login now</span>
                </div>
                <button className="regform-close" onClick={onClose}>&times;</button>
              </div>
            </div>
          );
        }

        export default RegistrationForm;
