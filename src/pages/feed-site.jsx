import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../authContext';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import './feed-site.css';

const fetchTutorData = async (username, setTutor) => {
  const { data, error } = await supabase
    .from('tutors')
    .select('*')
    .eq('username', username)
    .single();
  if (!error) {
    setTutor(data);
  }
};

const FeedSite = () => {
  const { username } = useAuth();
  const [tutor, setTutor] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [questions, setQuestions] = useState([]);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showWithdrawPopup, setShowWithdrawPopup] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTutorData(username, setTutor);
  }, [username]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (tutor && activeTab === 'questions') {
        const { data, error } = await supabase
          .from('questions')
          .select('id, title, subject, budget, delivery_time, is_answered')
          .eq('tutor_assigned', tutor.username);
        if (!error) {
          setQuestions(data);
        } else {
          setQuestions([]);
        }
      }
    };
    fetchQuestions();
  }, [tutor, activeTab]);

  const getRandomIcon = () => {
    const icons = ['👨‍🏫'];
    return icons[0];
  };

  const calculateAverageRating = (reviews) => {
    if (!reviews || reviews === '' || reviews === '[]') return 0;
    try {
      const parsedReviews = typeof reviews === 'string' ? JSON.parse(reviews) : reviews;
      if (!Array.isArray(parsedReviews) || parsedReviews.length === 0) return 0;
      const ratings = parsedReviews.map(r => r.rating);
      return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
    } catch (e) {
      console.error('Error parsing reviews:', e);
      return 0;
    }
  };

  const getStarRating = (rating) => {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
  };

  const calculateSuccessRate = (averageRating) => {
    if (averageRating === 0) return 100;
    return 100 - ((5 - averageRating) * 2);
  };

  if (!tutor) return <div>Loading...</div>;

  const reviews = tutor.reviews ? (typeof tutor.reviews === 'string' ? tutor.reviews : JSON.stringify(tutor.reviews)) : '[]';
  const averageRating = calculateAverageRating(reviews);
  const successRate = calculateSuccessRate(parseFloat(averageRating));
  let parsedReviews;
  try {
    parsedReviews = JSON.parse(reviews);
  } catch (e) {
    parsedReviews = [];
  }

  const handleWithdraw = () => {
    const balance = tutor.balance || 0;
    if (balance === 0) {
      alert('You cannot withdraw a $0 balance.');
      return;
    }
    setShowWithdrawConfirm(true);
  };

  const handleConfirmWithdraw = (confirm) => {
    setShowWithdrawConfirm(false);
    if (confirm) {
      setShowWithdrawPopup(true);
    }
  };

  const handleWithdrawSubmit = async () => {
    const balance = tutor.balance || 0;
    const convertedAmount = (balance * 125.90).toFixed(2);
    const { error: updateError } = await supabase
      .from('tutors')
      .update({ balance: 0 })
      .eq('username', username);
    if (!updateError) {
      const { error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          tutor_username: username,
          amount: convertedAmount,
          phone_number: phoneNumber,
          timestamp: new Date().toISOString()
        });
      if (!insertError) {
        alert('Withdrawal is successful. Payments can take a minimum of 24 hrs or a maximum of up to 72 hrs in case of any errors.');
      } else {
        console.error('Failed to log withdrawal request:', insertError);
      }
    } else {
      console.error('Error updating balance:', updateError);
    }
    setShowWithdrawPopup(false);
    setPhoneNumber('');
    fetchTutorData(username, setTutor);
  };

  return (
    <div className="feed-container">
      <nav className="nav-bar">
        <div style={{ fontWeight: 'bold', fontSize: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          MindFlex Tutor
          <span role="img" aria-label="graduation cap" style={{ fontSize: '18px' }}>🎓</span>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button style={navButtonStyle}>Home</button>
          <button style={navButtonStyle}>Profile</button>
          <button style={navButtonStyle} onClick={() => navigate('/')}>Logout</button>
        </div>
      </nav>

      <div className="profile-header">
        <div className="profile-icon">{getRandomIcon()}</div>
        <div className="profile-info">
          <div className="username">{tutor.username}</div>
          <div className="joined-date">Joined Mindflex on: {new Date(tutor.created_at).toLocaleDateString()}</div>
          <div className="tutor-id">Tutor ID: {tutor.id}</div>
        </div>
      </div>

      <div className="stats-section">
        <h2 className="section-title">Stats</h2>
        <p>✅ Success Rate: {successRate}%</p>
        <p>💬 Replies: 97%</p>
        <p>⏳ Status Updates: 98%</p>
        <p>⚠️ Warnings: 0</p>
        <p>🚫 Suspensions: 0</p>
        <p>📅 Overdue: 0</p>
        <p>🏆 Activity: Lv. 2 (183 answers in last 180 days)</p>
      </div>

      <div className="nav-links">
        <button className="nav-link-btn" onClick={() => setActiveTab('home')}>Home</button>
        <button className="nav-link-btn" onClick={() => setActiveTab('questions')}>Questions List</button>
        <button className="nav-link-btn" onClick={() => setActiveTab('calendar')}>Calendar</button>
        <button className="nav-link-btn" onClick={() => { setActiveTab('balance'); fetchTutorData(username, setTutor); }}>Balance</button>
        <button className="nav-link-btn" onClick={() => { setActiveTab('reviews'); fetchTutorData(username, setTutor); }}>Reviews</button>
      </div>

      {activeTab === 'home' && (
        <div className="home-tabs">
          <div className="tab-card" style={{ background: 'linear-gradient(135deg, #3498db, #2ecc71)' }}>
            <div className="tab-icon">👽🎓</div>
            <h3>BROWSE QUESTIONS</h3>
            <p>Answer questions by students and get paid</p>
            <button className="select-btn" onClick={() => navigate('/tutor-home')}>SELECT</button>
          </div>
          <div className="tab-card" style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)' }}>
            <div className="tab-icon">👽🌐</div>
            <h3>Check Your Stats</h3>
            <p>Check your Performance Statistics</p>
            <button className="select-btn" onClick={() => setActiveTab('stats')}>SELECT</button>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="stats-section active">
          <h2 className="section-title">Stats</h2>
          <p>✅ Success Rate: {successRate}%</p>
          <p>💬 Replies: 97%</p>
          <p>⏳ Status Updates: 98%</p>
          <p>⚠️ Warnings: 0</p>
          <p>🚫 Suspensions: 0</p>
          <p>📅 Overdue: 0</p>
          <p>🏆 Activity: Lv. 2 (183 answers in last 180 days)</p>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="calendar-section active">
          <h2 className="section-title">Calendar</h2>
          <Calendar className="calendar" />
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="questions-section active">
          <h2 className="section-title">
            Questions List <span>({questions.filter(q => !q.is_answered).length} In Progress)</span>
          </h2>
          <ul className="questions-list">
            {questions.map((question, index) => (
              <li
                key={index}
                className="question-item"
                onClick={() => window.open(`/question/${question.id}`, '_blank')}
                style={{ cursor: 'pointer', padding: '10px', borderBottom: '1px solid #ddd' }}
              >
                <div><strong>Title:</strong> {question.title}</div>
                <div><strong>Subject:</strong> {question.subject}</div>
                <div><strong>Budget:</strong> ${question.budget}</div>
                <div><strong>Delivery Time:</strong> {question.delivery_time}</div>
                <div><strong>Status:</strong> {question.is_answered ? '✅ Answered' : 'Not answered'}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'balance' && (
        <div className="balance-section active">
          <h2 className="section-title">Balance</h2>
          <p>Your current balance: ${tutor.balance || 0.00}</p>
          <p style={{ color: 'blue' }}><strong>Local conversion rates apply. USD to Kshs as per the latest conversion rate of 125.90 per $.</strong></p>
          <button
            onClick={handleWithdraw}
            style={{ padding: '10px 20px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}
          >
            Withdraw
          </button>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="reviews-section active">
          <h2 className="section-title">Reviews</h2>
          <p>Average Rating: {getStarRating(averageRating)} / 5</p>
          {parsedReviews.length > 0 ? (
            <ul>
              {parsedReviews.map((review, index) => (
                <li key={index} style={{ marginBottom: '10px' }}>
                  Rating: {getStarRating(review.rating)} - {new Date(review.timestamp).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No reviews yet.</p>
          )}
        </div>
      )}

      {showWithdrawConfirm && (
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
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <h3 style={{ color: '#2c3e50', textAlign: 'center' }}>Are you sure you want to make a withdrawal?</h3>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => handleConfirmWithdraw(true)} style={{ padding: '10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Yes</button>
            <button onClick={() => handleConfirmWithdraw(false)} style={{ padding: '10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>No</button>
          </div>
        </div>
      )}

      {showWithdrawPopup && (
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
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <h3 style={{ color: '#2c3e50', textAlign: 'center' }}>Withdrawal Details</h3>
          <input
            type='tel'
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder='Enter Mpesa Number here.......'
            style={{ padding: '10px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ccc', outlineColor: '#3498db' }}
            required
          />
          <div>
            <p>Current Balance: ${tutor.balance || 0.00}</p>
            <p>Converted Amount: {(tutor.balance * 125.90).toFixed(2)} Kshs</p>
            <p>You will receive {(tutor.balance * 125.90).toFixed(2)} Kshs in your Mpesa account</p>
          </div>
          <button
            onClick={handleWithdrawSubmit}
            style={{ padding: '10px 20px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

const navButtonStyle = {
  background: 'transparent',
  color: '#fff',
  border: '2px solid #fff',
  padding: '8px 18px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: '500',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
};

export default FeedSite;