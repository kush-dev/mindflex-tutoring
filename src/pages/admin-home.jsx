import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminHome() {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [budget, setBudget] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [questions, setQuestions] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [activeSection, setActiveSection] = useState('post');
  const [showBalancePopup, setShowBalancePopup] = useState(false);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [rating, setRating] = useState(3); // Default to 3 stars
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
    fetchTutors();
    fetchWithdrawalRequests();
  }, []);

  const fetchQuestions = async () => {
    const { data, error } = await supabase.from('questions').select('*');
    if (!error) {
      setQuestions(data);
    }
  };

  const fetchTutors = async () => {
    const { data, error } = await supabase.from('tutors').select('username, balance');
    if (!error) {
      setTutors(data);
    }
  };

  const fetchWithdrawalRequests = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('timestamp', { ascending: false });
    if (!error) {
      setWithdrawalRequests(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).slice(0, 7);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles].slice(0, 7));
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title || !subject || !budget || !dueTime || !description) {
      setError('Please fill in all required fields.');
      return;
    }

    if (title.trim().split(/\s+/).length > 15) {
      setError('Title must be 15 words or less.');
      return;
    }

    let fileUrls = [];

    if (files.length > 0) {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase
          .storage
          .from('question-files')
          .upload(fileName, file);

        if (uploadError) {
          setError('File upload failed: ' + uploadError.message);
          return;
        }

        const { data: publicUrlData } = supabase
          .storage
          .from('question-files')
          .getPublicUrl(fileName);

        fileUrls.push(publicUrlData.publicUrl);
      }
    }

    const baseInsertData = {
      title,
      subject,
      budget: parseFloat(budget),
      delivery_time: dueTime,
      description,
      file_urls: fileUrls.length > 0 ? fileUrls : null,
      answer_file_urls: null
    };

    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'questions')
      .eq('column_name', 'is_answered');
    const insertData = columns && columns.length > 0
      ? { ...baseInsertData, is_answered: false }
      : baseInsertData;

    const { error: insertError } = await supabase
      .from('questions')
      .insert([insertData]);

    if (insertError) {
      setError('Failed to post question: ' + insertError.message);
    } else {
      setSuccess('Question posted successfully.');
      setTitle('');
      setSubject('');
      setBudget('');
      setDueTime('');
      setDescription('');
      setFiles([]);
      fetchQuestions();
    }
  };

  const getRemainingTime = (questionId, deliveryTime) => {
    const countdownKey = `countdown_${questionId}`;
    const storedTime = localStorage.getItem(countdownKey);
    if (storedTime) {
      return storedTime;
    }
    return deliveryTime;
  };

  const handleAddBalance = (tutorUsername) => {
    if (!tutorUsername) {
      setError('No tutor assigned to this question.');
      return;
    }
    setSelectedTutor(tutorUsername);
    setShowBalancePopup(true);
  };

  const handleAddReview = (tutorUsername, questionId) => {
    if (!tutorUsername) {
      setError('No tutor assigned to this question.');
      return;
    }
    setSelectedTutor(tutorUsername);
    setSelectedQuestionId(questionId);
    setShowReviewPopup(true);
  };

  const handleBalanceSubmit = async () => {
    if (!balanceAmount || isNaN(parseFloat(balanceAmount)) || parseFloat(balanceAmount) <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    const { data: tutor, error: fetchError } = await supabase
      .from('tutors')
      .select('balance')
      .eq('username', selectedTutor)
      .single();

    if (fetchError || !tutor) {
      setError('Tutor not found or error fetching data: ' + fetchError?.message);
      return;
    }

    const newBalance = (tutor.balance || 0) + parseFloat(balanceAmount);
    const { error: updateError } = await supabase
      .from('tutors')
      .update({ balance: newBalance })
      .eq('username', selectedTutor);

    if (updateError) {
      setError('Failed to update balance: ' + updateError.message);
    } else {
      setSuccess(`Balance updated successfully for ${selectedTutor}. New balance: $${newBalance.toFixed(2)}`);
      setShowBalancePopup(false);
      setBalanceAmount('');
      fetchQuestions();
      fetchTutors();
    }
  };

  const handleReviewSubmit = async () => {
    const { data: tutor, error: fetchError } = await supabase
      .from('tutors')
      .select('reviews')
      .eq('username', selectedTutor)
      .single();

    if (fetchError || !tutor) {
      setError('Tutor not found or error fetching data: ' + fetchError?.message);
      return;
    }

    const currentReviews = tutor.reviews || '[]';
    let reviewsArray = [];
    try {
      reviewsArray = JSON.parse(currentReviews);
      if (!Array.isArray(reviewsArray)) {
        reviewsArray = [];
      }
    } catch (e) {
      reviewsArray = [];
    }

    const newReview = {
      rating: rating,
      timestamp: new Date().toISOString()
    };
    reviewsArray.push(newReview);

    const { error: updateError } = await supabase
      .from('tutors')
      .update({ reviews: JSON.stringify(reviewsArray) })
      .eq('username', selectedTutor);

    if (updateError) {
      setError('Failed to update review: ' + updateError.message);
    } else {
      if (selectedQuestionId) {
        const { error: deleteError } = await supabase
          .from('questions')
          .delete()
          .eq('id', selectedQuestionId);
        if (deleteError) {
          setError('Failed to delete question: ' + deleteError.message);
        }
      }
      setSuccess(`Review added successfully for ${selectedTutor}. Rating: ${rating} stars`);
      setShowReviewPopup(false);
      setRating(3);
      setSelectedQuestionId(null);
      fetchQuestions();
    }
  };

  const handlePopupClose = () => {
    setShowBalancePopup(false);
    setShowReviewPopup(false);
    setBalanceAmount('');
    setRating(3);
    setSelectedQuestionId(null);
    setError('');
    setSuccess('');
  };

  const handleClearRequest = async (requestId) => {
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'cleared' })
      .eq('id', requestId);
    if (!error) {
      fetchWithdrawalRequests();
      setSuccess('Request cleared successfully.');
    } else {
      setError('Failed to clear request: ' + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Admin Dashboard</h2>
        <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
      </div>

      <div style={styles.slider}>
        <button
          onClick={() => setActiveSection('post')}
          style={activeSection === 'post' ? styles.activeTab : styles.tab}
        >
          Post a Question
        </button>
        <button
          onClick={() => setActiveSection('active')}
          style={activeSection === 'active' ? styles.activeTab : styles.tab}
        >
          Active Questions
        </button>
        <button
          onClick={() => setActiveSection('tutorBalances')}
          style={activeSection === 'tutorBalances' ? styles.activeTab : styles.tab}
        >
          Tutor Balances
        </button>
        <button
          onClick={() => setActiveSection('withdrawalRequests')}
          style={activeSection === 'withdrawalRequests' ? styles.activeTab : styles.tab}
        >
          Withdrawal Requests
        </button>
      </div>

      <div style={styles.content}>
        {activeSection === 'post' && (
          <form onSubmit={handlePost} style={styles.form}>
            <input
              type='text'
              placeholder='Question Title (max 15 words)'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type='text'
              placeholder='Subject'
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type='number'
              placeholder='Budget'
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type='text'
              placeholder='Delivery Time (e.g., 3 hours or 2 days)'
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              style={styles.input}
              required
            />
            <textarea
              placeholder='Description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
              rows={5}
              required
            />
            <input
              type='file'
              accept='.pdf,.doc,.docx,.png,.jpg'
              onChange={handleFileChange}
              multiple
              style={styles.input}
            />
            {files.length > 0 && (
              <div style={styles.filePreview}>
                {files.map((file, index) => (
                  <span key={index} style={styles.fileItem}>{file.name} <button type="button" onClick={() => setFiles(files.filter((_, i) => i !== index))} style={styles.removeFile}>✕</button></span>
                ))}
              </div>
            )}
            {error && <p style={styles.error}>{error}</p>}
            {success && <p style={styles.success}>{success}</p>}
            <button type='submit' style={styles.button}>
              Post Question
            </button>
          </form>
        )}
        {activeSection === 'active' && (
          <div style={styles.tableContainer}>
            <h3 style={styles.subHeading}>Active Questions</h3>
            {questions.length > 0 ? (
              <table style={{ ...styles.table, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={tableStyles.header}>Title</th>
                    <th style={tableStyles.header}>Subject</th>
                    <th style={tableStyles.header}>Tutor</th>
                    <th style={tableStyles.header}>Budget</th>
                    <th style={tableStyles.header}>Time Remaining</th>
                    <th style={tableStyles.header}>Answers</th>
                    <th style={tableStyles.header}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} style={{ ...styles.tableRow, display: 'table-row' }}>
                      <td style={tableStyles.cell}>{q.title}</td>
                      <td style={tableStyles.cell}>{q.subject}</td>
                      <td style={tableStyles.cell}>{q.tutor_assigned || 'Not assigned'}</td>
                      <td style={tableStyles.cell}>${q.budget}</td>
                      <td style={tableStyles.cell}>{getRemainingTime(q.id, q.delivery_time)}</td>
                      <td style={tableStyles.cell}>
                        {q.is_answered && q.answer_file_urls && q.answer_file_urls.length > 0 ? (
                          q.answer_file_urls.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#3498db', textDecoration: 'none', display: 'flex', alignItems: 'center', marginBottom: '5px' }}
                            >
                              <span role="img" aria-label="download">⬇️</span> {url.split('/').pop()}
                            </a>
                          ))
                        ) : 'N/A'}
                      </td>
                      <td style={{ ...tableStyles.cell, display: 'flex', gap: '5px', padding: '5px' }}>
                        <button
                          onClick={() => handleAddBalance(q.tutor_assigned)}
                          style={{ ...styles.button, padding: '5px 10px', flex: '1', minWidth: '0' }}
                          disabled={!q.tutor_assigned}
                        >
                          Add Balance
                        </button>
                        <button
                          onClick={() => handleAddReview(q.tutor_assigned, q.id)}
                          style={{ ...styles.button, padding: '5px 10px', flex: '1', minWidth: '0' }}
                          disabled={!q.tutor_assigned}
                        >
                          Add Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No questions available.</p>
            )}
          </div>
        )}
        {activeSection === 'tutorBalances' && (
          <div style={styles.tableContainer}>
            <h3 style={styles.subHeading}>Tutor Balances</h3>
            {tutors.length > 0 ? (
              <table style={{ ...styles.table, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={tableStyles.header}>Username</th>
                    <th style={tableStyles.header}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {tutors.map((tutor) => (
                    <tr key={tutor.username} style={styles.tableRow}>
                      <td style={tableStyles.cell}>{tutor.username}</td>
                      <td style={tableStyles.cell}>${tutor.balance !== null ? tutor.balance.toFixed(2) : '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No tutors available.</p>
            )}
          </div>
        )}
        {activeSection === 'withdrawalRequests' && (
          <div style={styles.tableContainer}>
            <h3 style={styles.subHeading}>Withdrawal Requests</h3>
            {withdrawalRequests.length > 0 ? (
              <table style={{ ...styles.table, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={tableStyles.header}>Tutor Username</th>
                    <th style={tableStyles.header}>Amount (Kshs)</th>
                    <th style={tableStyles.header}>Phone Number</th>
                    <th style={tableStyles.header}>Timestamp</th>
                    <th style={tableStyles.header}>Status</th>
                    <th style={tableStyles.header}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalRequests.map((request) => (
                    <tr key={request.id} style={styles.tableRow}>
                      <td style={tableStyles.cell}>{request.tutor_username}</td>
                      <td style={tableStyles.cell}>{request.amount.toFixed(2)}</td>
                      <td style={tableStyles.cell}>{request.phone_number}</td>
                      <td style={tableStyles.cell}>{new Date(request.timestamp).toLocaleString()}</td>
                      <td style={tableStyles.cell}>{request.status}</td>
                      <td style={tableStyles.cell}>
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleClearRequest(request.id)}
                            style={{ ...styles.button, padding: '5px 10px' }}
                          >
                            Clear
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No withdrawal requests available.</p>
            )}
            {error && <p style={styles.error}>{error}</p>}
            {success && <p style={styles.success}>{success}</p>}
          </div>
        )}
      </div>

      {showBalancePopup && (
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
          <h3 style={{ color: '#2c3e50', textAlign: 'center' }}>Add Balance for {selectedTutor}</h3>
          <input
            type='number'
            value={balanceAmount}
            onChange={(e) => setBalanceAmount(e.target.value)}
            placeholder='Enter amount'
            style={{ padding: '10px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ccc', outlineColor: '#3498db' }}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={handleBalanceSubmit} style={styles.button}>Submit</button>
            <button onClick={handlePopupClose} style={{ ...styles.button, backgroundColor: '#e74c3c' }}>Cancel</button>
          </div>
        </div>
      )}

      {showReviewPopup && (
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
          <h3 style={{ color: '#2c3e50', textAlign: 'center' }}>Add Review for {selectedTutor}</h3>
          <label style={{ color: '#2c3e50', textAlign: 'center' }}>Rating: {rating} stars</label>
          <input
            type='range'
            min='1'
            max='5'
            value={rating}
            onChange={(e) => setRating(parseInt(e.target.value))}
            style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
          />
          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={handleReviewSubmit} style={styles.button}>Submit</button>
            <button onClick={handlePopupClose} style={{ ...styles.button, backgroundColor: '#e74c3c' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '40px',
    maxWidth: '800px',
    margin: '40px auto',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px'
  },
  heading: {
    margin: 0,
    color: '#2c3e50'
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  slider: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background 0.3s'
  },
  activeTab: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  content: {
    padding: '20px',
    backgroundColor: '#f5f7fa',
    borderRadius: '8px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    outlineColor: '#3498db'
  },
  textarea: {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    resize: 'vertical',
    outlineColor: '#3498db'
  },
  button: {
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  error: {
    color: 'red',
    textAlign: 'center'
  },
  success: {
    color: 'green',
    textAlign: 'center'
  },
  tableContainer: {
    padding: '20px'
  },
  subHeading: {
    color: '#2c3e50',
    marginBottom: '15px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #ddd'
  },
  tableHeader: {
    backgroundColor: '#ecf0f1'
  },
  tableRow: {
    borderBottom: '1px solid #ddd'
  },
  filePreview: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '15px'
  },
  fileItem: {
    backgroundColor: '#f0f0f0',
    padding: '5px 10px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px'
  },
  removeFile: {
    background: 'none',
    border: 'none',
    color: '#e74c3c',
    marginLeft: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

const tableStyles = {
  header: {
    padding: '12px',
    fontWeight: 'bold',
    color: '#2c3e50',
    borderBottom: '2px solid #ddd'
  },
  cell: {
    padding: '10px',
    color: '#34495e',
    textAlign: 'left'
  }
};