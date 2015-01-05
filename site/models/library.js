var mongoose = require('mongoose');
var async = require('async');
var UDF = require('./udf.js');

var librarySchema = mongoose.Schema({ 
	name: String,
	description: String,
	lastUpdated: Date
});

//Not using it, but it "feels" right as a method anyway
//Hmm, you know... code dupe is bad
/*
librarySchema.methods.getNumberOfUDFs = function(cb) {
	UDF.count({library_id:this.id}, cb);
};
*/

librarySchema.methods.getUDFs = function(page, cb) {
	//20 is hard coded, we need to abstract it eventually
	var size = 20;
	var skip = (page-1) * size;
	UDF.find({library_id:this.id,released:true}).sort({lname:1}).skip(skip).limit(size).exec(cb);

};

librarySchema.statics.findByName = function (name, cb) {
  this.findOne({ name: new RegExp(name, 'i') }, function(err, lib) {
  	  if(!lib) {
	  	cb("Invalid lib");
	  } else {
		  getUDFCount(lib, function(err, count) {
			  lib.udfCount = count;
			  cb(null, lib);
		  });
	  }
  });
};

function getUDFCount(lib,cb) {
	UDF.count({library_id:lib.id,released:true}, cb);	
}

//I not only load all libs, but all prefetch their numUDFs
librarySchema.statics.getAll = function(cb) {
	this.find().sort({name:1}).exec(function(err, libs) {
		async.map(libs, getUDFCount, function(err, result) {
			for(var i=0, len=libs.length; i<len; i++) {
				libs[i].udfCount = result[i];	
			}
			cb(null,libs);
		});
	});
};

var Library = mongoose.model('Library', librarySchema); 

Library.find(function(err, libraries) {
	
	if(libraries.length) return;
	
});

/*
Library.findByName = function(name, cb) {
	console.log("ok in the library func, looking for "+name);
	Library.
	cb(null,{name:"ray"});
}
*/

module.exports = Library;