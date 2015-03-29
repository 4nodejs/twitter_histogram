// Model for a tweet

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var tweetSchema;

tweetSchema = new Schema({
    ID: {type: String, required: true},
    TweetDate: {type: Date, required: true},
    Search_term: {type: String, required: true}
});


module.exports = mongoose.model('Tweet', tweetSchema);