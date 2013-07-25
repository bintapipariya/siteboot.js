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

var Fortmax = function(){
	
var http = require("http");
var https = require("https");
var fs = require("fs");
var url = require("url"); 
var path = require("path");
var Timers = require("timers"); 
var JSON = require("JSON");
var child = require("child_process");
var events = require('events');
var walk = require("walk"); 
var mustache = require('mustache'); 
var crypto = require("crypto"); 
var querystring = require("querystring"); 
var formidable = require("formidable");
var mysql = require("mysql");
var async = require("async"); 
var multipart = require("multipart");
var sys = require("sys");
var posix = require("posix");

var cfg = require("./config");
var config = cfg.config; 

var server_exports = {} 
var db = {}
var widgets = {}
var pages = {};
var users = {};
var current_theme = {}; 

db = mysql.createConnection(config.database);

// initial database tables
var tables = {
	fx_properties: {
		object_type: "varchar (255) not null",
		object_id: "varchar (255) not null",
		property_name: "varchar(255) not null",
		property_value: "text",
		"constraint _pk primary key": "(object_type, object_id, property_name)"
	}, 
	fx_users: {
		username: "varchar(255) not null",
		hash: "varchar(255) not null",
		role: "varchar(255)"
	}
}; 

function CreateTables(callback){
	var funcs = []; 
	console.log("Creating missing database tables..."); 
	async.eachSeries(Object.keys(tables), function(key, callback) {
		db.query("select * from "+key, function(error){
			if(error){
				console.log("Table "+key+" seems to be missing.. will try to create it."); 
				var table_name = key; 
				funcs.push(function(callback){
					var query = Object.keys(tables[table_name]).map(function(x){return x+" "+tables[table_name][x]; }).join(", "); 
					db.query("create table "+table_name+"("+query+")", function(error){
						if(error){
							console.log("An error occured while creating database tables! BAILING OUT! - "+error); 
							process.exit(); 
						}
						callback(); 
					});
				}); 
			}
			callback(); 
		});
	}, function(err){
		async.series(funcs, function(){
			console.log("Successfully created database tables!"); 
			callback(); 
		}); 
	});
	
}
function CreateDatabase(callback) {
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	
	process.stdout.write("No database configuration found. We must create one. Enter settings below.\n"); 
	
	var settings = Object.keys(config.database); 
	var values = {}; 
	var cur_setting = 0; 
	
	var readline = require('readline');

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});
	
	process.stdout.write("Database "+settings[cur_setting]+": "); 
	rl.on('line', function (cmd) {
		if(cur_setting < settings.length){
			values[settings[cur_setting]] = cmd.substr(0, cmd.length - 1); 
			cur_setting++; 
			if(cur_setting == settings.length){
				config.database = values; 
				
				db = mysql.createConnection(config.database); 
				db.connect(function(error){
					if(error){
						console.log("ERROR: still can't create a connection! BAILING OUT!");
						process.exit(); 
					}
					else {
						cfg.save(); 
						CreateTables(function(){
							main();
						}); 
					}
				});
			} else {
				process.stdout.write("Database "+settings[cur_setting]+": "); 
			}
		} 
	});
	
}; 

db.connect(function(error) {
	if (error) {
		CreateDatabase(function(){
			main();
		}); 
		//console.log("ERROR CONNECTING TO DATABASE SERVER: " + error);
		//process.exit(); 
	}
	else {
		CreateTables(function(){
			main();
		}); 
	}
});

var mime_types = {
	'.html': "text/html",
	'.css':  "text/css",
	'.js':   "text/javascript",
	'.jpg': "image/jpeg",
	'.jpeg': "image/jpeg",
	'.png': "image/png"
};

var BASEDIR = process.cwd()+"/"; 
var ITEMS_PER_PAGE = 21; 

var forms = {}; 
var texts = {}; 

var sessions = {}; 
var theme = {};
var handlers = {};
var plugins = {}; 

