// load all the dependency packages and create our app
var express = require('express');
// Using the twit module temporarily for testing and avoid boilerplate. TODO : Use a simple http get instead.
var Twit = require('twit');
var config = require('./config');
var mongoose = require('mongoose');


// instantiate Twit module
var twitter = new Twit(config.twitter);

// connect to mongo local instance
var uristring = 'mongodb://127.0.0.1/twitdata';
var mongoOptions = { };

mongoose.connect(uristring, mongoOptions, function (err, res) {
    if (err) {
        console.log('Error when connecting to: ' + uristring + '. ' + err);
    }
    else {
        console.log('Successfully connected to: ' + uristring);
    }
});

/**
 *
 * Create the models
 */

var TweetModel = require('./model/tweet');
var MetadataModel = require('./model/metadata');

/**
 * Misc Variables
 */

var until_date='2015-03-01';
var TWEET_COUNT = 2000;
var TWEET_SEARCH_URL = 'search/tweets';
var port = 1337;
var tweetSinceId = 2000;


// create the express app
var app = express();
var router = express.Router();


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
        result_type : 'recent',
        since_id : tweetSinceId
    };

    /**
     * Parameters to be sent in for the max id tweet request which we would be using as the since id in the next requests.
     * @type {{q: *, result_type: string, until: string}}
     */

    params_for_maxid = {
        q: req.params.keyword, // the user id passed in as part of the route
        result_type : 'recent',
        until : until_date
    };

/*
    var metadata_model = new MetadataModel();
    MetadataModel.findOne({date: until_date}, function(err) {
        if (err) return handleError(err);
        console.log("Current Date : "+until_date );
    });

    twitter.get(TWEET_SEARCH_URL, params_for_maxid, function (err, data, resp) {
        metadata_model.since_id = data.search_metadata.since_id;
        metadata_model.date = until_date;
    });

 */
    var tweets;

    // request data
    twitter.get(TWEET_SEARCH_URL, params, function (err, data, resp) {

        tweets = data;

        for(var i = 0; i < tweets.statuses.length; i++) {

            var tweetDate = new Date(tweets.statuses[i].created_at);

            var record = new TweetModel();

            record.ID = tweets.statuses[i].id_str;
            record.TweetDate = tweetDate;


            var recFound = false;
            // This is for finding
            TweetModel.find({ID: tweets.statuses[i].id_str}, function(err, tweets) {
                recFound = true;
            });

            if(recFound){
               // console.log('MONGO - record found for id '+tweets.statuses[i].id_str);
            }else{
                record.save(function (err) {
                    if (err) {
                    console.log("Error in saving");}
                });
            }




        }



/**
        //get since_id from search_metadata and store
        console.log("previous tweetSinceId:"+tweetSinceId);
        console.log("tweets.search_metadata.since_id:" + tweets.search_metadata.since_id);
        console.log("tweets.search_metadata.max_id:" + tweets.search_metadata.max_id);
        tweetSinceId = tweets.search_metadata.max_id;
        console.log("new tweetSinceId:"+tweetSinceId);
*/


        //aggreate number of records for each day

        TweetModel.aggregate(
            [

                {
                    $group : {
                        _id : { month: { $month: "$TweetDate" }, day: { $dayOfMonth: "$TweetDate" }, year: { $year: "$TweetDate" } },
                        count: { $sum: 1 }
                    }
                }
            ]
            , function (err, tweets) {
                if (err) {
                    if (err) {
                    console.log("Aggregation Error "+err);}
                    return;
                }
                for (var i=0, counter=tweets.length; i < counter; i++) {
                    var tweet = tweets[i];
                    console.log("Total records on the date ("+tweet._id.year+" "+tweet._id.month+" "+tweet._id.day+") is " +tweet.count);
                }
            });


    });


    // There is no UI Logic at the moment to show a histogram of all tweets, so send it to a default html page.
    res.sendFile(__dirname + '/index.html');

});

// all the requests will have /search
app.use('/search', router);


// start the server
app.listen(port);

console.log('Server Starts here');

