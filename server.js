// load all the dependency packages and create our app
var express = require('express');
var mongoose = require('mongoose');
var async = require("async");
var OAuth = require('oauth');


// These credentials are dummy and will be revoked.

var twitterKey = 'X8NUHm4n4BcbtWqEHpqj8Z3MA';
var twitterSecret = 'RTU1mg6VvDPNwQ4gwO1dNlVDyRHKkz2zAStBolPx3A259G4y5p';
var token = '99992765-CMkmhxIltcORDo8qDn4ivEaCkSwtlyWrlfejQAP3x';
var secret = 'BY9QyptW3jtRb63sfeT8WMzTJ05ljW6TIiEXDhtWFIQW1';


// Define an OAuth module

var oauth = new OAuth.OAuth(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    twitterKey,
    twitterSecret,
    '1.0A',
    null,
    'HMAC-SHA1'
);

// connect to mongo local instance
var uristring = 'mongodb://127.0.0.1/twitdata';
var mongoOptions = {};


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
Schema = mongoose.Schema;

var TweetModel = require('./model/tweet');
var MaxIDModel = require('./model/metadata');


/**
 * Misc Variables
 */

var TWEET_COUNT = 2000;
var port = 1337;


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
router.get('/:keyword/:type', function (req, res) {

    // Get the Max ID which would be used as the since id for all the subsequent requests.
    var maxIdRetrieved = getMaxID(req);

    var aggregate_type = req.params.type;
    var search_keyword = req.params.keyword;

    var tweets;

    var get_search_url = 'https://api.twitter.com/1.1/search/tweets.json?q=' + encodeURIComponent(search_keyword) + "&count=" + TWEET_COUNT + "&since_id=" + maxIdRetrieved;

    console.log(get_search_url);

    oauth.get(
        get_search_url,
        token,
        secret,
        function (error, data, resp) {


            if (error) console.error(error);

            // data is received in String format when using Oauth.
            tweets = JSON.parse(data);


            // Need to further investigate why only 100 tweets are returned back.
            //console.log("Tweet status length : "+tweets.statuses.length);

            for (var i = 0; i < tweets.statuses.length; i++) {

                // Create the model for persisting to db
                var record = new TweetModel();

                var tweetDate = new Date(tweets.statuses[i].created_at);

                var id_str = tweets.statuses[i].id_str;

                record.ID = id_str;

                record.TweetDate = tweetDate;

                record.Search_term = req.params.keyword;


                // This is for finding
                TweetModel.find({ID: id_str}, function (err, tweets) {

                    if (tweets.length > 0) {
                        //Duplicate : Redundant code to be removed console.log("Duplicate");
                    } else {
                        record.save(function (err) {
                            if (err) {
                                console.log("Error in saving");
                            }
                        });
                    }


                });

            }


            var conditions = {searchterm: req.params.keyword}
                , update = {$set: {maxid: tweets.search_metadata.max_id}}
                , options = {};

            // TODO : upsert doesn't work as desired using mongoose. need to research.
            // We update the max id, as we want to fetch the tweets since this max_id as all the older tweets are in Database.

            MaxIDModel.update(conditions, update, options, function (err, numAffected) {
                console.log("Number of rows affected : " + numAffected + " while saving new max_id ");
            });

        });


    getAggregateData(aggregate_type, function (data) {
        // Sort and send the json response
        var keys = Object.keys(data);
        keys.sort();
        res.status(200).json(data);
    });


});

var getAggregateData = function (aggregateType, cbAgData) {
    console.log("Aggregate the Data for the Type :  " + aggregateType);

    var groupByConfig;

    if (aggregateType == 'hour') {
        groupByConfig = {
            month: {$month: "$TweetDate"},
            day: {$dayOfMonth: "$TweetDate"},
            year: {$year: "$TweetDate"},
            hh: {$hour: "$TweetDate"}
        };
    } else {
        // Default would be day

        groupByConfig = {month: {$month: "$TweetDate"}, day: {$dayOfMonth: "$TweetDate"}, year: {$year: "$TweetDate"}};

    }

    var jsonAGData = {};

    TweetModel.aggregate(
        [
            {
                $group: {
                    _id: groupByConfig, count: {$sum: 1}
                }
            }
        ],
        function (err, tweets) {
            if (err) {
                if (err) {
                    console.log("Aggregation Error " + err);
                }
                return;
            } else {
                for (var i = 0, counter = tweets.length; i < counter; i++) {
                    var tweet = tweets[i];
                    jsonAGData[tweet._id.month + "-" + tweet._id.day + "-" + tweet._id.year + (aggregateType == 'day' ? "" : ":" + tweet._id.hh)] = tweet.count;
                }
                cbAgData(jsonAGData);
            }
        });

}

// Retrieves the Max ID from the DB for a given keyword

var getMaxIDFromDB = function (req, cbDBMaxID) {

    //search term

    MaxIDModel.find({searchterm: req.params.keyword}, function (err, sids) {

        var sidval = '0';
        if (err) {
            console.log("Error from getMaxIDFromDB " + err);
        } else
            for (var i = 0, counter = sids.length; i < counter; i++) {
                sid = sids[i];
                sidval = sid.maxid;
            }

        cbDBMaxID(sidval);
    });
}


function getMaxID(req) {

    var localmaxid = 0;

    getMaxIDFromDB(req, function (data) {

        localmaxid = data;

        if (Number(localmaxid) < 1) { //its first time call

            console.log('Hitting twitter for max id');

            // TODO, twitter not giving back max_id 30 days ago, so defaulting to 5 days old tweets.
            var dateOffset = (24 * 60 * 60 * 1000) * 5; //30 days
            var myDate = new Date();
            myDate.setTime(myDate.getTime() - dateOffset);
            var yyyymmdd = myDate.toISOString().substring(0, 10);

            var get_maxid_url = 'https://api.twitter.com/1.1/search/tweets.json?q=' + req.params.keyword + "&until=" + yyyymmdd;

            /** We would hit here the first time around, when there is nothing in the db and would have to know the max_id from 30 days ago. Once we have got the tweets since then, we would go ahead just get the recent tweets since
             * the saved max_id
             **/
            oauth.get(
                get_maxid_url,
                token,
                secret,
                function (err, data, res) {

                    if (err) {
                        console.log(" Error getting the max_id from twitter " + err);
                    }
                    console.log(err)
                    console.log(data)
                    var maxidtweets = JSON.parse(data);
                    ;

                    persistMaxIdtoMongo(maxidtweets.search_metadata.max_id_str, req.params.keyword);

                });

        }

        return localmaxid;

    });
    return localmaxid;
}

function persistMaxIdtoMongo(maxid, keyword) {

    console.log("Persist Max id to mongo");
    var record = new MaxIDModel();

    record.ID = '0';
    record.maxid = maxid;
    record.searchterm = keyword;

    // upsert doesn't work as desired using mongoose. need to research.
    record.save(function (err) {
        if (err) {
            console.log("Error at maxid saving - " + err);
        }
    });

}


// Convert to prototypes
/**
 Date.prototype.yyyymmdd = function () {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
    var dd = this.getDate().toString();
    return yyyy + '-' + (mm[1] ? mm : "0" + mm[0]) + '-' + (dd[1] ? dd : "0" + dd[0]); // padding
};
 */

// all the requests will have /search
app.use('/search', router);


// start the server
app.listen(port);

console.log('Server Starts here');

