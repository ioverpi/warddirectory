require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(express.static('../public'));

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_DB_URL, {
    useNewUrlParser: true
});

const cookieParser = require('cookie-parser');
app.use(cookieParser());

require("./member_model.js").makeModel();
require("./ward_model.js").makeModel();
const auth = require("./auth.js");

const members = require('./members.js');
app.use("/api/members", members);

const info = require('./info.js');
app.use("/api/info", info);

const users = require("./users.js");
app.use("/api/users", users);

app.use("/photos", auth.verifyToken);
app.use("/photos", express.static("../photos"));

const photos = require("./photos.js");
app.use("/api/photos", photos);

const booklet = require("./booklet.js");
app.use("/api/booklet", booklet);

app.listen(process.env.SERVER_PORT, () => console.log(`Listening on port ${process.env.SERVER_PORT}!`));