require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = 3000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.uri;

if (!MONGODB_URI) {
  console.error('❌ MongoDB URI is not defined in environment variables');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

let db;
let client;

async function connectToMongo() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('Rootedlane');
    console.log('✅ Connected to MongoDB');
    
    const collections = await db.listCollections().toArray();
    console.log('📊 Available collections:', collections.map(c => c.name));
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

connectToMongo();

// Add the test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const testResult = await db.collection('test').insertOne({
      message: 'Test document',
      timestamp: new Date()
    });
    
    const count = await db.collection('test').countDocuments();
    
    res.json({
      success: true,
      insertedId: testResult.insertedId,
      count: count,
      message: 'MongoDB is working correctly!'
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'MongoDB connection failed'
    });
  }
});

// Use the fixed signup and login routes from above
app.post('/api/users/signup', async (req, res) => {
  // ... use the fixed signup code from above
});

app.post('/api/users/login', async (req, res) => {
  // ... use the fixed login code from above
});

// ... keep the rest of your routes

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});