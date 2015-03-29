// Model for a tweet meta data

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var metadataSchema;

metadataSchema = new Schema({
    ID: String,
    maxid: String,
    searchterm: String
});


module.exports = mongoose.model('search_meta', metadataSchema);