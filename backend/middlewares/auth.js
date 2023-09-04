const User = require("../models/User");
const jwt = require("jsonwebtoken");

//middle ware to check if the loginned user is authenticated 
exports.isAuthenticated = async (req,res,next) => {
    try {
        const { token } = req.cookies;
        // if the token is not present means no user is loginned
        if(!token){
            return res.status(401).json({
                success : false,
                message : "please login first",
            });
        }
        // verification for correctness of the token 
        // decode id must be present in the database
        const decoded = await jwt.verify(token,process.env.JWT_SECRET);
        //find the user with the decoded id and then storing it in the request object
        req.user = await User.findById(decoded._id);
        next();
    } catch (error) {
        return res.status(500).json({
            success : false,
            message : error.message
        });
    }

}