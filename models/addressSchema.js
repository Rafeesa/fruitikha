/*const mongoose = require("mongoose");
const {Schema} = mongoose;


const addressSchema = new Schema({
    userId: {
        type:Schema.Types.ObjectId,
        ref:"User",
        required : true
    },
    address: [{
        name:{
            type:String,
            required:true,
        },
       houseName:{
            type : String,
            required : true,
        },
        city:{
            type: String,
            required :true,
        },
        landMark:{
            type: String,
            required :true
        },
        state:{
            type:String,
            required:true
        },
        pincode: {
            type : Number,
            required:true,
        },
        country: {
            type: String,
            required: true, 
          },
        phone:{
            type : String,
            required :true,
        },
        email:{
            type:String,
            required:true,
        },
       
       
    }]
})


const Address = mongoose.model("Address",addressSchema);*/
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: [
        {
            name: {
                type: String,
                required: [true, 'Name is required']
            },
            email: {
                type: String,
                required: [true, 'Email is required'],
                match: [/.+\@.+\..+/, 'Please fill a valid email address']
            },
            phone: {
                type: String,
                required: true
            },
            country: {
                type: String,
                required: true
            },
            pincode: {
                type: String,
                required: true
            },
            state: {
                type: String,
                required: true
            },
            landMark: {
                type: String,
                required: true
            },
            city: {
                type: String,
                required: true
            },
            houseName: {
                type: String,
                required: true
            }
        }
    ]
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
