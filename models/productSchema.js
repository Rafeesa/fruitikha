const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
         },
    description: { 
        type: String,
         required: true 
        },
    price: { 
        type: Number, 
        required: true
         },
         category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'category',  // Reference to the Category model
            required: true
        },
   productImage: {
    type:[String],
    required:true
   },
 
    
},{timestamps:true});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;