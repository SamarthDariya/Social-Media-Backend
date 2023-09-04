const Post = require("../models/Post");
const User = require("../models/User");

//function to use in catch block
const catcher = (error,res) => {
    return res.status(500).json({
        success : false,
        message : error.message,
    });
}

// function to create a post
exports.createPost = async (req,res) =>{
    try{
        // using schema
        const newPostData = {
            caption: req.body.caption,
            image:{
                public_id : "req.body.public_id",
                url : "req.body.url"
            },
            owner : req.user._id,
        }

        // creating the post in the database
        const post = await Post.create(newPostData);
        
        //updating the post in the user database
        const user = await User.findById(req.user._id);
        
        user.posts.push(post._id);

        await user.save();

        return res.status(201).json({
            success : true,
            post,
        });
    }catch(err){
        return res.status(500).json({
            success:false,
            message: err.message
        })
    }
};

//function to delete a post 
exports.deletePost = async (req,res) => {
    try {

        const post = await Post.findById(req.params.id);
        //checking the validity of post
        if(!post){
            return res.status(404).json({
                success : false,
                message : "post not found",
            });
        }

        //checking the owner of the post
        if(post.owner.toString() !== req.user._id.toString()){
            return res.status(401).json({
                success : false,
                message : " you are not the owner of this post ",
            });
        }

        //deleting the post
        await post.deleteOne();

        //updating the user database
        const user = await User.findById(req.user._id);
        const index = user.posts.indexOf(req.params.id);
        user.posts.splice(index,1);

        await user.save();

        return res.status(200).json({
            success : true,
            message : "post deleted",
        });


    } catch (error) {
        return res.status(500).json({
            success : false,
            message : error.message,
        });
    }
}

//function to like and unlike the post
exports.likeAndUnlikePost = async (req,res) => {
    try {
        const post = await Post.findById(req.params.id);

        //checking the validity of the post
        if(!post){
            return res.status(404).json({
                success : false,
                message : "post not found",
            });
        }

        //checking if we have to like it or unlike it
        if(post.likes.includes(req.user._id)){

            //unliking the post by removing the user in post database
            const index = post.likes.indexOf(req.user._id);
            post.likes.splice(index,1);
            await post.save();

            return res.status(200).json({
                success : true,
                message : "post unliked",
            });

        }else{

            //liking the post by adding the user to the database
            post.likes.push(req.user._id);

            await post.save();

            return res.status(200).json({
                success : true,
                message : "post liked",
            });
        }

        

    } catch (error) {
        return res.status(500).json({
            success : false,
            message : error.message,
        });
    }
};

//function to send all the posts of all the users one follows
exports.getPostOfFollowing = async (req,res) => {
    try {
        //getting the user
        const user = await User.findById(req.user._id);

        //getting all the posts from the database 
        const posts = await Post.find({ owner : {$in : user.following },});

        return res.status(200).json({
            success : true,
            posts,
        });

    } catch (error) {
        return res.status(500).json({
            success : false,
            message : error.message,
        });
    }
};

//function to update the caption of the post
exports.updateCaption = async (req,res) => {
    try {
        
        const post = await Post.findById(req.params.id);

        if(!post){
            return res.status(404).json({
                success : false,
                message : "post not found",
            })
        }

        if(post.owner.toString() !== req.user._id.toString()){
            return res.status(401).json({
                success : false,
                message : "unauthorised",
            })
        }

        post.caption = req.body.caption;
        await post.save();

        return res.status(200).json({
            success : true,
            message : "caption updated",
        });

    } catch (error) {
        return catcher(error,res);
    }
};

//function to add or update a comment in a post 
exports.commentOnPost = async (req,res) => {
    try {
        // getting the post
        const post = await Post.findById(req.params.id);

        // if post not exisit
        if(!post){
            return res.status(404).json({
                success : false,
                message : "post not found",
            });
        }

        //checking if user already commented
        let commentIndex = -1;

        post.comments.forEach((item,index)=>{
            if(item.user.toString() === req.user._id.toString()){
                commentIndex = index;
            }
        });

       if (commentIndex !== -1) {
        //updating the comment
         post.comments[commentIndex].comment = req.body.comment;

         await post.save();
 
         return res.status(200).json({
             success : true,
             message : "comment updated"
         });
       } else {
        //adding new comment
        const user = req.user._id;
 
         const comment = {
             user,
             comment : req.body.comment,
         };
 
         post.comments.push(comment);
 
         await post.save();
 
         return res.status(200).json({
             success : true,
             message : "comment added"
         });
       }

    } catch (error) {
        return catcher(error,res)
    }
}

//function to delete the commen
exports.deleteComment = async (req,res) => {
    try {
        const post = await Post.findById(req.params.id);

        // if post not exisit
        if(!post){
            return res.status(404).json({
                success : false,
                message : "post not found",
            });
        }

        // checking if the ownwer of the post is deleting or another user
        if(post.owner.toString() === req.user._id.toString()){

            //case of owner of the post
            //comment id required in the body
            if(req.body.commentId === undefined){
                return res.status(400).json({
                    success : false,
                    message : "comment id required",
                });
            }


            let commentIndex = -1;

            post.comments.forEach((item,index)=>{
                if(item._id.toString() === req.body.commentId.toString()){
                    commentIndex = index;
                }
            });

            //validity of the comment id
            if(commentIndex === -1){
                return res.status(404).json({
                    success : false,
                    message : "invalid comment id",
                });
            }else{

                //deleting the comment
                post.comments.splice(commentIndex,1);
                await post.save();
                return res.status(200).json({
                    success : true,
                    message : "the comment has been deleted",
                });
            }

        }else{

            //general user
            let commentIndex = -1;

            //finding the comment of the user
            post.comments.forEach((item,index)=>{
                if(item.user.toString() === req.user._id.toString()){
                    commentIndex = index;
                }
            });

            // if no comment
            if(commentIndex === -1){
                return res.status(404).json({
                    success : false,
                    message : "you have not commented on this post",
                });
            }else{
                //deleting the comment
                post.comments.splice(commentIndex,1);
                await post.save();
                return res.status(200).json({
                    success : true,
                    message : "your comment has been deleted",
                });
            }
        }
    } catch (error) {
        return catcher(error,res);
    }
}