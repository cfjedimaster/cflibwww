var UDF = require('../models/udf.js');
var Library = require('../models/library.js');

exports.adminindex = function(req, res) {
	var keyword = req.param('keyword');
	var status = req.param('status');
	var results = [];
	//do a search if we entered a keyword or status
	if(keyword || status) {
		keyword = keyword.toLowerCase();
		console.log("ok going to search - keyword:"+keyword + " status:"+status);
		UDF.search(keyword, status, function(err, results) {
			res.render('admin', {title:'Admin',keyword:keyword,status:status,results:results});	
		});
	} else {
		res.render('admin', {title:'Admin',keyword:keyword,status:status,results:results});	
	}
};

function storeUDF(udf, req, res) {

	udf.library_id = req.param('libraryid');
	udf.name = req.param('name');
	udf.lname = udf.name.toLowerCase();
	udf.shortDescription = req.param('shortdescription');
	udf.description = req.param('description');
	udf.returnValue = req.param('returnvalue');
	udf.example = req.param('example');
	udf.warnings = req.param('warnings');
	udf.code = req.param('code');

	var released = req.param('released');
	if(released == 1 || released == 0) {
		if(released == 1) {
			udf.released = true;
		} else {
			udf.released = false;
		}
	}
		
	udf.lastUpdated = new Date();
	udf.author = req.param('author');
	udf.authorEmail = req.param('authoremail');
	udf.version = req.param('version');
	udf.cfVersion = req.param('cfversion');
	udf.headerComments = req.param('headercomments');
	udf.rejectionReason = req.param('rejectionreason');

	var rejected = req.param('rejected');
	if(rejected == 1 || rejected == 0) {
		if(rejected == 1) {
			udf.rejected = true;
		} else {
			udf.rejected = false;
		}
	}
		
	if(req.param('tagbased')) {
		udf.tagBased = true;
	} else {
		udf.tagBased = false;
	}

	var args = req.param('args');
	udf.args = JSON.parse(args);

	udf.javaDoc = req.param('javadoc');

	udf.save(function(err, udf) {
		if(err) {
			console.log("Err saving UDF: "+err);
			//do *something*
		}
		//clear the cache, always
		UDF.clearCache();
		Library.clearCache();
		res.redirect('/adminedit/'+udf.id);
	});
}

exports.editudf = function(req, res) {

	if(req.method === 'POST') {
	
		if(req.params.id === 'new') {
			var udf = new UDF();
			storeUDF(udf, req, res);
		} else {
			UDF.findById(req.params.id, function(err, udf) {
				storeUDF(udf, req, res);		
			});		
		}
	} else {
	
		Library.getAll(function(err, libraries) {
			if(req.params.id === 'new') {
				var udf = new UDF()
				res.render('editudf', {udf:udf, libraries:libraries});
			} else {
				UDF.findById(req.params.id, function(err, udf) {
					if(err) res.redirect('/admin');
					//console.log(udf);
					res.render('editudf', {udf:udf, libraries:libraries});
				});
			}
		});
		
	}
};