var vfs = new function(){
	var index = {}; 
	this.add_index = function(dir, callback){
		console.log("Indexing directory "+dir); 
		var addtoindex = function(root, stat, next){
			var realpath = root+"/"+stat.name; 
			var path = root.substr(dir.length)+"/"+stat.name;
			console.log("Adding link "+path+" -> "+realpath); 
			index[path] = realpath; 
			next(); 
		}
		walk.walk(dir)
		.on("file", addtoindex)
		.on("directory", addtoindex)
		.on("end", function(){
			if(callback) callback(); 
		}); 
	}
	this.search = function(wildcard, callback){
		var rx = RegExp(wildcard.replace("*", ".*?"), "gi"); 
		var keys = Object.keys(index); 
		
		// fast asynchronous filter
		async.filter(keys, function(key, callback){
			var match = rx.test(key); 
			if(match){
				console.log("Found matching file "+key+" for "+wildcard); 
			}
			callback(match);
		}, function(results){
			callback(undefined, results); 
		});
	}
	
	this.resolve = function(path, callback){
		if(path in index){
			if(fs.existsSync(index[path])){
				done(undefined, index[path]); 
				return index[path]; 
			}
			else {
				done("File does not exist! ("+path+")"); 
				delete index[path]; 
				return undefined; 
			}
		} else {
			done( "File does not exist: "+path); 
			
			return undefined; 
		}
		function done(err){
			if(callback) callback(err);
		}
	}
}

function LoadTheme(theme, callback){
	var themebase = BASEDIR+"themes/"+theme+"/";
	
	function error(e){
		console.log("ERROR: could not load theme "+theme+": "+e);
	}

	fs.exists(themebase, function(exists){
		if(!exists) {
			error("Directory does not exist!"); 
			callback();
			return; 
		}
		try{
			var module; 
			if(fs.existsSync(themebase+"/"+theme)){
				console.log("DEPRECATED: "+theme+".js found in theme directory of "+theme+" - use init.js for theme init script in the future!"); 
				try {
					module = require(themebase+"/"+theme); 
				} catch(e){
					module = require(themebase+"/init"); 
				}
				module.init(server_exports); 
			} else if(fs.existsSync(themebase+"/init.js")){
				module = require(themebase+"/init");
				module.init(server_exports); 
				handlers[theme] = module; 
				current_theme = module; 
			} else {
				throw "init.js script not found in theme directory for theme "+theme; 
			}
		} catch(e){
			console.log("Could not load theme "+theme+": "+e); 
			callback();
			return; 
		}
		
		
		
		async.series([
			function(callback){
				vfs.add_index(themebase+"/content", function(){
					callback(); 
				}); 
			},
			function(callback){
				console.log("Loading widgets..");
				LoadScripts(themebase+"/widgets", function(scripts){
					for(var key in scripts){
						widgets[key] = scripts[key]; 
						widgets[key].id = key; 
					}
					callback(); 
				});
			},
			function(callback){
				console.log("Loading theme handlers..."); 
				LoadScripts(themebase+"/handlers", function(scripts){
					for(var key in scripts){
						handlers[key] = scripts[key]; 
					}
					callback(); 
				});
			},
			function(callback){
				console.log("Loading forms..."); 
				LoadForms(themebase+"/html", function(results){
					for(var key in results){
						console.log("Loaded form for "+key); 
						forms[key] = results[key]; 
					}
					callback(); 
				}); 
			},
			function(callback){
				console.log("Loading pages...");
				LoadPages(themebase, callback); 
			}
		], function(){
			console.log("Loaded all data!"); 
			console.log(JSON.stringify(handlers));
			callback(); 
		}); 
	});
}


function HandlerInitCompleted(hr){
	// apply the handler to pages
	if("pages" in hr){
		console.log("Updating pages for handler: "+hr.name); 
		for(var key in hr.pages){
			if(!(hr.pages[key] in pages)){
				//console.log("Adding new page for "+hr.pages[key]); 
				pages[hr.pages[key]] = {
					title: "New Page",
					content: "New Page",
					handler: hr.name
				};
			}
			else {
				console.log("Updating page handler for page "+hr.pages[key]+" to "+hr.name); 
				pages[hr.pages[key]].handler = hr.name; 
			}
		}
	}
}


