const mongoose = require("mongoose");
const auth = require("./auth.js");
const express = require("express");
const router = express.Router();
const auth2 = require("./auth2.js");

// Members

const Member = mongoose.model("Member"); //, memberSchema);
const OldEmail = mongoose.model("OldEmail")
//const Ward = mongoose.model("Ward");

router.get("/", auth.verifyToken, async (req, res) => {
    try{
        let members = await Member.find();

        return res.send(members);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.post("/", [auth.verifyToken, auth2.permissionsGreaterThan(0)], async (req, res) => {
    const member = new Member({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        phone: req.body.phone,
        apt: req.body.apt,
        photo: 0,
        permissions: 0,
        ward: req.user_ward,
        password: "" //Maybe change the users.js instead of changing this. 
    });
    try{
        await member.save();

        return res.send(member);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.post("/update", [auth.verifyToken, auth2.permissionsGreaterThan(0)], async (req, res) => {
    try{
        const member = await Member.findOne({
            _id: req.body.id
        });
        member.firstname = req.body.firstname;
        member.lastname = req.body.lastname;
        member.email = req.body.email;
        member.phone = req.body.phone;
        member.apt = req.body.apt;
        if(req.body.address) member.address = req.body.address;
        
        await member.save();
        return res.send(member);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
    
});

router.post("/calling", [auth.verifyToken, auth2.permissionsGreaterThan(0)], async (req, res) => {
    try{
        const member = await Member.findById(req.body.id);
        const oldMember = await Member.findOne({
            calling: req.body.calling
        });
        if(oldMember && req.body.id == oldMember._id) return res.sendStatus(200);
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

// router.get("/calling/:id", auth.verifyToken, async (req, res) => {
//     try{
//         await
//     }
// })

router.post("/permissions", auth.verifyToken, async (req, res) => {
    try{
        const currentUser = await Member.findById(req.user_id);
        if(req.body.permissions < currentUser.permissions){
            const member = await Member.findById(req.body.id);
            member.permissions = req.body.permissions;
            await member.save();
            return res.sendStatus(200);
        }
        return res.status(403).send({
            message: "Failed to authenticate token."
        });
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.post("/hidden", [auth.verifyToken, auth2.permissionsGreaterThan(0)], async(req, res) => {
    try{
        //const currentUser = await Member.findById(req.user_id);
        const member = await Member.findById(req.body.id);
        member.hidden = req.body.hidden;
        await member.save();
        return res.sendStatus(200);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
})

router.post("/batch", [auth.verifyToken, auth2.permissionsGreaterThan(2)], async (req, res) => {
    try{
        for(const member of req.body.data) {
            const oldMember = await Member.findOne({
                email: member.email
            }) || await OldEmail.findOne({
                email: member.email
            });
            /* || await Ward.findOne({
                old_emails: member.email
            });*/
            

            //let x = 1 || 4
            if(!oldMember) {
                let newMember = new Member({
                    firstname: member.firstname,
                    lastname: member.lastname,
                    email: member.email,
                    phone: member.phone,
                    apt: member.apartment,
                    photo: 0,
                    permissions: 0,
                    ward: req.user_ward,
                    password: "" //Maybe change the users.js instead of changing this. 
                });

                await newMember.save()
            }            
        }

        return res.sendStatus(200)
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.delete("/:id", [auth.verifyToken, auth2.permissionsGreaterThan(0)], async (req, res) => {
    try{
        const member = await Member.findById(req.params.id)
        /*
        const ward = await Ward.findById(member.ward)
        console.log(ward);
        console.log(ward.old_emails);
        ward.old_emails.push(member.email);
        ward.save()*/
        
        const oldEmail = new OldEmail({
            email: member.email
        });

        oldEmail.save();
        

        member.remove(); //This is depreciated, but oh-well ¯\_(ツ)_/¯

        /* await Member.deleteOne({
            _id: req.params.id
        }); */

        return res.sendStatus(200);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

module.exports = router;