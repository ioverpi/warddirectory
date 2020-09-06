const mongoose = require("mongoose");

const SALT_WORK_FACTOR = 10;

const oldEmailSchema = new mongoose.Schema({ 
    email: String
});

const makeModel = () => {
    mongoose.model("OldEmail", oldEmailSchema);
}

module.exports.makeModel = makeModel;