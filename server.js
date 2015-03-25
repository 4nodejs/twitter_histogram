
// load all the dependency packages and create our app
var express = require('express');
// Using the twit module temporarily for testing and avoid boilerplate. TODO : Use a simple http get instead.
var Twit = require('twit');
var config = require('./config');
var mongoose = require('mongoose');
var tweet = require('./model/tweet');
var util = require('util');

// instantiate Twit module
var twitter = new Twit(config.twitter);

// connect to mongo local instance
mongoose.connect('mongodb://127.0.0.1/twitdata'); // connect to our database


var TWEET_COUNT = 15;
var TWEET_SEARCH_URL = 'search/tweets';

// create the express app
var app = express();

var router = express.Router();
var port = 1337;


// Filter all the requests through here
router.use(function (req, res, next) {
    // do logging
    console.log('Entering the app');
    next(); // move on to the rest of the routes
});

// define the search route
router.get('/:keyword', function (req, res) {

    params = {
        q: req.params.keyword, // the user id passed in as part of the route
        count: TWEET_COUNT, // how many tweets to return
        result_type : 'recent'
    };

    var tweets;
    // request data
    twitter.get(TWEET_SEARCH_URL, params, function (err, data, resp) {

        tweets = data;

        // Need to parse the JSON which we receive from twitter.

        /*   tweets =  JSON.stringify(data, ['id_str', 'created_at']);
        console.log(tweets)
        for(var mytweet in tweets){

            console.log(util.inspect(tweets[mytweet], false, Infinity, true));
        }
       console.log(tweets.statuses[0].user.name);
       console.log(util.inspect(data, false, Infinity, true));*/



    });


    // There is no UI Logic at the moment to show a histogram of all tweets, so send it to a default html page.
    res.sendFile(__dirname + '/index.html');

});

// all the requests will have /search
app.use('/search', router);


// start the server
app.listen(port);

console.log('Server Starts here');