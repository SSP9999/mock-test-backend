const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// For Vercel deployment - export the app
module.exports = app;
const JWT_SECRET = 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database
let users = [];
let tests = [
  {
    id: 1,
    title: 'SSC CGL General Knowledge',
    type: 'SSC CGL',
    duration: 60,
    questions: [
      {
        id: 1,
        question: 'Who is the current Prime Minister of India?',
        options: ['Narendra Modi', 'Amit Shah', 'Rajnath Singh', 'Nitin Gadkari'],
        correct: 0
      },
      {
        id: 2,
        question: 'What is the capital of Rajasthan?',
        options: ['Jodhpur', 'Udaipur', 'Jaipur', 'Kota'],
        correct: 2
      },
      {
        id: 3,
        question: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correct: 1
      },
      {
        id: 4,
        question: 'In which year did India gain independence?',
        options: ['1945', '1946', '1947', '1948'],
        correct: 2
      },
      {
        id: 5,
        question: 'Who wrote the Indian National Anthem?',
        options: ['Bankim Chandra Chattopadhyay', 'Rabindranath Tagore', 'Sarojini Naidu', 'Mahatma Gandhi'],
        correct: 1
      }
    ]
  },
  {
    id: 2,
    title: 'Railway Group D Technical',
    type: 'Railway',
    duration: 90,
    questions: [
      {
        id: 1,
        question: 'What is the standard gauge of Indian Railways?',
        options: ['1435 mm', '1676 mm', '1000 mm', '762 mm'],
        correct: 1
      },
      {
        id: 2,
        question: 'Which type of current is used in Indian Railways for traction?',
        options: ['AC 25 kV', 'DC 1500 V', 'Both AC and DC', 'AC 50 kV'],
        correct: 2
      },
      {
        id: 3,
        question: 'What does LHB stand for in railway coaches?',
        options: ['Light Heavy Bogies', 'Linke Hofmann Busch', 'Long Heavy Bogies', 'Light Hindustan Bogies'],
        correct: 1
      },
      {
        id: 4,
        question: 'Which is the longest railway tunnel in India?',
        options: ['Pir Panjal Tunnel', 'Karbude Tunnel', 'Natuwadi Tunnel', 'Rohtang Tunnel'],
        correct: 0
      },
      {
        id: 5,
        question: 'What is the maximum speed of Vande Bharat Express?',
        options: ['160 km/h', '180 km/h', '200 km/h', '220 km/h'],
        correct: 1
      }
    ]
  }
];
let results = [];

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// User Registration
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tests
app.get('/api/tests', authenticateToken, (req, res) => {
  const testsWithoutAnswers = tests.map(test => ({
    id: test.id,
    title: test.title,
    type: test.type,
    duration: test.duration,
    questionCount: test.questions.length
  }));
  
  res.json(testsWithoutAnswers);
});

// Get specific test questions
app.get('/api/tests/:id', authenticateToken, (req, res) => {
  const testId = parseInt(req.params.id);
  const test = tests.find(t => t.id === testId);

  if (!test) {
    return res.status(404).json({ message: 'Test not found' });
  }

  // Remove correct answers from questions
  const testWithoutAnswers = {
    ...test,
    questions: test.questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options
    }))
  };

  res.json(testWithoutAnswers);
});

// Submit test and get results
app.post('/api/tests/:id/submit', authenticateToken, (req, res) => {
  try {
    const testId = parseInt(req.params.id);
    const { answers } = req.body;
    const userId = req.user.id;

    const test = tests.find(t => t.id === testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    let score = 0;
    const detailedResults = test.questions.map(question => {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correct;
      if (isCorrect) score++;

      return {
        questionId: question.id,
        question: question.question,
        options: question.options,
        correctAnswer: question.correct,
        userAnswer: userAnswer,
        isCorrect: isCorrect
      };
    });

    const result = {
      id: results.length + 1,
      userId: userId,
      testId: testId,
      testTitle: test.title,
      score: score,
      totalQuestions: test.questions.length,
      percentage: Math.round((score / test.questions.length) * 100),
      detailedResults: detailedResults,
      completedAt: new Date().toISOString()
    };

    results.push(result);

    res.json({
      score: score,
      totalQuestions: test.questions.length,
      percentage: result.percentage,
      detailedResults: detailedResults
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user results
app.get('/api/results', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const userResults = results.filter(result => result.userId === userId);
  
  const formattedResults = userResults.map(result => ({
    id: result.id,
    testTitle: result.testTitle,
    score: result.score,
    totalQuestions: result.totalQuestions,
    percentage: result.percentage,
    completedAt: result.completedAt
  }));

  res.json(formattedResults);
});

// Start server only in development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}