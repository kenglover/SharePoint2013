// Configure my ajax defaults
$.ajaxSetup({
	headers: {"Accept":"application/json;odata=verbose",
				"content-type":"application/json;odata=verbose",
				"X-REQUESTDIGEST" : $('#__REQUESTDIGEST').val()
			}
});
var csTemplates = {};
var baseRoleDefs = {};
var groupIds = {};

// Initialize on page ready
$(document).ready(function() {
	getTemplates(); // On page load, get list of templates and populate select box
	$('#CS-parent').val(_spPageContextInfo["webAbsoluteUrl"]); // Default URL to current URL
});

// Page will prompt for: URL, Name, Description, Template, Inherit permissions

function doIt() {
	//console.log ("Doing It");
	
	var projectName = $("#CS-name").val();
	var projectDescription = $("#CS-description").val();
	var projectParentURL = $('#CS-parent').val();
	var projectURL = $("#CS-url").val();
	var projectTemplate = csTemplates[$("#CS-template").val()];
	var projectPermissions = $("#CS-permissions").val() == "Yes"?true:false;
	
	var groupPrefix = "Project " + projectName + " ";
	
	$('#CS-results').html('Starting the build for <a href="' + projectURL + '">' + projectName + '</a>');

// Read template configuration JSON
// { Template, {group name or suffix, suffix indicator}, {List Name, List Template, {Content Type Name, Content Type ID}, {Group name or suffix, permission} }}
	//console.log(csTemplates[projectTemplate]);

// Check URL, create it if it does not exist
	var URLinuse = false;
	var checkURLpromise = $.ajax({
		url: projectParentURL + '/' + projectURL + "/_api/web",
		success: function(data) {
			appendMessage("<b>URL already in use</b>");
			URLinuse = true;
		}
	});
	
	var baseRolesPromise = getBaseRoles(projectParentURL);
// Validate URL is in same site collection as this page/script

	$.when(checkURLpromise, baseRolesPromise).always(function() {
		var deferedGroup1 = [];
		
		if (!URLinuse) {
			deferedGroup1.push(createNewSite(projectParentURL, projectURL, projectName, projectDescription, projectPermissions));
				
			// For each group name suffix
			// Validate that generated group name will be unique
			if (projectPermissions) {
				
				$.each(projectTemplate.Groups, function(index, group) {
					//console.log(groupName + ": " + createGroup);
					if (group.createGroup == "Y") {
						// Create group
						deferedGroup1.push(createNewGroup(groupPrefix + group.groupName, projectParentURL + "/" + projectURL, projectName));
					}
				});
				
			} else {
				appendMessage('Not creating any groups as requested');
			}
			console.log(deferedGroup1);
			$.when.apply($, deferedGroup1).always(function() { 
				// Site created and groups defined
				$.each(projectTemplate.Groups, function(index, group) {
					if (group.createGroup == "Y") {
						addGroupToSite(groupPrefix + group.groupName,projectParentURL + "/" + projectURL, group.groupPermission, 0);
					} else {
						addGroupToSite(group.groupName,projectParentURL + "/" + projectURL, group.groupPermission, 0);
					}
				});
			});
		}
		
		// Populate initial members if appropriate

		// For each List Name
		$.when.apply($, deferedGroup1).always(function() {
			$.each(projectTemplate.lists, function(index, list) {
				// name, type, contentTypes [""], inheritPermssions, permissions [groupName, groupPermission]
				createList(list, projectParentURL + "/" + projectURL,0);

			});
		});
		// Find list by name
			// If not found, create it
		// If found, add content types
		// Set permissions for groups
	
	}); // End of checkURLpromise
	
	return false;
}

function createList (list, URL,trycount) {
	if (trycount > 50) {
		appendMessage("<b>Error:</b> Gave up trying to create list " + list.name + " after " + trycount + " tries. Too many 404 on create");
		return;
	}
	var listID;
	// Check to see if list already exists, if not then create the list
	$.ajax({
		url: URL + "/_api/web/lists/getbytitle('" + list.name + "')",
		method: "GET",
		success: function(data) {
			listID = data.d.Id;
			appendMessage("Found list " + list.name + "already exists");
		},
		error: function() {
			// List does not exist, create it
			$.ajax({
				url: URL + "/_api/web/lists",
				method: "POST",
				data: JSON.stringify({"__metadata":{"type":"SP.List"}, 
					"AllowContentTypes": true, 
					"BaseTemplate": 100, 
					"ContentTypesEnabled":true, 
					"Description":"Autocreated " + list.name, 
					"Title":list.name}),
				success: function(data) {
					listID = data.d.Id;
					appendMessage("Created list " + list.name);
					connectContentTypes(listID, list, URL);
				},
				statusCode: {
					404: function() {
						createList(list, URL, trycount+1);
					}
				}
			});
		}
	});
}

