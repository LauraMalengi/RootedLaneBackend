require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.MONGO ||
  process.env.URI ||
  process.env.uri;


app.use(express.json());


const allowedOrigins = [
  "http://www.rootedlane1.com.s3-website-us-east-1.amazonaws.com",
  "http://rootedlane1.com.s3-website-us-east-1.amazonaws.com",
  "https://www.rootedlane1.com",
  "https://rootedlane1.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked: " + origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Preflight support
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});


// ---- DATABASE CONNECT ----
let dbClient = null;
let db = null;

async function connectToMongoOnce() {
  if (db) return db;
  if (!MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI not set.");
    return null;
  }

  if (!dbClient) {
    dbClient = new MongoClient(MONGODB_URI);
    await dbClient.connect();
    db = dbClient.db("Rootedlane");
    console.log("✅ Connected to MongoDB");
  }

  return db;
}

// ---- START SERVER ----
if (require.main === module) {
  (async () => {
    try {
      await connectToMongoOnce();
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server running at http://98.95.166.176:${PORT}`)
    );

    } catch (err) {
      console.error("Server failed to start:", err);
      process.exit(1);
    }
  })();
}

app.locals.connectToMongoOnce = connectToMongoOnce;

// ---- JSON ERROR HELPER ----
function simpleJsonError(res, status = 500, message = "Internal server error") {
  return res.status(status).json({ success: false, message });
}

// ---------------------------------------
//               ROUTES
// ---------------------------------------

// Test DB route
app.get("/api/test-db", async (req, res) => {
  try {
    const database = await connectToMongoOnce();
    if (!database) {
      return res.json({
        success: true,
        message: "No MongoDB configured — fallback mode",
      });
    }

    const testResult = await database.collection("test").insertOne({
      message: "Test document",
      timestamp: new Date(),
    });

    const count = await database.collection("test").countDocuments();

    res.json({
      success: true,
      insertedId: testResult.insertedId,
      count,
      message: "MongoDB is working!",
    });
  } catch (err) {
    console.error("❌ DB test failed:", err);
    simpleJsonError(res, 500, "MongoDB connection failed");
  }
});

// --- Create user (for tests)
app.post("/api/user", async (req, res) => {
  const { name, email } = req.body || {};

  if (!name || !email)
    return res.status(400).json({ message: "Name and email are required" });

  try {
    const database = await connectToMongoOnce();

    if (database) {
      const existing = await database.collection("users").findOne({ email });
      if (existing)
        return res.status(409).json({ message: "User already exists" });

      const result = await database
        .collection("users")
        .insertOne({ name, email, createdAt: new Date() });

      return res.status(201).json({
        _id: result.insertedId,
        name,
        email,
      });
    }

    return res.status(201).json({ name, email });
  } catch (err) {
    console.error("Create /api/user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---- SIGNUP ----
app.post("/api/users/signup", async (req, res) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const database = await connectToMongoOnce();
    const hashedPassword = await bcrypt.hash(password, 10);

    if (database) {
      const existing = await database.collection("users").findOne({ email });
      if (existing)
        return res.status(409).json({ message: "User already exists" });

      const result = await database.collection("users").insertOne({
        username,
        email,
        password: hashedPassword,
        createdAt: new Date(),
      });

      return res
        .status(201)
        .json({ message: "User created successfully", userId: result.insertedId });
    }

    return res
      .status(201)
      .json({ message: "User created (fallback)", username, email });
  } catch (err) {
    console.error("Signup error:", err);
    simpleJsonError(res, 500);
  }
});

// ---- LOGIN ----
app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password)
    return res
      .status(400)
      .json({ success: false, message: "Email and password required" });

  try {
    const database = await connectToMongoOnce();

    if (!database)
      return res
        .status(501)
        .json({ success: false, message: "Login unavailable in fallback mode" });

    const user = await database.collection("users").findOne({ email });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });

    const { password: _, ...userData } = user;

    res.json({
      success: true,
      message: "Login successful",
      user: userData,
    });
  } catch (err) {
    console.error("Login error:", err);
    simpleJsonError(res, 500);
  }
});

// ---------------------------------------
// Mock Routes
// ---------------------------------------

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

const makeId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function makeResourceRoutes(name) {
  mockRouter.get(`/${name}`, (req, res) => res.json(stores[name]));

  mockRouter.get(`/${name}/:id`, (req, res) => {
    const item = stores[name].find((i) => i.id === req.params.id);
    if (!item)
      return res.status(404).json({ error: `${name.slice(0, -1)} not found` });
    res.json(item);
  });

  mockRouter.post(`/${name}`, (req, res) => {
    const item = { id: makeId(), ...req.body };
    stores[name].push(item);
    res.status(201).json(item);
  });

  mockRouter.put(`/${name}/:id`, (req, res) => {
    const idx = stores[name].findIndex((i) => i.id === req.params.id);
    if (idx === -1)
      return res.status(404).json({ error: `${name.slice(0, -1)} not found` });
    stores[name][idx] = { ...stores[name][idx], ...req.body };
    res.json(stores[name][idx]);
  });

  mockRouter.delete(`/${name}/:id`, (req, res) => {
    stores[name] = stores[name].filter((i) => i.id !== req.params.id);
    res.status(204).end();
  });
}

[
  "products",
  "wishlist",
  "test",
  "orders",
  "users",
  "cart",
  "reviews",
  "payments",
  "deliveries",
  "userLocations",
].forEach(makeResourceRoutes);

app.use("/api/mock", mockRouter);

module.exports = app;
