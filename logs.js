const { Schema, mode, model } = require("mongoose");
let l = new Schema({
    event_type: String,
    message: String,
    user_name: String,
    image_id: String,
    systemID: String,
    timestamp: String,
});

module.exports = model("logs", l);
