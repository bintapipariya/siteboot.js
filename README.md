FORTMAX SITEBOOT WEB OBJECTS
===========

Fortmax SiteBoot is a web development framework offering you a powerful way to develop javascript based web services. SiteBoot is like a game engine, and your site is like a game - except in the context of siteboot it is html that is sent to the user instead of graphical polygons being sent to the graphics card. 

SiteBoot is written entirely in JavaScript and requires node js. 

	npm install siteboot
	
SERVICES PROVIDED BY SITEBOOT
===========

* Automatic parsing and loading of all resources (ie you only write your classes, siteboot automatically loads them, makes your classes inherit from the right base types and sets up an interface that your plugins and apps can use - all this greatly reduces the amount of code that you need to write to get your app up and running). 
* Powerful ORM to map objects to MySQL database. With siteboot you rarely will need to write any SQL code. Instead you will define higher level objects and siteboot will automatically keep the database structure up to date. 
* Plugin architecture. SiteBoot plugin architecture makes it easy to write third party apps. Many SiteBoot core functions are implemented as plugins. Even your main application works like a plugin. 
* Localization support - built in localisation support for most objects (by using properties), for html templates and within code. You can have several versions of the same object properties for each language and siteboot will automatically load the localized copy for the chosen language. 

CREATING AN OBJECT
==========

You will define your objects in the "objects" folder of your plugin. This is what your object may look like: 

	function MyObject(){
		
	}

	exports.model = {
		constructor: MyObject,
		name: "myobject.name",
		fields: {
			id: {
				type: "integer", 
				autoIncrement: true,
				unique: true
			},
			name: "string",
			description: "text"
		}, 
		index: ["name"]
	}

The code above will go into a js file, like "myobject.js". When siteboot loads your site, it will parse this file and automatically create an sql table called "myobject_name" with the colums that you have specified. The markdown of the fields is the same as Sequelize uses, except that we define types as strings instead of referencing Sequelize types. 

If you supply "update: true" flag in your site config then siteboot will also update the table structure for the objects. You have to boot your site once with update true in order to update the table structure if you add a field to an object. 

To access the above object within your application (or within a widget), you will use syntax that looks like this: 

	var objects = self.server.pool.get("myobject.name"); 
	objects.find({name: "foobar"}).done(function(obj){
		console.log(obj.description); 
	}); 

Notice how the fields that you have defined in the object definition are now available as object properties. You can set a field like this: 

	obj.description = "A description"
	
To save an object to the database: 
	
	obj.save().done(function(){console.log("Done!");}); 
	
To delete an object: 

	obj.destroy().done(..); 
	
HOW SITEBOOT MAKES IT WORK
========

All objects get a variable inside them called "server" which points to a server interface object. This object then contains links to other services that your code will have access to. In fact, nearly every JS file that is loaded by siteboot such as widgets, plugins and objects will have the server variable set in it's "this" pointer. The definition of the server interface is found in lib/server_interface.js file in siteboot source. 

Siteboot loads your objects, html files, client code, widgets and other resources upon startup. When the user visits a url, siteboot first looks for the path in physical files that are available in "/content" folders in your plugins. If the file is not found, then siteboot looks in the pages table for the path to the page. If the page is found then Page.render() method is called for the template that is used for that particular page. 

When you define your page, you also create a page template js file with code that will run every time user visits that page. SiteBoot will automatically call the render() method and it will expect the render() method to return an object with fields that can be directly rendered using mustasche onto the html template that will have the same file name as the widget but with .html extension. 

Each page is also considered to be a widget. So you can define your page template like this: 

	var Page = function(){
		
	}

	Page.prototype.post = function(req) {
		var ret = this.server.defer(); 
		var self = this; 
		
		self.super.post.call(self, req).done(function(){
			ret.resolve(); 
		}); 
		
		return ret.promise; 
	}

	Page.prototype.render = function(req){
		var result = this.server.defer(); 
		var self = this; 
		
		req.meta.page_title = self.object.properties.title; 
		result.resolve({
			
		}); 
		
		return result.promise; 
	}

	exports.module = {
		type: Page
	}

All methods that you write in your widget have to return a Q.promise(). In this case server.defer() method is the same as Q.defer() in node js. 

The render method can then access your objects inside the database and prepare data for the html view. Inside the html view you will use tags like this: 

	<h1>{{title}}</h1> 

to render the fields of the object that is returned by the render method through the call to ret.resolve(). The syntax here is the same as mustache syntax. 

TEMPLATES
========

All html templates in siteboot are written with mustache stateless syntax markup. However there is an extra syntax added which looks like this: 

	[[blog:post path="/path/to/post"]]
	
This syntax is used to include a widget called "post" from the blog plugin and pass it an argument "path" that is set to the unique name of the post to display. The result of this syntax is that the page will show your post whereever you put this piece of code. 

All siteboot syntax is evaluated AFTER mustache pass. So you can include this syntax even in your content data. 

WIDGETS
=======

Widgets are user interface components that are embeddable into pages using the above syntax. A widget consists of: 

* widget.js file - contains code and goes into "widgets" folder. 
* widget.html file - contains the view template and goes into "html" folder. 
* widget.client.js - contains client code javascript and goes into "client" folder. 
* widget.object.js - contains database object (if any) and goes into "objects" folder. 
* widget.css - contains the stylesheets and goes into "css" folder. 

If you then call [[widget arg="foo"]] then your widgets render() method will be called with a "req" object that has a dictionary member called "args" that will contain the "arg" key set to "foo". So you can access your argument from within the render method using: 

	req.args["arg"] (== "foo")
	
WRITING PLUGINS
========

Now you can put all of the above files into a separate working tree and place the whole tree into a folder under your "plugins" directory to make all the widgets in this working tree members of your new plugin. When you do this, you will now have to prefix all of your widgets with your plugin folder name when you want to include them: 

	[[myplugin:widget]]
	
Plugins can contain their own client javascript, objects, widgets etc. All of these files will be loaded by siteboot and all client code and css will be compiled into one large file that will be sent to the client. 

PUBLISHING PLUGINS
==========

SiteBoot has a module called "app" that implements interface for installing plugins from repositories. If you have the app module and console module installed then you can open up the server console in your web browser and type: 

	app install blog
	
to install the blogging module. 

Siteboot operates with git repositories for third party plugins. So all distribution and version control of plugins is done through public git repositories or through github. 

CONTRIBUTING
========

Many siteboot plugins can be improved. Particularly currently the security module is under development and there needs to be proper access control implemented. SiteBoot will have both a firewall that operates by filtering post and get arguments and a more broad user access control based on roles. This is currently high priority on the list. 

You can contribute by sending me an email to: 

	martin@fortmax.se

License
========

SiteBoot - The Node.js Web Framework Copyright (C) 2013 Martin K. Schröder

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see http://www.gnu.org/licenses/.

Contact
========

SiteBoot is developed by Fortmax AB in Sweden. If you have any questions, feel free to send us an email to info@fortmax.se. 
