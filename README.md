# StackIt - Programming Q&A Platform

StackIt is a modern, full-stack Q&A platform similar to Stack Overflow, built with React, Node.js, Express, and MongoDB. It provides a comprehensive solution for developers to ask questions, share knowledge, and build a community around programming topics.
# Working Demo
https://dynamic-pavlova-513b70.netlify.app/
## 🚀 Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based secure authentication
- **Question Management** - Create, read, update, delete questions with rich text editor
- **Answer System** - Comprehensive answer management with voting and acceptance
- **Tagging System** - Organize questions with tags, tag management, and search
- **Voting System** - Upvote/downvote questions and answers
- **Reputation System** - User reputation based on community feedback
- **Real-time Notifications** - Stay updated with question/answer activities
- **Search & Filtering** - Advanced search and filtering capabilities

### Advanced Features
- **Rich Text Editor** - Powered by ReactQuill for formatting content
- **Image Upload** - Support for image attachments with Cloudinary integration
- **Responsive Design** - Mobile-first design with Tailwind CSS
- **Role-based Access** - User, Moderator, and Admin roles
- **Comment System** - Threaded comments on answers
- **Tag Wiki** - Comprehensive tag documentation
- **Badge System** - Achievement badges for user engagement

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and development server
- **Axios** - HTTP client for API calls
- **React Quill** - Rich text editor
- **Lucide React** - Beautiful icons
- **React Hot Toast** - Toast notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Helmet** - Security middleware
- **Express Rate Limit** - Rate limiting
- **Sanitize HTML** - HTML sanitization

## 📁 Project Structure

```
stackit/
├── client/                           # Frontend (React)
│   ├── src/
│   │   ├── assets/                  # Static assets
│   │   ├── components/              # React components
│   │   │   ├── Navbar.jsx           # Navigation bar
│   │   │   ├── QuestionList.jsx     # List of questions
│   │   │   ├── QuestionPage.jsx     # Question details and answers
│   │   │   ├── Editor.jsx           # Rich text editor
│   │   │   ├── NotificationDropdown.jsx # Notifications
│   │   │   ├── Login.jsx            # Login form
│   │   │   └── Register.jsx         # Registration form
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Home page
│   │   │   └── AskQuestion.jsx      # Question submission
│   │   ├── App.jsx                  # Main app component
│   │   ├── main.jsx                 # Entry point
│   │   └── index.css                # Global styles
│   ├── public/                      # Public assets
│   ├── package.json                 # Dependencies and scripts
│   ├── vite.config.js              # Vite configuration
│   └── tailwind.config.js          # Tailwind configuration
├── server/                          # Backend (Node.js/Express)
│   ├── config/
│   │   └── db.js                   # MongoDB connection
│   ├── models/
│   │   ├── User.js                 # User schema
│   │   ├── Question.js             # Question schema
│   │   ├── Answer.js               # Answer schema
│   │   ├── Tag.js                  # Tag schema
│   │   └── Notification.js         # Notification schema
│   ├── routes/
│   │   ├── auth.js                 # Authentication routes
│   │   ├── questions.js            # Question routes
│   │   ├── answers.js              # Answer routes
│   │   ├── tags.js                 # Tag routes
│   │   └── notifications.js        # Notification routes
│   ├── middleware/
│   │   ├── auth.js                 # Authentication middleware
│   │   └── upload.js               # File upload middleware
│   ├── server.js                   # Main server file
│   └── package.json                # Dependencies and scripts
├── .env                            # Environment variables
└── README.md                       # Project documentation
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd stackit
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Install client dependencies**
```bash
cd ../client
npm install
```

4. **Environment Setup**
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
# Update MongoDB URI, JWT secret, and other settings
```

5. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (update MONGODB_URI in .env)
```

6. **Start the development servers**

Backend (from server directory):
```bash
npm run dev
```

Frontend (from client directory):
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/stackit
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your-cloudinary-name (optional)
CLOUDINARY_API_KEY=your-cloudinary-key (optional)
CLOUDINARY_API_SECRET=your-cloudinary-secret (optional)
```

### Database Setup

The application will automatically create the necessary collections when you start using it. No manual database setup is required.

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Question Endpoints
- `GET /api/questions` - Get all questions (with filtering)
- `GET /api/questions/:id` - Get single question
- `POST /api/questions` - Create new question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/questions/:id/vote` - Vote on question

### Answer Endpoints
- `GET /api/answers` - Get answers for a question
- `GET /api/answers/:id` - Get single answer
- `POST /api/answers` - Create new answer
- `PUT /api/answers/:id` - Update answer
- `DELETE /api/answers/:id` - Delete answer
- `POST /api/answers/:id/vote` - Vote on answer
- `POST /api/answers/:id/accept` - Accept answer

### Tag Endpoints
- `GET /api/tags` - Get all tags
- `GET /api/tags/popular` - Get popular tags
- `GET /api/tags/search` - Search tags
- `GET /api/tags/:id` - Get single tag
- `GET /api/tags/:name/questions` - Get questions for tag

### Notification Endpoints
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

## 🧪 Testing

### Running Tests

Backend tests:
```bash
cd server
npm test
```

Frontend tests:
```bash
cd client
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
```bash
cd client
npm run build
```

2. Deploy the `dist` folder to your hosting provider

### Backend Deployment (Heroku/Railway/DigitalOcean)

1. Set environment variables on your hosting platform
2. Ensure MongoDB is accessible (use MongoDB Atlas for cloud deployment)
3. Deploy the server folder

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Stack Overflow for inspiration
- React and Node.js communities
- MongoDB for the excellent database
- All open-source contributors

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

---

**Built with ❤️ by the StackIt Team**
