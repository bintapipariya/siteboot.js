/*********************************************

FORTMAX Node.js SERVER

For more projects, visit https://github.com/fantachip/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
**********************************************/

var http = require("http");
var https = require("https");
var fs = require("fs");
var url = require("url"); 
var path = require("path");
var JSON = require("JSON");
var walk = require("walk"); 
var mustache = require('mustache'); 
var crypto = require("crypto"); 
var querystring = require("querystring"); 
var formidable = require("formidable");
var mysql = require("mysql");
var async = require("async"); 
var multipart = require("multipart");
var sys = require("sys");
var sequelize = require("sequelize"); 
var util = require("util"); 
var events = require("events"); 
var assert = require("assert"); 

var cluster = require("cluster");

var extname = path.extname; 

var config = {};

var widget_types = {}; 
var widgets = {};
var pages = {};
var forms = {}; 
var texts = {}; 
var handlers = {};
var plugins = {}; 
var core = {}; 

var widget_counter = 0; 

var mime_types = {
	'.html': "text/html",
	'.css':  "text/css",
	'.js':   "text/javascript",
	'.jpg': "image/jpeg",
	'.jpeg': "image/jpeg",
	'.png': "image/png"
};

var DefaultWidget = function(x){
	this.server = x; 
}
DefaultWidget.prototype.render = function(path, args, session, next){
	next("Default"); 
}

widget_types["default"] = {
	new: function(x){
		return new DefaultWidget(x); 
	}
}; 

var BASEDIR = __dirname+"/"; 
var ITEMS_PER_PAGE = 21; 

var cache = {}; 

cache.sessions = {}; 
cache.mailer_templates = {}; 

var theme = {};

var vfs = require("./modules/vfs"); 
var loader = require("./modules/loader"); 


var AsyncEventEmitter = function(){
	events.EventEmitter.call(this); 
	//this.orig_emit = this.emit; 
	this.emitAsync = function(){
		assert(arguments.length > 1, "AsyncEventEmitter#emit expects at least two arguments!"); 
		
		var argv = []; 
		for(var c = 0; c < arguments.length; c++)
			argv.push(arguments[c]); 
		var ev = argv.shift(); 
		var callback = argv.pop(); 
		var c = this.listeners(ev).length; 
		
		console.debug("Emitting "+ev+" event..."); 
		if(c == 0){
			console.debug("Event "+ev+" completed!"); 
			callback(); 
			return; 
		}
		
		var args = [ev].concat(argv).concat([function(){
			c--; 
			if(c == 0) {
				console.debug("Event "+ev+" completed!"); 
				callback(); 
			}
		}]); 
		this.emit.apply(this, args); 
	}
}

util.inherits(AsyncEventEmitter, events.EventEmitter); 

var ServerInterface = function(){
	AsyncEventEmitter.call(this); 
	this._client_code = ""; 
}

util.inherits(ServerInterface, AsyncEventEmitter); 

var server = new ServerInterface();

console.debug = function(msg){
	console.log("DEBUG: "+msg); 
}

console._sb_err = console.error; 

console.error = function(msg){
	console._sb_err("ERROR: "+msg); 
}

/*
function WidgetValue(widget, args, session){
	this.session = session; 
	this.widget = widget; 
	this.args = args; 
	
	var self = this; 
	
	return function(){
		return function(val){ // val is the argument from mustache
			var name = self.widget.id; 
			if(val){
				name = self.widget.id+"_"+val; 
			}
			console.log("Getting value for "+name+", "+val); 
			if(!(name in self.session.rendered_widgets)){
				var w = {};
				for(var key in self.widget)
					w[key] = self.widget[key];
				w.id = name; 
				w.argument = val; 
				widgets[name] = w; 
				console.log("Added copy widget for key "+name); 
				// call render for the widget
				//self.widget.render(docpath, self.args, self.session, function(html){
				//	session.rendered_widgets[name] = html; 
				//}); 
				return "Default Text"; 
			}
			return self.session.rendered_widgets[name];
		}
	};
}
*/

