const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const express = require("express");
const router = express.Router();
const auth = require("./auth.js");

const SALT_WORK_FACTOR = 10;

// Users

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    tokens: []
});

userSchema.pre("save", async function(next){
    if(!this.isModified("password"))
        return next();

    try{
        const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);

        const hash = await bcrypt.hash(this.password, salt);

        this.password = hash;
        next();
    } catch(error){
        console.log(error);
        next(error);
    }
});

userSchema.methods.comparePassword = async function(password){
    try{
        const isMatch = await bcrypt.compare(password, this.password);
        return isMatch;
    } catch(error){
        return false;
    }
};

userSchema.methods.toJSON = function(){
    var obj = this.toObject();
    delete obj.password;
    delete obj.tokens;
    return obj;
};

userSchema.methods.addToken = function(token){
    this.tokens.push(token);
}

userSchema.methods.removeToken = function(token){
    this.tokens = this.tokens.filter(t => t != token);
}

userSchema.methods.removeOldTokens = function(){
    this.tokens = auth.removeOldTokens(this.tokens);
}

const User = mongoose.model("User", userSchema);

async function login(user, res){
    let token = auth.generateToken({
        id: user._id
    }, "24h");

    user.removeOldTokens();
    user.addToken(token);
    await user.save();

    return res
        .cookie("token", token, {
            expires: new Date(Date.now() + 86400 * 1000)
        })
        .status(200).send(user);
}

router.get("/", auth.verifyToken, async (req, res) => {
    const user = await User.findOne({
        _id: req.user_id
    });
    if(!user)
        return res.status(403).send({
            error: "must login"
        });

    return res.send(user);
})

router.post("/", async (req, res) => {
    if(!req.body.username || !req.body.password)
        return res.status(400).send({
            message: "username and password are required"
        });

    try{
        const existingUser = await User.findOne({
            username: req.body.username
        });
        if(existingUser)
            return res.status(403).send({
                message: "username already exists"
            });
        
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });
        await user.save();
        login(user, res);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.post("/login", async (req, res) => {
    if(!req.body.username || !req.body.password)
        return res.sendStatus(400);

    try{
        const existingUser = await User.findOne({
            username: req.body.username
        });
        if(!existingUser)
            return res.status(403).send({
                message: "username or password is wrong"
            });

        if(!await existingUser.comparePassword(req.body.password))
            return res.status(403).send({
                message: "username or password is wrong"
            });

        login(existingUser, res);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.delete("/", auth.verifyToken, async (req, res) => {
    const user = await User.findOne({
        _id: req.user_id
    });
    if(!user)
        return res.clearCookie("token").status(403).send({
            error: "must login"
        });

    user.removeToken(req.token);
    await user.save();
    res.clearCookie("token");
    res.sendStatus(200);
})

module.exports = router;