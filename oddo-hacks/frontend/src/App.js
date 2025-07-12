import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home';  // Make sure this uses default export
import AskPage from './pages/Ask';    // Default import
import Layout from './components/layout/Layout.jsx';

// Temporary components for demonstration
const QuestionDetailPage = () => <div>Question Detail Page</div>;
const ProfilePage = () => <div>Profile Page</div>;
const NotFoundPage = () => <div>404 - Page Not Found</div>;

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Exact root path */}
          <Route path="/" element={<HomePage />} />

          {/* Ask question page */}
          <Route path="/ask" element={<AskPage />} />

          {/* Question detail page */}
          <Route path="/questions/:id" element={<QuestionDetailPage />} />

          {/* Profile page */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Catch-all route for 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;