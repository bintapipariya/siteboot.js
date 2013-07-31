Introduction
============

LiveSite is web framework developed for node.js with fully featured inline editing. 

The philosophy of LiveSite is: remove all admin panels and just do the edinting inline! We provide you with a filesystem tree where all files are loaded automatically and a versatile plugin system to make your code as modular as possible. 

To run livesite you will need node.js: 
	apt-get install node

Then run the bootstrap script in the livesite directory to install all of the dependencies. 

Then create a new mysql database. 

Then run: 
node server.js in the livesite directory

Sorry, very little docs have been written at the moment. More will come.. 

USAGE
===== 

LiveSite is a complete system - it does not need an external server. It all runs on node js and all the modules that are available for it in the npm library. 

To run the server, simply type: 
	
	node server.js 
	
In the main project directory. This will load default config and start listening on the default 8000 port. To change the configuration, create a new file called "config-local.js" and make it export a variable called "config" with all the settings. See config.js for an example. 

DIRECTORY STRUCTURE
===================

From this point on, the server loads all the plugins that it can find in /plugins directory, it loads the theme specified in the config and also loads all the widgets and forms that are defined in plugins and the theme. 

Implementing a plugin
=====================

Coming soon..
	

MEDIA UPLOADS
=============

All media uploads are put into the same folder, /uploads/ on the server and each image is renamed to the SHA1_HASH_OF_FILE.ext format. This greatly simplifies how we work with images because now we don't have to care about duplicate media files and we don't need any media browser in the application because we instead simply allow the user to arbitrarily upload files every time they need to embed an image or add some media file to a page. If the uploaded file is exactly the same to a previously uploaded file then the already present version is used. This way we can easily avoid duplicates and keep all media files in the same place. 

But ALSO, we don't completely eliminate the presence of a media library in the future. Of course a media database can be added in the future by extending the functionality of the upload script. But we can still use the hashing to eliminate duplicates and simplify working with pages on the site. 

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
