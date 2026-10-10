const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'sku is required'],
      trim: true,
      unique: true
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'price is required'],
      min: [0.01, 'price must be greater than 0']
    },
    quantity: {
      type: Number,
      required: [true, 'quantity is required'],
      min: [0, 'quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer'
      }
    },
    reorderLevel: {
      type: Number,
      required: [true, 'reorderLevel is required'],
      min: [0, 'reorderLevel cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'reorderLevel must be an integer'
      }
    },
    supplier: {
      type: String,
      required: [true, 'supplier is required'],
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// stockValue is calculated on the fly, so it is never stored in the database.
productSchema.virtual('stockValue').get(function () {
  return Math.round(this.price * this.quantity * 100) / 100;
});

// Fields a client is allowed to send. Everything else (_id, createdAt, ...) is rejected.
productSchema.statics.EDITABLE_FIELDS = [
  'name',
  'sku',
  'category',
  'price',
  'quantity',
  'reorderLevel',
  'supplier'
];

module.exports = mongoose.model('Product', productSchema);
