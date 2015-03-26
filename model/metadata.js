// Model for a tweet meta data

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var metadataSchema;

metadataSchema = new Schema({
    since_id: String,
    date: Date
});


module.exports = mongoose.model('metadata', metadataSchema);