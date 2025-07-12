
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import NotificationDropdown from './components/NotificationDropdown';
import AskQuestion from './pages/AskQuestion';
import Home from './pages/Home';
import Login from './pages/Login';
import QuestionPage from './pages/QuestionPage';
import Register from './pages/Register';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ask" element={<AskQuestion />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/question/:id" element={<QuestionPage />} />
          </Routes>
        </main>
        <NotificationDropdown />
      </div>
    </Router>
  );
}

export default App;
