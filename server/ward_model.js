const mongoose = require("mongoose");

const wardSchema = new mongoose.Schema({
    name: String,
    apartments: [], 
    callings: String
});

const makeModel = () => {
    mongoose.model("Ward", wardSchema);
}

module.exports.makeModel = makeModel;