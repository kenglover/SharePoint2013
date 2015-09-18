// Createsite template builder

// Global variables
var contentTypes = {};
var listTemplateTypes = // Would be nice if there was a way to get this from the server, but it appears we have to hard code it.
		{"GenericList":100, "DocumentLibrary":101, "Survey":102, "Links":103, "Announcements":104, "Contacts":105, "Events":106, "Tasks":107, "DiscussionBoard":108, "PictureLibrary":109};
var template = {"Groups":[], "lists":[]}; // The built up template
var baseRoleDefs = {}; // Permission levels
var csTemplates = {};


// Initialize
$.ajaxSetup({
	headers: {"Accept":"application/json;odata=verbose",
				"content-type":"application/json;odata=verbose",
				"X-REQUESTDIGEST" : $('#__REQUESTDIGEST').val()
			}
});
$("document").ready(function() {
	getContentTypes();
	getBaseRoles();
	getTemplates();
});

// Form button functions
function addGroup() {

	return false;
}

function addCTtoList() {

	return false;
}

function addListPerm() {

	return false;
}

function addList() {

	return false;
}

function saveTemplate() {

	return false;
}

function loadTemplate() {
	template = csTemplates[$("#CS-template").val()];
	displayTemplate();
	return false;
}

// Utility functions
function displayTemplate() {
	console.log("displayTemplate called");
	console.log(template);
	$("#templateDisplay").html("Template: " + template.Template +
		"<br/>Groups:<br/><table class=\"CSTemplateDiplay\" ><tbody id=\"CSGroups\"><tr><th>Name or Suffix</th><th>Create</th><th>Site Permission</th></tr></tbody></table>");
	$.each(template.Groups, function(group, info) {
		$("#CSGroups").append("<tr><td>" + info.groupName + "</td><td>" + info.createGroup + "</td><td>" + info.groupPermission + "</td></tr>");
	});
	$("#templateDisplay").append("<br/>Lists:<br/>");
	$("#templateDisplay").append("<table class=\"CSTemplateDiplay\" ><tbody id=\"CSLists\"><tr><th>Name</th><th>Type</th><th>Content types</th><th>Inherit Permissions</th></tr></tbody></table>");
	$.each(template.lists, function(i, list) {
		$("#CSLists").append("<tr><td>" + list.name + "</td><td>" + list.type + "</td><td id=\"CTsFor" + i + "\"></td><td>" + list.inheritPermissions + "</td></tr>");
		$.each(list.contentTypes, function(c, contentType) {
			$("#CTsFor"+i).append(contentType + "<br/>");
		});
		if(!list.inheritPermissions) {
			$("#CSLists").append("<tr ><th></th><th>Permissions</th><td colspan=\"2\"><table id=\"Perms"+i+"\"></table></tr>");
			$.each(list.permissions, function(p, permission) {
				$("#Perms"+i).append("<tr><td>" + permission.groupName + "</td><td>" + permission.groupPermission + "</td></tr>");
			});
		}
	});

}

function getContentTypes() {
	$.ajax({
		url: _spPageContextInfo["siteAbsoluteUrl"] + "/_api/web/contentTypes?$filter=Hidden eq false&$select=Name, Description, Group",
		method: "GET",
		success: function(data) {
			$.each(data.d.results, function(i, ct) {
				contentTypes[ct.Name] = {"Group": ct.Group, "Description":ct.Description};
				$("#contentType").append('<option>' + ct.Name + '</option>');
			})
		}
	});
}

function getBaseRoles() {
	return $.ajax({
		url: _spPageContextInfo["siteAbsoluteUrl"] + "/_api/Web/roledefinitions",
		type: "GET",
		success: function(data) {
			$.each(data.d.results, function(index,result) {
				baseRoleDefs[result.Name] = result.Id;
				$("#siteGroupPermission").append('<option>' + result.Name + '</option>');
				$("#listPermission").append('<option>' + result.Name + '</option>');
			});
			console.log("Done baseRoleDefs");
			console.log(baseRoleDefs);
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