import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../authContext';
import { startCountdown } from '../components/time';

const fetchQuestions = async (selectedSubjects, setQuestions) => {
  let query = supabase.from('questions').select('*').order('created_at', { ascending: false });
  if (selectedSubjects.length > 0) {
    query = query.in('subject', selectedSubjects);
  }
  query = query.eq('is_assigned', false);
  const { data, error } = await query;
  if (!error) setQuestions(data);
};

export const QuestionDetail = () => {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerFiles, setAnswerFiles] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const navigate = useNavigate();
  const { username } = useAuth();

  const fetchQuestion = useCallback(async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('id, title, subject, budget, delivery_time, is_assigned, tutor_assigned, description, file_urls, is_answered, answer_file_urls')
      .eq('id', id)
      .single();
    if (!error) {
      setQuestion(data);
      if (data.is_assigned) {
        startCountdown(data.delivery_time, setTimeRemaining, id);
      }
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => fetchQuestion(), 1000);
    return () => clearTimeout(timer);
  }, [fetchQuestion]);

  const handleTake = async () => {
    if (question && !question.is_assigned) {
      setShowConfirm(true);
    } else if (question && question.is_assigned) {
      alert('This question is already assigned to ' + (question.tutor_assigned || 'someone'));
    }
  };

  const handleConfirm = async (confirmed) => {
    setShowConfirm(false);
    if (confirmed) {
      const { error } = await supabase
        .from('questions')
        .update({ is_assigned: true, is_accepted: true, tutor_assigned: username })
        .eq('id', id);
      if (!error) {
        window.location.reload();
      }
    }
  };

  const handleBack = () => {
    window.close();
    navigate('/tutor-home');
  };

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files).slice(0, 7);
    setAnswerFiles((prevFiles) => [...prevFiles, ...selectedFiles].slice(0, 7));
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() && answerFiles.length === 0) {
      setError('Please enter text or attach at least one file before submitting.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    let answerFileUrls = [];

    if (answerFiles.length > 0) {
      for (const file of answerFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${username}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('answer-files')
          .upload(fileName, file);
        if (uploadError) {
          setError('File upload failed: ' + uploadError.message);
          setIsSubmitting(false);
          return;
        }
        const { data: publicUrlData } = supabase.storage
          .from('answer-files')
          .getPublicUrl(fileName);
        answerFileUrls.push(publicUrlData.publicUrl);
      }
    }

    const { error: updateError } = await supabase
      .from('questions')
      .update({
        answer_text: answer,
        answer_file_urls: answerFileUrls.length > 0 ? answerFileUrls : null,
        is_answered: true
      })
      .eq('id', id);

    setIsSubmitting(false);
    if (updateError) {
      setError('Failed to submit answer: ' + updateError.message);
    } else {
      setSubmitSuccess(true);
      setAnswer('');
      setAnswerFiles([]);
      fetchQuestion();
    }
  };

  const handleLogout = async () => {
    setIsSubmitting(true);
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!question) return <div>Loading...</div>;

  const getFileIcon = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    return '📎';
  };

  const isAssigned = question && question.is_assigned;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px', maxWidth: '900px', margin: '0 auto', background: 'linear-gradient(135deg, #f0f4f8, #e8f5e9)', minHeight: '100vh' }}>
      {/* Dashboard Top Bar */}
      <nav style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        height: '60px',
        background: 'linear-gradient(90deg, #2c3e50, #34495e)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 30px',
        zIndex: '1000',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          MindFlex Tutor
          <span role="img" aria-label="graduation cap" style={{ fontSize: '18px' }}>🎓</span>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => navigate('/tutor-home')} style={navButtonStyle}>Home</button>
          <button onClick={() => window.open(window.location.origin + '/feed-site', '_blank')} style={navButtonStyle}>Profile</button>
          <button onClick={handleLogout} style={navButtonStyle}>Logout</button>
        </div>
      </nav>

      <h1 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '24px', textAlign: 'center', fontWeight: 600, marginTop: '70px' }}>{question.title}</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #ffffff, #f5f7fa)', padding: '15px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          <span style={{ color: '#27ae60', fontWeight: 'bold' }}>{question.subject}</span>
          <span style={{ color: isAssigned ? '#27ae60' : '#7f8c8d' }}>{isAssigned ? 'Assigned' : 'Unassigned'}</span>
          <span style={{ display: 'flex', alignItems: 'center', color: '#34495e' }}><span role="img" aria-label="clock">⏰</span> {isAssigned ? timeRemaining : question.delivery_time}</span>
          <span style={{ display: 'flex', alignItems: 'center', color: '#34495e' }}><span role="img" aria-label="wallet">💰</span> ${question.budget}</span>
          <span style={{ color: 'red', fontWeight: 'bold' }}>Tutor: {question.tutor_assigned || 'Not assigned'}</span>
        </div>
        <div>
          {question.is_answered ? (
            <span style={{ background: '#2ecc71', color: 'white', padding: '8px 15px', borderRadius: '6px', fontSize: '14px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(46, 204, 113, 0.3)' }}>
              Question Answered ✅
            </span>
          ) : (
            <button style={{ marginRight: '10px', background: '#ddd', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '14px' }}>Edit</button>
          )}
          <button style={{ background: '#9b59b6', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', fontSize: '14px' }}>Share Access</button>
        </div>
      </div>
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(45deg, #3498db, #2980b9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginRight: '10px' }}>👩‍🎓</div>
          <span style={{ color: '#2c3e50', fontSize: '16px' }}>Student</span>
        </div>
        <p style={{ color: '#34495e', lineHeight: '1.6', margin: '0', background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>{question.description}</p>
      </div>
      {question.file_urls && question.file_urls.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <span style={{ color: '#3498db', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>ATTACHMENTS</span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {question.file_urls.map((url, index) => (
              <a key={index} href={url} target="_blank" rel="noopener noreferrer" style={{ background: '#ecf0f1', padding: '10px 15px', borderRadius: '8px', textDecoration: 'none', color: '#2c3e50', display: 'flex', alignItems: 'center', boxShadow: '0 3px 8px rgba(0,0,0,0.1)' }}>
                {getFileIcon(url)} {url.split('/').pop()} <span role="img" aria-label="download">⬇️</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {question.answer_file_urls && question.answer_file_urls.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <span style={{ color: '#9b59b6', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>TUTOR ANSWERS</span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {question.answer_file_urls.map((url, index) => (
              <a key={index} href={url} target="_blank" rel="noopener noreferrer" style={{ background: '#ecf0f1', padding: '10px 15px', borderRadius: '8px', textDecoration: 'none', color: '#2c3e50', display: 'flex', alignItems: 'center', boxShadow: '0 3px 8px rgba(0,0,0,0.1)' }}>
                {getFileIcon(url)} {url.split('/').pop()} <span role="img" aria-label="download">⬇️</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
        <button onClick={handleTake} disabled={isAssigned} style={{ background: 'linear-gradient(45deg, #2ecc71, #27ae60)', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontSize: '16px', boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)', opacity: isAssigned ? 0.6 : 1, cursor: isAssigned ? 'not-allowed' : 'pointer' }}>Take</button>
        <button onClick={handleBack} style={{ background: 'linear-gradient(45deg, #e74c3c, #c0392b)', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontSize: '16px', boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)' }}>Back</button>
      </div>
      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff, #f9fbfc)', boxShadow: '0 6px 15px rgba(0,0,0,0.1)', opacity: isAssigned ? 1 : 0.6, pointerEvents: isAssigned ? 'auto' : 'none' }}>
        <div style={{ marginBottom: '10px', background: '#f5f7fa', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ marginRight: '20px', color: '#34495e' }}>📏 Check Formatting</span>
          <span style={{ marginRight: '20px', color: '#34495e' }}>🔍 Check Plagiarism</span>
          <span style={{ color: '#34495e' }}>✍️ Spellchecker</span>
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter your answer here..."
          style={{ width: '100%', height: '120px', marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)', background: '#fff' }}
          disabled={!isAssigned}
        />
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <input type="file" onChange={handleFileUpload} multiple style={{ display: 'none' }} id="fileInput" disabled={!isAssigned} />
          <label htmlFor="fileInput" style={{ background: 'linear-gradient(45deg, #3498db, #2980b9)', color: 'white', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px', boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)' }}>
            📎 Upload File(s)
          </label>
          {answerFiles.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {answerFiles.map((file, index) => (
                <span key={index} style={{ color: '#34495e', alignSelf: 'center', fontSize: '14px', background: '#f0f0f0', padding: '5px 10px', borderRadius: '4px' }}>
                  {getFileIcon(URL.createObjectURL(file))} {file.name} <button type="button" onClick={() => setAnswerFiles(answerFiles.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: '#e74c3c', marginLeft: '5px', cursor: 'pointer' }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
        {error && <p style={{ color: '#e74c3c', marginBottom: '15px', fontSize: '14px', background: '#ffebee', padding: '10px', borderRadius: '6px' }}>{error}</p>}
        <button onClick={handleSubmitAnswer} style={{ background: 'linear-gradient(45deg, #b826a0, #9b59b6)', color: 'white', padding: '15px', border: 'none', borderRadius: '8px', width: '100%', fontSize: '16px', boxShadow: '0 6px 15px rgba(184, 38, 160, 0.3)', transition: 'transform 0.2s' }} disabled={!isAssigned}>
          Submit Answer
        </button>
      </div>
      {isSubmitting && (
        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
            <p>Submitting answer...</p>
            <div style={{ border: '5px solid #f3f3f3', borderTop: '5px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '15px auto' }} />
          </div>
        </div>
      )}
      {submitSuccess && (
        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
            <p>Answer submitted successfully!</p>
            <button onClick={() => setSubmitSuccess(false)} style={{ background: 'linear-gradient(45deg, #2ecc71, #27ae60)', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontSize: '14px', boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)' }}>OK</button>
          </div>
        </div>
      )}
      {showConfirm && (
        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
            <p>You have been assigned the question!</p>
            <button onClick={() => handleConfirm(true)} style={{ marginRight: '15px', background: 'linear-gradient(45deg, #2ecc71, #27ae60)', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontSize: '14px', boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)' }}>OK</button>
            <button onClick={() => handleConfirm(false)} style={{ background: 'linear-gradient(45deg, #e74c3c, #c0392b)', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontSize: '14px', boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TutorHome() {
  const [questions, setQuestions] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [alertsOn, setAlertsOn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions(selectedSubjects, setQuestions);
    const interval = setInterval(() => fetchQuestions(selectedSubjects, setQuestions), 5000);
    return () => clearInterval(interval);
  }, [selectedSubjects]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleFilterClick = (subject) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev : [...prev, subject]
    );
  };

  const removeFilter = (subject) => {
    setSelectedSubjects((prev) => prev.filter((s) => s !== subject));
  };

  const saveFilters = () => {
    fetchQuestions(selectedSubjects, setQuestions);
  };

  const clearFilters = () => {
    setSelectedSubjects([]);
    fetchQuestions([], setQuestions);
  };

  const subjects = [
    'Mathematics', 'Programming', 'Science', 'Writing', 'Business',
    'Computer Science', 'Economics', 'Engineering', 'Foreign Languages',
    'Health and Medical', 'Humanities', 'Law', 'Rising Star'
  ];

  const sampleFriends = [
    { id: 1, icon: '👩‍💼' },
    { id: 2, icon: '👨‍🏫' },
    { id: 3, icon: '👩‍🔬' },
    { id: 4, icon: '👨‍🎨' },
    { id: 5, icon: '👩‍💻' }
  ];

  const handleBookmark = () => {
    alert('Press CTRL + D to bookmark this page.');
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px', maxWidth: '900px', margin: '0 auto', background: 'linear-gradient(135deg, #f0f4f8, #e8f5e9)', minHeight: '100vh' }}>
      {/* Dashboard Top Bar */}
      <nav style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        height: '60px',
        background: 'linear-gradient(90deg, #2c3e50, #34495e)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 30px',
        zIndex: '1000',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          MindFlex Tutor
          <span role="img" aria-label="graduation cap" style={{ fontSize: '18px' }}>🎓</span>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => navigate('/tutor-home')} style={navButtonStyle}>Home</button>
          <button onClick={() => window.open(window.location.origin + '/feed-site', '_blank')} style={navButtonStyle}>Profile</button>
          <button onClick={handleLogout} style={navButtonStyle}>Logout</button>
        </div>
      </nav>

      {/* Custom Div with Filters and Friends */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff, #f5f7fa)',
        padding: '25px',
        borderBottom: '2px solid #ddd',
        marginTop: '60px',
        maxWidth: '900px',
        marginLeft: 'auto',
        marginRight: 'auto',
        boxShadow: '0 6px 15px rgba(0,0,0,0.1)',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '18px' }}>ALERTS</span>
            <label style={{ marginLeft: '15px', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '60px',
                  height: '30px',
                  backgroundColor: alertsOn ? '#2ecc71' : '#bdc3c7',
                  borderRadius: '15px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onClick={() => setAlertsOn(!alertsOn)}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: alertsOn ? '32px' : '2px',
                    transition: 'left 0.3s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}
                />
              </div>
              <span style={{ color: '#555', marginLeft: '10px', fontSize: '16px' }}>{alertsOn ? 'ON' : 'OFF'}</span>
            </label>
          </div>
          <button onClick={handleBookmark} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: '16px', fontWeight: '500', textDecoration: 'underline' }}>BOOKMARK PAGE</button>
        </div>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => handleFilterClick(subject)}
              style={{
                background: selectedSubjects.includes(subject) ? 'linear-gradient(45deg, #3498db, #2980b9)' : '#fff',
                color: selectedSubjects.includes(subject) ? '#fff' : '#2c3e50',
                border: '1px solid #ddd',
                padding: '10px 15px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 6px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease'
              }}
            >
              {subject === 'Rising Star' && <span style={{ color: '#e67e22' }}>⭐</span>}
              {subject === 'Business' && <span style={{ color: '#27ae60' }}>💼</span>}
              {subject === 'Computer Science' && <span style={{ color: '#2980b9' }}>💻</span>}
              {subject === 'Economics' && <span style={{ color: '#8e44ad' }}>📈</span>}
              {subject === 'Engineering' && <span style={{ color: '#e74c3c' }}>⚙️</span>}
              {subject === 'Foreign Languages' && <span style={{ color: '#e74c3c' }}>🌐</span>}
              {subject === 'Health and Medical' && <span style={{ color: '#e74c3c' }}>🏥</span>}
              {subject === 'Humanities' && <span style={{ color: '#8e44ad' }}>📚</span>}
              {subject === 'Law' && <span style={{ color: '#e67e22' }}>⚖️</span>}
              {subject === 'Mathematics' && <span style={{ color: '#2980b9' }}>📐</span>}
              {subject === 'Programming' && <span style={{ color: '#27ae60' }}>💾</span>}
              {subject === 'Science' && <span style={{ color: '#f1c40f' }}>🔬</span>}
              {subject === 'Writing' && <span style={{ color: '#e74c3c' }}>✍️</span>}
              {subject}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#555', maxWidth: '600px', fontSize: '15px', background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            Student friends will invite you to their questions and give you a large stream of constant work.
            We prioritize matching students and tutors that are friends. Working with NEW STUDENTS is the best
            way to build up a valuable student network.
          </p>
          <div>
            <span style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '18px' }}>Friends:</span>
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              {sampleFriends.slice(0, 5).map((friend) => (
                <div key={friend.id} style={{ width: '50px', height: '50px', background: 'linear-gradient(45deg, #3498db, #2980b9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                  {friend.icon}
                </div>
              ))}
              <span style={{ color: '#3498db', fontSize: '15px', fontWeight: '500' }}>+ 12</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          {selectedSubjects.map((subject) => (
            <span
              key={subject}
              style={{ background: 'linear-gradient(45deg, #3498db, #2980b9)', color: '#fff', padding: '8px 12px', borderRadius: '8px', marginRight: '10px', display: 'inline-flex', alignItems: 'center', fontSize: '15px', boxShadow: '0 3px 6px rgba(0,0,0,0.1)' }}
            >
              {subject}
              <span
                onClick={() => removeFilter(subject)}
                style={{ marginLeft: '8px', cursor: 'pointer', color: '#fff', fontWeight: 'bold' }}
              >
                ✕
              </span>
            </span>
          ))}
          <button onClick={saveFilters} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: '15px', fontWeight: '500', textDecoration: 'underline' }}>Save filters</button>
          <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', marginLeft: '15px', fontSize: '15px', fontWeight: '500', textDecoration: 'underline' }}>Clear all filters</button>
        </div>
      </div>

      {/* Questions Table */}
      <div style={{ maxWidth: '900px', margin: '40px auto', background: 'linear-gradient(135deg, #ffffff, #f9fbfc)', padding: '25px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#2c3e50', fontWeight: '600', fontSize: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>Available Questions</h2>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'linear-gradient(90deg, #ecf0f1, #dfe6e9)', borderRadius: '10px' }}>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Budget</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Subject</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr
                key={q.id}
                onClick={() => window.open(`/question/${q.id}`, '_blank')}
                style={{ cursor: 'pointer', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease' }}
              >
                <td style={{ ...tdStyle, whiteSpace: 'normal', wordWrap: 'break-word', padding: '15px' }}>{q.title}</td>
                <td style={tdStyle}>${q.budget}</td>
                <td style={tdStyle}>{q.delivery_time}</td>
                <td style={tdStyle}>{q.subject}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isLoggingOut && (
        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
            <p>Logging off...</p>
            <div style={{ border: '5px solid #f3f3f3', borderTop: '5px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '15px auto' }} />
          </div>
        </div>
      )}
    </div>
  );
}

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
  ':hover': {
    background: '#fff',
    color: '#2c3e50',
    transform: 'translateY(-2px)'
  }
};

const thStyle = {
  padding: '15px',
  fontWeight: 'bold',
  color: '#2c3e50',
  borderBottom: '3px solid #ddd',
  background: 'transparent'
};

const tdStyle = {
  padding: '15px',
  verticalAlign: 'top',
  color: '#34495e',
  transition: 'background 0.3s ease'
};