function LoadScripts(dir, callback){
	fs.readdir(dir, function (err, files) {
		if (err) {
			console.log(err);
			callback(); 
			return;
		}
		var scripts = {}; 
		for(var key in files){
			var file = files[key]; 
			if(!/\.js$/.test(file)) {
				continue;
			}
			try{
				var script_name = file.replace(/\.[^/.]+$/, "");
				var hr = require(dir+"/"+file);
				hr.name = script_name; 
				hr.init(server_exports, function(){
					HandlerInitCompleted(hr); 
				});
				HandlerInitCompleted(hr); 
				handlers[script_name] = hr; 
				scripts[script_name] = hr; 
				console.log("SCRIPT LOADED: "+script_name);
			}
			catch(e){
				console.log("ERROR: could not load script "+dir+"/"+file+": "+e); 
				process.exit(); 
			} 
		}
		callback(scripts);
	});
}

function LoadPlugins(basedir, callback){
	widgets_to_load = []; 
	
	walk.walk(basedir+"plugins").on("directory", function(root, stat, next){
		if(fs.existsSync(root+"/"+stat.name+"/init.js")){
			try{
				var hr = require(root+"/"+stat.name+"/init");
				hr.name = stat.name; 
				server_exports[stat.name] = hr; 
				hr.init(server_exports, function(){
					HandlerInitCompleted(hr); 
				});
				handlers[stat.name] = hr; 
				plugins[stat.name] = hr; 
				widgets_to_load.push(stat.name); 
				vfs.add_index(root+"/"+stat.name+"/content"); 
				console.log("PLUGIN LOADED: "+stat.name);
			}
			catch(e){
				console.log("ERROR: could not load plugin "+root+"/"+stat.name+": "+e); 
			} 
		}
		next();
	}).on("end", function(){
		console.log("Loading widgets for plugins.."); 
		async.eachSeries(widgets_to_load, function(plugin_name, callback){
			async.series([
				function(callback){
					LoadScripts(BASEDIR+"plugins/"+plugin_name+"/widgets", function(scripts){
						for(var key in scripts){
							var w = scripts[key]; 
							w.id = plugin_name+"_"+key; 
							widgets[plugin_name+"_"+key] = w;
							console.log("Loaded widget "+plugin_name+"_"+key); 
						}
						callback(); 
					}); 
				}, 
				function(callback){
					LoadForms(BASEDIR+"plugins/"+plugin_name+"/html", function(results){
						for(var key in results){
							forms[plugin_name+"_"+key] = results[key]; 
							console.log("Loaded form "+plugin_name+"_"+key); 
						}
						callback(); 
					});
				}
			], function(err){
				console.log("Loaded plugin "+plugin_name);
				callback(); 
			}); 
		}, function(){
			console.log("Loaded plugin widgets!"); 
			callback();
		});
	});
}
function LoadPages(base, next){
	db.query("select * from fx_page", function(error, rows){
		if(!rows) {
			next();
			return;
		}
		
		for(var row_id in rows){
			var row = rows[row_id]; 
			console.log("PAGE: "+row["url"]); 
			pages[row["url"]] = {
				title: row["title"]||"",
				content: row["content"]||"",
				handler: row["handler"],
			}
		}
		next();
	});
}
function LoadForms(basedir, callback){
	var walker = walk.walk(basedir); 
	var forms = {}; 
	
	walker.on("file", function(root, stat, next){
		if(!/\.html$/.test(stat.name)) {
			next(); 
			return;
		}
		
		try{
			var data = fs.readFileSync(root + "/" + stat.name); 
			var name = stat.name.replace(/\.[^/.]+$/, ""); 
			forms[name] = String(data); 
		}
		catch(e){
			console.log("ERROR: "+root+"/"+stat.name); 
		} 
		next(); 
	}).on("end", function(){
		callback(forms); 
	});
}


function default_handler(){return "Proper server side handler for this page does not exist!";}; 


function printCategoryTree(tree){
	function print_children(cat_tree, indent){
		if(Object.keys(cat_tree) == 0) return ""; 
		for(var child in cat_tree){
			var str = "";
			for(var c = 0; c < indent; c++){
				str+=" "; 
			}
			str+= child; 
			console.log(str); 
			
			print_children(cat_tree[child], indent + 4); 
		}
	}
	for(var toplevel in tree){
		console.log(toplevel);
		print_children(tree[toplevel], 0); 
	}
}

