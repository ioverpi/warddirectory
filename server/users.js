const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const express = require("express");
const router = express.Router();
const auth = require("./auth.js");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");

// Users

const User = mongoose.model("Member"); //We are making members users. 

async function login(user, res){
    let token = auth.generateToken({
        id: user._id
    }, "24h");

    user.removeOldTokens();
    user.addToken(token);
    user.logEvent("Login", Date.now(), "Logged in successfully!", true);
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

/* For now, I'm not going to worry about letting a member register as a user. This will probably be done on the Clerk's side.
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
*/

//function resetPassword
const RESET_TOKEN_SEPARATOR = "---";
const RESET_TOKEN_EXPIRATION = 900000; //Specifies how to long to keep the token. 
function resetToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + RESET_TOKEN_SEPARATOR + Date.now();
}

function validResetToken(user, token) {
    let resetTokens = user.tokens.filter(t => t.split(RESET_TOKEN_SEPARATOR).length > 1);
    for(tok in resetTokens) {
        let data = tok.split(RESET_TOKEN_SEPARATOR);
        if(token == data[0] && Date.now() - parseInt(data[1]) < RESET_TOKEN_EXPIRATION) {
            return true;
        }
    }
    return false;
}

async function genTokenSendEmail(user, res) {
    try {
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + RESET_TOKEN_EXPIRATION;
        await user.save();

        if(process.env.DEBUG_MODE) {
            console.log(`${process.env.DEBUG_MODE?"http":"https"}://${process.env.SERVER_HOST}${(process.env.SERVER_PORT == 443 || process.env.SERVER_PORT == 80)?"":`:${process.env.SERVER_PORT}`}/api/users/reset/${token}`);
            return;
        }

        /* Gmail is finnicky!!
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_ADDRESS, 
                pass: process.env.EMAIL_PASSWORD
            }
        });
        */ 

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: true,
            auth: {
                user: process.env.EMAIL_ADDRESS,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        if(user.email == "" || !user.email) {
            console.log(`For some reason, ${user.firstname} ${user.lastname} had an empty email when accessing the object. Here is the user:`);
            console.log(user);
        }

        const mailOptions = {
            from: process.env.EMAIL_ADDRESS,
            to: `${process.env.DEBUG_MODE?"kellon08@gmail.com":user.email}`, //For now, we don't want mail going to anybodies address. Maybe change this later.
            subject: `Link to Reset Password`,
            text: 
`You are receiving this because you (or someone else) have requested the reset of the password for your account or this is your first time signing in.

Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:

${process.env.DEBUG_MODE?"http":"https"}://${process.env.SERVER_HOST}${(process.env.SERVER_PORT_EXTERNAL == 443 || process.env.SERVER_PORT_EXTERNAL == 80)?"":`:${process.env.SERVER_PORT_EXTERNAL}`}/api/users/reset/${token}

If you did not request this, please ignore this email and your password will remain unchanged.
`
        }

        await transporter.sendMail(mailOptions);
    } catch(error) {
        console.log(`Failed to send email to ${user.email}.`);
        console.log(error);
        return res.sendStatus(500);
    }

}

const obscureAuthMessage = `Email or password is wrong. Please contact ${process.env.EMAIL_ADDRESS} for assistance.`;

router.post("/login", async (req, res) => {
    if(!req.body.email) //I want an email instead of a username now. 
        return res.sendStatus(400);

    try{
        const existingUser = await User.findOne({
            email: req.body.email
        });
        if(!existingUser)
            return res.status(403).send({
                message: obscureAuthMessage
            });

        if(!existingUser.password) {
            await genTokenSendEmail(existingUser, res);
            existingUser.logEvent("Reset Password", 
                Date.now(), 
                `Sent password reset email. Reason for the password reset: ${user.password?"Forgotten Password":"New user"}.`, 
                true);
            existingUser.save();
            return res.status(200).send({
                message: "This is your first time logging in. We have sent an email to you to set your password. NOTE: Please check your spam folder if nothing arrives!"
            });
        }

        if(!req.body.password) return res.sendStatus(400);

        if(!await existingUser.comparePassword(req.body.password)){
            existingUser.logEvent("Login", 
                Date.now(), 
                "Tried to log in with a bad password.",
                false);
            existingUser.save();
            return res.status(403).send({
                message: obscureAuthMessage
            });
        }

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
    user.logEvent("Logout", Date.now(), "Logged out successfully", true);
    await user.save();
    res.clearCookie("token");
    res.sendStatus(200);
})

router.post("/forgot_password", async (req, res) => {
    if(!req.body.email) 
        return res.sendStatus(400);

    try{
        const user = await User.findOne({
            email: req.body.email
        });
        if(!user) return res.status(403).send({
            message: obscureAuthMessage
        });
        genTokenSendEmail(user, res);
        return res.status(200).send({
            message: "We have sent an email to you to set your password. NOTE: Please check your spam folder if nothing arrives!"
        });
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
})

router.get("/reset/:token", async (req, res) => {
    try{
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: {$gt: Date.now()}
        });
        if(!user)
            return res.status(401).send({
                message: "Password reset token is invalid or has expired."
            });

        res.sendFile(path.resolve("../public/reset_password.html"));
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.post("/reset/:token", async (req, res) => {
    try{
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: {$gt: Date.now()}
        });
        if(!user)
            return res.status(401).send({
                message: "Password reset token is invalid or has expired."
            });

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.logEvent("Reset Password",
            Date.now(),
            "Successfully reset password!",
            true);
        await user.save();
        return res.status(200).send("Password reset successful! You may close this page.")
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

module.exports = router;