const mongoose = require("mongoose");

//Contains functions that couldn't go in auth.js

const Member = mongoose.model("Member");

const permissionsGreaterThan = (level) => {
    return async function(req, res, next) {
        try{
            const currentUser = await Member.findOne({
                _id: req.user_id
            });
            req.user_ward = currentUser.ward;
            //console.log(`${currentUser.firstname}, ${currentUser.permissions}, ${level}`);
            if(!(currentUser.permissions > level)) {
                throw new Error("Permission level not high enough.");
            }
            next();
        } catch (error) {
            console.log(error);
            return res.status(403).send({
                message: "Failed to authenticate token."
            });
        }
    }
}

module.exports = {
    permissionsGreaterThan: permissionsGreaterThan
};