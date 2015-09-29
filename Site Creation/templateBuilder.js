// Createsite template builder

// Global variables
var contentTypes = {};
var listTemplateTypes = // Would be nice if there was a way to get this from the server, but it appears we have to hard code it.
		{"GenericList":100, "DocumentLibrary":101, "Survey":102, "Links":103, "Announcements":104, "Contacts":105, "Events":106, "Tasks":107, "DiscussionBoard":108, "PictureLibrary":109};
var template = {"Groups":[], "lists":{}}; // The built up template
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
	$.each(listTemplateTypes, function(name, id) {
		$('#listTemplate').append('<option>' + name + '</option');
	});
	$('#siteTemplate').change(function() { updateTemplate(); });
});

// Form button functions
function addGroup() {
	template.Groups.push({"groupName":$('#groupName').val(), "createGroup":$('#createGroup').val(), "groupPermission":$('#siteGroupPermission').val()});
	$('#listGroup').append('<option>' + $('#groupName').val() + "</option>");
	displayTemplate();
	return false;
}

function addCTtoList() {
	template.lists[$('#listName').val()]["contentTypes"].push($('#contentType').val());
	displayTemplate();
	return false;
}

function addListPerm() {
	template.lists[$('#listName').val()]["permissions"].push({"groupName":$('#listGroup').val(),"groupPermission":$('#listPermission').val()});
	displayTemplate();
	return false;
}

function addList() {
	if(!template.lists[$('#listName').val()]) {
		template.lists[$('#listName').val()] = {"name":$('#listName').val(), "type":$('#listTemplate').val(), "inheritPermissions":$('#inheritPermissions').val()=="true"?true:false, "contentTypes":[], "permissions":[]};
	} else {
		template.lists[$('#listName').val()].type = $('#listTemplate').val();
		template.lists[$('#listName').val()].inheritPermissions = $('#inheritPermissions').val()=="true"?true:false;
	}
	displayTemplate();
	return false;
}

function saveTemplate() {
	if($("#siteTemplateName").val() == "") {
		//TODO: Ask for template name
	} else {
		// Save template
		var payloadObject = {'__metadata': {
						'type': 'SP.Data.SiteTemplatesListItem'
					},
					"Configuration": JSON.stringify(template)};
		$.ajax({
			url: _spPageContextInfo["webAbsoluteUrl"] + "/_api/web/lists/getbytitle('SiteTemplates')/items?$filter=Title eq '" + $("#siteTemplateName").val() + "'" ,
			type: "GET",
			success: function(data) {
				if(data.d.results[0]) {
					// Found an existing one with this name
					console.log(data);
					console.log("Existing Template " + data.d.results[0].Id);
					$.ajax({
						url: _spPageContextInfo["webAbsoluteUrl"] + "/_api/web/lists/getbytitle('SiteTemplates')/items(" +data.d.results[0].Id + ")",
						method: "POST",
						data: JSON.stringify(payloadObject),
						headers: { "X-HTTP-Method": "MERGE",
								"If-Match": data.d.results[0].__metadata.etag },
						success: function(data2) {
							console.log(data2);
							//TODO: Put up "saved" message
						}
					});
				} else {
					// New template
					console.log("New Template");
					payloadObject["Title"] = $("#siteTemplateName").val();
					$.ajax({
						url: _spPageContextInfo["webAbsoluteUrl"] + "/_api/web/lists/getbytitle('SiteTemplates')/items",
						method: "POST",
						data: JSON.stringify(payloadObject),
						success: function(data2) {
							console.log(data2);
							//TODO: Put up "saved" message
						}
					});
				}
			},
			error: function(data) {
				console.log("Failed call to getTemplates");
				appendMessage("Could not load templates");
			}
		});
	}
	return false;
}

function updateTemplate() {
	template['Template'] = $('#siteTemplate').val();
	displayTemplate();
}

function loadTemplate() {
	template = csTemplates[$("#CS-template").val()];
	$("#siteTemplateName").val($("#CS-template").val());
	$.each(template.Groups, function(g, group) {
		$('#listGroup').append('<option>' + group.groupName + "</option>");
	});
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