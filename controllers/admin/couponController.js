const express = require('express');
const Coupon = require('../../models/couponSchema'); 

const getCouponPage=async(req,res)=>{
    try {
        console.log("hai")
        const coupons = await Coupon.find(); 
        res.render('coupon', { coupons }); 
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).send('Error loading coupons');
    }
}

const getAddCouponPage=async(req,res)=>{
    res.render('addCoupon')
}
const createCoupon = async (req, res) => {
    try{
    const { code, value, expirationDate, usageLimit, minimumPurchaseAmount, isActive } = req.body;

        const newCoupon = new Coupon({
            code,
            value,
            expirationDate: new Date(expirationDate),
            usageLimit,
            minimumPurchaseAmount,
            isActive
        });

        await newCoupon.save();
        res.status(201).json(newCoupon);
    } catch (error) {
        console.error('Error saving coupon:', error);
        res.status(500).json({ error: 'Error creating coupon' });
    }
};


// Route to delete a coupon by code
const deleteCoupon= async (req, res) => {
    const code = req.params.code;

    try {
        const result = await Coupon.deleteOne({ code: code }); 

        if (result.deletedCount === 1) {
            return res.status(200).json({ message: 'Coupon deleted successfully!' });
        } else {
            return res.status(404).json({ error: 'Coupon not found' });
        }
    } catch (error) {
        console.error('Error deleting coupon:', error);
        return res.status(500).json({ error: 'An error occurred while deleting the coupon.' });
    }
};




module.exports = {
    getCouponPage,
    getAddCouponPage,
    createCoupon,
    deleteCoupon
}
