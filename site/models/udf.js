var mongoose = require('mongoose');

var udfSchema = mongoose.Schema({ 
	library_id: mongoose.Schema.Types.ObjectId,
	name: String,
	shortDescription:String,
	description:String,
	returnValue:String,
	example:String,
	warnings:String,
	code:String,
	args:[mongoose.Schema.Types.Mixed],
	released:Boolean,
	lastUpdated:Date,
	author:String,
	authorEmail:String,
	javaDoc:String,
	version:Number,
	headerComments:String,
	rejected:Boolean,
	rejectionReason:String,
	cfVersion:String,
	tagBased:Boolean,
	oldId:Number
});

var locals = {};

udfSchema.statics.findByName = function (name, cb) {
  this.findOne({ name: new RegExp(name, 'i') }, function(err, udf) {
	  cb(null, udf);
  });
};

udfSchema.methods.getArgString = function() {
	if(this.args.length === 0) return '()';
	var argstr = '(';
	for(var i=0, len=this.args.length; i<len; i++) {
		var arg = this.args[i];
		if(arg["REQ"]) {
			if(i != 0) argstr += ', ';
			argstr += arg["NAME"];
		} else {
			if(i != 0) {
				argstr += '[, ';
			} else {
				argstr += '[';
			}
			argstr += arg["NAME"] + ']';
		}
	}
	argstr += ')';
	return argstr;
}

var UDF = mongoose.model('UDF', udfSchema); 

UDF.find(function(err, udfs) {
	
	if(udfs.length) return;
	
});
		
UDF.getLatest = function(cb, total) {
	if(!total) total=5;
	//use cached version
	if(locals["latestUDFs"+total]) {
		cb(locals["latestUDFs"+total]);
	} else {
		UDF.find().sort({lastUpdated:-1}).limit(total).exec(function(err, results) {
			locals["latestUDFs"+total] = results;
			cb(results);
		});
	}
};

module.exports = UDF;