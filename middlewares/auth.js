const User=require("../models/userSchema")



/*const userAuth=(req,res,next)=>
{
   if(req.session.user) 
   {
    User.findById(req.session.user)
    .then(data=>{
        if(data && !data.isBlocked)
        {
            next();
        }
        else
        {
            res.redirect("/login")
        }
    })
    .catch(error=>{
        console.log("Error in user auth middleware")
        res.status(500).send("Internal server error")
    })
   }
   else{
    res.redirect("/login")
   }
}*/
/*const userAuth = (req, res, next) => {
    if (req.session.user) {
      console.log("User session ID:", req.session.user); // Debug Log
  
      // Find user by the ID stored in session
      User.findById(req.session.user)
        .then(data => {
          if (data) {
            console.log("User found:", data); // Debug Log
  
            if (!data.isBlocked) {
              next();
            } else {
              console.log("User is blocked"); // Debug Log
              res.redirect("/login");
            }
          } else {
            console.log("User not found in database"); // Debug Log
            res.redirect("/login");
          }
        })
        .catch(error => {
          console.error("Error in user auth middleware:", error);
          res.status(500).send("Internal server error");
        });
    } else {
      console.log("User not logged in"); // Debug Log
      res.redirect("/login");
    }
  };*/
  
  const userAuth = async (req, res, next) => {
    try {
      // Ensure user session exists
      if (req.session.user) {
        console.log("User session ID:", req.session.user); // Debug Log
  
        // Find user by ID stored in session
        const user = await User.findById(req.session.user);
        
        if (user) {
          console.log("User found:", user); // Debug Log
  
          // Check if user is blocked
          if (!user.isBlocked) {
            // Attach user info to the request for further use in route handlers
            req.currentUser = user;
            return next();
          } else {
            console.log("User is blocked"); // Debug Log
            return res.redirect("/login");
          }
        } else {
          console.log("User not found in database"); // Debug Log
          return res.redirect("/login");
        }
      } else {
        console.log("User not logged in"); // Debug Log
        return res.redirect("/login");
      }
    } catch (error) {
      console.error("Error in user auth middleware:", error);
      res.status(500).send("Internal server error");
    }
  };
  

const adminAuth=(req,res,next)=>{
User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
        next()
    }
    else{
        res.redirect("/admin/login")
    }
})
.catch(error=>{
    console.log("Error in adminauth middleware")
    res.status(500).send("internal server error")
})
}



module.exports={
    userAuth,
    adminAuth
}