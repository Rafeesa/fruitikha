const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
const User=require("../../models/userSchema")



const fs=require("fs")
const path=require("path")
const sharp=require("sharp")
const { name } = require("ejs")




// Show form to create a new Product


const showNewProductForm=async (req,res)=>{
    try {
       const category=await Category.find() 
       res.render("addProduct",{
        cat:category,

       })
    } catch (error) {
      res.redirect("/admin/addProducts")  
    }
}

const getAllProduct = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    const productData = await Product.find({
      name: { $regex: new RegExp(".*" + search + ".*", "i") },
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    const count = await Product.find({
    name: { $regex: new RegExp(".*" + search + ".*", "i") },
    }).countDocuments()

    const categories = await Category.find();
if(categories){
 // Pass 'productData' as 'products'
 res.render("product", {
  data: productData, // Here 'products' is used
  currentPage: page,
  totalPages: Math.ceil(count / limit),
  cat: categories,
});
}else{
  console.log("error:Categories not found")
}
   
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
const addProducts=async(req,res)=>{
  try {
    const products=req.body
    const { name, description, category, price,stock } = req.body;
    const productExist = await Product.findOne({
      productName: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
   //   productName:products.productName,

    //})
    if(!productExist){
      const images=[];
      if(req.files && req.files.length>0)
      {
        for(let i=0;i<req.files.length;i++)
        {
          const originalImagePath=req.files[i].path
          const resizedImagePath=path.join('public','uploads','product-images',req.files[i].filename)
          await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath)
          images.push(req.files[i].filename)
        }
      }
      const categoryId=await Category.findOne({name:products.category})
      if(!categoryId){
        return res.status(400).join("Invalid category name")
      }


      const newProduct=new Product({
        name:name,
        description:description,
        category:categoryId._id,
        price:price,
        stock:stock,
        createdOn: new Date(), 
       productImage: images 
        
        
      })
      await newProduct.save();
      return res.redirect("/admin/Product")
    }else{
      return res.status(400).json("Product already exist,please try with another name")
    }
  } catch (error) {
    console.error("Error saving Product",error)
    return res.redirect("/admin/products")
  }
}

/*const getEditProduct=async(req,res)=>{
  try {
    const id=req.query.id
    const product=await Product.findOne({_id:id})
    const category=await Category.find({})
    res.render("edit-product",{
      product:product,
      cat:category})
  } catch (error) {
    console.error("error")
  }
}

const editProduct=async(req,res)=>{
  try {
    const id=req.params.id
    const product=await Product.findOne({_id:id})
    const data=req.body
    const existingProduct=await Product.findOne({
      productName:data.name,
      _id:{$ne:id}
    })
    if(existingProduct){
      return res.status(400).json({error:"Product with this name alraedy exist.please try with another one"})
    }

    const images=[];
    if(req.files&&req.files.length>0){
      for(let i=0;i<req.files.length;i++)
      {
        images.push(req.files[i].filename)
      }
    }
    const updateFields = {
      name: data.name, 
      description: data.description,
      category: product.category,
      price: data.price,
      productImage: images.length > 0 ? images : product.productImage // Preserve existing images if no new ones
    };
    
/*if (req.files && req.files.length > 0) {
    await Product.findByIdAndUpdate(id, {
       $addToSet: { productImage: { $each: images } }
     }, { new: true });
    }*/

   /*  if(req.files.length>0)
     {
      updateFields.$push={productImage:{$each:images}}
     }

    
    await Product.findByIdAndUpdate(id, updateFields, { new: true });
    res.redirect("/admin/Product"); // Redirect after successful update 
    
  } catch (error) {
    console.error(error)
    
  }
}

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;
    
    // Find and update the product to remove the image
    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer }
    });

    // Build the full path to the image
    const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);
    
    // Check if the image exists
    if (fs.existsSync(imagePath)) {
      // Delete the image asynchronously
      await fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
      res.send({ status: true, message: "Image deleted successfully" });
    } else {
      console.log(`Image ${imageNameToServer} not found`);
      res.status(404).send({ status: false, message: "Image not found" });
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: false, message: "Error deleting the image" });
  }
};
*/
// Get product details for editing
const getEditProduct = async (req, res) => {
  try {
      const id = req.query.id;
      const product = await Product.findOne({ _id: id });
      const category = await Category.find({});
      res.render("edit-product", {
          product,
          cat: category,
      });
  } catch (error) {
      console.error("Error fetching product for editing", error);
  }
};

// Edit an existing product
const editProduct = async (req, res) => {
  try {
      const id = req.params.id;
      const data = req.body;
      const product = await Product.findOne({ _id: id });

      const existingProduct = await Product.findOne({
          name: data.name,
          _id: { $ne: id }
      });
      if (existingProduct) {
          return res.status(400).json({ error: "Product with this name already exists, please try another name" });
      }
      // Update category
    const categoryId = await Category.findOne({ name: data.category });
    if (!categoryId) {
      return res.status(400).json({ error: "Invalid category" });
    }

      const images = [];
      if (req.files && req.files.length > 0) {
          for (let i = 0; i < req.files.length; i++) {
              images.push(req.files[i].filename);
          }
      }

      const updateFields = {
          name: data.name,
          description: data.description,
          category: categoryId._id,
          price: data.price,
          stock:data.stock,
          productImage: images.length > 0 ? images : product.productImage, // Keep existing images if no new ones
      };

      await Product.findByIdAndUpdate(id, updateFields, { new: true });
      res.redirect("/admin/Product");
  } catch (error) {
      console.error("Error editing product", error);
  }
};

// Delete a single image from a product
const deleteSingleImage = async (req, res) => {
  try {
      const { imageNameToServer, productIdToServer } = req.body;

      // Ensure imageNameToServer is defined
      if (!imageNameToServer || !productIdToServer) {
          return res.status(400).send({ status: false, message: "Invalid request data" });
      }

      // Find and update the product to remove the image
      const product = await Product.findByIdAndUpdate(productIdToServer, {
          $pull: { productImage: imageNameToServer }
      });

      if (!product) {
          return res.status(404).send({ status: false, message: "Product not found" });
      }

      // Build the full path to the image
      const imagePath = path.join("public", "uploads", "product-images", imageNameToServer);

      // Check if the image exists
      if (fs.existsSync(imagePath)) {
          // Delete the image asynchronously
          await fs.unlinkSync(imagePath);
          console.log(`Image ${imageNameToServer} deleted successfully`);
          res.send({ status: true, message: "Image deleted successfully" });
      } else {
          console.log(`Image ${imageNameToServer} not found`);
          res.status(404).send({ status: false, message: "Image not found" });
      }
  } catch (error) {
      console.error("Error deleting image", error);
      res.status(500).send({ status: false, message: "Error deleting the image" });
  }
};
const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id; // Retrieve the product ID from the request parameters

    // Use `findByIdAndDelete` to remove the product from the database
    await Product.findByIdAndDelete(productId);

    // Redirect to the product listing page after successful deletion
    res.redirect('/admin/product');
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).send('Internal Server Error');
  }
};


module.exports={
    showNewProductForm,
    getAllProduct,
    addProducts,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    deleteProduct
}