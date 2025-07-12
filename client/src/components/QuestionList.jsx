import { Calendar, MessageSquare, Tag, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const QuestionList = ({ searchQuery, sortBy = 'newest' }) => {
  // Mock data for demonstration until backend is connected
  const [questions] = useState([
    {
      _id: '1',
      title: 'How to implement authentication in React?',
      content: 'I am building a React application and need to implement user authentication. What are the best practices for handling JWT tokens and protecting routes?',
      author: { username: 'john_dev', avatar: null },
      tags: [{ name: 'react' }, { name: 'authentication' }, { name: 'jwt' }],
      votes: { upvotes: 12, downvotes: 2 },
      answers: [],
      views: 156,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      _id: '2',
      title: 'Best practices for Node.js error handling?',
      content: 'What are the recommended approaches for handling errors in Node.js applications, especially for Express.js APIs?',
      author: { username: 'api_master', avatar: null },
      tags: [{ name: 'nodejs' }, { name: 'express' }, { name: 'error-handling' }],
      votes: { upvotes: 8, downvotes: 0 },
      answers: [{ _id: 'a1' }, { _id: 'a2' }],
      views: 89,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      _id: '3',
      title: 'MongoDB aggregation pipeline performance tips?',
      content: 'I am working with large datasets in MongoDB and my aggregation queries are slow. Any tips for optimization?',
      author: { username: 'db_expert', avatar: null },
      tags: [{ name: 'mongodb' }, { name: 'performance' }, { name: 'aggregation' }],
      votes: { upvotes: 15, downvotes: 1 },
      answers: [{ _id: 'a3' }],
      views: 234,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    }
  ]);

  const [loading] = useState(false);
  const [error] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'today';
    if (diffDays === 2) return 'yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const truncateContent = (content, maxLength = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
            <div className="flex space-x-4">
              <div className="flex flex-col items-center space-y-1 min-w-0">
                <div className="w-8 h-4 bg-gray-300 rounded"></div>
                <div className="w-8 h-4 bg-gray-300 rounded"></div>
                <div className="w-8 h-4 bg-gray-300 rounded"></div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </div>
                <div className="flex space-x-4">
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                  <div className="h-4 bg-gray-300 rounded w-24"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
        <p className="text-gray-600 mb-6">
          {searchQuery 
            ? `No questions match your search for "${searchQuery}"`
            : "Be the first to ask a question!"
          }
        </p>
        <Link
          to="/ask"
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center"
        >
          Ask the First Question
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <div key={question._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex space-x-4">
            {/* Vote and Stats */}
            <div className="flex flex-col items-center space-y-1 text-sm text-gray-600 min-w-0">
              <div className="flex flex-col items-center">
                <span className="font-medium">{question.votes || 0}</span>
                <span className="text-xs">votes</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium">{question.answers?.length || 0}</span>
                <span className="text-xs">answers</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium">{question.views || 0}</span>
                <span className="text-xs">views</span>
              </div>
            </div>

            {/* Question Content */}
            <div className="flex-1 min-w-0">
              <Link
                to={`/question/${question._id}`}
                className="block group"
              >
                <h3 className="text-lg font-medium text-blue-600 group-hover:text-blue-800 transition-colors mb-2">
                  {question.title}
                </h3>
              </Link>

              <div 
                className="text-gray-700 mb-3 line-clamp-3"
                dangerouslySetInnerHTML={{ 
                  __html: truncateContent(question.content?.replace(/<[^>]*>/g, '') || '') 
                }}
              />

              {/* Tags */}
              {question.tags && question.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {question.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta Info */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{question.author?.username || 'Anonymous'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>asked {formatDate(question.createdAt)}</span>
                  </div>
                </div>
                
                {question.lastActivity && (
                  <div className="text-xs">
                    modified {formatDate(question.lastActivity)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {questions.length >= 10 && (
        <div className="text-center pt-6">
          <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors">
            Load More Questions
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionList;
