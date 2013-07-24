
// livesite globals 
var livesite = {
	livebar: {},
	session: livesite_session,
}; 

function LiveBar(){
	var save_button = $(".livebar .livebar_button_save");
	var edit_button = $(".livebar .livebar_button_edit"); 
	
	$(save_button).click(function(){
		var i, t = tinyMCE.editors;
		for (i in t){
				if (t.hasOwnProperty(i)){
						t[i].remove();
				}
		}
		$(".editable").removeClass("editable-active"); 
	})
}


function EnableInlineEditing(selector_id){
	function SaveEditorContent(ed) {
		var data = {}; 
		var div = $("#"+ed.id)[0]; 
		ed.save(); 
		
		$.each(div.attributes, function() {
			if(this.name.indexOf("data-") == 0){
				data[this.name.substring(5).replace("-", "_")] = this.value; 
			}
		}); 
		data["property_value"] = encodeURIComponent(ed.getContent()); 
		
		var attrs = Object.keys(data).map(function(x){
			return x+"="+data[x]; 
		}).join("&"); 
		$.ajax({
			type:"POST",
			url: "/edit_helper",
			data:"set_property_value&"+attrs,
			success:function(){$('.action').fadeIn(750).delay(3000).fadeOut(750)}
		});
		return true; 
	}
	if(tinyMCE){
		tinyMCE.init({
			inline: true,
			convert_urls: 0,
			remove_script_host: 0, 
			autosave: true,
			plugins: [
					"ajaximage autosave save advlist autolink lists link image charmap print preview anchor",
					"searchreplace visualblocks code fullscreen",
					"insertdatetime media table contextmenu paste"
			],
			toolbar: "ajaximage save insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
			save_enablewhendirty: false,
			save_oncancelcallback: function(ed){
				alert("hello"); 
			},
			save_onsavecallback: SaveEditorContent,
			selector: selector_id
		});
	} else {
		alert("TinyMCE was not found!");
	}
}

function InitTinyMCEImagePlugin(){
	try {
		tinymce.create('tinymce.plugins.ajaxImagePlugin', {
			/**
			* Initializes the plugin, this will be executed after the plugin has been created.
			* This call is done before the editor instance has finished it's initialization so use the onInit event
			* of the editor instance to intercept that event.
			*
			* @param {tinymce.Editor} ed Editor instance that the plugin is initialized in.
			* @param {string} url Absolute URL to where the plugin is located.
			*/
			init : function(ed, url) {
				// Register the command so that it can be invoked by using tinyMCE.activeEditor.execCommand('mceExample');
				ed.addCommand('ajaxImage', function() {
					$('#uploadform')[0].reset();
					$("#overlay").fadeTo( 'fast', .6 ); 
					$('#upload_form').fadeIn('fast');
				});

				// Register button
				ed.addButton('ajaximage', {
					title : 'Upload Image',
					cmd : 'ajaxImage',
					image : url + '/img/image.gif'
				});

				// Add a node change handler, selects the button in the UI when a image is selected
				/*ed.onNodeChange.add(function(ed, cm, n) {
					cm.setActive('example', n.nodeName == 'IMG');
				});*/
			},
			/**
			* Returns information about the plugin as a name/value array.
			* The current keys are longname, author, authorurl, infourl and version.
			*
			* @return {Object} Name/value array containing information about the plugin.
			*/

			getInfo : function() {
				return {
					longname : 'Ajax image upload plugin',
					author : 'Mike Hayes',
					authorurl : 'http://www.mikesimagination.net',
					infourl : 'http://www.mikesimagination.net',
					version : "1.0"
				};
			}
		});
		// Register plugin
		tinymce.PluginManager.add('ajaximage', tinymce.plugins.ajaxImagePlugin);
	} catch(e) {
		alert("Could not initialize image plugin! Image upload will be disabled! "+e); 
	}
}

function InitAdminInterface() {
	$(".editable").addClass("editable-active"); 
	livesite.livebar = new LiveBar(); 
	
	InitTinyMCEImagePlugin(); 
	EnableInlineEditing("div.editable"); 
}

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-30645096-1']);
_gaq.push(['_trackPageview']);

function InitAnalytics(){
	(function() {
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
		var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	})();
}

$(document).ready(function(){
	if(livesite.session.user.loggedin)
		InitAdminInterface(); 
	
	if(!livesite.session.user.loggedin){
		InitAnalytics(); 
	}
	
	$(".editable").each(function(i,v){
		// load the latest value from the database
		var obj = $(this); 
		$.ajax({
			type: "GET",
			url: "/edit_helper",
			data: {
				get_property_value: 1,
				object_type: obj.attr("data-object-type"),
				object_id: obj.attr("data-object-id"),
				property_name: obj.attr("data-property-name")
			},
			success: function(data){
				try {
					var resp = JSON.parse(data); 
					if(resp.success)
						obj.html(resp.response); 
					else {
						if(!(obj.attr("data-error-policy") === "ignore"))
							obj.html("<div class='well' style='background-color: #f88;'>"+resp.response+"</div>"); 
					}
				} catch(e){
					//...
				}
			}
		}); 
	}); 
}); 