server.mailer = {}; 
server.mailer.send = function(options, next){
	var path         = require('path'); 
	var emailTemplates = require('email-templates'); 
	var nodemailer     = require('nodemailer');
	
	next = next||function(){}; 
	
	if(!options.to || !options.from || !options.template){
		console.error("Mailer: You must specify both to, from and template in options: "+JSON.stringify(options)); 
		next(""); 
		return; 
	}
	options.subject = options.subject||"(no subject)"; 
	
	var tpl = {
		path: __dirname+"/mailer_templates", 
		template: "default"
	}
	if(options.template in cache.mailer_templates) 
		tpl = cache.mailer_templates[options.template]; 
	
	emailTemplates(tpl.path, function(err, template) {
		if (err) {
			console.log(err);
			return; 
		} 
		var transportBatch = nodemailer.createTransport("SMTP", config.mailer.smtp);
		
		var Render = function(data) {
			this.data = data;
			this.send = function(err, html, text) {
				if (err) {
					console.log(err);
					next(""); 
					return; 
				} 
				
				// send the email
				transportBatch.sendMail({
					from: options.from,
					to: options.to,
					subject: options.subject,
					html: html,
					generateTextFromHTML: true
				}, function(err, responseStatus) {
					if (err) {
						console.log(err);
					} else {
						console.log(responseStatus.message);
					}
					
					next(html); 
				});
			};
			this.batch = function(batch) {
				try{
					batch(this.data, "mailer_templates", this.send);
				} catch(e){
					console.log("ERROR WHILE SENDING EMAILS: "+e); 
					next(""); 
				}
			};
		};
		
		console.debug("Using mailer template: "+tpl.path+"/"+tpl.template); 
		
		// Load the template and send the emails
		template(tpl.template, true, function(err, batch) {
			var render = new Render(options.data);
			render.batch(batch);
		});
	});
}
var User = function(){
	this.loggedin = false; 
	this.username = "default";
}


var Session = function(x){
	this.user = new User(); 
	this.rendered_widgets = {}; 
	this.object = x; 
}

Session.prototype = {
	get sid(){
		return this.object.sid; 
	}
}

Session.prototype.save = function(){
	server.emit("session_save", this); 
	this.object.save(); 
}

Session.prototype.render = function(template, args){
	var session = this; 
	var params = {};
	// add all value retreivers for all currently available widgets
	//for(var key in widgets){
	//	params[key] = new WidgetValue(widgets[key], args, session); 
	//}
	// add args to the options array
	for(var key in args){
		params[key] = args[key]; 
	}
	if(!(template in forms)){
		return "Form "+template+".html does not exist!";
	} else {
		return mustache.render(forms[template], params);
	} 
}

Session.prototype.render_widgets = function(widgets, path, args, callback){
	var self = this; 
	var data = {}; 
	async.each(Object.keys(widgets), function(k, cb){
		if(widgets[k] && ("update" in widgets[k]))
			widgets[k].update(path, args, self, cb);
		else {
			cb(); 
		}
	}, function(){
		async.each(Object.keys(widgets), function(k, cb){
			if(widgets[k]){
				widgets[k].render(path, args, self, function(x){
					data[k] = x; 
					cb(); 
				});
			} else {
				console.debug("Error: empty widget found in argument for key "+k); 
				cb(); 
			}
		}, function(){
			if(callback) callback(data); 
		});
	});
}

Session.prototype.toJSON = function(){
	return {
		sid: this.sid, 
		user: this.user,
		data: this.data
	}
}
			
function parseCookieString(str){
	var cookies = {}; 
	str && str.split(';').forEach(function( cookie ) {
		var parts = cookie.split('=');
		cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
	});
	return cookies; 
}


exports.shutdown = function(){
	server.http.close(); 
}

exports.init = function(site, config){
	return new SiteBoot(site, config); 
}

