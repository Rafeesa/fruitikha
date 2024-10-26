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
         salePrice:{
            type:Number,
            required:false
         },
         category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'category',  // Reference to the Category model
            required: true
        },
        stock: {
            type: Number,
            required: true
           // default: 0, 
          },
          productOffer:{
            type:Number,
            deafault:0
          },
   productImage: {
    type:[String],
    required:true
   },
 
    
},{timestamps:true});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;