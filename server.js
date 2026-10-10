require('dotenv').config({ quiet: true });

const express = require('express');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const productRoutes = require('./routes/productRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Inventory Management API is running' });
});
app.use('/api/products', productRoutes);

// These two must come last.
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    await Product.init(); // make sure the unique index on sku exists before accepting requests

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
