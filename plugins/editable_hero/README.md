Editable Hero Widget
====================

This widget provides an editable hero-unit (see documentation for hero units in bootstrap). 

Data
====

The hero unit will save it's data in the /editable_hero/ directory on the server. The default image is default.jpg. All other files will be uploaded into this directory and named appropriately. 

The files are named after the hero unit id that you specify in the template like this: 

	{{#editable_hero_widget}}hero-unit-id{{/editable_hero_widget}}


Options
=======

To place a hero unit in your template, add the following to the template html: 
	
	{{#editable_hero_widget}}hero-unit-id{{/editable_hero_widget}}
	
The id will be used to create a unique identified for all data associated with the hero unit widget. You can use the same id in several places to have an identical hero unit. 
