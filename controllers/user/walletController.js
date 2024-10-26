

const User = require("../../models/userSchema");


const getWallet = async (req, res) => {
    const userId = req.session.passport?.user; 

    if (!userId) {
        return res.redirect('/login'); 
    }

    try {
        const user = await User.findById(userId).select('walletBalance walletTransactions'); 
        res.render('wallet', { user }); 
    } catch (error) {
        console.error('Error fetching wallet:', error);
        res.status(500).send('Internal Server Error');
    }
};



module.exports={
    getWallet
}