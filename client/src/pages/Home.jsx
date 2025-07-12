import { useState } from 'react';
import { Link } from 'react-router-dom';

// Helper to format 'X days ago'
const getDaysAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
};

const QUESTIONS_PER_PAGE = 5;

function Home() {
  const [questions, setQuestions] = useState([
    {
      _id: '1',
      title: 'How to effectively manage time while studying for multiple exams?',
      tags: [
        { _id: 't1', name: 'technology' },
        { _id: 't2', name: 'study-skills' }
      ],
      author: { username: 'Sophia Clark' },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      votes: 0,
      answers: 5,
      views: 10
    },
    {
      _id: '2',
      title: 'What are the best resources for learning advanced calculus?',
      tags: [
        { _id: 't3', name: 'mathematics' }
      ],
      author: { username: 'Ethan Miller' },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      votes: 0,
      answers: 3,
      views: 15
    },
    {
      _id: '3',
      title: 'How to improve coding skills for software development?',
      tags: [
        { _id: 't4', name: 'programming' }
      ],
      author: { username: 'Olivia Davis' },
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      votes: 0,
      answers: 7,
      views: 20
    }
  ]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // useEffect(() => {
  //   axios.get('/api/questions')
  //     .then(res => {
  //       // Handle different possible response structures
  //       const questionsData = res.data.questions || res.data || [];
  //       // Ensure it's an array
  //       const questionsArray = Array.isArray(questionsData) ? questionsData : [];
  //       setQuestions(questionsArray);
  //     })
  //     .catch(err => {
  //       console.log('API not available, using demo data');
  //       // Fallback demo data when API is not available
  //       setQuestions([
  //         {
  //           _id: '1',
  //           title: 'How to implement authentication in React?',
  //           tags: [
  //             { _id: 't1', name: 'react' },
  //             { _id: 't2', name: 'authentication' },
  //             { _id: 't3', name: 'jwt' }
  //           ],
  //           author: { username: 'john_dev' },
  //           createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  //           votes: 12,
  //           answers: 0,
  //           views: 156
  //         },
  //         {
  //           _id: '2',
  //           title: 'Best practices for Node.js error handling?',
  //           tags: [
  //             { _id: 't4', name: 'nodejs' },
  //             { _id: 't5', name: 'express' },
  //             { _id: 't6', name: 'error-handling' }
  //           ],
  //           author: { username: 'api_master' },
  //           createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  //           votes: 8,
  //           answers: 2,
  //           views: 89
  //         },
  //         {
  //           _id: '3',
  //           title: 'MongoDB aggregation pipeline performance tips?',
  //           tags: [
  //             { _id: 't7', name: 'mongodb' },
  //             { _id: 't8', name: 'performance' },
  //             { _id: 't9', name: 'aggregation' }
  //           ],
  //           author: { username: 'db_expert' },
  //           createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  //           votes: 15,
  //           answers: 1,
  //           views: 234
  //         }
  //       ]);
  //     });
  // }, []);

  // Filtering
  let filteredQuestions = questions;
  if (filter === 'unanswered') {
    filteredQuestions = filteredQuestions.filter(q => (q.answers || 0) === 0);
  }
  // Add more filters as needed

  // Sorting
  if (sort === 'newest') {
    filteredQuestions = [...filteredQuestions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'mostAnswers') {
    filteredQuestions = [...filteredQuestions].sort((a, b) => (b.answers || 0) - (a.answers || 0));
  } else if (sort === 'mostViews') {
    filteredQuestions = [...filteredQuestions].sort((a, b) => (b.views || 0) - (a.views || 0));
  }

  // Pagination
  const totalQuestions = filteredQuestions.length;
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * QUESTIONS_PER_PAGE, currentPage * QUESTIONS_PER_PAGE);

  // Handlers
  const handleFilter = (val) => {
    setFilter(val);
    setFilterOpen(false);
    setCurrentPage(1);
  };
  const handleSort = (val) => {
    setSort(val);
    setSortOpen(false);
    setCurrentPage(1);
  };
  const handlePage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Questions</h1>
            <p className="text-gray-600">Explore questions from our vibrant community of learners.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm mr-2">{totalQuestions} questions</span>
            <div className="relative">
              <button className="bg-white border px-4 py-2 rounded hover:bg-gray-100 flex items-center" onClick={() => setFilterOpen(v => !v)}>
                <span className="mr-2">Filter</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-10">
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleFilter('all')}>All</button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleFilter('unanswered')}>Unanswered</button>
                </div>
              )}
            </div>
            <div className="relative">
              <button className="bg-white border px-4 py-2 rounded hover:bg-gray-100 flex items-center" onClick={() => setSortOpen(v => !v)}>
                <span className="mr-2">Sort</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {sortOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow z-10">
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleSort('newest')}>Newest</button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleSort('mostAnswers')}>Most Answers</button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleSort('mostViews')}>Most Views</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {paginatedQuestions.map(question => (
            <div key={question._id} className="bg-white border p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Link to={`/question/${question._id}`} className="text-xl font-semibold text-blue-600 hover:underline block mb-2">
                {question.title}
              </Link>
              <div className="flex gap-2 mb-2">
                {question.tags && question.tags.map(tag => (
                  <span key={tag._id || tag} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">{tag.name || tag}</span>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex gap-4">
                  <span>💬 {question.answers} answers</span>
                  <span>👁️ {question.views} views</span>
                </div>
                <span>Asked by {question.author?.username || 'Anonymous'} {question.createdAt ? getDaysAgo(question.createdAt) : ''}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Pagination UI */}
        <div className="flex justify-center mt-8">
          <nav className="inline-flex -space-x-px">
            <button onClick={() => handlePage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border rounded-l bg-white hover:bg-gray-100 disabled:opacity-50">&lt;</button>
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx + 1}
                onClick={() => handlePage(idx + 1)}
                className={`px-3 py-1 border-t border-b ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}
              >
                {idx + 1}
              </button>
            ))}
            <button onClick={() => handlePage(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-r bg-white hover:bg-gray-100 disabled:opacity-50">&gt;</button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default Home;
