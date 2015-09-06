// Configure my ajax defaults
$.ajaxSetup({
	headers: {"Accept":"application/json;odata=verbose",
				"content-type":"application/json;odata=verbose",
				"X-REQUESTDIGEST" : $('#__REQUESTDIGEST').val()
			}
});
var csTemplates = {};

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
	var projectTemplate = $("#CS-template").val();
	var projectPermissions = $("#CS-permissions").val() == "Yes"?true:false;
	
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
// Validate URL is in same site collection as this page/script

	$.when(checkURLpromise).always(function() {
		
		createNewSite(projectParentURL, projectURL, projectName, projectDescription, projectPermissions);
		
		// For each group name suffix
		// Validate that generated group name will be unique
		if (projectPermissions) {
			var groupPrefix = "Project " + projectName + " ";
			var groups = csTemplates[projectTemplate].Groups;
			$.each(groups, function(groupName, createGroup) {
				//console.log(groupName + ": " + createGroup);
				if (createGroup == "Y") {
					// Create group
					createNewGroup(groupPrefix + groupName, projectURL, projectName);
				}
			});
		} else {
			appendMessage('Not creating any groups as requested');
		}
	
	// Populate initial members if appropriate

	// For each List Name
		// Find list by name
			// If not found, create it
		// If found, add content types
		// Set permissions for groups
	
	}); // End of checkURLpromise
	
	return false;
}

function appendMessage(message) {
	$('#CS-results').append('<br/>' + message);
}

function createNewSite(rootUrl, URL, title, description, uniquePermissions) {
	
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