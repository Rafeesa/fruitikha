const User = require("../../models/userSchema");
const Product = require('../../models/productSchema'); 



/*const getWishlist= async (req, res) => {
    try {
      const user = await User.findById(req.user._id).populate('wishlist'); // Populate product details
      res.render('wishlist', { wishlist: user.wishlist });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching wishlist');
    }
  }*/
    const getWishlist = async (req, res) => {
        try {
          
          const userId = req.user._id; 
          
          const user = await User.findById(userId).populate('wishlist');
          
          const productIds = user.wishlist; 
          const wishlistItems = await Product.find({ _id: { $in: productIds } });
      
          res.render('wishlist', { wishlist: wishlistItems });
        } catch (error) {
          console.error(error);
          res.status(500).send('Error fetching wishlist');
        }
      };
      
 
/*const addToWishlist= async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // Get the logged-in user
    const productId = req.params.productId;

    // Avoid duplicates in the wishlist
    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.redirect('/wishlist');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding to wishlist');
  }
}*/
const addToWishlist = async (req, res) => {
    try {
      const userId = req.user.id; 
      const productId = req.body.productId; 
      console.log('User ID:', userId);
      console.log('Product ID:', productId);
  
      const user = await User.findById(userId); 
  
      // Avoid duplicates in the wishlist
      if (!user.wishlist.includes(productId)) {
        user.wishlist.push(productId);
        await user.save();
      }
  
      res.redirect('/wishlist'); 
    } catch (error) {
      console.error(error);
      res.status(500).send('Error adding to wishlist');
    }
  };
  
  
  

  const removeWishlist = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user || !user.wishlist) {
        return res.status(404).json({ message: 'User or wishlist not found' });
      }
  
      user.wishlist = user.wishlist.filter(id => id && id.toString() !== req.params.productId);
      await user.save();
      
      res.status(200).json({ message: 'Item removed from wishlist' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error removing from wishlist' });
    }
  };
  
  
 /* const toggleWishlist = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      const productId = req.body.productId;
  
      // Check if the product is already in the wishlist
      const productIndex = user.wishlist.indexOf(productId);
  
      if (productIndex === -1) {
        // Product not in wishlist, add it
        user.wishlist.push(productId);
      } else {
        // Product already in wishlist, remove it
        user.wishlist.splice(productIndex, 1);
      }
  
      await user.save();
      res.redirect('back'); // Redirect to the previous page
    } catch (error) {
      console.error(error);
      res.status(500).send('Error toggling wishlist');
    }
  };
  */
  


  module.exports={
    getWishlist,
    addToWishlist,
    removeWishlist

  }
  