function connectContentTypes(listID, list, URL) {
	$.each(list.contentTypes, function(index, ct) {
		console.log("Looking at add CT " + ct + " to list " + list.name);
		$.ajax({
			url: _spPageContextInfo["siteAbsoluteUrl"] + "/_api/web/contentTypes?$filter=Name eq '" + ct + "'",
			method: "GET",
			success: function(data) {
				var cts = data.d.results;
				if (cts) {
					var ctID = cts[0].StringId;
					$.ajax({
						url: URL + "/_api/web/lists/getbytitle('" + list.name + "')/ContentTypes/addAvailableContentType",
						method: "POST",
						data: JSON.stringify({"contentTypeId":ctID}),
						success: function(data) {
							appendMessage("Added Content Type " + ct + " to list " + list.name);
						}
					});
				} else {
					appendMessage("Could not find content Type " + ct);
				}
			}
		});
	});
}

function appendMessage(message) {
	$('#CS-results').append('<br/>' + message);
}

function getBaseRoles(rootUrl) {
	return $.ajax({
		url: rootUrl + "/_api/Web/roledefinitions",
		type: "GET",
		success: function(data) {
			$.each(data.d.results, function(index,result) {
				baseRoleDefs[result.Name] = result.Id;
			});
			console.log("Done baseRoleDefs");
			console.log(baseRoleDefs);
		}
	});
}

function addGroupToSite(groupName, URL, permission, trycount) {
	console.log("Time to tie group " + groupName + " to site with permission " + permission);
	var getGroupPromise;
	var groupId;
	
	if (trycount > 50) {
		// Giving up
		console.log("Had to give up after " + trycount + " tries adding group to site, got too many 404 errors");
		appendMessage("<b>Error:</b> could not add group " + groupName + " to site");
		return;
	}
	
	if (groupIds[groupName]) {
		groupId = groupIds[groupName];
	} else {
		// Need to do an ajax all to get group by name
		getGroupPromise = $.ajax({
			url: URL + "/_api/web/sitegroups/getbyname('" + groupName + "')/id",
			method: "GET",
			success: function(data) {
				groupId = data.d.Id;
				groupIds[groupName] = groupId; // Add the looked up group ID to the array to be used later when lists are created.
			},
			statusCode: {
				404: function() {
					// URL not found 
					addGroupToSite(groupName, URL, permission, trycount+1);
				}
			}
		});
	}
	
	$.when(getGroupPromise).done(function() {
		return $.ajax({
			url: URL + "/_api/web/roleassignments/addroleassignment(principalid=" + groupId + ",roledefid=" + baseRoleDefs[permission] + ")",
			method: "POST",
			success: function(data) {
				appendMessage("Gave group " + groupName + " site permission " + permission);
			},
			statusCode: {
				404: function() {
					// URL not found 
					addGroupToSite(groupName, URL, permission, trycount+1);
				}
			}
		});
	});
}

function createNewSite(rootUrl, URL, title, description, uniquePermissions) {
	// Based on http://sympmarc.com/2014/03/30/create-a-subsite-in-sharepoint-2013-using-rest-calls/
    return $.ajax({
      url: rootUrl + "/_api/web/webinfos/add",
      type: "POST",
      data: JSON.stringify({
        'parameters': {
          '__metadata': {
            'type': 'SP.WebInfoCreationInformation'
          },
          'Url': URL,
          'Title': title,
          'Description': description,
          'Language': 1033,
          'WebTemplate': 'sts',
          'UseUniquePermissions': uniquePermissions
        }
      })
    });
}

function createNewGroup(groupName, siteURL, projectName) {
	console.log("creating group " + groupName + " for project " + projectName + " at URL " + siteURL);

	return $.ajax({
		url: _spPageContextInfo["webAbsoluteUrl"] + "/_api/web/siteGroups",
		type: "POST",
		data: JSON.stringify({ '__metadata':{ 'type': 'SP.Group' },
					'Title':groupName,
					'Description':'Group for project ' + projectName + ' at URL ' + siteURL,
					'AllowMembersEditMembership':'false',
					'AllowRequestToJoinLeave':'false', 
					'AutoAcceptRequestToJoinLeave':'false',
					'OnlyAllowMembersViewMembership':'false', 
					'RequestToJoinLeaveEmailSetting':'true' }),
		success: function(data) {
			console.log("Created group " + groupName);
			console.log(data);
			appendMessage('Created group: <a href="' + _spPageContextInfo["webAbsoluteUrl"] + '/_layouts/15/people.aspx?MembershipGroupId=' + data.d.Id + '">' + groupName + '</a>');
			groupIds[groupName] = data.d.Id;
		},
		error: function(data) {
			console.log("Failed to create group " + groupName);
			console.log(data);
			appendMessage('<b>Failure</b> to create group: ' + groupName);
			appendMessage('&nbsp;&nbsp;Message: '+data.responseJSON.error.message.value);
		}
	});

}

// Read the templates out of the SiteTemplates list
function getTemplates() {
	$.ajax({
		url: _spPageContextInfo["webAbsoluteUrl"] + "/_api/web/lists/getbytitle('SiteTemplates')/items?$orderby=Title&$select=Title,Configuration",
		type: "GET",
		success: function(data) {
			console.log(data);
			templates = data.d.results;
			$.each(templates,function(index, template) {
				$('#CS-template').append('<option>' + template.Title + '</option>'); // Put templates on form options
				csTemplates[template.Title] = JSON.parse(template.Configuration);
			})
		},
		error: function(data) {
			console.log("Failed call to getTemplates");
			appendMessage("Could not load templates");
		}
	});
}