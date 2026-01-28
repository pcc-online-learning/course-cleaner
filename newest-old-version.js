const latestStyle = `8.0`;
//!! EDIT THIS LINK WHEN CHANGING FROM TEST SERVER
const latestStyleLink = "https://online.pcc.edu/shared/css/8.0/css/stylesheet.css";
//we ignore a stylesheet link element if it contains these terms:
const blacklist = [];
const moduleBlacklist = [/*'Instructor ONLY', 'Course Information', 'Introduction to Online Learning', 'Student Support Resources', 'How to Teach This Course', 'Intro to Online Learning'*/];
var updatedPages = 0;

window.addEventListener('DOMContentLoaded', (loadEvent) => {
	
	var $checkAll = $('#scanAll');
	
	//$checkAll.on("click", function() {
    fetch(`/d2l/api/le/1.75/${window.orgUnitId}/content/toc`)
        .then((response) => response.json())
        .then((data) => {
			const $cssTable = $('#cssTable');
			const $copiableRow = $('.copiable.cssRow');
			const topics = recursiveFileFinder(data);

			//HTML PAGES
			topics.forEach(t => {
				for(var i = 0; i < moduleBlacklist.length; i++) {
					var needle = moduleBlacklist[i].toLowerCase();
					var haystack = t.ParentModule.toLowerCase();
					if(haystack.includes(needle)) {
						return;
					}
				}
				
				var updated = false;
				var hasnew = false;
				var $thisRow = $copiableRow.clone().removeClass('copiable');
				var editableUrl =  'https://online.pcc.edu/d2l/le/content/' + window.orgUnitId + '/contentfile/' + t.Identifier + '/EditFile?fm=0';
				
				$cssTable.append($thisRow);
				$thisRow.find('.pageTitle').html(`<p><b><a target="_blank" href="`+editableUrl+`">`+t.Title+`</a></b> <br><i>Module: ` + t.ParentModule + `</i></p>`);
				
				//GET CONTENT OF HTML PAGES
				// needs to use try block incase of broken/missing files
				fetch(`/d2l/api/le/1.75/${window.orgUnitId}/content/topics/` + t.Identifier + `/file`)
					.then((response) => {
						if (!response.ok){
							throw new Error('HTTP error, status = ' + response.status);
						}
						return response.text();
					})
					.then((data) => {	
						var sourcePage = data;
						var $wrapper = document.createElement('html');
						$wrapper.innerHTML = data;
						var sourceStyle = $wrapper.querySelectorAll('[rel="stylesheet"]');
						
						//POPULATE TABLE INFO

						//CHECK THAT PAGE IS DONE IMPORTING
						if(data.search('<body>Not Found</body>') > -1
						|| data == "Bad Request") {
							$thisRow.find('.pageData ul').append('<li class="bad">Page not finished importing. Refresh and try again when all pages are imported.</li>');
							return;
						}
						
						//CHECK FOR ABLE PLAYER FEATURES
						//SKIP IF THERES A PLAYLIST
						if(data.search('able-playlist') > -1) {
							$thisRow.find('.pageData ul').append('<li class="bad">Page contains an Able Player playlist. Please manually update this page.</li>');
							return;
						}
						
						//WARN IF THERES VIDEOS
						if(data.search('ablep-wrapper') > -1) {
							$thisRow.find('.pageData ul').append('<li class="warn">Page contains Able Player videos - be aware that upon CSS update, real captions may no longer display, and other style issues may arise.</li>');
						}
						
						//CHECK FOR FOOTERS
						var footers = $wrapper.querySelectorAll('footer');
						if(footers.length > 0
						|| data.search('<div id="footer">') > -1
						|| data.search("<div id='footer'") > -1) {
							$thisRow.find('.pageData ul').append('<li>Page contains footer.</li>');
						} else {
							$thisRow.find('.pageData ul').append('<li class="bad">Page does not contain footer.</li>');
						}
						
						//CHECK FOR INLINE STYLES 
						if(data.search(/style=["'].*;["']/) > -1) {
							$thisRow.find('.pageData ul').append('<li class="bad">Page has inline styles.</li>');
						} else {
							$thisRow.find('.pageData ul').append('<li>No inline styles found.</li>');
						}
						
						//CHECK FOR TED VIDEOS
						if(data.search(/<iframe.*src=".*embed.ted.com/) > -1) {
							$thisRow.find('.pageData ul').append('<li class="warn">Page contains a TedEx embed which may not be displaying properly.</li>');
						}
						
						//LIST STYLESHEETS
						if(sourceStyle.length > 0) {
							sourceStyle.forEach(function(s, i) {
								
								var skip = isBlacklisted(s);
								var full = s.getAttribute('href');
								var shortened = /.*\/(.*\/.*\/.*)/.exec(full)[1];
								
								$thisRow.find('.sheetList ol').append('<li title="'+full+'">'+ shortened +'</li>');
								
								//CHECK IF 8.0
								if (skip) {
									return;
								}else if(isLatestStyle(s, $thisRow)) {
									hasnew = true;
								} else {
									//hasnew = false;
								}
							});
						} else {
							$thisRow.find('.sheetList').append('<p>File is not local or no stylesheet is found.</p>');
							//leave latest css cell default "n"
							if (updated) {
								updated = false;
							}
						}
						
						//if 8.0 is the ONLY sheet theres no need to update the file
						if(hasnew && sourceStyle.length == 1) {
							updated = true;
							$thisRow.find('.status').removeClass('n').addClass('y').text('Y');
						}
						
						//CHANGE HTML FILE
						if(!updated) {
							//BULK UPDATE
							$('#updateAll').on("click", function() {
								updateOneFile($wrapper, $thisRow, t, hasnew);
							});
							if($('#updateAll').attr('disabled') == 'disabled') {
								$('#updateAll').removeAttr('disabled').on('click', function() {
									$(this).attr('disabled', 'disabled').off('click');
								});
							}
							
							//INDIVIDUAL UPDATE
							$updateButton = $thisRow.find('.updateButton button');
							$updateButton.removeAttr('disabled').on("click", function() {
								updateOneFile($wrapper, $thisRow, t, hasnew);
							});
						}
					})
					.catch(error => {
						console.error('Fetch error:', error);
					});
			});
        });
	//$(this).off("click").attr("disabled", "disabled");});
});

async function updateOneFile($wrapper, $thisRow, t, hasnew) {
	var newWrapper = $wrapper.cloneNode(true);
										
	//delete unwanted stylesheets
	newWrapper.querySelectorAll('[rel="stylesheet"]').forEach(function(s, i){
		if(!isBlacklisted(s) && !isLatestStyle(s, $thisRow)) {
			//console.log(s)
			s.remove();
		}
	});
	
	//remove all scripts
	newWrapper.querySelectorAll('script').forEach(function(s, i){
			s.remove();
	});
	
	$(newWrapper).children().contents().each(function() {
		//delete unwanted comments
		//if i need to i can add more specific conditions here, right now it just deletes all comments in the document
		if(this.nodeType === Node.COMMENT_NODE) {
			$(this).remove();
		}
		//remove extra newlines
		if(this.nodeType == Node.TEXT_NODE && this.nodeValue.trim() === "") {
			$(this).remove();
		}
	});
	
	//replace columbia banner+title combos on overview pages
	newWrapper.querySelectorAll('.intersect-wrapper.bg-img-wrapper').forEach(function(w, i) {
		var title = $(w).find('h1');
		var banner = $(w).find('img');
		var alttext = banner.attr('alt');
		var newtitle;
		if(title.length > 0) {
			newtitle = $('<h1>'+ title[0].innerText +'</h1>');
		} else {
			newtitle = $('<h1>'+ t.Title +'</h1>');
		}
		var newbanner = $('<div class="banner-img"><img src="' + banner.attr('src') + '" alt="' + alttext + '"></div>'); 
		$(w).before(newbanner).before(newtitle);
		title.remove();
		banner.remove();
		
		//this looks insane but i had to do it incase there was text in the title/banner element
		var savetext = w.innerText;
		if(savetext.length > 0) {
			newtitle.after(savetext);
		}
		$(w).remove();
	});
	
	//replace columbia left indentations on overview pages
	newWrapper.querySelectorAll('.offset-md-2').forEach(function(w, i) {
		$(w).removeClass('offset-md-2');
	});
	
	//
	
	//add new IF NEEDED
	if(!hasnew) {
		var l = document.createElement("link");
		
		l.setAttribute('rel', 'stylesheet');
		l.setAttribute('href', latestStyleLink);
		newWrapper.querySelector('head').prepend(l);
	}
	
	//add lang=en
	$(newWrapper).attr('lang', 'en');
	
	console.log(newWrapper);
	
	var fileInfo = urlToPathAndName(t.Url);
	var result = await overwriteHtmlFile(newWrapper, fileInfo.filename, fileInfo.path);
	
	if(result == 200) {
		//update box to green
		refreshStatusBox($thisRow, true);
		//update listed links 
		$thisRow.find('.sheetList ol').html("");
		newWrapper.querySelectorAll('link').forEach(l => {
			var full = l.getAttribute('href');
			var shortened = /.*\/(.*\/.*\/.*)/.exec(full)[1];
			
			$thisRow.find('.sheetList ol').append('<li title="'+full+'">'+ shortened +'</li>');
		});
		//disable button
		$thisRow.find($('.updateButton button')).attr('disabled', 'disabled');
	}
	
	updatedPages++;
	if(updatedPages == $('.cssRow').length - 1) {
		alert("Updates complete. Check table for results.");
	}
	
	return result;
}

//is for pages only
function isBlacklisted($s) {
	styleLink = $s.getAttribute('href');
	
	for(var n = 0; n < blacklist.length; n++) {
		if(styleLink.search(blacklist[n]) > -1) {
			//console.log("test failed");
			return blacklist[n];
		}
	}
	return false;
}

function isLatestStyle($s, $row) {
	styleLink = $s.getAttribute('href');
	
	if(styleLink.includes(latestStyle)) {
		refreshStatusBox($row, true);
		return true;
	} else {
		refreshStatusBox($row);
		return false;
	}
}

function refreshStatusBox($row, updated=false) {
	if(updated) {
		$row.find('.status').removeClass('n').addClass('y');
		$row.find('.status span:nth-child(1)').html("Y");
	} else {
		$row.find('.status').removeClass('y').addClass('n');
		$row.find('.status span:nth-child(1)').html("N");
	}
	return;
}


// Helper function for Topic Url field to filename and relative path for upload
function urlToPathAndName(url){
    const regex = /\/content\/enforced\/[^/]+\//
    if (!url.match(regex)) {
        // file is not a local file
        return null;
    } else {
        const relativepart = url.split(regex)[1]
        const pathparts = relativepart.split('/');
        const filename = pathparts.pop();
        const relativepath = pathparts.join('/');       // should be '' for root
        return {'filename': filename, 'path': relativepath};
    }
}

// helper function for Topic Url to test for html files
function fileUrlIsHtml (url) {
    const htmlext = /\w?html?/;
	if(url) {
		const ext = url.split('.').pop();
		return htmlext.test(ext);
	} else return;
}

async function uploadHTMLString(htmlString, filename, path, overwrite) {
    // expects a DOMParser object as htmlStrint
    // Serialize the HTML String and make an uploadable 'blob'
    const encoder = new XMLSerializer();
    const uploadString = encoder.serializeToString(htmlString);
    const uploadBlob = new Blob([uploadString], {type: 'text/html'});

    var fileKey;

    // this first POST will redirect fetch automatically and cause a 416
    return await fetch(`/d2l/api/lp/1.46/${window.orgUnitId}/managefiles/file/upload`, {
        method: 'POST',
        headers: {
            'X-Upload-Content-Type': 'text/html',
            'X-Upload-Content-Length': uploadBlob.size.toString(),
            'X-Upload-File-Name': filename,
            'X-CSRF-TOKEN': localStorage.getItem("XSRF.Token")
        }
    }).then(async (response) => {
        // response.status is 416 not 308 due to the fetch handling of 308 codes
        // but if the redirect was successfull we have the upload key in the url field
        // console.log(response);
        if (response.redirected) {
            return await fetch(response.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/html',
                    'X-CSRF-TOKEN': localStorage.getItem("XSRF.Token")
                    // needs chunk header if large file
                },
                body: uploadBlob
            }).then(uploadResponse => {
                if (uploadResponse.status == 200) {
                    // pull the key out of the url
                    fileKey = uploadResponse.url.split('/').pop();
                    //console.log(fileKey);
                    saveFile(fileKey, path, overwrite);
					//no working
					return uploadResponse.status;
                }
            })
        }
    })
	//return "Ok";
}

async function overwriteHtmlFile(html, filename, path) {
   return await uploadHTMLString(html, filename, path, true);
}

function saveFile (key, path, overwrite) {
    // overwrite file true and a new file that doesn't exist will error
    const queryParams = new URLSearchParams({
        overwriteFile: overwrite.toString()
    })
    const formParams = new URLSearchParams({
        fileKey: key,
        relativePath: path
    })
    fetch(`/d2l/api/lp/1.46/${window.orgUnitId}/managefiles/file/save?${queryParams}`, {
        method: 'POST',
        headers: {
            //'Content-Type': 'appplication/x-www-form-urlencoded',
            'X-CSRF-TOKEN': localStorage.getItem("XSRF.Token")
        },
        body: formParams
    }).then(response => {
        return response.json();
    });//.then(data => console.log(data))
}

// Works in TOC with submodules
function recursiveFileFinder (toc) {
	return toc.Modules.flatMap( function loop (module) {
		// submodules can have submodules AND topics...
		const arr = [];
		if (module.Modules.length) {
			arr.push(...module.Modules.flatMap(loop));
		}
		if (moduleBlacklist.includes(module.Title)) {
			return [];
		}
		filtered_topics = module.Topics.filter(topic => fileUrlIsHtml(topic.Url) && topic.TypeIdentifier === "File" && !topic.Title.includes('Combined Syllabus')).map(topic => ({...topic, ParentModule: module.Title}));
		arr.push(...filtered_topics);
		return arr;
	})
}

