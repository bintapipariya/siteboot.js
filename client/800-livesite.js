
// livesite globals 

var admin = {
	
};

var livesite = {
	livebar: {},
	session: livesite_session,
	admin: admin,
}; 


admin.get_property = function(obj, id, prop, callback){
	$.ajax({
		type: "GET",
		url: "/edit_helper",
		data: {
			get_property_value: 1,
			object_type: obj,
			object_id: id,
			property_name: prop
		},
		success: function(data){
			try {
				var resp = JSON.parse(data); 
				if(resp.success)
					callback(undefined, resp.message); 
				else {
					callback(resp.message); 
				}
			} catch(e){
				callback("Could not parse response from server! ("+e+")"); 
			}
		}, 
		error: function(data){
			callback("Error: "+data);
		}
	}); 
}

admin.set_property = function(obj, id, prop, val, callback){
	$.ajax({
		type:"POST",
		url: "/edit_helper",
		data: {
			set_property_value: 1,
			object_type: obj,
			object_id: id,
			property_name: prop, 
			property_value: val
		},
		success:	function(response){
			try {
				var obj = JSON.parse(response); 
				if(obj.success)
					callback(); 
				else 
					callback(obj.message); 
			} catch(e){
				callback("Could not set property value "+e+", trace: "+e.stack); 
			}
		}, 
		error: function(response) {
			callback(response); 
		}
	});
}

livesite.init = function(){
	if(livesite.session.user.loggedin) {
		$(".editable").each(function(i, v){$(v).addClass("editable-active"); });
		livesite.livebar = new LiveBar(); 
		
		livesite.start_editor("div.editable"); 
	}
	
	if(!livesite.session.user.loggedin){
		InitAnalytics(); 
	}
	
	$(".editable").each(function(i,v){
		// load the latest value from the database
		var obj = $(this); 
		admin.get_property(obj.attr("data-object-type"), obj.attr("data-object-id"), obj.attr("data-property-name"), 
			function(error, val){
			if(!error)
				obj.html(val); 
			else if(!(obj.attr("data-error-policy") === "ignore"))
				obj.html("<div class='well' style='background-color: #f88;'>"+val+"</div>"); 
		}); 
		
	}); 
}

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


livesite.start_editor = function(selector_id){
	function save(ed) {
		var data = {}; 
		var div = $("#"+ed.id)[0]; 
		ed.save(); 
		
		var type = $(div).attr("data-object-type"); 
		var id = $(div).attr("data-object-id"); 
		var name = $(div).attr("data-property-name"); 
		var val = ed.getContent();
		
		admin.set_property(type, id, name, val, function(error) {
			if(error) {
				activeEditor.windowManager.alert("Could not save text! Please backup the text, check your connection and try again later!"); 
			}
		}); 
		return false; 
	}
	
	// attach mce editor to the selector
	tinyMCE.init({
		inline: true,
		convert_urls: 0,
		remove_script_host: 0, 
		//relative_urls: false,
		autosave: true,
		plugins: [
				"autosave save advlist autolink lists link image charmap print preview anchor",
				"searchreplace visualblocks code fullscreen",
				"insertdatetime media table contextmenu paste imageupload textcolor"
		],
		toolbar: "save insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent forecolor,backcolor,fontselect,fontsizeselect | link image imageupload",
		//skin: 'default',
		theme_advanced_buttons1: "forecolor,backcolor,fontselect,fontsizeselect",
		theme_advanced_buttons2: "",
		save_enablewhendirty: false,
		save_oncancelcallback: function(ed){
			alert("Cancel.."); 
		},
		save_onsavecallback: save,
		selector: selector_id
	});
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
	try {
		livesite.init(); 
	} catch(e){
		alert("Could not initialize JavaScript on page. "+e+"\nStack trace: \n"+e.stack); 
	}
}); 
