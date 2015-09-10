This will use REST calls through Javascript and jQuery to:
  1. Create a site
  2. Create groups as configured and assign permissions to the site
  3. Create lists, attach content types, and grant permissions as configured
  
Configuration for site template is read from a list called "SiteTemplates" with 2 columns:
  1. Title
  2. Configuration - multiline text only field populated with JSON (see example below).
  
The JSON for configuration looks like this:
```
  {"Template":"sts",
    "Groups":[
      {"groupName":"Team","createGroup":"Y","groupPermission":"Contribute"},
      {"groupName":"PM","createGroup":"Y","groupPermission":"Edit"},
      {"groupName":"ICT Members","createGroup":"N","groupPermission":"Read"}],
    "lists":[
      {"name":"List1",
        "type":"GenericList",
        "contentTypes":["Event","Link","Task"],
        "inheritPermissions":false,
        "permissions":[
          {"groupName":"PM","groupPermission":"Contribute"},
          {"groupName":"Team","groupPermission":"Read"}]},
      {"name":"List2",
        "type":"Events",
        "contentTypes":["Task"],
        "inheritPermissions":true}]}
```

To setup, create the list in a site, add the 2 files to site assets, create a page and reference the files from a content editor web part for the HTML file and a snippet for the JS file.
Make sure jQuery is included also.
