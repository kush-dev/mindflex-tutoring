import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, role: 'tutor' } }
      });
      
      if (error) throw error;
      
      await supabase.from('tutors').insert([{ username, email, dob, password, balance: 0.00, reviews: '[]' }]);
      setShowPopup(true); // Show popup on success
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePopupClose = () => {
    setShowPopup(false);
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e6f3fa'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        border: '2px solid #3498db'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center', color: '#2c3e50' }}>
          Register
        </h2>
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#2c3e50', marginBottom: '5px', fontWeight: '500' }}>Username</label>
            <input
              type='text'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '16px' }}
              required
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#2c3e50', marginBottom: '5px', fontWeight: '500' }}>Email</label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '16px' }}
              required
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#2c3e50', marginBottom: '5px', fontWeight: '500' }}>Date of Birth</label>
            <input
              type='date'
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '16px' }}
              required
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#2c3e50', marginBottom: '5px', fontWeight: '500' }}>Password</label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '16px' }}
              required
            />
          </div>
          {error && <p style={{ color: '#e74c3c', marginBottom: '15px', textAlign: 'center' }}>{error}</p>}
          <button
            type='submit'
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#3498db',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
          >
            Register
          </button>
        </form>
        <p style={{ marginTop: '15px', textAlign: 'center', color: '#2c3e50' }}>
          Already have an account? <a href='/login' style={{ color: '#3498db', textDecoration: 'none' }}>Login</a>
        </p>
      </div>

      {showPopup && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '2px solid #3498db',
          zIndex: 1000
        }}>
          <p style={{ color: '#2c3e50', textAlign: 'center', marginBottom: '15px' }}>
            Registration successful! Please check your email inbox to confirm your account before logging in.
          </p>
          <button
            onClick={handlePopupClose}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#3498db',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}