const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

//defining schema for the user
const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true,"enter a name"],
    },
    
    avatar:{
        public_id:String,
        url:String
    },

    email:{
        type:String,
        required:[true,"enter a email"],
        unique:[true,"email already exists"],
    },

    password:{
        type: String,
        required:[true,"enter a password"],
        minlength:[6,"password must be atleast 6 characters long"],
        select: false,
    },

    posts:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Post"
        },
    ],

    followers:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
        }
    ],

    following:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
        }
    ]
});

//defining middleware to check if the password is modified
userSchema.pre("save",async function (next){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password,10);
    }

    next();
});

// defining methods to be used by a user object

userSchema.methods.matchPassword= async function (password ){
    return await bcrypt.compare(password,this.password); 
}

userSchema.methods.generateTokens = async function (){
    return jwt.sign({
        _id : this._id
    },process.env.JWT_SECRET)
}

module.exports = mongoose.model("User",userSchema);