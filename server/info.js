const mongoose = require("mongoose");
const auth = require("./auth.js");
const express = require("express");
const router = express.Router();

const Member = mongoose.model("Member");
const Ward = mongoose.model("Ward");

router.get("/:type", auth.verifyToken, async (req, res) => {
    try{
        const currentUser = await Member.findById(req.user_id);
        const userWard = await Ward.findById(currentUser.ward);
        let response = {};
        response[req.params.type] = (req.params.type != "callings")? userWard[req.params.type] : JSON.parse(userWard[req.params.type]);
        return res.send(response);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
})

module.exports = router;