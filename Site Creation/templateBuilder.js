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

	return false;
}

// Utility functions
function getContentTypes() {
	$.ajax({
		url: _spPageContextInfo["siteAbsoluteUrl"] + "/_api/web/contentTypes?$filter=Hidden eq false&$select=Name, Description, Group",
		method: "GET",
		success: function(data) {
			$.each(data.d.results, function(i, ct) {
				contentTypes[ct.Name] = {"Group": ct.Group, "Description":ct.Description};
				$("contentType").append('<option>' + ct.Name + '</option>');
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
				$("siteGroupPermission").append('<option>' + result.Name + '</option>');
				$("listPermission").append('<option>' + result.Name + '</option>');
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