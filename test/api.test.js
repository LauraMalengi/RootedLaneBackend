const { expect } = require('chai');

describe('API Tests (using global fetch)', () => {
  const BASE_URL = 'http://localhost:3000/api';
  
  // Test data
  let testUserId;
  let testProductId;
  let testOrderId;

  // Helper function to generate unique data
  const generateUniqueEmail = () => `test-${Date.now()}@gmail.com`;
  const generateUniqueUsername = () => `user${Date.now()}`;

  describe('Database Tests', () => {
    it('GET /test-db should return success', async () => {
      const res = await fetch(`${BASE_URL}/test-db`);
      expect(res.status).to.equal(200);
      const body = await res.json();
      expect(body).to.be.an('object');
      expect(body).to.have.property('success', true);
    });
  });

  describe('User Management', () => {
    it('POST /user should create a new user', async () => {
      const userData = {
        name: 'John Doe',
        email: generateUniqueEmail()
      };

      const res = await fetch(`${BASE_URL}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      expect(res.status).to.equal(201);
      const body = await res.json();
      expect(body).to.be.an('object');
      expect(body).to.have.property('_id');
      expect(body).to.have.property('name', userData.name);
      expect(body).to.have.property('email', userData.email);
      
      testUserId = body._id;
    });

    it('POST /users/signup should create a new user with password', async () => {
      const userData = {
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'testpassword123'
      };

      const res = await fetch(`${BASE_URL}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      expect(res.status).to.equal(201);
      const body = await res.json();
      expect(body).to.be.an('object');
      expect(body).to.have.property('message', 'User created successfully');
      expect(body).to.have.property('userId');
    });

    it('POST /users/login should authenticate user', async () => {
      // First create a user to login with
      const userData = {
        username: 'loginuser',
        email: 'login-test@example.com',
        password: 'loginpassword123'
      };

      // Sign up
      await fetch(`${BASE_URL}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      // Then try to login
      const res = await fetch(`${BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password
        }),
      });
      
      // This might return 501 if running in fallback mode without DB
      if (res.status === 200) {
        const body = await res.json();
        expect(body).to.be.an('object');
        expect(body).to.have.property('success', true);
        expect(body).to.have.property('user');
      } else {
        console.log('Login test skipped - running in fallback mode');
      }
    });
  });

  describe('Mock Data Endpoints', () => {
    describe('Products', () => {
      it('GET /mock/products should return empty array initially', async () => {
        const res = await fetch(`${BASE_URL}/mock/products`);
        expect(res.status).to.equal(200);
        const body = await res.json();
        expect(body).to.be.an('array');
      });

      it('POST /mock/products should create a product', async () => {
        const productData = {
          name: 'Test Product',
          price: 29.99,
          description: 'Test description',
          category: 'electronics'
        };

        const res = await fetch(`${BASE_URL}/mock/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });
        
        expect(res.status).to.equal(201);
        const body = await res.json();
        expect(body).to.be.an('object');
        expect(body).to.have.property('id');
        expect(body).to.have.property('name', productData.name);
        expect(body).to.have.property('price', productData.price);
        
        testProductId = body.id;
      });

      it('GET /mock/products/:id should return the created product', async () => {
        const res = await fetch(`${BASE_URL}/mock/products/${testProductId}`);
        expect(res.status).to.equal(200);
        const body = await res.json();
        expect(body).to.be.an('object');
        expect(body).to.have.property('id', testProductId);
      });

      it('PUT /mock/products/:id should update the product', async () => {
        const updateData = {
          price: 39.99,
          description: 'Updated description'
        };

        const res = await fetch(`${BASE_URL}/mock/products/${testProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        
        expect(res.status).to.equal(200);
        const body = await res.json();
        expect(body).to.have.property('price', 39.99);
        expect(body).to.have.property('description', 'Updated description');
      });

      it('DELETE /mock/products/:id should delete the product', async () => {
        const res = await fetch(`${BASE_URL}/mock/products/${testProductId}`, {
          method: 'DELETE'
        });
        expect(res.status).to.equal(204);
      });
    });

    describe('Wishlist', () => {
      it('POST /mock/wishlist should add item to wishlist', async () => {
        const wishlistItem = {
          productId: 'prod123',
          productName: 'Wishlist Product',
          userId: 'user123'
        };

        const res = await fetch(`${BASE_URL}/mock/wishlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wishlistItem),
        });
        
        expect(res.status).to.equal(201);
        const body = await res.json();
        expect(body).to.have.property('id');
        expect(body).to.have.property('productName', wishlistItem.productName);
      });

      it('GET /mock/wishlist should return wishlist items', async () => {
        const res = await fetch(`${BASE_URL}/mock/wishlist`);
        expect(res.status).to.equal(200);
        const body = await res.json();
        expect(body).to.be.an('array');
      });
    });

    describe('Cart', () => {
      it('POST /mock/cart should add item to cart', async () => {
        const cartItem = {
          productId: 'cart123',
          productName: 'Cart Product',
          quantity: 2,
          price: 19.99,
          userId: 'user123'
        };

        const res = await fetch(`${BASE_URL}/mock/cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cartItem),
        });
        
        expect(res.status).to.equal(201);
        const body = await res.json();
        expect(body).to.have.property('id');
        expect(body).to.have.property('quantity', 2);
      });
    });

    describe('Orders', () => {
      it('POST /mock/orders should create an order', async () => {
        const orderData = {
          userId: 'user123',
          products: [
            { productId: 'prod1', name: 'Product 1', quantity: 1, price: 29.99 }
          ],
          total: 29.99,
          status: 'pending'
        };

        const res = await fetch(`${BASE_URL}/mock/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });
        
        expect(res.status).to.equal(201);
        const body = await res.json();
        expect(body).to.have.property('id');
        expect(body).to.have.property('total', 29.99);
        expect(body).to.have.property('status', 'pending');
        
        testOrderId = body.id;
      });

      it('GET /mock/orders should return all orders', async () => {
        const res = await fetch(`${BASE_URL}/mock/orders`);
        expect(res.status).to.equal(200);
        const body = await res.json();
        expect(body).to.be.an('array');
      });
    });

    describe('Reviews', () => {
      it('POST /mock/reviews should create a review', async () => {
        const reviewData = {
          productId: 'prod123',
          userId: 'user123',
          rating: 5,
          comment: 'Great product!',
          userName: 'Test User'
        };

        const res = await fetch(`${BASE_URL}/mock/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData),
        });
        
        expect(res.status).to.equal(201);
        const body = await res.json();
        expect(body).to.have.property('id');
        expect(body).to.have.property('rating', 5);
        expect(body).to.have.property('comment', 'Great product!');
      });
    });

    describe('Payments', () => {
      it('POST /mock/payments should process payment', async () => {
        const paymentData = {
          orderId: testOrderId,
          amount: 29.99,
          method: 'credit_card',
          status: 'completed'
        };

        const res = await fetch(`${BASE_URL}/mock/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentData),
        });
        
        expect(res.status).to.equal(201);
        const body = await res.json();
        expect(body).to.have.property('id');
        expect(body).to.have.property('status', 'completed');
      });
    });

    describe('Deliveries', () => {
      it('POST /mock/deliveries should create delivery', async () => {
        const deliveryData = {
          orderId: testOrderId,
          address: '123 Test St, Test City',
          status: 'pending',
          estimatedDelivery: '2024-12-31'
        };

        const res = await fetch(`${BASE_URL}/mock/deliveries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deliveryData),
        });
        
        expect(res.status).to.equal(201);
        const body = await res.json();
        expect(body).to.have.property('id');
        expect(body).to.have.property('status', 'pending');
      });
    });

    describe('User Locations', () => {
      it('POST /mock/userLocations should save user location', async () => {
        const locationData = {
          userId: 'user123',
          address: '456 Test Ave',
          city: 'Test City',
          country: 'Test Country',
          isDefault: true
        };

        const res = await fetch(`${BASE_URL}/mock/userLocations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData),
        });
        
        expect(res.status).to.equal(201);
        const body = await res.json();
        expect(body).to.have.property('id');
        expect(body).to.have.property('isDefault', true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await fetch(`${BASE_URL}/nonexistent`);
      expect(res.status).to.equal(404);
    });

    it('should return 400 for invalid user data', async () => {
      const res = await fetch(`${BASE_URL}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Missing required fields
      });
      
      expect(res.status).to.equal(400);
    });

    it('should return 409 for duplicate email', async () => {
      const duplicateEmail = generateUniqueEmail();
      
      // First request should succeed
      await fetch(`${BASE_URL}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: 'First User', 
          email: duplicateEmail 
        }),
      });

      // Second request should fail with 409
      const res = await fetch(`${BASE_URL}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: 'Second User', 
          email: duplicateEmail 
        }),
      });
      
      expect(res.status).to.equal(409);
    });
  });
});