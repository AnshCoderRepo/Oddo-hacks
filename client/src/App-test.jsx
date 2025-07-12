import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          🎉 StackIt is Working!
        </h1>
        <p className="text-gray-600 mb-6">
          Your React application is successfully running
        </p>
        <button 
          onClick={() => setCount(count + 1)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Clicked {count} times
        </button>
        <div className="mt-6 space-y-2 text-gray-500">
          <p>✅ React + Vite</p>
          <p>✅ Tailwind CSS</p>
          <p>✅ Development Server</p>
        </div>
      </div>
    </div>
  );
}

export default App;
