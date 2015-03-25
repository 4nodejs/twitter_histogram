// Model for a tweet

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var tweetSchema;

tweetSchema = new Schema({
    id_str: String,
    created_at: String
})

module.exports = mongoose.model('tweet', tweetSchema);