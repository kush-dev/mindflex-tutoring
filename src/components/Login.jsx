// src/components/Login.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('tutor');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      let email;
      if (role === 'admin') {
        email = 'admin@mindflex.com';
      } else {
        const { data, error: queryError } = await supabase
          .rpc('get_tutor_email', { p_username: username.toLowerCase() });
        if (queryError) throw queryError;
        if (!data || data.length === 0) throw new Error('Tutor not found');
        email = data[0].tutor_email; // Updated to use tutor_email
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (authError) throw authError;

      // Update user metadata with username after successful login
      const { error: updateError } = await supabase.auth.updateUser({
        data: { username: username.toLowerCase() } // Store username in metadata
      });
      if (updateError) throw updateError;

      navigate(role === 'admin' ? '/admin-home' : '/tutor-home');
    } catch (err) {
      setError(err.message);
    }
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
          Login
        </h2>
        <form onSubmit={handleLogin}>
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
            <label style={{ display: 'block', color: '#2c3e50', marginBottom: '5px', fontWeight: '500' }}>Password</label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '16px' }}
              required
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#2c3e50', marginBottom: '5px', fontWeight: '500' }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '16px' }}
            >
              <option value='tutor'>Tutor</option>
              <option value='admin'>Admin</option>
            </select>
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
            Login
          </button>
        </form>
        <p style={{ marginTop: '15px', textAlign: 'center', color: '#2c3e50' }}>
          Don't have an account? <a href='/register' style={{ color: '#3498db', textDecoration: 'none' }}>Register</a>
        </p>
      </div>
    </div>
  );
}