var SiteBoot = function(site, cfg){
	this.site = site; 
	config = cfg; 
	if(!("site_path" in config)) config.site_path = process.cwd(); 

	console.log("Initializing database with configuration "+JSON.stringify(config.database));
	db = new sequelize(config.database.database, config.database.user, config.database.password, {
		define: {
			charset: "utf8", 
			collate: 'utf8_general_ci'
		},
		host: config.database.hostname,
		dialect: "mysql"
	}); 
	// test a query to make sure everything is working..
	db.query("select 1 from dual").error(function(err){
		console.error("Could not connect to database: "+err);
		process.exit(); 
	}); 
	db.types = sequelize; 
	db.objects = {}; 
	db.objects.users = require("./user").init(db); 
	db.objects.properties = require("./property").init(db); 

	db.objects.sessions = db.define("session", {
		sid: {type: db.types.STRING, primaryKey: true},
		user: db.types.STRING,
		data: db.types.TEXT
	}, {
		classMethods: {
			GetOrCreateSession: function(sid, next){
				var cookies = {};
				var session = null; 
				
				console.log("Looking up session "+sid+"..."); 
				
				if(sid in cache.sessions){
					console.debug("Returing cached session for "+sid); 
					next(cache.sessions[sid]); 
					return; 
				}
				
				var sessions = server.db.objects.sessions; 
				
				var hash = String(crypto.createHash("sha1").update(String(Math.random())).digest("hex")); 
				if(!sid) sid = hash; 
				
				sessions.findOrCreate({sid: sid}, {sid: hash}).success(function(x, created){
					if(sid in cache.sessions) {
						next(cache.sessions[sid]); 
						return; 
					}
					
					if(created)
						console.debug("Created new session in database with sid: "+x.sid);
					else 
						console.debug("Loaded existing session from database for: "+x.sid+" -- "+JSON.stringify(x.values));
					
					session = new Session(x); 
					cache.sessions[sid] = session; 
					setSessionTimeout(session); 
					session.object.save().success(function(){
						server.emit("session_create", session); 
						server.emitAsync("session_init", session, function(){
							setSessionTimeout(session); 
							session.object.save().success(function(){
								next(session); 
							}); 
						}); 
					}); 
					
				}); 
			}
		}
	}); 
	
	db.objects.users.sync().success(function(){
		return db.objects.properties.sync(); 
	}).success(function(){
		return db.objects.sessions.sync(); 
	}).success(function(){
		console.debug("Purging old sessions..."); 
		return db.query("delete from sessions where createdAt < '"+(new Date((new Date()).getTime() - 60000*(config.session_ttl||20)))+"'").error(function(err){
			console.error("Could not purge sessions table: "+err);
		}); 
	}); 
	server.db = db; 
}
function setSessionTimeout(session){
	if("timeout" in session)
		clearTimeout(session.timeout); 
	session.timeout = setTimeout(function(){
		console.debug("Removing session object for "+session.sid); 
		server.emitAsync("session_destroy", session, function(){
			session.object.destroy(); 
			delete cache.sessions[session.sid];
		}); 
	}, 60000*(config.session_ttl||20)); 
}; 

