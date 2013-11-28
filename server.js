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
var Q = require("q"); 
var jquery = require("jquery");

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

var shellarg = function(cmd) {
  return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};

var DefaultWidget = function(x){
	this.server = x; 
}
DefaultWidget.prototype.render = function(req){
	var r = Q.defer(); 
	r.resolve("[widget not found]"); 
	return r.promise; 
}

widget_types["default"] = {
	new: function(x){
		return new DefaultWidget(x); 
	},
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

console.info = function(msg){
	console.log("INFO: "+msg); 
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

server.q = Q; 
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

server.render = function(template, fragments){
	var proms = []; 
	var result = Q.defer();  
	
	var data = {}; 
	if(!fragments) fragments = {}; 
	
	Object.keys(fragments).map(function(x){
		if(typeof fragments[x] == "object" && "done" in fragments[x]){
			proms.push([x, fragments[x] ]); 
		} else {
			data[x] = fragments[x]; 
		}
	}); 
	// render all promises
	async.eachSeries(proms, function(x, next){
		console.debug("Rendering fragment "+x[0]+" for "+template); 
		var timeout = setTimeout(function(){
			console.error("Rendering timed out for "+x[0]);
			data[x[0]] = "Timed out!"; 
			next(); 
		}, 2000); 
		x[1].done(function(html){
			console.debug("Done rendering fragment "+x[0]+" for "+template); 
			clearTimeout(timeout); 
			data[x[0]] = html; 
			next(); 
		}); 
	}, function(){
		var form = forms[template]||""; 
		console.debug("Rendering template "+template); 
		result.resolve(mustache.render(forms[template]||"", data)); 
	}); 
	return result.promise; 
}

server.defer = function(){
	return Q.defer(); 
}

server.create_widget = function(c, options){
	
	if(!(c in widget_types) || !("new" in widget_types[c])){
		console.debug("Widget type "+c+" does not exist!"); 
		return widget_types["default"].new(server); 
	}
	
	var x = widget_types[c].server||server; 
	console.debug(x); 
	
	var widget = widget_types[c].new(x); 
	if(!widget) return widgets_types["default"].new(x); 
	
	widget.id = "widget_"+widget_counter; 
	widget.name = c; 
	widget_counter++; 
	
	if(!("data" in widget)){
		widget.data = function(d){
			if(d) {
				this.model = d;
				return this.model; 
			} else {
				return this.model; 
			}
		}
	}
	
	widget.addWidget = function(name, id, settings){
		this[name] = this.server.create_widget(id); 
		this[name].data(settings); 
	}
	
	if("init" in widget)
		widget.init(server); 
		
	if(options) widget.data(options); 
	
	widgets[widget.id] = widget; 
	
	console.debug("Created widget "+c); 
	
	return widget; 
}

server.registerObjectFields = function(name, fields){
	var table = {}; 
	var self = this; 
	var ret = Q.defer(); 
	
	if(!(name in server.db.objects)){
		server.db.objects[name] = table = server.db.define(name, fields); 
		
		async.eachSeries(Object.keys(fields), function(f, next){
			//console.info("Updating field "+f+" for "+name+"!"); 
			var def = {}; 
			if(typeof(fields[f]) == "object") def = fields[f]; 
			else def = {type: fields[f]}; 
			self.db.getQueryInterface().changeColumn(table.tableName, f, def)
			.success(function(){next();})
			.error(function(err){
				console.debug("ERROR: "+err); 
				self.db.getQueryInterface().addColumn(table.tableName, f, def)
				.success(function(){next();})
				.error(function(err){
					console.debug("ERROR: "+err);  
					next(); 
				}); 
			}); 
		}, function(){
			table.sync().success(function(){
				ret.resolve(table);
			}).error(function(){
				ret.resolve(table); 
			});
		}); 
	} else {
		var table = server.db.objects[name]; 
		async.eachSeries(Object.keys(fields), function(f, next){
			console.info("Registering field "+f+" for "+name+"!"); 
			if(typeof(fields[f]) == "object") schema[f] = fields[f]; 
			else schema[f] = {type: fields[f]}; 
			
			self.db.getQueryInterface().changeColumn(table.tableName, f, schema[f])
			.success(function(){next();});  
		}, function(){
			ret.resolve(table); 
		}); 
	}
	return ret.promise;  
}

server.shellarg = shellarg; 

server.pool = {
	get: function(model){
		if(model in server.db.objects){
			return server.db.objects[model]; 
		}
	}
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
		async.eachSeries(Object.keys(widgets), function(k, cb){
			if(widgets[k]){
				var session_data = self[widgets[k].id]||{}; 
				widgets[k].render(path, args, self, function(x){
					data[k] = x; 
					self[widgets[k].id] = session_data; 
					cb(); 
				}, session_data);
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

var ServerObject = function(table, server){
	this.table = table; 
	this.server = server; 
}

ServerObject.prototype.create = function(opts){
	var result = Q.defer(); 
	this.table.create(opts).success(function(obj){
		result.resolve(obj); 
	}); 
	return result.promise; 
}

ServerObject.prototype.search = function(opts){
	var result = Q.defer(); 
	this.table.findAll({where: opts}).success(function(objs){
		var ret = objs.map(function(x){return x.id}); 
		result.resolve(ret); 
	}); 
	return result.promise; 
}

ServerObject.prototype.browse = function(ids){
	var result = Q.defer(); 
	var where = {where: ["id in (?)", ids]}; 
	if(!ids || !ids.length){
		where = {}; 
	} 
	
	this.table.findAll(where).success(function(objs){
		console.debug("Found "+objs.length+" objects.."); 
		var ret = {}; 
		objs.map(function(x){ret[x.id] = x;}); 
		result.resolve(ret, objs); 
	}); 
	
	return result.promise; 
}

/*
function renderWidgets(req, res){
	var self = this; 
	if(!self._widgets) return {}; 
	Object.keys(self._widgets).map(function(x){
		result[x] = self._widgets.render(req, res)
}
*/
exports.init = function(site, config){
	return new SiteBoot(site, config); 
}

var SiteBoot = function(SiteClass, cfg){
	var site = this.site = new SiteClass(server); 
	
	if(!("init" in site)) site.init = function(){return Q.defer().resolve().promise;}
	
	this.inprogress = false; 
	
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
				
				console.debug("Looking up session "+sid+"..."); 
				
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
	
	db.objects.properties.sync().success(function(){
		return db.objects.sessions.sync(); 
	}).success(function(){
		/*console.debug("Purging old sessions..."); 
		return db.query("delete from sessions where createdAt < '"+(new Date((new Date()).getTime() - 60000*(config.session_ttl||20)))+"'").error(function(err){
			console.error("Could not purge sessions table: "+err);
		}); */
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
	var self = this; 
	/*
	if(self.inprogress){
		setTimeout(function(){
			self.ClientRequest(req, res); 
		}, 0); 
		return; 
	} 
	self.inprogress = true; 
	*/
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
			render: function(req){
				var res = Q.defer(); 
				var path = req.path; 
				
				var filepath = vfs.resolve("/"+path); 
				console.debug("Trying to serve ordinary file "+filepath+" ("+path+")..."); 
				if(!filepath){
					res.resolve(); 
					return res.promise;
				}
				fs.readFile(filepath, "binary", function(err, data){
					if(err) {
						res.resolve({
							code: 404,
							data: "Not found!"
						});  
						return res.promise; 
					}
					
					var headers = {}; 
					
					res.resolve({
						code: 200,
						headers: {
							"Content-type": mime_types[extname(path)],
							"Cache-Control": "public max-age=120"
						},
						data: data,
						type: "binary"
					});  
				});
				return res.promise; 
			}
		};
		
		// default headers
		var resp = {
			headers: {
				"Content-type": "text/html"
			},
			code: 200,
			data: "Default data"
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
					if(req.method != "POST"){
						next(null, session); 
						return; 
					}
					
					console.log("POST: "+docpath+" args: "+JSON.stringify(fields)); 
					console.debug("FORM: "+docpath+" > "+JSON.stringify(fields)+" > "+JSON.stringify(files)); 
					
					Object.keys(fields).map(function(k){args[k] = fields[k]; });
					
					var rcpt = args["rcpt"]; 
					if(rcpt && rcpt in plugins && "post" in plugins[rcpt]){
						console.debug("Passing post data to plugin "+rcpt); 
						plugins[rcpt].post({
							path: docpath,
							args: args, 
							session: session}).done(function(response){
							copyResponse(response); 
							next(null, session); 
						}); 
					} else if(rcpt && rcpt in widgets && "post" in widgets[rcpt]){
						console.debug("Passing post data to widget.."); 
						widgets[rcpt].post({
							path: docpath,
							args: args, 
							session: session})
						.done(function(response){
							delete args["rcpt"];  
							copyResponse(response); 
							next((docpath=="ajax")?"ajax":null, session); 
						}); 
					} else if("post" in site){
						site.post({
							path: docpath,
							args: args, 
							session: session}).done(function(response){
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
				console.log("GET: "+docpath); 
				
				if(docpath == "scripts"){
					copyResponse({
						headers: {
							"Content-type": "text/javascript"
						}, 
						data: server.client_code
					}); 
					next(null, session); 
					return; 
				} else if(docpath == "styles"){
					copyResponse({
						headers:  {
							"Content-type": "text/css"
						}, 
						data: server.client_style
					}); 
					next(null, session); 
					return; 
				}
					
				var rcpt = args["rcpt"]; 
				args = query.query; 
				
				// files are always served regardless
				if(fs.existsSync(server.vfs.resolve("/"+docpath))){
					console.debug("Serving file since it exists: "+docpath);
					render_default();
				} else if(rcpt && rcpt in plugins && "render" in plugins[rcpt]){
					console.debug("Passing GET data to plugin "+rcpt); 
					plugins[rcpt].render({
							path: docpath,
							args: args, 
							session: session}).done(function(response){
						copyResponse(response); 
						next(null, session); 
					}); 
				} else if(rcpt && rcpt in widgets && "render" in widgets[rcpt]){
					console.debug("Passing GET data to widget: "+JSON.stringify(args)); 
					widgets[rcpt].render({
							path: docpath,
							args: args, 
							session: session}).done(function(response){
						copyResponse(response); 
						next(null, session); 
					}); 
				} else if("render" in site){
					console.debug("Calling site render..."); 
					site.render({
							path: docpath,
							args: args, 
							session: session})
					.done(function(response){
						if(!response){
							console.debug("Site did not render.. using default render!"); 
							render_default(); 
						} else { 
							server.render("root", {
								title: session.title||"",
								content: response,
							}).done(function(html){
								copyResponse(html); 
								next(null, session);
							}); 
						} 
					});
				} else {
					render_default(); 
				}
				function render_default(){
					renderer.render({
							path: docpath,
							args: args, 
							session: session}).done(function(resp){
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
			self.inprogress = false; 
		}); 
		
	} catch(e) { // prevent server crash
		console.debug("FATAL ERROR WHEN SERVING CLIENT "+path+": "+e+"\n"+e.stack); 
		res.writeHead(200, {}); 
		res.write("Fatal server error occured. Please go to home page."); 
		res.end(); 
		self.inprogress = false; 
	}
}

SiteBoot.prototype.StartServer = function(){
	var self = this; 
	server.http = http.createServer(function(req, res){
		self.ClientRequest(req, res); 
	});
	server.http.listen(config.server_port||8000);
}

SiteBoot.prototype.boot = function(){
	var loader = require("./modules/loader"); 
	console.debug("====== BOOTING SITE ======"); 
	
	var self = this; 
	
	server.q = Q; 
	server.config = config;
	server.basedir = BASEDIR; 
	server.widgets = widgets; 
	server.vfs = vfs; 
	server.theme = {}; 
	server.client_code = ""; 
	server.client_style = ""; 
	
	server.getClientCode = function(session){
		return "var livesite_session = "+(JSON.stringify(session) || "{}")+";\n\n"+this.client_code; 
	}; 

	var site = this.site; 
	
	function LoadPlugins(directory, next){
		fs.readdir(directory, function(err, files) {
			var pl = []; 
			if(!files){
				next(); 
				return; 
			}
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
						var x = jquery.extend({}, server); 
						
						// replace the render method with a widget specific method that takes into account template prefixing TODO
						x.render = function(template, data){
							// if already prefixed with plugin name then we just render as normal. 
							console.debug("Rendering template "+template+" for "+prefix); 
							if(template.indexOf(prefix) == 0) 
								return server.render(template, data); 
							// otherwise prefix it with the plugin name
							return server.render(((prefix)?(prefix+"_"):"")+template, data); 
						} 
						
						widget_types[name].server = x; 
						
						if("init" in widget_types[name]) {
							widget_types[name].init(x); 
						}
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
						async.eachSeries(files, function(file, next){
							if(!/.*js$/.test(file)){
								next(); 
								return; 
							}
							file = path+"/objects/"+file; 
							console.debug("Loading object from "+file); 
							var model = require(file).model; 
							
							var required = ["constructor", "fields", "name"];
							var fail = false;  
							if(!model){
								console.error("Object definition in "+file+" is missing 'model' field defining the model of the object!"); 
								fail = true; 
							} else {
								required.map(function(x){
									if(!(x in model)){
										console.error("Object definition in "+file+" is missing required field "+x);
										fail = true; 
									}
								}); 
							}
							if(fail){
								next();
								return; 
							}
							
							if(!model.tableName)
								model.tableName = model.name.replace(/\./g, "_"); 
								
							// resolv all the types
							Object.keys(model.fields).map(function(x){
								if(typeof(model.fields[x]) == "object"){
									var typename = model.fields[x].type.toString().toUpperCase(); 
									if(!(typename in server.db.types)){
										delete model.fields[x]; 
									} else {
										model.fields[x].type = server.db.types[typename]; 
									}
								} else {
									model.fields[x] = server.db.types[model.fields[x].toString().toUpperCase()]; 
								}
							}); 
							
							console.debug(Object.keys(model.fields)); 
							
							server.registerObjectFields(model.tableName, model.fields).done(function(def){
								var proto = model.constructor.prototype; 
								
								model.constructor.prototype = new ServerObject(def, server); 
								
								Object.keys(proto).map(function(x){
									model.constructor.prototype[x] = proto[x]; 
								}); 
								
								model.constructor.prototype.super = ServerObject.prototype; 
								model.constructor.prototype.constructor = model.constructor; 
								
								server.db.objects[model.name] = new model.constructor(); 
								server.db.objects[model.name].table = def; 
								//server.db.objects[model.tableName][model.name] = model.constructor; 
									
								def.sync().success(function(){
									if("init" in server.db.objects[model.name])
										server.db.objects[model.name].init().done(next); 
									else
										next();
								});  
							}); 
						}, function(){
							next(); 
						}); 
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
					var dirname = path+"/css/"; 
					if(!("client_style" in server)) server.client_style = ""; 
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
								var css = fs.readFileSync(dirname+file); 
								if(css)
									server.client_style += css; 
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
				console.error(crash); 
				fs.appendFile(server.config.site_path+"/crashlog.log", crash); 
			});
			
			var server_started = false; 
			setTimeout(function(){
				if(!server_started) {
					console.error("Site is taking too long to start! did you forget to call 'next' in the site 'init' method?"); 
					process.exit(); 
				}
			}, 30000); 
			site.init(server).done(function(){
				self.StartServer(); 
				server_started = true; 
				console.log("Server listening...");
			});
		}
	}); 
	
}



