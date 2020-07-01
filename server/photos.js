const mongoose = require("mongoose");
const auth = require("./auth.js");
const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");

const multer = require("multer");
const upload = multer({ dest: "uploads/"});

// Photos

const Member = mongoose.model("Member")//, memberSchema);

function decodeBase64Image(dataString){
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    var responses = {};

    if(matches.length !== 3){
        return new Error("Invalid input string.");
    }

    responses.type = matches[1];
    responses.data = new Buffer(matches[2], "base64");

    return responses;
}

router.post("/oldmethod", async (req, res) => {
    try{
        var imageBuffer = decodeBase64Image(req.body.imageBase64);
        //Check imageType!
        var filename = "../photos/" + req.body.id + ".jpg";
        await fs.writeFile(filename, imageBuffer.data);

        const member = await Member.findOne({
            _id: req.body.id
        });
        if(!member.photo) member.photo = 0; //Delete this line eventually. 
        member.photo++;
        await member.save();
        return res.sendStatus(200);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

async function incrementPhotoCounter(id){
    const member = await Member.findOne({
        _id: id
    });
    if(!member.photo) member.photo = 0; //Delete this line eventually. 
    member.photo++;
    await member.save();
}

router.post("/", upload.single("photo"), async (req, res) => {
    try{
        if(path.extname(req.file.originalname).toLowerCase() === ".jpg"){
            let newFilename = "";
            switch(req.body.photoType){
                case "original":
                    newFilename = "../photos/" + req.body.id + "_original.jpg";
                break;
                case "cropped":
                    newFilename = "../photos/" + req.body.id + ".jpg";
                break;
                case "leadership":
                    newFilename = "../photos/" + req.body.id + ".jpg";
                break;
                default:
                    await fs.unlink(req.file.path);
                    throw "Wrong file type sent.";
                break;
            }
            await fs.rename(req.file.path, newFilename);
            await incrementPhotoCounter(req.body.id);
            return res.sendStatus(200);
            //console.log(req.files["new"][0].originalname + " and " + req.files["old"][0].originalname);
        } else {
            await fs.unlink(req.file.path);
            throw "Wrong file type sent.";
            return res.sendStatus(500);
        }
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

/*
router.post("/", upload.fields([{name: "new", maxCount: 1}, {name: "old", maxCount: 1}]), async (req, res) => {
    try{
        if( path.extname(req.files["new"][0].originalname).toLowerCase() === ".jpg" &&
            path.extname(req.files["old"][0].originalname).toLowerCase() === ".jpg"){
            console.log(req.files["new"][0].originalname + " and " + req.files["old"][0].originalname);
        } else {
            console.log("Wrong file type sent.");
            return res.sendStatus(500);
        }
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});
*/

router.delete("/:id", auth.verifyToken, async (req, res) => {
    try{
        var filename = "../photos/" + req.params.id + ".jpg";
        await fs.unlink(filename);
        // Uncomment this section when in production
        // var originalPhoto = "../photos/" + req.params.id + "_original.jpg";
        // await fs.unlink(originalPhoto);
        return res.sendStatus(200);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
})

module.exports = router;