function formatHTML(text){
	var filters = [
		["([A-ZÄÖÅ][A-ZÄÖÅ0-9\\-\\s]+)\n\n", "<b>$1</b><br/><br/>"], // headings 
		["\\*(.+?)\\.(.*?)\n", "<li><b>$1</b><br/>$2</li>"], // list items
		["\\[list\\]\n", "<ul>"],
		["\\[/list\\]\n", "</ul>"],
		["(\\-[^\n]*?\\?\n)", "<b><em>$1</em></b>"], // questions
		["<URL:(.*):(.*)>", "<A HREF=\"$1\">$2</A>"], // links
		["image\\([\"\']*([^\"\']+)[\"\'\\s]*,[\"\'\\s]*([^\"\']+)[\"\']*\\)", "<img src=\"$1\" style=\"$2\"/>"], // images
		["\n", "<br/>"],
	];
	for(var c in filters){
		text = text.replace(RegExp(filters[c][0], "g"), filters[c][1]); 
	}
	text.replace("\n", "<br/>"); 
	return text; 
}

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


function SessionRenderForm(template, session, args) {
	var params = {};
	// add all value retreivers for all currently available widgets
	for(var key in widgets){
		params[key] = new WidgetValue(widgets[key], args, session); 
	}
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


function CreateServer(){
	http.createServer(function(req, res){
		try {
			var current_session = false;
			
			function GetCart(){
				var sess = GetSession(); 
				
				if("cart" in sess) return sess["cart"]; 
				
				function new_cart(){
					return {
						order_number: Math.random().toFixed(6)*1000000,
						items: {}, 
						address: {
							first_name: "",
							last_name: "",
							company: "",
							address1: "",
							address2: "",
							zip: "",
							city: "",
							country: "",
							state: ""
						},
						contact: {
							phone: "",
							email: "",
						},
						ssn: "",
						comment: "",
						payment_method: "",
						subtotal: 0,
						tax_total: 0,
						shipping_total: 0,
						total: 0,
						submitted: false,
						paid: false,
						payment_redirect_form: false,
						confirmed: false,
						New: new_cart,
					};
				}
				sess["cart"] = new_cart(); 
				sess["cart"].New = new_cart; 
				
				console.log("GetCart: "+JSON.stringify(sess)); 
				
				return cart; 
			}

			function GetSession(){
				var cookies = {};
				
				if(current_session != false) return current_session; 
				
				req.headers.cookie && req.headers.cookie.split(';').forEach(function( cookie ) {
					var parts = cookie.split('=');
					cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
				});
				
				if(!cookies["session"] || cookies["session"] == "" || !(cookies["session"] in sessions)){
					var sid = String(crypto.createHash("sha1").update(String(Math.random())).digest("hex")); 
					current_session = {
						sid: sid,
						user: users.New(),
						render: function(tpl, opts){return SessionRenderForm(tpl, this, opts); }
					}; 
					sessions[sid] = current_session; 
					console.log("SESSION::New : "+current_session.sid); 
				}
				else {
					current_session = sessions[cookies["session"]]; 
				}
				return current_session; 
			}

			var query = url.parse(req.url, true);
			var docpath = query.pathname;
			if(query.pathname != "/")
				docpath = query.pathname.replace("..", ""); 
			
			var args = {}

			var form = new formidable.IncomingForm();
			
			var cart = GetCart(); 
			var session = GetSession(); 
			
			Object.keys(query.query).map(function(k){args[k] = query.query[k];}); 
			
			var headers = {
				"Content-type": "text/plain"
			}; 
			
			function ServeRequest(){
				var filepath = vfs.resolve(docpath); 
				
				console.log("GET "+docpath);
				
				// render all widgets to cache
				
				if(docpath == "/" || !filepath){
					var html = "";
					console.log("Serving "+docpath);

					var session = GetSession(); 
						// render all widgets and cache the results for later
						if(!("rendered_widgets" in session))
							session.rendered_widgets = {}
						// TODO: this is right now done BEFORE the render function for the main page is called
						// this means that the main page will at first STILL render the widgets that are left from
						// "previous" state. Perhaps we can handle post to the current handler BEFORE calling render?
						async.eachSeries(Object.keys(widgets), function(i, callback){
							console.log("Prerendering widget "+i); 
							var new_args = {};
							Object.keys(args).map(function(x){new_args[x] = args[x];}); 
							new_args["widget_id"] = widgets[i].id; 
							new_args["widget_arg"] = widgets[i].argument; 
							widgets[i].render(docpath, new_args, session, function(html){
								session.rendered_widgets[i] = html;
								callback();
							}); 
						}, function(){
							headers["Set-Cookie"] = "session="+session.sid+"; path=/";
							headers["Content-type"] = "text/html; charset=utf-8"; 
							headers["Cache-Control"] = "public max-age=120";
							
							// process page speciffic params and generate page
							var handler = {}
							if(docpath in pages && pages[docpath].handler in handlers){
								handler = handlers[pages[docpath].handler];
							}
							else {
								console.log("Using default theme handler for rendering the page "+JSON.stringify(theme)); 
								handler = current_theme; 
							}
							if("headers" in handler){
								for(var key in handler.headers){
									headers[key] = handler.headers[key];
								} 
							}
							(handler["render"]||handler["get"])(docpath.replace(/\/+$/, "").replace(/^\/+/, ""), args, session,
								function(html){
									res.writeHead(200, headers); 
									res.write(html); 
									res.end(); 
								}
							); 
						});
					 /*else {
						console.log("404 not found: "+docpath);
						headers["Content-type"] = "text/html; charset=utf-8"; 
						//headers["Location"] = "http://sakradorren.se"; 
						res.writeHead(404, headers); 
						res.write(mustache.render(forms["404"], {})); 
						res.end();
					}*/
				}
				else if(filepath){
					// serve the file
					fs.readFile(filepath, "binary", function(err, data){
						
						if(err) {
							res.end(); 
							return; 
						}
						
						headers["Content-type"] = mime_types[path.extname(docpath)]; 
						headers["Cache-Control"] = "public max-age=120";
						
						res.writeHead(200, headers);
						res.write(data, "binary"); 
						res.end(); 
					});
				}
				else {
					res.end(); 
				}
			}
			// upon a post request we simply process the post data 
			// and redirect the user to the same page. 
			if(req.method == "POST"){
				form.parse(req, function(err, fields, files) {
					console.log("FORM: "+docpath+" > "+JSON.stringify(fields)+" > "+JSON.stringify(files)); 
					
					// TODO: do we need to update the signature of all handlers to accomodate for uploaded files or is this ok?
					if(Object.keys(files).length)
						args["uploaded_file"] = files["file"]; 
						
					Object.keys(fields).map(function(k){args[k] = fields[k]; }); 
					
					// submit post to the handler before doing the main render 
					// NOTE: this is necessary in order to get latest state when rendering!
					//headers["Location"] = docpath;
					res.writeHead(200, headers);
					var success = false; 
					
					var handler = {};
					if((docpath in pages) && (pages[docpath].handler in handlers)){
						handler = handlers[pages[docpath].handler];
					} else {
						handler = current_theme; 
					}
					if("post" in handler){
						handler.post(docpath.replace(/\/+$/, "").replace(/^\/+/, ""), args, session, function(response){
							res.writeHead(200, headers); 
							if(response) res.write(response); 
							res.end(); 
						}); 
					} else {
						ServeRequest(); 
					}
				});
			} else if(req.method == "GET"){
				ServeRequest(); 
			}
		} catch(e) { // prevent server crash
			console.log("FATAL ERROR WHEN SERVING CLIENT "+path+", session: "+JSON.stringify(session)+": "+e+"\n"+e.stack); 
			res.writeHead(200, {}); 
			res.write("Fatal server error occured. Please go to home page."); 
			res.end(); 
		}
	}).listen(config.server_port);
}

function main(){
	server_exports.db = db; 
	server_exports.pages = pages; 
	server_exports.config = config;
	server_exports.basedir = BASEDIR; 
	server_exports.widgets = widgets; 
	server_exports.vfs = vfs; 
	server_exports.users = users; 
	server_exports.handlers = {
		register: function(class_name, module){
			if(class_name in handlers){
				console.log("WARNING: Replacing handler for "+class_name); 
			}
			handlers[class_name] = module; 
			console.log("Registered handler for "+class_name); 
		}
	}
	
	async.series([
		function(callback){
			vfs.add_index("./content", function(){
				callback(); 
			}); 
		},
		function(callback){
			console.log("Loading core forms..."); 
			LoadForms(BASEDIR+"/html", function(results){
				for(var key in results){
					forms[key] = results[key]; 
					console.log("Loaded form "+key); 
				}
				callback(); 
			}); 
		},
		function(callback){
			console.log("Loading core handlers...");
			LoadScripts(BASEDIR+"/handlers", function(scripts){
				for(var key in scripts){
					handlers[key] = scripts[key]; 
				}
				callback(); 
			});
		},
		function(callback){
			console.log("Loading core widgets...");
			LoadScripts(BASEDIR+"/widgets", function(scripts){
				for(var key in scripts){
					widgets[key] = scripts[key]; 
					widgets[key].id = key; 
				}
				callback(); 
			});
		},
		function(callback){
			console.log("Loading plugins..."); 
			LoadPlugins(BASEDIR, callback); 
		},
		function(callback){
			LoadTheme(config.theme, callback); 
		},
	], function(){
		CreateServer(); 
		console.log("Server listening...");
	});
	
}


// extensions
users.create = function(user, callback){
	users.get(user, function(error, user){
		if(!error){
			callback("CreateUser: User already exist!"); 
			return; 
		}
		
	}); 
}

users.get = function(params, callback){
	try {
		db.query("select * from fx_users where "+
			Object.keys(params).map(function(x){return x+" = ?";}).join(" and "), 
			Object.keys(params).map(function(x){return params[x];}), function(error, rows){
			
			if(error){
				console.log("SQL ERROR in users.get(): "+error); 
				callback(error); 
				return; 
			}
			if(!rows || rows.length != 1){
				callback("GetUser: could not get user with params "+JSON.stringify(params)); 
				return; 
			}
			var row = rows[0]; 
			var us = undefined; 
			async.series([
				function(next){
					//sessions.find({username: row.username}, callback);
					next();
				},
				function(next){
					var user = {
						username: row.username,
						hash: row.hash,
						role: row.role, 
						is_loggedin: ((us)?true:false),
					}; 
					callback(undefined, user); 
					next(); 
				}],
				function(next){
					// done 
				}
			); 
		}); 
	} catch(e) {
		callback(e); 
	}
}

users.New = function(){
	return {
		username: "",
		loggedin: false
	}
}

users.login = function(username, hash, session, callback){
	if(!username || !hash || !session){
		callback("Need username and sha1 hash and session parameters!"); 
		return; 
	}
	users.get({username: username}, function(error, user){
		if(error){
			callback("Error: Wrong username or password!"); 
			console.log(error); 
			return; 
		}
		console.log("Login: user.hash: "+user.hash+", key: "+session.sid); 
		if(hash == crypto.createHash("sha1").update(user.hash+session.sid).digest('hex')){
			session.user = {
				username: user.username,
				role: user.role, 
				loggedin: true
			};  
			callback(undefined, user); 
			return; 
		}
		else {
			console.log("Error: could not login user "+username+": passwords do not match!"); 
			callback("Error: Wrong username or password!"); 
			return; 
		}
		callback(); 
	}); 
};

pages.get = function(path, done){
	function return_page(rows){
		var page = {
			title: "",
			content: ""
		}; 
		for(var row_id in rows){
			page[rows[row_id]["property_name"]] = rows[row_id]["property_value"];
		}
		var obj = {
			// gets latest version
			get: function(done){ 
				self = this; 
				try {
					db.query("select * from fx_properties where object_type = 'page' and object_id = ?", [self.url], function(error, rows, cols){
						if(!error && rows.length){
							for(key in rows){
								self[rows[key]["property_name"]] = rows[key]["property_value"]; 
							}
						}
						done(self, error); 
					});
				} catch(e){
					done(self, error); 
				}
			},
			update: function(values, done){
				self = this; 
			},
			remove: function(done){
				
			}
		}
		for(key in page){
			obj[key] = page[key]; 
		}
		return obj; 
	}
	try {
		db.query("select * from fx_properties where object_type = 'page' and object_id = ?", [path], function(error, rows){
			if(!error && rows.length){
				var obj = return_page(rows); 
				done(error, obj); 
				return; 
			}
			done(error, {}); 
		});
	} catch(e){
		done(e, return_page([])); 
	}
}


}

Fortmax(); 