SiteBoot.prototype.ClientRequest = function(req, res){
	console.log("============== SERVING NEW REQUEST ==============="); 
	var cookies = parseCookieString(req.headers.cookie); 

	var query = url.parse(req.url, true);
	var docpath = query.pathname.replace(/\/+$/, "").replace(/^\/+/, "").replace(/\/+/g, "/");
	var splitpath = docpath.split("/"); 
	var site = this.site; 
	
	var args = {}
	Object.keys(query.query).map(function(k){args[k] = query.query[k];}); 
	
	try {
		// Default response handler
		var renderer = {
			render: function(path, args, session, next){
				var filepath = vfs.resolve("/"+path); 
				console.debug("Trying to serve ordinary file "+filepath+" ("+path+")..."); 
				if(!filepath){
					next(); 
					return;
				}
				fs.readFile(filepath, "binary", function(err, data){
					if(err) {
						next({
							code: 404,
							data: "Not found!"
						});  
						return; 
					}
					
					var headers = {}; 
					
					next({
						code: 200,
						headers: {
							"Content-type": mime_types[extname(path)],
							"Cache-Control": "public max-age=120"
						},
						data: data,
						type: "binary"
					});  
				});
			}
		};
		
		// default headers
		var resp = {
			headers: {
				"Content-type": "text/plain"
			},
			code: 200,
			data: "No data"
		}
		
		function copyResponse(response){
			if(!response) return; 
			if(typeof(response) === "object"){
				Object.keys(response.headers||{}).map(function(x){
					resp.headers[x] = response.headers[x]; 
				}); 
				resp.code = response.code || resp.code; 
				resp.data = response.data || resp.data; 
				resp.type = response.type || resp.type; 
				if("Location" in resp.headers)
					resp.code = 301
			} else {
				resp.data = response; 
			}
		}
			
		async.waterfall([
			function(next){
				server.db.objects.sessions.GetOrCreateSession(cookies["session"], function(session){
					next(null, session);
				}); 
			}, 
			function(session, next){
				console.debug("Parsing post data..."); 
				resp.headers["Set-Cookie"] = "session="+session.sid+"; path=/"; 
				
				if(!session.user.loggedin && server.config.auto_login){
					session.user = {
						username: "admin",
						role: "admin",
						loggedin: true,
					}
				}
				
				var form = new formidable.IncomingForm();
				form.parse(req, function(err, fields, files) {
					console.debug("FORM: "+docpath+" > "+JSON.stringify(fields)+" > "+JSON.stringify(files)); 
					Object.keys(fields).map(function(k){args[k] = fields[k]; });
					
					var rcpt = args["rcpt"]; 
					if(rcpt && rcpt in plugins && "post" in plugins[rcpt]){
						console.debug("Passing post data to plugin "+rcpt); 
						plugins[rcpt].post(docpath, args, session, function(response){
							copyResponse(response); 
							next(null, session); 
						}); 
					} else if(rcpt && rcpt in widgets && "post" in widgets[rcpt]){
						console.debug("Passing post data to widget.."); 
						widgets[rcpt].post(docpath, args, session, function(response){
							copyResponse(response); 
							next(null, session); 
						}); 
					} else if("post" in site){
						site.post(docpath, args, session, function(response){
							copyResponse(response); 
							next(null, session);
						}); 
					} else {
						next(null, session); 
					}
				}); 
			},  
			function(session, next){
				console.debug("Rendering site..."); 
				var rcpt = args["rcpt"]; 
				args = query.query; 
				
				// files are always served regardless
				if(fs.existsSync(server.vfs.resolve("/"+docpath))){
					console.debug("Serving file since it exists: "+docpath);
					render_default();
				} else if(rcpt && rcpt in plugins && "render" in plugins[rcpt]){
					console.debug("Passing GET data to plugin "+rcpt); 
					plugins[rcpt].render(docpath, args, session, function(response){
						copyResponse(response); 
						next(null, session); 
					}); 
				} else if("render" in site){
					site.render(docpath, args, session, function(response){
						if(!response){
							console.debug("Site did not render.. using default render!"); 
							render_default(); 
						} else { 
							copyResponse(response); 
							next(null, session);
						} 
					});
				} else {
					render_default(); 
				}
				function render_default(){
					renderer.render(docpath, args, session, function(resp){
						copyResponse(resp); 
						next(null, session);
					}); 
				}
			}
		], function(err, session){
			if(err){
				console.error(err); 
			}
			console.debug("Passing headers to browser: "+JSON.stringify(resp.headers)); 
			
			// save the session
			session.save();
			
			if(!resp.data){
				res.writeHead(404, {}); 
				res.end(); 
			} else {
				res.writeHead(resp.code, resp.headers); 
				res.write(resp.data, resp.type); 
				res.end(); 
			}
		}); 
		
	} catch(e) { // prevent server crash
		console.debug("FATAL ERROR WHEN SERVING CLIENT "+path+": "+e+"\n"+e.stack); 
		res.writeHead(200, {}); 
		res.write("Fatal server error occured. Please go to home page."); 
		res.end(); 
	}
}

SiteBoot.prototype.StartServer = function(){
	var self = this; 
	server.http = http.createServer(function(req, res){
		self.ClientRequest(req, res); 
	});
	server.http.listen(config.server_port);
}

