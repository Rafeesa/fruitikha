const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address= require("../../models/addressSchema")
const Cart=require("../../models/cartSchema")



const getCartPage = async (req, res) => {
  try {
    const userId = req.user.id; 
    console.log(userId);

    
   const cart = await Cart.findOne({ userId }).populate('items.productId');

if (!cart) {
  console.log('No cart found for this user. Consider creating a new cart.');
  
  
  const newCart = new Cart({ userId, items: [] });
  await newCart.save();
  console.log('New cart created:', newCart);
} else {
  console.log('Cart found:', cart);
}


    if (!cart || cart.items.length === 0) {
      
      return res.render('cart', { cartItems: [], subtotal: 0, shippingCost: 45.00, total: 45.00 });
    }

    
    let subtotal = 0;
    cart.items.forEach(item => {
      if (item.productId) { 
        subtotal += item.productId.price * item.quantity;
      }
    });

    const shippingCost = 45.00;
    const total = subtotal + shippingCost;

    
    res.render('cart', { cartItems: cart.items, subtotal, shippingCost, total });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    const quantityToAdd = Number(quantity);

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    
    const maxQtyPerPerson = 5;

    
    if (quantityToAdd > product.stock) {
      return res.status(400).send(`Only ${product.stock} items are available in stock.`);
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(item => item.productId.equals(productId));
    if (existingItemIndex > -1) {
      const totalQuantity = cart.items[existingItemIndex].quantity + quantityToAdd;

      
      if (totalQuantity > product.stock) {
        return res.status(400).send(`You can only add up to ${product.stock} items in total for this product.`);
      }

      if (totalQuantity > maxQtyPerPerson) {
        return res.status(400).send(`You can only add up to ${maxQtyPerPerson} items of this product.`);
      }

      cart.items[existingItemIndex].quantity += quantityToAdd;
    } else {
      // New item - check if quantity exceeds max limit
      if (quantityToAdd > maxQtyPerPerson) {
        return res.status(400).send(`You can only add up to ${maxQtyPerPerson} items of this product.`);
      }
      cart.items.push({ productId, quantity: quantityToAdd });
    }

    await cart.save();
    res.redirect('/cart');
  } catch (error) {
    console.error(error);
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
    const itemIndex = cart.items.findIndex(item => item.productId.equals(productId));
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
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const maxQtyPerPerson = 5;
    if (newQuantity > product.stock) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${product.stock} items are available in stock.` 
      });
    }

    if (newQuantity > maxQtyPerPerson) {
      return res.status(400).json({ 
        success: false, 
        message: `You can only add up to ${maxQtyPerPerson} items of this product.` 
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const existingItemIndex = cart.items.findIndex(item => item.productId.equals(productId));
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
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
}