import axios from 'axios';

function NotificationDropdown({ notifications }) {
  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      // Update UI (handled by parent component polling)
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded p-4 text-black">
      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications</p>
      ) : (
        notifications.map(notification => (
          <div
            key={notification._id}
            className={`p-2 cursor-pointer hover:bg-gray-50 ${notification.isRead ? 'bg-gray-100' : 'bg-blue-100'}`}
            onClick={() => handleMarkAsRead(notification._id)}
          >
            {notification.message}
          </div>
        ))
      )}
    </div>
  );
}

export default NotificationDropdown;
