import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // For demo purposes, simulate a user
      setUser({ username: 'demo_user' });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <nav className="bg-blue-500 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">StackIt</Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/ask" className="hover:underline">Ask Question</Link>
              <span className="text-sm cursor-pointer">🔔</span>
              <span>{user.username}</span>
              <button onClick={handleLogout} className="hover:underline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">Login</Link>
              <Link to="/register" className="hover:underline">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
