const mongoose = require("mongoose");
const auth = require("./auth.js");
const express = require("express");
const router = express.Router();
const variables = require("./variables.js")

// Members

const memberSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    email: String,
    phone: String,
    apt: String,
    photo: Number,
    calling: String,
    address: String
});

const Member = mongoose.model("Member", memberSchema);

router.get("/variables/:type", auth.verifyToken, async (req, res) => {
    try{
        let response = {};
        response[req.params.type] = variables[req.params.type];
        return res.send(response);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.get("/", auth.verifyToken, async (req, res) => {
    try{
        let members = await Member.find();

        return res.send(members);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.post("/", async (req, res) => {
    const member = new Member({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        phone: req.body.phone,
        apt: req.body.apt,
        photo: 0
    });
    try{
        await member.save();

        return res.send(member);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.post("/update", auth.verifyToken, async (req, res) => {
    try{
        const member = await Member.findOne({
            _id: req.body.id
        });
        member.firstname = req.body.firstname;
        member.lastname = req.body.lastname;
        member.email = req.body.email;
        member.phone = req.body.phone;
        member.apt = req.body.apt;

        await member.save();
        return res.send(member);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
    
});

router.post("/calling", auth.verifyToken, async (req, res) => {
    try{
        const member = await Member.findById(req.body.id);
        const oldMember = await Member.findOne({
            calling: req.body.calling
        });
        if(oldMember){
            oldMember.calling = "";
            await oldMember.save();
        }
        member.calling = req.body.calling;
        await member.save();
        return res.send(member);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.post("/address", auth.verifyToken, async (req, res) => {
    try{
        const member = await Member.findById(req.body.id);
        member.address = req.body.address;
        await member.save();
        return res.sendStatus(200);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

// router.get("/calling/:id", auth.verifyToken, async (req, res) => {
//     try{
//         await
//     }
// })

router.delete("/:id", auth.verifyToken, async (req, res) => {
    try{
        await Member.deleteOne({
            _id: req.params.id
        });
        return res.sendStatus(200);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

module.exports = router;