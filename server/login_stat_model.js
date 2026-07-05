const mongoose = require("mongoose");

// Records one document per successful login. Lives in its own collection so the
// demo reseed (which only clears Members and Wards) never wipes it, and it
// survives app restarts as long as the mongo-data volume persists.
const loginStatSchema = new mongoose.Schema({
    email: String,           // which demo account was used
    at: { type: Date, default: Date.now },
    ip: String,              // best-effort client IP (via Cloudflare header when present)
    userAgent: String
});

const makeModel = () => {
    mongoose.model("LoginStat", loginStatSchema);
};

module.exports.makeModel = makeModel;
