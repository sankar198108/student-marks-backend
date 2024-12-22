const express = require('express');
const cors = require('cors');

const app = express();
const port = 5000;

// Middleware
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON request bodies

// Importing the student routes
const studentRoutes = require('./routes/StudentRoutes');

// Use student routes for any requests starting with /students
app.use('/students', studentRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
