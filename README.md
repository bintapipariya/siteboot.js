Introduction
============

SiteBoot is a package that makes it simple for you to build really cool and editable websites. SiteBoot is packed with features that you can easily use to create a site template. 

Installation

	npm install siteboot
	
Creating a site with SiteBoot is as simple as this: 

	var sb = require("siteboot"); 
	var config = {
		database: {
			"hostname": "db_host",
			"user": "db_user",
			"password": "db_password",
			"database": "db_name"
		},
		server_port: 8000,
		auto_login: true
	}
	var Site = function(x){
		
	}

	Site.prototype.init = function(x){
		this.server = x; 
		this.message = "Hello World!"; 
		console.log("Site initialized!"); 
	}

	Site.prototype.render = function(path, args, session, callback){
		callback(this.message);
	}

	sb.init(config, function(){
		sb.boot(new Site());
	});  

This will create a site with the default configuration. You will need to create a database though inside MySQL. SiteBoot uses MySQL. All the required tables will be set up automatically though upon first connection. 

Now you can create a site inside a directory where you will put all the site related content. 

One great benefit of SiteBoot is that it compiles all scripts for you and loads everything automatically. You can put your widgets inside "widgets" folder, then reference them inside the main theme through server.get_widget_or_empty() and render html templates using session.render(). All widgets can be rendered in one go using session.render_widgets(). Then you call the callback that is passed to the render method in order to output the page to the user. 

The rest is handled by siteboot. 

The behavior of post requests is dependent on a few parameters. 

- "redirect": if set then the server will redirect the post request using 301 to the current address. Useful when submitting forms. Otherwise the request is not redirected and JSON will probably be returned instead of a page html. 
- "rcpt": specify plugin which will receive the post data. Plugin "post" method will be called if it exists. 

There are more options that can be posted directly to the siteboot. For example, siteboot supports contact forms that you can simply enter into the editor on the page and then post to siteboot with special hidden post variables. More documentation on these features will come a little later since it's quite a lot to put down in text. 

License
=======

LiveSite - The Node.js Web Framework
Copyright (C) 2013  Martin K. Schröder

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
