const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load env variables
dotenv.config();

// Import route files
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// Import models
const User = require('./models/User');

const app = express();

// Middleware
// Configure CORS for security in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['chrome-extension://*', process.env.ALLOWED_ORIGINS || 'https://your-domain.com'] 
    : '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Serve static files for any other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('MongoDB Connected...');
    
    // Check if admin user exists, if not create one
    try {
      const adminExists = await User.findOne({ username: process.env.ADMIN_USERNAME });
      
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        
        await User.create({
          username: process.env.ADMIN_USERNAME,
          password: hashedPassword,
          isAdmin: true
        });
        
        console.log('Admin user created');
      }
    } catch (err) {
      console.error('Error setting up admin user:', err);
    }
    
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
