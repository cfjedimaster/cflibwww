var express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);

app.use(require('body-parser')());

var crypto = require('crypto');

var credentials = require('./credentials.js');

var mongoose = require('mongoose');
var opts = {
	server: {
		socketOptions: { keepAlive: 1 }
	}
};

if(process.env.VCAP_SERVICES) {
    var env = JSON.parse(process.env.VCAP_SERVICES);
    var mongo = env['mongodb2-2.4.8'][0]['credentials'];
} else {
    var mongo = {
		"hostname":"localhost",
		"port":27017,
		"username":"",
		"password":"",
		"name":"",
		"db":"cflib"
    }
};

var generate_mongo_url = function(obj){
    obj.hostname = (obj.hostname || 'localhost');
    obj.port = (obj.port || 27017);
    obj.db = (obj.db || 'test');

    if(obj.username && obj.password){
        return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
    else{
        return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
}

var mongourl = generate_mongo_url(mongo);
mongoose.connect(mongourl, opts);

var moment = require('moment');

var RSS = require('rss');
app.set('rssXML', '');


var Library = require('./models/library.js');
var UDF = require('./models/udf.js');

var handlebars = require('express-handlebars').create({ 
	defaultLayout:'main',
	helpers: {
		getYear: function() {
			return new Date().getFullYear();
		},
		fullDate: function(d) {
			return moment(d).format("MMMM D, YYYY");
		},
		numudfs: function(library) {
			return library.getNumberOfUDFs();
		},
		formatAgo: function(d) {
			return moment(d).fromNow();
		},
		gravatarURL: function(e) {
			if(!e) e = "";
			//http://nodeexamples.com/2013/09/04/creating-an-md5-hash-to-get-profile-images-from-gravatar/
			var s = "http://www.gravatar.com/avatar/";
			e = e.toLowerCase().trim();
			var hash = crypto.createHash("md5");
			hash.update(e);
			s += hash.digest("hex");
	
			s += "?s=43";
			return s;
		},
		hash:function(e) {
			var hash = crypto.createHash("md5");
			hash.update(e);
			return hash.digest("hex");
		},
		selected:function(option,value) {
			if(option == value) {
				return ' selected';
			} else {
				return '';
			}
		},
		stringify:function(v) {
			return JSON.stringify(v);
		},
		truncate:function(s) {
			if(s.length < 17) return s;
			else return s.substring(0,16) + '...';
		},
		yesNoFormat:function(b) {
			return b?"Yes":"No";
		}
	}
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.use(express.static(__dirname + '/public'));

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')());

//Load admin routes
var admin = require('./routes/admin');

//Get last 5
app.use(function(req, res, next) {
	UDF.getLatest(function(latestUDFs) {
		res.locals.latestUDFs = latestUDFs;
		next();
	});
});

app.get('/', function(req, res) { 
	Library.getAll(function(err, libraries) {
		res.render('home',{
							libraries:libraries,
						   	title:"Welcome to CFLib"
						  });		
	});
});

app.get(['/library/:name','/library/:name/start/:start'], function(req, res) {
	//TODO: global, also, this page logic seems stupid
	var perpage = 20;
	var start  = 1;
	var page = 1;
	
	if(req.params.start) {
		if(req.params.start < 1) res.redirect('/');
		start = req.params.start;
		if(start > 1) {
			page = Math.ceil(start / perpage);
		}
	}
	
	// TODO: findByName should fetch udfs too to make the calling code here simpler. 
	Library.findByName(req.params.name, function(err, library) {		
		if(!library) res.redirect('/');
		else {
			library.getUDFs(page, function(err, udfs) {
				if(err) {
					console.log('library.getUDFs err '+err);
				}
				var showPagination = false;
				if(library.udfCount > perpage) {
					showPagination = true;	
				}
				var showPrevious = page > 1;
				
				var totalPages = Math.ceil(library.udfCount / perpage);
				var showNext = page < totalPages;
				var startNext = 0;
				var startPrevious = 0;
				if(showNext) {
					startNext = (page*perpage)+1;
				}
				if(showPrevious) {
					startPrevious = (page-2)*perpage+1;
				}

				res.render('library', {
					library:library, 
					title:library.name, 
					udfs:udfs,
					showPagination:showPagination,
					showPrevious:showPrevious,
					startPrevious:startPrevious,
					showNext:showNext,
					startNext:startNext,
					page:page
				});
			});
		}
	});
});

app.get('/login', function(req, res) {
    if(req.session.error) {
        res.locals.error = req.session.error;
        delete req.session.error;
    }
    res.render('login',{title:"Admin Login"});		
});

app.post('/login', function(req, res) {
	if(authenticate(req.param('username'), req.param('password'))) {
		req.session.regenerate(function() {
			req.session.loggedin=true;
			res.redirect('/admin');
		});
	} else {
		req.session.error = 'Invalid login.';        
		res.redirect('/login');
	}
});

app.get('/udf-code/:id', function(req, res) {
	console.log('loading udf code '+req.params.id);
	UDF.findOne({_id:req.params.id}, function(err, udf) {
		if(!udf) res.redirect('/');
		else {
			res.render('udfcode', {udf:udf, layout:false});
		}
	});
});

app.get('/udf/:name', function(req, res) {
	console.log('loading udf '+req.params.name);
	UDF.findByName(req.params.name, function(err, udf) {
		if(!udf) res.redirect('/');
		else {
			var showArgs = udf.args.length > 0;
			udf.argString = udf.getArgString();
			Library.findOne({_id:udf.library_id}, function(err, lib) {
				res.render('udf', {udf:udf, library:lib, title:udf.name,showArgs:showArgs});
			});
		}
	});
});

app.get('/udfdownload/:name', function(req, res) {
	console.log('downloading udf '+req.params.name);
	UDF.findByName(req.params.name, function(err, udf) {
		if(!udf) res.redirect('/');
		else {
			res.attachment(udf.name+'.cfm');
			res.type('text/plain');
			res.render('udfcode', {udf:udf, plain:true, layout:false});
		}
	});
});

app.get('/search', function(req, res) {
	res.render('search',{title:'Search'});
});

app.get('/submit', function(req, res) {
	res.render('submit', {title:'Submit a UDF'});
});

app.get('/rss', function(req, res) {
	//Do we have a cache for xml?
	if(app.get('rssXML') != '') {
		console.log('from cache in index.js ');
		res.set('Content-Type','application/rss+xml');
		res.send(app.get('rssXML'));
	} else {
	
		var feed = new RSS({
			title: 'CFLib RSS Feed',
			description: 'The following are the 10 latest UDFs released at CFlib.org',
			feed_url: 'http://www.cflib.org/rss',
			site_url: 'http://www.cflib.org',
			author: 'Raymond Camden'
		});

		UDF.getLatest(function(data) {
			data.forEach(function(itm) {
				feed.item({
					title:  itm.name,
					description: itm.description,
					url: 'http://www.cflib.org/udf/'+itm.name, 
					author: itm.author,
					date: itm.lastUpdated
				});
				
			});
			res.set('Content-Type','application/rss+xml');
			app.set('rssXML',feed.xml());
			res.send(app.get('rssXML'));		
		}, 10);

		
	}
});

/* admin block */
app.all('/admin', secure, admin.adminindex);
app.all('/adminedit/:id', secure, admin.editudf);

function authenticate(username, password) {
	return (username === credentials['adminusername'] && password === credentials['adminpassword']);
}

function secure(req, res, next) {
    if(req.session.loggedin) {
        next();   
    } else {
        res.redirect('/login');
    }
}
// custom 404 page
app.use(function(req, res){ 
	res.status(404);
	res.render('404');
});

// custom 500 page
app.use(function(err, req, res, next){ 
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.listen(app.get('port'), function(){
	console.log( 'Express started on http://localhost:' +
	app.get('port') + '; press Ctrl-C to terminate.' );
});