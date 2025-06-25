import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import { AuthProvider } from './authContext';
import AdminHome from './pages/admin-home';
import TutorHome, { QuestionDetail } from './pages/tutor-home';
import FeedSite from '../src/pages/feed-site';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path='/' element={<Login />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/admin-home' element={<AdminHome />} />
          <Route path='/tutor-home' element={<TutorHome />} />
          <Route path="/question/:id" element={<QuestionDetail />} />
          <Route path="/feed-site" element={<FeedSite />} />
          <Route path="/questions-list" element={<TutorHome />} />
          <Route path="/calendar" element={<FeedSite />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}