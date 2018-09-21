const mongoose = require("mongoose");
mongoose.connect("mongodb://uffx8yofvbmjtvj:kjXCdkkXsAWDQXs69bF4@bebhcqq50nzkc2m-mongodb.services.clever-cloud.com:27017/bebhcqq50nzkc2m");

var claimSchema = new mongoose.Schema({
    amount: String,
    date: { type: Date, default: Date.now }
})

var Claim  = mongoose.model("claim", claimSchema)

var withdrawalSchema = new mongoose.Schema({
    amount: String,
    date: { type: Date, default: Date.now }
})

var userSchema = new mongoose.Schema({
    user: Number,
    balance: {type: String, default: "0"},
    type: {type: String, default: "free"},
    wallet: String,
    signup: { type: Date, default: Date.now },
    timestamp: { type: Date, default: Date.now },
    claims: [claimSchema],
    withdrawals: [withdrawalSchema]
})

var User = mongoose.model("User", userSchema);

var globalSchema = new mongoose.Schema({
    totalMined: String,
    totalUsers: Number
})

var Global = mongoose.model("Global", globalSchema);

module.exports = {
    claim: Claim,
    user: User,
    global: Global
}
