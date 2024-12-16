const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  /* discountType: {
        type: String,
        enum: ['fixed', 'percentage'], 
        required: true
    },*/
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number,
    default: 1,
    min: 0,
  },
  minimumPurchaseAmount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true, // By default, coupons are active
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