SiteBoot.prototype.boot = function(){
	var loader = require("./modules/loader"); 
	console.debug("====== BOOTING SITE ======"); 
	
	var self = this; 
	
	server.config = config;
	server.basedir = BASEDIR; 
	server.widgets = widgets; 
	server.vfs = vfs; 
	server.theme = {}; 
	server.client_code = ""; 
	server.getClientCode = function(session){
		return "var livesite_session = "+(JSON.stringify(session) || "{}")+";\n\n"+this.client_code; 
	}; 

	var site = this.site; 
	
	server.create_widget = function(c){
		if(!(c in widget_types)){
			console.debug("Widget type "+c+" does not exist!"); 
			return widget_types["default"].new(server); 
		} else if("new" in widget_types[c]){
			var widget = widget_types[c].new(server); 
			if(!widget) return widgets_types["default"].new(server); 
			widget.id = c+widget_counter; 
			widget_counter++; 
			widgets[widget.id] = widget; 
			return widget; 
		}
		return widget_types["default"].new(server); 
	}
	
	server.registerObjectFields = function(name, fields){
		if(!(name in server.db.objects)){
			server.db.objects[name] = server.db.define(name, fields); 
			return; 
		} else {
			var schema = server.db.objects[name].rawAttributes; 
			var options = server.db.objects[name].options; 
			Object.keys(fields).map(function(f){
				if(typeof(fields[f]) == "object") schema[f] = fields[f]; 
				else schema[f] = {type: fields[f]}; 
			}); 
			
			server.db.objects[name] = server.db.define(name, schema, options); 
			return; 
		}/*
		var obj = server.db.objects[name]; 
		Object.keys(fields).map(function(f){
			if(f in obj.rawAttributes && f.type != obj.rawAttributes[f].type){
				console.error("New field type does not match type already in the database: "+f+" - "+f.type); 
				return; 
			}
			if(f in obj.rawAttributes){
				return; 
			} 
			// create new field column
			console.debug("Adding new column "+f+" to "+obj.tableName); 
			if(typeof(fields[f]) == "object"){
				obj.QueryInterface.addColumn(f, fields[f]).error(function(){});
				obj.rawAttributes[f] = fields[f]; 
				//obj.rawAttributes[f] = fields[f]; 
			} else {
				obj.QueryInterface.addColumn(obj.tableName, f, {type: fields[f]}).error(function(){});
				obj.rawAttributes[f] = {type: fields[f]}; 
			}
			console.debug(JSON.stringify(Object.keys(obj.options))); 
			
		}); */
	}
	
	function LoadPlugins(directory, next){
		fs.readdir(directory, function(err, files) {
			var pl = []; 
			async.each(files||[], function(file, next){
				fs.stat(directory + '/' + file, function(err, stats) {
					if(stats.isDirectory()) {
						pl.push(file); 
					}
					next(); 
				});
			}, loadplugins); 
			function loadplugins(){
				async.eachSeries(pl, function(plug, cb){
					console.debug("Loading plugin "+plug); 
					LoadModule(directory+"/"+plug, function(module){
						plugins[plug] = module; 
						cb();
					}, plug); 
				}, function(){
					next(); 
				}); 
			}
		});
	}
	function LoadModule(path, cb, prefix){
		prefix = prefix || ""; 
		loader.LoadModule(path, function(module){
			if(!module){
				console.error("Could not load module "+path);
				cb(null); 
				return; 
			}
			async.series([
				// add content to web root
				function(next){
					vfs.add_index(path+"/content", next); 
				}, 
				function(next){
					for(var key in module.forms) {
						var name = ((prefix)?(prefix+"_"):"")+key; 
						forms[name] = module.forms[key]; 
					}
					for(var key in module.handlers){
						var name = ((prefix)?(prefix+"_"):"")+key; 
						handlers[name] = module.handlers[key]; 
						handlers[name].init(server); 
						var hr = handlers[name]; 
						if("pages" in hr) {
							for(var h in hr.pages){
								console.debug("Setting page handler for "+hr.pages[h]+" to "+hr.name); 
								pages[hr.pages[h]] = {
									handler: hr.name
								}
							}
						}
					}
					for(var key in module.widgets) {
						var name = ((prefix)?(prefix+"_"):"")+key; 
						widget_types[name] = module.widgets[key]; 
						if("init" in widget_types[name]) 
							widget_types[name].init(server); 
					}
					
					next(); 
				}, 
				// load objects
				function(next){
					if(!fs.existsSync(path+"/objects")){
						next(); 
						return; 
					}
					fs.readdir(path+"/objects", function(err, files){
						if(files) files.sort(); 
						files.map(function(file){
							if(!/.*js$/.test(file)){
								return; 
							}
							file = path+"/objects/"+file; 
							console.debug("Loading object from "+file); 
							var model = require(file).model; 
							var required = ["constructor", "fields", "name"];
							var fail = false;  
							if(!model){
								console.error("Object definition in "+file+" is missing 'model' field defining the model of the object!"); 
								return; 
							}
							required.map(function(x){
								if(!(x in model)){
									console.error("Object definition in "+file+" is missing required field "+x);
									fail = true; 
								}
							}); 
							if(fail) return; 
							// resolv all the types
							Object.keys(model.fields).map(function(x){
								if(typeof(model.fields[x]) == "object"){
									model.fields[x].type = server.db.types[model.fields[x].type.toString().toUpperCase()]; 
								} else {
									model.fields[x] = server.db.types[model.fields[x].toString().toUpperCase()]; 
								}
							}); 
							var def = server.db.define(model.name, model.fields); 
							server.db.objects[def.tableName] = def; 
							server.db.objects[def.tableName][model.name[0].toUpperCase()+model.name.slice(1)] = model.constructor; 
							
							def.sync(); 
						}); 
						next(); 
					});
				},
				// load client code
				function(next){
					if(!fs.existsSync(path+"/client")){
						next(); 
						return; 
					}
					fs.readdir(path+"/client", function(err, files){
						if(files) files.sort(); 
						for(var key in files){
							var file = files[key]; 
							if(/\.js$/.test(file)){
								console.log("Loading client script "+path+"/client/"+file); 
								server.client_code += fs.readFileSync(path+"/client/"+file); 
							}
						}
						next(); 
					});
				},
				// load css code
				function(next){
					var dirname= path+"/css/"; 
					if(!"client_style" in server) server.client_style = ""; 
					if(!fs.existsSync(dirname)){
						next(); 
						return; 
					}
					fs.readdir(dirname, function(err, files){
						if(files) files.sort(); 
						for(var key in files){
							var file = files[key]; 
							if(/\.css$/.test(file)){
								console.log("Loading stylesheet "+dirname+file); 
								server.client_style += fs.readFileSync(dirname+file); 
							}
						}
						next(); 
					});
				}, 
				// load mailer templates into cache
				function(next){
					var dirname= path+"/mailer_templates/"; 
					if(!fs.existsSync(dirname)){
						next(); 
						return; 
					}
					fs.readdir(dirname, function(err, files){
						if(files) files.sort(); 
						files.map(function(file){
							if(fs.statSync(dirname+file).isDirectory()){
								console.log("Adding mailer template: "+dirname+file); 
								cache.mailer_templates[file] = {
									path: dirname,
									template: file
								}; 
							}
						}); 
						next(); 
					});
				}
			], function(){
				console.debug("Loaded module from path "+path); 
				if("init" in module) module.init(server); 
				cb(module); 
			}); 
		});
	}
	async.series([
		function(cb){
			LoadModule(__dirname, function(module){
				if(!module){
					console.debug("Could not load core components!"); 
					process.exit(); 
				}
				core = module;
				cb(); 
			}); 
		}, 
		function(next){
			console.debug("Loading core plugins.."); 
			LoadPlugins(__dirname+"/plugins", next); 
		},
		function(callback){
			console.debug("Indexing module content in "+__dirname+"/content"); 
			vfs.add_index(__dirname+"/content", function(){
				callback(); 
			}); 
		},
		function(cb){
			console.debug("Loading site data..."); 
			LoadModule(config.site_path, function(module){
				if(!module){
					console.error("Could not load main site module!");
					process.exit(); 
				} 
				cb(); 
			}); 
		},
		function(next){
			console.debug("Loading site plugins.."); 
			LoadPlugins(config.site_path+"/plugins", next); 
		}
	], function(){
		
		if (cluster.isMaster) {
			// this is the master control process
			console.log("Control process running: PID=" + process.pid);

			// fork as many times as we have CPUs
			var numCPUs = require("os").cpus().length;

			cluster.fork();

			// handle unwanted worker exits
			cluster.on("exit", function(worker, code) {
				if (code != 0) {
					console.log("Worker crashed! Spawning a replacement.");
					cluster.fork();
				}
			}); 
		} else {
			process.on('uncaughtException', function (err) {
				var crash = "=============================\n";
				crash += "Program crashed on "+(new Date())+"\n"; 
				crash += err.stack; 
				fs.appendFile(server.config.site_path+"/crashlog.log", crash); 
			});
			site.init(server, function(){
				self.StartServer(); 
				console.log("Server listening...");
			});
		}
	}); 
	
}



