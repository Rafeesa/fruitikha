const Coupon = require('../../models/couponSchema');
const User = require('../../models/userSchema');

const availableCoupon = async (req, res) => {
  try {
    const userId =
      req.query.userId || req.session.userId || req.session.passport?.user;

    const orderTotal = parseFloat(req.query.orderTotal); // Get order total to check against minimum purchase amount
    console.log(orderTotal);

    if (!orderTotal) {
      return res.status(400).json({ error: 'Order total is required' });
    }

    // Find the user by ID
    const user = await User.findById(userId);

    // Find all active and non-expired coupons
    const coupons = await Coupon.find({
      isActive: true,
      expirationDate: { $gte: new Date() },
      minimumPurchaseAmount: { $lte: orderTotal }, // Check if the order total meets the minimum purchase requirement
    });

    // Filter coupons based on the user's redeemList
    const availableCoupons = coupons.filter((coupon) => {
      return !user.redeemList.includes(coupon._id); // Only include coupons not used by the user
    });

    if (availableCoupons.length === 0) {
      return res
        .status(404)
        .json({ message: 'No applicable coupons for your order' });
    }

    res.json(availableCoupons);
  } catch (error) {
    console.error('Error retrieving coupons:', error);
    res
      .status(500)
      .json({ error: 'Server error retrieving applicable coupons.' });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const code = req.body.code;
    const userId = req.session.passport?.user;

    const coupon = await Coupon.findOne({ code: code, isActive: true });
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found or inactive.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.redeemList && user.redeemList.includes(coupon._id)) {
      return res
        .status(400)
        .json({ error: 'You have already used this coupon.' });
    }

    user.redeemList.push(coupon._id);
    await user.save();

    const discountAmount = coupon.value || 0;

    // Store discount in session for later use in checkout rendering
    req.session.discountAmount = discountAmount;

    return res.status(200).json({
      message: 'Coupon applied successfully.',
      discountAmount: discountAmount,
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = {
  availableCoupon,
  applyCoupon,
  //deleteCoupon
};
