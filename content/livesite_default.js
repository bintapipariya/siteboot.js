
function inline_editor(selector_id){
	function SaveEditorContent(ed) {
		var data = {}; 
		var div = $("#"+ed.id)[0]; 
		ed.save(); 
		
		$.each(div.attributes, function() {
			if(this.name.indexOf("data-") == 0){
				data[this.name.substring(5)] = this.value; 
			}
		}); 
		data["property-value"] = encodeURIComponent(ed.getContent()); 
		
		var attrs = Object.keys(data).map(function(x){
			return x+"="+data[x]; 
		}).join("&"); 
		$.ajax({
			type:"POST",
			url: data["target"]||'#',
			data:"save_text=true&"+attrs,
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
					"autosave save advlist autolink lists link image charmap print preview anchor",
					"searchreplace visualblocks code fullscreen",
					"insertdatetime media table contextmenu paste"
			],
			toolbar: "save insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
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

$(document).ready(function(){
	
	Cufon.replace(".livesite h2", { fontFamily:'eurostile', hover:true}); 
	Cufon.replace(".livesite h1", { fontFamily:'eurostile', hover:true}); 
	
	inline_editor("div.editable"); 
	
}); 
