const User=require("../../models/userSchema")



const customerInfo=async(req,res)=>{
    try{
       let search="";
       if(req.query.search)
        {
         search=req.query.search   
        } 
        let page=1;
        if(req.query.page){
            page=parseInt(req.query.page)
        }
        const limit=3
        
        //fetch customers with pagination
        const userData=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}}
            ]
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();

        //count total customers
        const count=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}}
            ]
        }).countDocuments()

        //calculate total pages
        const totalPages=Math.ceil(count/limit)

        res.render("customers",{data:userData,
            currentPage:page,
        totalPages:totalPages,
    })
    }catch(error)
    {
console.error(error)
res.status(500).send('Server Error')
    }
}




const customerBlocked=async(req,res)=>
{
try{
    let id=req.query.id
    await User.updateOne({_id:id},{$set:{isBlocked:true}})
    res.redirect("/admin/users")
}catch(error){
console.log("error")
}
}


const customerunBlocked=async(req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
    } catch (error) {
        
    }
}





module.exports={
    customerInfo,
    customerBlocked,
    customerunBlocked
}