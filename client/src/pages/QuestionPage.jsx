import { ArrowDown, ArrowUp, Bookmark, Calendar, Share2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const QuestionPage = () => {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [newAnswer, setNewAnswer] = useState('');
  const [loading, setLoading] = useState(true);

  // Demo data for now - we'll replace with API calls later
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setQuestion({
        id: id,
        title: "How to implement user authentication in React?",
        content: "I'm building a React application and need to implement user authentication. What's the best approach for handling login, logout, and protecting routes? Should I use localStorage, sessionStorage, or some other method to store the authentication token?",
        author: "john_doe",
        createdAt: "2024-01-15T10:30:00Z",
        votes: 15,
        tags: ["react", "authentication", "javascript", "security"],
        views: 234
      });
      
      setAnswers([
        {
          id: 1,
          content: "For React authentication, I recommend using a combination of JWT tokens and React Context. Here's a basic approach:\n\n1. Store JWT token in localStorage\n2. Create an AuthContext to manage authentication state\n3. Use protected routes\n4. Implement automatic token refresh\n\nThis provides a good balance of security and user experience.",
          author: "react_expert",
          createdAt: "2024-01-15T11:00:00Z",
          votes: 8,
          isAccepted: true
        },
        {
          id: 2,
          content: "Another approach is to use libraries like Auth0 or Firebase Authentication. These provide:\n\n- Built-in security best practices\n- Social login options\n- Token management\n- Password reset functionality\n\nFor production apps, I'd recommend this approach over rolling your own authentication.",
          author: "security_dev",
          createdAt: "2024-01-15T12:15:00Z",
          votes: 5,
          isAccepted: false
        }
      ]);
      
      setLoading(false);
    }, 1000);
  }, [id]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleVote = (type, targetId, targetType) => {
    console.log(`${type} vote for ${targetType} ${targetId}`);
    // Will implement actual voting when connected to backend
  };

  const handleSubmitAnswer = (e) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;
    
    // Simulate adding answer
    const answer = {
      id: answers.length + 1,
      content: newAnswer,
      author: "current_user",
      createdAt: new Date().toISOString(),
      votes: 0,
      isAccepted: false
    };
    
    setAnswers([...answers, answer]);
    setNewAnswer('');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Question not found</h1>
        <Link to="/" className="text-blue-600 hover:text-blue-700">
          Return to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Question */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{question.title}</h1>
          
          <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {question.author}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(question.createdAt)}
            </div>
            <div>{question.views} views</div>
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 whitespace-pre-line">{question.content}</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => handleVote('up', question.id, 'question')}
                  className="p-1 text-gray-400 hover:text-green-600"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
                <span className="font-medium text-gray-700">{question.votes}</span>
                <button 
                  onClick={() => handleVote('down', question.id, 'question')}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
              </div>
              <button className="flex items-center text-gray-400 hover:text-blue-600">
                <Bookmark className="h-4 w-4 mr-1" />
                Save
              </button>
              <button className="flex items-center text-gray-400 hover:text-blue-600">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Answers */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {answers.length} Answer{answers.length !== 1 ? 's' : ''}
        </h2>

        {answers.map((answer) => (
          <div 
            key={answer.id} 
            className={`bg-white rounded-lg shadow-md border mb-4 ${
              answer.isAccepted ? 'border-green-400 border-l-8 bg-green-50' : 'border-gray-200'
            }`}
          >
            <div className="p-6">
              {answer.isAccepted && (
                <div className="flex items-center text-green-700 text-base font-semibold mb-3">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Accepted Answer
                </div>
              )}
              <div className="prose max-w-none mb-4">
                <p className="text-gray-700 whitespace-pre-line">{answer.content}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => handleVote('up', answer.id, 'answer')}
                      className="p-1 text-gray-400 hover:text-green-600"
                    >
                      <ArrowUp className="h-5 w-5" />
                    </button>
                    <span className="font-medium text-gray-700">{answer.votes}</span>
                    <button 
                      onClick={() => handleVote('down', answer.id, 'answer')}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <ArrowDown className="h-5 w-5" />
                    </button>
                  </div>
                  <button className="flex items-center text-gray-400 hover:text-blue-600">
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </button>
                </div>
                <div className="text-sm text-gray-500 text-right">
                  <div className="flex items-center justify-end">
                    <User className="h-4 w-4 mr-1" />
                    {answer.author}
                  </div>
                  <div className="text-xs">{formatDate(answer.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Answer Form */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your Answer</h3>
          <form onSubmit={handleSubmitAnswer}>
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Write your answer here..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
            <div className="mt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Post Your Answer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionPage;
