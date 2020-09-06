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
}).catch(error => {
    console.log("Cannot connect to the database server. Doesn't make sense to start.");
    console.log(error);
    server.close(() => {console.log("Shut down complete.")})
});

const cookieParser = require('cookie-parser');
app.use(cookieParser());

require("./member_model.js").makeModel();
require("./ward_model.js").makeModel();
require("./old_email_model.js").makeModel();
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

const server = app.listen(process.env.SERVER_PORT, () => console.log(`Listening on port ${process.env.SERVER_PORT}!`));