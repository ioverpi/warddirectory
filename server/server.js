const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(express.static('../public'));

const mongoose = require('mongoose');

//Probably change this line. It needs to be dynamic.
mongoose.connect('mongodb://localhost:27017/ward_directory', {
    useNewUrlParser: true
});

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const auth = require("./auth.js");

const members = require('./members.js');
app.use("/api/members", members);
const users = require("./users.js");
app.use("/api/users", users);

app.use("/photos", auth.verifyToken);
app.use("/photos", express.static("../photos"));

const photos = require("./photos.js");
app.use("/api/photos", photos);

const booklet = require("./booklet.js");
app.use("/api/booklet", booklet);

app.listen(4000, () => console.log("Listening on port 4000!"));