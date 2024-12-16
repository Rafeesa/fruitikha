const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');

const getCartPage = async (req, res) => {
  try {
    const userId = req.session.passport?.user;
    const user = await User.findById(userId).exec();

    const cart = await Cart.findOne({ userId })
      .populate('items.productId')
      .exec();

    if (!cart || cart.items.length === 0) {
      return res.render('cart', {
        cartItems: [],
        subtotal: 0,
        shippingCost: 45.0,
        total: 45.0,
        user,
      });
    }

    const calculateSalePrice = (product) => {
      const categoryOffer = product.category?.categoryOffer || 0;
      const productOffer = product.productOffer || 0;

      const categoryDiscount = (product.price * categoryOffer) / 100;
      const productDiscount = (product.price * productOffer) / 100;

      const maxDiscount = Math.max(categoryDiscount, productDiscount);

      return Math.round((product.price - maxDiscount) * 100) / 100;
    };

    let subtotal = 0;

    cart.items.forEach((item) => {
      if (item.productId) {
        const salePrice = calculateSalePrice(item.productId);
        item.productId.salePrice = salePrice; // Store the calculated salePrice
        const roundedPrice = Math.round(salePrice);
        subtotal += roundedPrice * item.quantity;
      }
    });

    const shippingCost = 45.0;
    const total = Math.round((subtotal + shippingCost) * 100) / 100;

    res.render('cart', {
      cartItems: cart.items,
      subtotal,
      shippingCost,
      total,
      user,
    });
  } catch (error) {
    console.error('Error in getCartPage:', error);
    res.status(500).send('Server Error');
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    // Ensure quantity is a valid number
    const quantityToAdd = Number(quantity);
    console.log(quantityToAdd);
    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
      return res.redirect(
        `/user/product-details/${productId}?error=Invalid quantity.`
      );
    }

    // Fetch the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    const maxQtyPerPerson = 5; // Max quantity allowed per person

    // Check if the quantity exceeds stock
    if (quantityToAdd > product.stock) {
      return res.redirect(
        `/user/product-details/${productId}?error=Only ${product.stock} items are available in stock.`
      );
    }

    // Find or create a cart for the user
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex((item) =>
      item.productId.equals(productId)
    );

    // If the item already exists in the cart
    if (existingItemIndex > -1) {
      const currentQuantity = cart.items[existingItemIndex].quantity;
      const totalQuantity = currentQuantity + quantityToAdd;

      // Validate against stock and maxQtyPerPerson
      if (totalQuantity > Product.stock) {
        return res.redirect(
          `/user/product-details/${productId}?error=You can only add up to ${product.stock - currentQuantity} more items.`
        );
      }

      if (totalQuantity > maxQtyPerPerson) {
        return res.redirect(
          `/user/product-details/${productId}?error=You can only add up to ${maxQtyPerPerson} items in total for this product.`
        );
      }

      // Update the item quantity
      cart.items[existingItemIndex].quantity = totalQuantity;
    } else {
      // Adding a new item to the cart
      if (quantityToAdd > maxQtyPerPerson) {
        return res.redirect(
          `/user/product-details/${productId}?error=You can only add up to ${maxQtyPerPerson} items for this product.`
        );
      }

      cart.items.push({ productId, quantity: quantityToAdd });
    }

    // Save the cart
    await cart.save();
    res.redirect('/cart');
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming the user is logged in
    const { productId } = req.body; // Get the product ID from the request

    // Find the user's cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).send('Cart not found');
    }

    // Find the index of the item to remove
    const itemIndex = cart.items.findIndex((item) =>
      item.productId.equals(productId)
    );
    if (itemIndex === -1) {
      return res.status(404).send('Item not found in cart');
    }

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1); // Removes the item at the specified index

    // Save the updated cart
    await cart.save();

    res.redirect('/cart'); // Redirect to the cart page after removing the item
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    const newQuantity = Number(quantity);

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    const maxQtyPerPerson = 5;
    if (newQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items are available in stock.`,
      });
    }

    if (newQuantity > maxQtyPerPerson) {
      return res.status(400).json({
        success: false,
        message: `You can only add up to ${maxQtyPerPerson} items of this product.`,
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: 'Cart not found' });
    }

    const existingItemIndex = cart.items.findIndex((item) =>
      item.productId.equals(productId)
    );
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      return res
        .status(404)
        .json({ success: false, message: 'Item not found in cart' });
    }

    await cart.save();
    res.json({ success: true, message: 'Quantity updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getCartPage,
  addToCart,
  removeFromCart,
  updateCartQuantity,
};
