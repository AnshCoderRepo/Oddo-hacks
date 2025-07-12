import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationImg from '../assets/notification.jpg';
// You can import more avatars, e.g. import liamImg from '../assets/liam.jpg';

const initialNotifications = [
  {
    id: 1,
    avatar: notificationImg,
    message: (
      <>
        <b>Liam</b> answered your question: <span className="text-blue-700 hover:underline">"How to implement collaborative learning features?"</span>
      </>
    ),
    time: '2 days ago',
    isRead: false,
    link: '/question/1',
  },
  {
    id: 2,
    avatar: notificationImg,
    message: (
      <>
        You were mentioned in a comment by <b>Sophia</b>.
      </>
    ),
    time: '1 week ago',
    isRead: false,
    link: '/user/sophia',
  },
  {
    id: 3,
    avatar: notificationImg,
    message: (
      <>
        Your question was upvoted by <b>Ethan</b>.
      </>
    ),
    time: '2 weeks ago',
    isRead: true,
    link: '/user/ethan',
  },
  {
    id: 4,
    avatar: notificationImg,
    message: (
      <>
        Your answer was marked as helpful by <b>Olivia</b>.
      </>
    ),
    time: '3 weeks ago',
    isRead: true,
    link: '/user/olivia',
  },
  {
    id: 5,
    avatar: notificationImg,
    message: (
      <>
        New comment on your post by <b>Noah</b>.
      </>
    ),
    time: '1 month ago',
    isRead: true,
    link: '/user/noah',
  },
];

export default function NotificationPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const navigate = useNavigate();

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (id, link) => {
    setNotifications(notifications =>
      notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      )
    );
    if (link) navigate(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <div className="flex gap-4 text-sm text-gray-500">
            <button className="hover:underline" onClick={markAllAsRead}>Mark all as read</button>
            <button className="hover:underline">Settings</button>
          </div>
        </div>
        <div className="space-y-4">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-center bg-white rounded-lg shadow-sm px-6 py-4 gap-4 border border-gray-100 cursor-pointer transition hover:bg-blue-50 ${!n.isRead ? 'ring-2 ring-blue-100' : ''}`}
              onClick={() => handleNotificationClick(n.id, n.link)}
            >
              <div className="relative">
                <img src={n.avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                {!n.isRead && <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="text-gray-800 text-base">{n.message}</div>
                <div className="text-xs text-gray-500 mt-1">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
        <footer className="text-center text-gray-400 text-sm mt-16">© 2024 EduConnect. All Rights Reserved.</footer>
      </div>
    </div>
  );
} 