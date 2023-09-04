const User = require("../models/User");
const Post = require("../models/Post");


//function to use in catch block
const catcher = (error,res) => {
    return res.status(500).json({
        success : false,
        message : error.message,
    });
}

//function to register a new user
exports.register = async (req,res) =>{
    try{
        const {name , email, password } = req.body;
        // checking if the user already exists
        let user = await User.findOne({email});
        if(user){
            return res
            .status(400)
            .json({success:false,message:"User already exists with the provided email"});
        }

        // creating a new user
        user = await User.create({
            name,
            email,
            password,
            avatar : {
                public_id : "sample public id",
                url : "sample url"
            }
        });

        // generating jwt token to remeber the login
        const token = await user.generateTokens();

        //options to save in the cookie
        const options = {
            expires : new Date(Date.now()+90*24*60*60*1000),
            httpOnly : true
        };

        return res.status(201)
        .cookie("token",token, options)
        .json({
            success:true,
            user,
            token
        });

    }catch(err){
        res.status(500).json({
            success : false,
            message : err.message,
        });
    }
};


//function to login an existing user
exports.login = async (req,res) => {
    
    try{
        const {email,password} = req.body;
        let user = await User.findOne({email}).select("+password");

        //authenticating email
        if(!user){
            return res.status(400).json({
                sucess : false,
                message : "user does not exists with this email"
            });
        }

        //authenticating password
        const isMatch = await user.matchPassword(password);

        if(!isMatch){
            return res.status(400).json({
                success : false,
                message : "password not matching"
            });
        }

        //generating token to remember the login
        const token = await user.generateTokens();

        const options = {
            expires : new Date(Date.now()+90*24*60*60*1000),
            httpOnly : true
        };

        return res.status(200)
        .cookie("token",token, options)
        .json({
            success:true,
            user,
            token
        });

    }catch(err){
        return res.status(500).json({
            success:false,
            message : err.message
        });
    }
};

//function to logout
exports.logout = async (req,res) => {
    try {
        //deleting the cookie data and removing the jwt token
        return res
            .status(200)
            .cookie("token",null,{ expires : new Date(Date.now()),httpOnly : true})
            .json({
                success : true,
                message : "user logged out"
            });

    } catch (error) {
        return res = catcher(error,res);
    }
};

//function to follow an user
exports.followUser = async (req,res) =>{
    try {

        //getting both the users
        const userToFollow = await User.findById(req.params.id);
        const loggedInUser = await User.findById(req.user._id);

        //checking valid user id
        if(!userToFollow){
            return res.status(404).json({
                success : false,
                message : "user not found",
            });
        }

        //checking if already followed than unfollow 

        if(userToFollow.followers.includes(loggedInUser._id)){

            //unfollowing
            const followerIndex = userToFollow.followers.indexOf(loggedInUser._id);
            const followingIndex = loggedInUser.following.indexOf(userToFollow._id);
            userToFollow.followers.splice(followerIndex,1);
            loggedInUser.following.splice(followingIndex,1);
        }else{

            //if not followed than follow the user

            //following
            loggedInUser.following.push(userToFollow._id);
            userToFollow.followers.push(loggedInUser._id);
        }

        await loggedInUser.save();
        await userToFollow.save();
       
        

        //sending success response
       if (userToFollow.followers.includes(loggedInUser._id)) {
         return res.status(200).json({
             success : true,
             message : "user followed",
         });
       } else {
        return res.status(200).json({
            success : true,
            message : "user unfollowed",
        });
       }

    } catch (error) {
        return res.status(500).json({
            success:false,
            message : error.message
        });
    }
};

//function to update the password
exports.updatePassword = async (req,res) => {
    try {
        const user = await User.findById(req.user._id).select("+password");

        const { oldPassword, newPassword } = req.body;

        //if fields not provided
        if(!oldPassword || !newPassword){
            return res.status(400).json({
                success : false,
                message : "please provide old password and new password",
            });
        }
        // matching old password
        const isMatch = await user.matchPassword(oldPassword);

        if(!isMatch){
            return res.status(400).json({
                success : false,
                message : "incorrect old password"
            });
        }

        user.password = newPassword;

        await user.save();

        return res.status(200).json({
            success : true,
            message : "password updated",
        });

    } catch (error) {
        return catcher(error,res);
    }
};

//function to update the profile of the user
exports.updateProfile = async (req,res) => {
    try {
        
        const user = await User.findById(req.user._id);

        const {name , email} = req.body;

        //updating the name
        if(name){
            user.name = name;
        }
        
        //updating the email address
        if(email){
            user.email = email;
        }

        await user.save();

        return res.status(200).json({
            success : true,
            message : "user updated",
        });
    } catch (error) {
        return catcher(error,res);
    }
};

//function to delete the profile of the user
exports.deleteMyProfile = async (req,res) => {
    try {
        const user = await User.findById(req.user.id);

        const following = user.following;
        const followers = user.followers;
        const posts = user.posts;

        // updating followers list of all the accounts user follows 
        for(let i=0;i<following.length;i++){
            const followedUser = await User.findById(following[i]);
            const followerIndex = followedUser.followers.indexOf(user._id);
            followedUser.followers.splice(followerIndex,1);
            await followedUser.save();
        }

        // updating the following list of all the followers of the user
        for(let i=0;i<followers.length;i++){
            const followingUser = await User.findById(followers[i]);
            const followingIndex = followingUser.following.indexOf(user._id);
            followingUser.following.splice(followingIndex,1);
            await followingUser.save();
        }

        //deleting all the posts from the database of that user
        for(let i=0;i<posts.length;i++){
            const post = await Post.findById(posts[i]);
            await post.deleteOne();
        }

        //removing user from the database
        user.deleteOne();

        //removing cookie data (logging out) in the response
        return res.status(200)
        .cookie("token",null,{ expires : new Date(Date.now()),httpOnly : true})
        .json({
            success : true,
            message : "user deleted"
        });
    } catch (error) {
        return catcher(error,res);
    }
};

//function to send all self profile data
exports.myProfile = async (req,res) => {
    try {
        //populating all the posts of the user
        const user = await User.findById(req.user.id).populate("posts");

        //sending the user
        res.status(200).json({
            success : true,
            user
        });

    } catch (error) {
        return catcher(error,res);
    }
};


//function to send all data of a selected user
exports.getUserProfile = async (req,res) => {
    try {
        //populating all the posts of the user
        const user = await User.findById(req.params.id).populate("posts");

        //checking the existense
        if(!user){
            return res.status(404).json({
                success : false,
                message : "user not found",
            });
        }

        //sending the user
        res.status(200).json({
            success : true,
            user
        });

    } catch (error) {
        return catcher(error,res);
    }
};

//function to get all users
exports.getAllUsers = async (req,res) => {
    try {
        const users = await User.find({});

        res.status(200).json({
            success : true,
            users
        });
    } catch (error) {
        return catcher(error,res)
    }
}

// function to execute when we forgot our password
exports.forgotPassword = async (req,res) => {
    try {
        
       // build after you get a mail

    } catch (error) {
        return catcher(error,res);
    }
}