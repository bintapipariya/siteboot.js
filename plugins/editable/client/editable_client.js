/*
 * Orangevolt Ampere Framework
 *
 * http://github.com/lgersman
 * http://www.orangevolt.com
 *
 * Copyright 2012, Lars Gersmann <lars.gersmann@gmail.com>
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */

/**
 * jQuery Upload Plugin v1.0.0
 *
 * This plugin extends jQuery Ajax functionality :
 *
 * provides function $.upload( FormData) to upload arbitrary files using without reloading the page.
 * $.upload smoothly integrates with Jquery $.ajax by supporting jQuery $.ajaxSettings.
 *
 * The plugin also advances $.ajax by delegating both upload and download progress notifications of the
 * native XMLHTTPRequest to the Promise object returned by any jQuery Ajax request (via its progress function).
 *
 * The progress feature is automatically available to all jQuery ajax functions if the plugin was loaded.
 * See https://github.com/lgersman/jquery.orangevolt-ampere for tests and examples.
 *
 * The plugin works fine for both single and multiple file uploads.
 *
 * Source and examples:
 * http://github.com/lgersman/jquery.orangevolt-ampere
 *
 * Works in all modern browsers supporting XMLHTTPRequest v2 (i.e. Chome/FF/Webkit etc.)
 *
 * Requires jQuery v1.7.0 or later
 *
 * http://github.com/lgersman
 * http://www.orangevolt.com
 *
 * Copyright 2012, Lars Gersmann <lars.gersmann@gmail.com>
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */

/**
 *
 */
(jQuery && jQuery.fn.upload) || (function( $) {
		// abort if xhr progress is not supported
	if( !($.support.ajaxProgress = ("onprogress" in $.ajaxSettings.xhr()))) {
		return;
	}

	var _ajax = $.ajax;
	$.ajax = function ajax( url, options) {
			// If url is an object, simulate pre-1.5 signature
		if ( typeof( url) === "object" ) {
			options = url;
			url = options.url;
		}

			// Force options to be an object
		options = options || {};

		var deferred = $.Deferred();
		var _xhr = options.xhr || $.ajaxSettings.xhr;
		var jqXHR;
		options.xhr = function() {
				// Reference to the extended options object
			var options = this;
			var xhr = _xhr.call( $.ajaxSettings);
			if( xhr) {
				var progressListener = function( /*true | false*/upload) {
					return function( event) {
						/*
						 * trigger the global event.
						 * function handler( jqEvent, progressEvent, upload, jqXHR) {}
						 */
						options.global && $.event.trigger( "ajaxProgress", [ event, upload, jqXHR]);

							/*
							 * trigger the local event.
							 * function handler(jqXHR, progressEvent, upload)
							 */
						$.isFunction( options.progress) && options.progress( jqXHR, event, upload);

						deferred.notifyWith( jqXHR, [event, upload]);
					};
				};

				xhr.upload.addEventListener( "progress", progressListener( true), false);
				xhr.addEventListener( "progress", progressListener( false), false);
			}
			return xhr;
		};

		jqXHR = _ajax.call( this, url, options);

			// delegate all jqXHR promise methods to our deferred
		for( var method in deferred.promise()) {
			jqXHR[ method]( deferred[ method]);
		}
		jqXHR.progress = deferred.progress;

			// overwrite the jqXHR promise methods with our promise and return the patched jqXHR
		return jqXHR;
	};

		/**
		 * jQuery.upload( url [, data] [, success(data, textStatus, jqXHR)] [, dataType] )
		 *
		 * @param url
		 *         A string containing the URL to which the request is sent.
		 * @param data
		 *         A map or string that is sent to the server with the request.
		 * @param success(data, textStatus, jqXHR)
		 *         A callback function that is executed if the request succeeds.
		 * @param dataType
		 *         The type of data expected from the server. Default: Intelligent Guess (xml, json, script, text, html).
		 *
		 * This is a shorthand Ajax function, which is equivalent to:
		 * .ajax({
		 *		processData	: false,
		 *		contentType	: false,
		 *		type		: 'POST',
		 *		url			: url,
		 *		data		: data,
		 *		success		: callback,
		 *		dataType	: type
		 *	});
		 *
		 * @return jqXHR
		 */
	$.upload = function( url, data, callback, type) {
			// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return $.ajax({
			/*
			 * processData and contentType must be false to prevent jQuery
			 * setting its own defaults ... which would result in nonsense
			 */
			processData	: false,
			contentType	: false,
			type		: 'POST',
			url			: url,
			data		: data,
			success		: callback,
			error: function(err){
				alert(JSON.stringify(err)); 
				callback()
			},
			//dataType	: type
		}).done(function(data){
			callback()
		});
	};
})( jQuery);

// bind the upload dialog
$(document).ready(function(){
	var dialogs = $(".editable-hero-upload-dialog"); 
	$(dialogs).each(function(i, dlg){
		$(dlg).find(".upload-button").click(function(){
			var form = $(dlg).find("form"); 
			var hero_id = $(dlg).attr("data-hero-id"); 
			var target = $(form).find("input[type='file']").val(); 
			var oldimage = $("#"+hero_id).attr("data-image"); 
			target = "/editable/hero_bg_"+hero_id+target.substr(target.lastIndexOf(".")); 
			var data = new FormData( form[0]); 
			data.append("file_upload", 1); 
			data.append("target", target); 
			
			var hero = $("#"+$(dlg).attr("data-hero-id")); 
			//hero.css("display", "none"); 
			
			
			$.upload( "/edit_helper", data, function(){
				$(hero).attr("style", "background-image: url('"+target+"?"+Math.random()+"') !important"); 
				$(hero).css("background-image", "url('"+target+"?"+Math.random()+"') !important"); 
				// remove the old file
				var oldimage = $(hero).attr("data-image"); 
				if(oldimage && oldimage != "" && oldimage != "/editable/hero_bg_default.jpg" && target != oldimage){
					$.ajax({
						url: "/edit_helper",
						type: "POST",
						data: {
							remove_file: "1",
							target: oldimage
						}
					}); 
				}
				$(hero).attr("data-image", target); 
				$(dlg).modal('hide'); 
			})
			.progress( function( progressEvent, upload) {
				if( progressEvent.lengthComputable) {
					var percent = Math.round( progressEvent.loaded * 100 / progressEvent.total) + '%';
					if( upload) {
							console.log( percent + ' uploaded');
					} else {
							console.log( percent + ' downloaded');
					}
				}
			});
		});
	});
}); 
