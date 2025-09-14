require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const base64 = require('base-64');
const cors = require('cors')

const app = express();
const PORT = 3000;
const uri = process.env.uri

app.use(cors());
app.use(express.json());

let db;

async function connectToMongo() {
  try {
    const client = new MongoClient(process.env.uri);
    await client.connect();
    db = client.db('Rootedlane');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}
// ADD THIS ROUTE TO YOUR SERVER FILE
app.post('/api/users/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

   
    const result = await db.collection('users').insertOne({
      username,
      email,
      password, 
      createdAt: new Date()
    });

    res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

connectToMongo();




app.post('/api/users/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

   
    const result = await db.collection('users').insertOne({
      username,
      email,
      password, 
      createdAt: new Date()
    });

    res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.get('/users/:id', async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

app.put('/users/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID' });

  const updates = req.body;
  updates.updatedAt = new Date();

  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    result.matchedCount
      ? res.json({ message: 'User updated successfully' })
      : res.status(404).json({ message: 'User not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
    result.deletedCount
      ? res.json({ message: 'User deleted successfully' })
      : res.status(404).json({ message: 'User not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;

  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Email and password are required',
      field: !email ? 'email' : 'password'
    });
  }

  try {
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    if (password !== user.password) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    
    const { password: _, ...userData } = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userData
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});


app.post('/location', async (req, res) => {
  const { email, locationId } = req.body;
  if (!email || !locationId) {
    return res.status(400).json({ message: 'Email and location are required' });
  }

  try {
    const result = await db.collection('userLocations').insertOne({
      email,
      locationId,
      createdAt: new Date()
    });
    res.status(201).json({ message: 'Location posted successfully', locationId: result.insertedId });
  } catch (err) {
    console.error('Post location error:', err);
    res.status(500).json({ message: 'Failed to post location' });
  }
});

app.get('/location', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const userLocations = await db.collection('userLocations').find({ email }).toArray();
    if (!userLocations.length) {
      return res.status(404).json({ message: 'No locations found for user' });
    }
    res.json(userLocations);
  } catch (err) {
    console.error('Get location error:', err);
    res.status(500).json({ message: 'Failed to get locations' });
  }
});

app.get('/possiblelocations', async (req, res) => {
  try {
    const locations = await db.collection('possibleLocations').find().toArray();
    if (!locations.length) return res.status(404).json({ message: 'No locations found' });
    res.json(locations);
  } catch (err) {
    console.error('Get possible locations error:', err);
    res.status(500).json({ message: 'Failed to fetch locations' });
  }
});


app.post('/products', async (req, res) => {
  const { name, price, description = '' } = req.body;
  if (!name || !price) {
    return res.status(400).json({ message: 'Name and price are required' });
  }

  try {
    const product = {
      name,
      price,
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('products').insertOne(product);
    res.status(201).json({ _id: result.insertedId, ...product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

app.get('/products', async (_req, res) => {
  try {
    const products = await db.collection('products').find().toArray();
    res.json(products);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ message: 'Failed to get products' });
  }
});

app.get('/products/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid product ID' });

  try {
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    product ? res.json(product) : res.status(404).json({ message: 'Product not found' });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

app.put('/products/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid product ID' });

  const updates = req.body;
  updates.updatedAt = new Date();

  try {
    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    result.matchedCount
      ? res.json({ message: 'Product updated successfully' })
      : res.status(404).json({ message: 'Product not found' });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

app.delete('/products/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid product ID' });

  try {
    const result = await db.collection('products').deleteOne({ _id: new ObjectId(id) });
    result.deletedCount
      ? res.json({ message: 'Product deleted successfully' })
      : res.status(404).json({ message: 'Product not found' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

app.get('/cart/:id', async (req, res) => {
  try {
    const item = await db.collection('cart').findOne({ _id: new ObjectId(req.params.id) });
    if (!item) return res.status(404).json({ message: 'Cart item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cart item' });
  }
});

app.put('/cart/:id', async (req, res) => {
  const updates = req.body;
  updates.updatedAt = new Date();

  try {
    const result = await db.collection('cart').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    result.matchedCount
      ? res.json({ message: 'Cart item updated successfully' })
      : res.status(404).json({ message: 'Cart item not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update cart item' });
  }
});

app.put('/deliveries/:id', async (req, res) => {
  const updates = req.body;
  updates.updatedAt = new Date();

  try {
    const result = await db.collection('deliveries').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    result.matchedCount
      ? res.json({ message: 'Delivery updated successfully' })
      : res.status(404).json({ message: 'Delivery not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update delivery' });
  }
});
// === PAYMENTS ===
app.put('/payments/:id', async (req, res) => {
  const updates = req.body;
  updates.updatedAt = new Date();

  try {
    const result = await db.collection('payments').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    result.matchedCount
      ? res.json({ message: 'Payment updated successfully' })
      : res.status(404).json({ message: 'Payment not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update payment' });
  }
});

app.delete('/payments/:id', async (req, res) => {
  try {
    const result = await db.collection('payments').deleteOne({ _id: new ObjectId(req.params.id) });
    result.deletedCount
      ? res.json({ message: 'Payment deleted successfully' })
      : res.status(404).json({ message: 'Payment not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete payment' });
  }
});

app.delete('/deliveries/:id', async (req, res) => {
  try {
    const result = await db.collection('deliveries').deleteOne({ _id: new ObjectId(req.params.id) });
    result.deletedCount
      ? res.json({ message: 'Delivery deleted successfully' })
      : res.status(404).json({ message: 'Delivery not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete delivery' });
  }
});


app.get('/reviews/:id', async (req, res) => {
  try {
    const review = await db.collection('reviews').findOne({ _id: new ObjectId(req.params.id) });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch review' });
  }
});

app.put('/reviews/:id', async (req, res) => {
  const updates = req.body;
  updates.updatedAt = new Date();

  try {
    const result = await db.collection('reviews').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    result.matchedCount
      ? res.json({ message: 'Review updated successfully' })
      : res.status(404).json({ message: 'Review not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update review' });
  }
});

app.delete('/reviews/:id', async (req, res) => {
  try {
    const result = await db.collection('reviews').deleteOne({ _id: new ObjectId(req.params.id) });
    result.deletedCount
      ? res.json({ message: 'Review deleted successfully' })
      : res.status(404).json({ message: 'Review not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete review' });
  }
});


app.get('/orders/:id', async (req, res) => {
  try {
    const order = await db.collection('orders').findOne({ _id: new ObjectId(req.params.id) });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

app.put('/orders/:id', async (req, res) => {
  const updates = req.body;
  updates.updatedAt = new Date();

  try {
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    result.matchedCount
      ? res.json({ message: 'Order updated successfully' })
      : res.status(404).json({ message: 'Order not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order' });
  }
});

app.delete('/orders/:id', async (req, res) => {
  try {
    const result = await db.collection('orders').deleteOne({ _id: new ObjectId(req.params.id) });
    result.deletedCount
      ? res.json({ message: 'Order deleted successfully' })
      : res.status(404).json({ message: 'Order not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete order' });
  }
});


app.get('/wishlist/:id', async (req, res) => {
  try {
    const item = await db.collection('wishlist').findOne({ _id: new ObjectId(req.params.id) });
    if (!item) return res.status(404).json({ message: 'Wishlist item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch wishlist item' });
  }
});

app.put('/wishlist/:id', async (req, res) => {
  const updates = req.body;
  updates.updatedAt = new Date();

  try {
    const result = await db.collection('wishlist').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    result.matchedCount
      ? res.json({ message: 'Wishlist item updated successfully' })
      : res.status(404).json({ message: 'Wishlist item not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update wishlist item' });
  }
});

app.delete('/wishlist/:id', async (req, res) => {
  try {
    const result = await db.collection('wishlist').deleteOne({ _id: new ObjectId(req.params.id) });
    result.deletedCount
      ? res.json({ message: 'Wishlist item deleted successfully' })
      : res.status(404).json({ message: 'Wishlist item not found' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete wishlist item' });
  }
});



app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
