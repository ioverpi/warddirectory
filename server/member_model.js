const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const auth = require("./auth.js");

const SALT_WORK_FACTOR = 10;

const userSchema = new mongoose.Schema({ //We are letting the member schema take the place of the user schema. 
    firstname: String,
    lastname: String,
    email: String,
    phone: String,
    apt: String,
    photo: Number,
    organization: String, 
    calling: String,
    address: String, 
    password: String,
    tokens: [], 
    permissions: Number, 
    resetPasswordToken: String,
    resetPasswordExpires: Number,
    ward: String,
    events: [{category: String, date: Date, message: String, success: Boolean}],
    hidden: Boolean
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
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
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

userSchema.methods.logEvent = function(category, date, message, success) {
    this.events.push({
        category: category,
        date: date,
        message: message,
        success: success
    })
}

const makeModel = () => {
    mongoose.model("Member", userSchema);
}

module.exports.makeModel = makeModel;