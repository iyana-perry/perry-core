function Perry() {
    
    this.perryGlobals = {
        perryTemplateTag: "data-perry-template",
        perryDataTag: "data-perry-data",
        perryConfigTag: "data-perry-config"
    };

    this.init = function() {
        var hasConfig = this.initWithConfig();

        if (!hasConfig) {
            // no config file - see if we find any data-perry-* markup in the body
            console.group("Perry: AD-HOC MODE");
            var body = $("body");
            this.processChildNodes(body, "(AdHoc) ");
        }
    };
    
    this.initWithConfig = function() {
        var perryConfig = $("body[" + this.perryGlobals.perryConfigTag + "]");

        if (perryConfig.length === 0) {
            // no data-perry-config attribute in body
            return false;
        }
        
        // load the config url
        var configUrl = perryConfig.attr(this.perryGlobals.perryConfigTag);
        
        if (configUrl.length === 0) {
            // invalid url
            console.error("Perry: Invalid parameter value for " + this.perryGlobals.perryConfigTag + " in <body> tag");
            return false;
        }
        
        // all looks good - lets load up the config
        console.group("Perry: CONFIG MODE");
        this.processPerryConfig(configUrl);

        // register the hash change listener
        var boundOnHashChanged = this.onHashChanged.bind(this);
        $(window).on('hashchange', boundOnHashChanged);    
        
        return true;
    };
   
    this.processPerryConfig = function(configUrl) {
        console.log("Perry: Config url: " + configUrl);
        
        var boundOnConfigLoaded = this.onConfigLoaded.bind(this);
        
        $.ajax({
            url: configUrl,
            type: 'get',
            async: true,
            cache: false
        }).done( boundOnConfigLoaded);
    };

    this.onConfigLoaded = function(data) {
        console.log("Perry: Config loaded");
        this.perryConfig = data;
        this.navigateToLoc();
    };
    
    this.navigateToLoc = function() {
        // find the location
        var loc = location.hash;
        if (loc === "") {
            loc = "#";
        }
        console.log("--- Perry: Matching location: " + loc);

        // find a config
        var pageConfig = this.perryConfig.config[loc];
        console.log("Perry: Loading template: " + pageConfig.template + ", asset:" + pageConfig.data);

        // find the body tag
        var body = $("body");
        body.attr( this.perryGlobals.perryDataTag, pageConfig.data);
        body.attr( this.perryGlobals.perryTemplateTag, pageConfig.template);
        body.removeAttr( this.perryGlobals.perryConfigTag);

        this.processNode(body, "(Config) 0");
    };

    this.onHashChanged = function() {
        this.navigateToLoc();
        //alert("Hash changed");
    };

    this.processChildNodes = function(node, consolePrefix) {

        var nodeCounter = 0;
        var iterateNodes = function(perry, consolePrefix, nodeCounter) {
            return function(index) { 
                nodeCounter++;
                perry.processNode($(this), consolePrefix + nodeCounter);
            };           
        }(this, consolePrefix, nodeCounter);    
        
        node.filter('[' + this.perryGlobals.perryTemplateTag + ']').each( iterateNodes);

        node.find('[' + this.perryGlobals.perryTemplateTag + ']').each( iterateNodes);
    };

    this.processNode = function(node, itemId) {
        var holder = { 
            id: itemId, 
            templateUrl: "", 
            dataUrl: "", 
            node: node, 
            templateValue: "", 
            dataValue: "",
            dataRequired: false,
            latch: false
        };

        // get the template
        holder.templateUrl = node.attr(this.perryGlobals.perryTemplateTag);
        console.log("Perry: " +  holder.id + ": template Url: "  + holder.templateUrl);

        if (holder.templateUrl === undefined) {
            console.log("Perry: " + holder.id + ": template url is undefined. Stopping");
            return;
        }

        // get the data
        holder.dataUrl = node.attr(this.perryGlobals.perryDataTag);
        console.log("Perry: " +  holder.id + ": data Url: "  + holder.dataUrl);

        holder.dataRequired =  ((holder.dataUrl !== undefined) && (holder.dataUrl !== ""));
        console.log("Perry: " +  holder.id + ": data required: "  + holder.dataRequired);
        this.getRemoteAssets( holder);
    };

    this.getRemoteAssets = function(holder) {
        var boundTemplateFn = this.onDataLoaded.bind(this, holder, "template");
        $.ajax({
            url: holder.templateUrl,
            type: 'get',
            async: true,
            cache: false
        }).done( boundTemplateFn);

        if (holder.dataRequired ) {
            var boundDataFn = this.onDataLoaded.bind(this, holder, "data");
            $.ajax({
                url: holder.dataUrl,
                type: 'get',
                async: true,
                cache: false
            }).done( boundDataFn);
        }
    };    


    this.onDataLoaded = function(holder, populate, data) {
    if (populate === "template") {
            console.log("Perry: " +  holder.id + ": template " + holder.templateUrl + " loaded");
            holder.templateValue = data;
        }

        if (populate === "data") {
            console.log("Perry: " +  holder.id + ": data " + holder.dataUrl + " loaded");
            holder.dataValue = data;
        }

        var templateReady = (holder.templateValue !== "");
        var dataReady = (!holder.dataRequired || (holder.dataValue !== ""));
        if (templateReady & dataReady & (!holder.latch)) {
            holder.latch = true;
            this.renderTemplate(holder);
        }
    };

    this.renderTemplate = function(holder) {
        var htmlDiv;

        if (!holder.dataRequired) {
            console.log("Perry: " + holder.id + ": Rendering (no merge)");
            htmlDiv = $(holder.templateValue);
        } else {
            console.log("Perry: " + holder.id + ": Rendering");
            var compiledTemplate = Handlebars.compile(holder.templateValue);
            var html = compiledTemplate(holder.dataValue);

            // replace the contents
            htmlDiv = $(html);
        }

        // if it is the body tag, change the innter html
        // if it is anything else, replace it
        if (holder.node.prop("tagName") === "BODY") {
            holder.node.html(htmlDiv);
        } else {
            holder.node.replaceWith(htmlDiv);
        }

        // see if they need any further replacements
        this.processChildNodes(htmlDiv, holder.id + ".");
    };
    
};

// loop through divs that are ajax and ensure that they are dynamically loaded
$(document).ready( function() {
    var perry = new Perry();
    perry.init();
});


