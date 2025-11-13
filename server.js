
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO || process.env.URI || process.env.uri;

app.use(cors());
app.use(express.json());

let dbClient = null;
let db = null;

async function connectToMongoOnce() {
  if (db) return db;
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI not set. Running without DB connection.');
    return null;
  }
  if (!dbClient) {
    dbClient = new MongoClient(MONGODB_URI);
    await dbClient.connect();
    db = dbClient.db('Rootedlane');
    console.log('✅ Connected to MongoDB (Rootedlane)');
  }
  return db;
}

// Start server only when this file is run directly
if (require.main === module) {
  (async () => {
    try {
      await connectToMongoOnce();
      app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
    } catch (err) {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
  })();
}

// Export helpers for tests
app.locals.connectToMongoOnce = connectToMongoOnce;

// Simple error helper
function simpleJsonError(res, status = 500, message = 'Internal server error') {
  return res.status(status).json({ success: false, message });
}

// --- Routes ---

// Test DB route
app.get('/api/test-db', async (req, res) => {
  try {
    const database = await connectToMongoOnce();
    if (!database) {
      // If no DB, return a simple success response for local testing
      return res.json({ success: true, message: 'No MongoDB configured — running in fallback mode' });
    }
    const testResult = await database.collection('test').insertOne({
      message: 'Test document',
      timestamp: new Date()
    });
    const count = await database.collection('test').countDocuments();
    res.json({
      success: true,
      insertedId: testResult.insertedId,
      count,
      message: 'MongoDB is working correctly!'
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    simpleJsonError(res, 500, 'MongoDB connection failed');
  }
});

// POST /api/user - expected by tests
app.post('/api/user', async (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

  try {
    const database = await connectToMongoOnce();
    if (database) {
      const existing = await database.collection('users').findOne({ email });
      if (existing) return res.status(409).json({ message: 'User already exists' });
      const result = await database.collection('users').insertOne({ name, email, createdAt: new Date() });
      return res.status(201).json({ _id: result.insertedId, name, email });
    } else {
      // Fallback response for environments without MongoDB
      return res.status(201).json({ name, email });
    }
  } catch (err) {
    console.error('Create /api/user error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Signup route (more complete)
app.post('/api/users/signup', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ message: 'All fields are required' });

  try {
    const database = await connectToMongoOnce();
    const hashedPassword = await bcrypt.hash(password, 10);

    if (database) {
      const existing = await database.collection('users').findOne({ email });
      if (existing) return res.status(409).json({ message: 'User already exists' });

      const result = await database.collection('users').insertOne({
        username,
        email,
        password: hashedPassword,
        createdAt: new Date()
      });
      return res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
    } else {
      // Fallback (do not store password in fallback)
      return res.status(201).json({ message: 'User created (fallback)', username, email });
    }
  } catch (err) {
    console.error('Signup error:', err);
    simpleJsonError(res, 500);
  }
});

app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    const database = await connectToMongoOnce();
    if (!database) return res.status(501).json({ success: false, message: 'Login not available in fallback mode' });

    const user = await database.collection('users').findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const { password: _, ...userData } = user;
    res.json({ success: true, message: 'Login successful', user: userData });
  } catch (err) {
    console.error('Login error:', err);
    simpleJsonError(res, 500);
  }
});

// In-memory mock routes under /api/mock
const mockRouter = express.Router();
const stores = {
  products: [],
  wishlist: [],
  test: [],
  orders: [],
  users: [],
  cart: [],
  reviews: [],
  payments: [],
  deliveries: [],
  userLocations: [],
};

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function makeResourceRoutes(name) {
  mockRouter.get(`/${name}`, (req, res) => res.json(stores[name]));
  mockRouter.get(`/${name}/:id`, (req, res) => {
    const item = stores[name].find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: `${name.slice(0,-1)} not found` });
    res.json(item);
  });
  mockRouter.post(`/${name}`, (req, res) => {
    const item = { id: makeId(), ...req.body };
    stores[name].push(item);
    res.status(201).json(item);
  });
  mockRouter.put(`/${name}/:id`, (req, res) => {
    const idx = stores[name].findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: `${name.slice(0,-1)} not found` });
    stores[name][idx] = { ...stores[name][idx], ...req.body };
    res.json(stores[name][idx]);
  });
  mockRouter.delete(`/${name}/:id`, (req, res) => {
    stores[name] = stores[name].filter(i => i.id !== req.params.id);
    res.status(204).end();
  });
}

[
  'products','wishlist','test','orders','users','cart','reviews','payments','deliveries','userLocations'
].forEach(makeResourceRoutes);

app.use('/api/mock', mockRouter);

module.exports = app;

