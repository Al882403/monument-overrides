/*Main Course App Controller*/
alert("Hello55!")
var app = (function () {
  var __moduleModel = null;
  var __startPageModel = {
  };
  var __currentPageModel = {
  };
  var EventManger = {
  };
  var __contentContainerDiv;
  var __currentPageRenderer = {
  };
  var __scormBridge = {
  };
  var __isNavigating = false;
  var heightcalculation = window.innerHeight + 50;
  $(window).resize(function(){
    var sizing = $(window).height() + 600 + 'px';
    $(".mfp-bg").css("height", sizing);
    //alert(sizing+" "+$(document).height());
    //center align popup
    alignPopup();
  });
  window.addEventListener("orientationchange", function () {
    setTimeout(function(){
      heightcalculation = window.innerHeight + 50;
      var casc = "100% "+heightcalculation+"px";
      //alert(casc);
      $("html").css("background-size", casc);
    }, 500);
  });
  function __init(){
    $("html").css("background-size","100% "+heightcalculation+"px");
    try{
      __scormBridge = (window.opener)?window.opener.scormBridge : {
        isOnLMS:false
      };
    }
    catch(e){
      console.log(e);
      __scormBridge = {
        isOnLMS:false
      }
    }
    if(__scormBridge.isOnLMS){
      window.opener.console.log("LMS found");
      console.log("LMS found");
      if(__scormBridge.isLMSAlive){
        console.log("LMS connection is active");
      }
      else{
        console.log("LMS connection is inactive. Calling scormbridge.init");
        if(__scormBridge.init() != "true"){
          $(".lms-error-message").addClass("show");
        }
      }
    }
    else{
      console.log("LMS not found");
    }
    //Open and Closewindow
    try{
      ((window.opener)?window.opener.onCourseWinLoaded():null);
    }
    catch(e){
      console.log("No launch page.")
    }
    window.onunload = function () {
      //alert("123");
      EventManger.trigger(ModuleEvents.MODULE_EXIT);
      //ModelModel will save data on ModuleExit
      ((window.opener) ? window.opener : window).console.log("COURSE::Module Exit");
      ((window.opener) ? window.opener.onCourseWinClose() : null);
    }
  }
  function __initModule(){
    EventManger.registerForEvent(ModuleEvents.MODULE_MODEL_READY, __onModuleModelReady);
    EventManger.registerForEvent(ModuleEvents.CONTENT_MODEL_READY, __onContentModelReady);
    EventManger.registerForEvent(UIEvents.UI_LOADED, __onUILoaded);
    EventManger.registerForEvent(UIEvents.NEXT_PAGE, __onNavigationRequest);
    EventManger.registerForEvent(UIEvents.PREVIOUS_PAGE, __onNavigationRequest);
    EventManger.registerForEvent(UIEvents.LOCK_TIMEDOUT, __onPageLockEnd);
    EventManger.registerForEvent(NavigationEvents.PAGE_LOAD_END, __onPageLoadEnd);
    EventManger.registerForEvent(NavigationEvents.PAGE_LOAD_REQUEST, __onPageLoadRequested);
    EventManger.registerForEvent(NavigationEvents.CURRENT_PAGE_COMPLETED, __onCurrentPageCompleted);
    EventManger.registerForEvent(NavigationEvents.NEXT_PAGE, __onNext);
    EventManger.registerForEvent(NavigationEvents.PREV_PAGE, __onPrev);
    EventManger.registerForEvent(PageRenderEvents.PAGE_RENDER_COMPLETE, __onPageRenderComplete);
    EventManger.registerForEvent(PageRenderEvents.PAGE_RENDER_FAILED, __onPageRenderFailed);
    EventManger.registerForEvent(ModuleEvents.MODULE_CLOSE, __onModuleClose);
    __moduleModel.register({
      eventsManager:EventManger,scormBridge:__scormBridge
    });
  }
  function __onModuleModelReady(e){
    EventManger.unRegisterEvent(ModuleEvents.MODULE_MODEL_READY, __onModuleModelReady);
  }
  function __initFromSCORM(){
    console.log("initfromscorm")
    if((__scormBridge.isOnLMS && __scormBridge.isLMSAlive) || !__scormBridge.isOnLMS) {
      var location = __scormBridge.get(__scormBridge.KEYS.Location);
      var lesson_status = __scormBridge.get(__scormBridge.KEYS.LessonStatus);
      if(location == "" || location == undefined || location == null || lesson_status == "completed"){
        __startPageModel = __moduleModel.getChapterModel(0).getPageByIndex(0);
        console.log("default start")
      }
      else{
        console.log("got location "+location)
        var chapterId = parseInt(location.split("_")[0]);
        var pageId = parseInt(location.split("_")[1]);
        __startPageModel = __moduleModel.getChapterModel(chapterId).getPageByIndex(pageId);
      }
    }
    else{
      __startPageModel = __moduleModel.getChapterModel(0).getPageByIndex(0);
    }
  }
  function __onContentModelReady(e){
    EventManger.unRegisterEvent(ModuleEvents.CONTENT_MODEL_READY, __onContentModelReady);
    __initFromSCORM();
  }
  function __onUILoaded(e){
    __loadContentContainer();
  }
  function __onPageLoadRequested(e){
    var chapterId = e.data.chapterId;
    var pageId = e.data.pageId;
    __loadPage(chapterId, pageId);
  }
  function __onCurrentPageCompleted(e){
    console.log(__currentPageModel.pageTitle+" "+__currentPageModel.pageStatus)
    EventManger.trigger(NavigationEvents.PAGE_COMPLETED, {
      pageModel: __currentPageModel
    })
    //__scormBridge.save();
  }
  function __onNext(e){
    __onNavigationRequest({
      type:UIEvents.NEXT_PAGE
    })
  }
  function __onPrev(e){
    __onNavigationRequest({
      type:UIEvents.PREVIOUS_PAGE
    })
  }
  function __onNavigationRequest(e){
    var direction = e.type;
    var nextPageId = __currentPageModel.pageId;
    if(direction == UIEvents.NEXT_PAGE){
      if(__currentPageModel.pageStatus != "completed"){
        console.log("Navigation locked. Can't move forward.");
        return;
      }
      nextPageId++;
    }
    else{
      nextPageId--;
    }
    __loadPage(__currentPageModel.chapterId, nextPageId);
  }
  function __loadContentContainer(){
    var contentPath = __moduleModel.modulePaths.content;
    __contentContainerDiv = $(".main-container");
    __contentContainerDiv.load(contentPath, function(){
      //Load the first page of the first chapter
      __loadPage(__startPageModel.chapterId, __startPageModel.pageId);
    });
  }
  function __loadPage(chapterIndex, pageIndex){
    if(__isNavigating){
      console.log("Navigator busy - try later.");
      //return false;
    }
    try{
      var chapterModel = __moduleModel.getChapterModel(chapterIndex);
      if(chapterIndex != __currentPageModel.chapterId){
        console.log("New Chapter"+chapterIndex+ " "+__currentPageModel.chapterId)
        EventManger.trigger(NavigationEvents.CHAPTER_LOAD_START, chapterIndex);
      }
    }
    catch(e){
      console.log("Load Page failed! - "+e);
    }
    try{
      var pageModel = __moduleModel.getPageModel(chapterIndex,pageIndex);
    }
    catch(e){
      console.log("Load Page failed! - "+e);
    }
    __startPageLoad({
      data:pageModel
    });
  }
  function __startPageLoad(e){
    __isNavigating = true;
    __destroyCurrentPage();
    var pageModel = e.data;
    var pageType = pageModel.pageType;
    var pageStatus = pageModel.pageStatus;
    __currentPageModel=pageModel;
    EventManger.trigger(NavigationEvents.PAGE_LOAD_START, pageModel);
    //To-DO:
    //Check for prerequisites for the page to be loaded
    //If prerequisites are satisfied allow page to load
    var pageXMLPath = __moduleModel.modulePaths.base + __moduleModel.modulePaths.xml + "/chapter"+(pageModel.chapterId + 1) + "/" + "c" + (pageModel.chapterId + 1) + "_p"+(pageModel.pageId + 1)+".xml";
    __currentPageRenderer = new PageRenderer();
    __currentPageRenderer.register({
      moduleModelAPI:__moduleModel, eventsManager:EventManger
    })
    __currentPageRenderer.loadPageByXMLPath(pageXMLPath, $(".content-inner-container"),pageModel);
  }
  function __onPageRenderComplete(e){
    var pagerenderer = e.data.pagerenderer;
    var xmlNode = e.data.xml;
    if(pagerenderer == __currentPageRenderer){
      var pageModel = e.data.args;
      var xmlNode = e.data.xml;
      __isNavigating = false;
      EventManger.trigger(NavigationEvents.PAGE_LOAD_END, {
        pageModel: pageModel,xml:xmlNode
      });
      var audioFileName = $(xmlNode).find("audio").text();
      var audioType = $(xmlNode).find("audio").attr("type");
      if(audioFileName == undefined || audioFileName == ""){
        EventManger.trigger(MediaEvents.STOP_OST_AUDIO, audioFileName);
        return;
      }
      //var audioPath =  __moduleModel.modulePaths.media + audioFileName;
      EventManger.trigger(MediaEvents.PLAY_OST_AUDIO, {
        type: audioType, path: audioFileName
      });
      setTimeout(function(){
        var video = document.getElementById('videotemp');
        if (video != null && video != undefined && video.parents().find("contentpopup").length > 0) {
          EventManger.trigger(MediaEvents.PAUSE_OST_AUDIO);
          console.log("PAUSE_OST_AUDIO");
          video.play();
        }
      }, 500);
      //center align popup
      alignPopup();
    }
  }
  function __onPageRenderFailed(e){
    //throw new Error("Page load failed");
    var pageModel = e.data.args;
    EventManger.trigger(NavigationEvents.PAGE_LOAD_END, pageModel);
    console.error(e.data.error);
  }
  /*Page unlock on timer end*/
  function __onPageLockEnd(e){
    console.log("PAGE LOAD END")
    var pageModel = e.data.pageModel;
    var pageId = pageModel.pageId;
    var chapterId = pageModel.chapterId;
    //Mark current Page status
    if(chapterId == __currentPageModel.chapterId && pageId == (__currentPageModel.pageId)){
      console.log(pageModel.pageTitle+ "PAGE IS LOCKED: "+pageModel.isLocked)
      //Mark complete if this is not a speedbreaker slide
      if(!pageModel.isLocked){
        EventManger.trigger(NavigationEvents.CURRENT_PAGE_COMPLETED);
      }
    }
  }
  /* function __onPageXMLLoaded(xml, pageRefId){
       
        var pageModel = __moduleModel.getPageModel(pageRefId.chapterId, pageRefId.pageId);
        var pageTemplate = pageModel.pageType;
        var templatePath = __moduleModel.modulePaths.templates + "/" + pageTemplate + "/" + pageTemplate+"-template.html";
        
        
        EventManger.registerForEvent(TemplateEvents.TEMPLATE_REGISTER, __onTemplateRegister);
        
        $(".content-inner-container").load(templatePath, __onTemplateLoaded);
        
        function __onTemplateLoaded(resp, status,xhr){
            if(xhr.status != 200){
                throw "Error:["+xhr.statusText+"] Template not found";
            }
            
             $(".content-inner-container").attr("class","content-inner-container")
            $(".content-inner-container").addClass(pageTemplate);
            
        }

        function __onTemplateRegister(e){
            var templateObj =  e.data;
            
            EventManger.unRegisterEvent(TemplateEvents.TEMPLATE_REGISTER, __onTemplateRegister);
            
            var moduleModelAPI = __moduleModel;
            templateObj.register(moduleModelAPI, pageModel, xml);
            
        }

    }
    */
  function __onPageLoadEnd(e){
    var pageModel = e.data.pageModel;
    __currentPageModel = pageModel;
    /*SCORM*/
    if((__scormBridge.isOnLMS && __scormBridge.isLMSAlive) || !__scormBridge.isOnLMS) {
      __scormBridge.set(__scormBridge.KEYS.Location,pageModel.chapterId+"_"+pageModel.pageId)
    }
  }
  function __destroyCurrentPage(){
    try{
      console.log(__currentPageRenderer)
      __currentPageRenderer.destroy();
    }
    catch(e){
      console.log("page rendered destroy failed -  "+e);
    }
    $(".content-inner-container").empty();
    $(".content-inner-container").removeClass(__currentPageModel.pageType);
  }
  function __onModuleClose(e){
    // This will trigger onBeforeUnload >> MODULE_EXIT >> handled by ModuleModel to save data
    if (confirm("Are you sure you want to exit the Module?")) {
      $("body").removeClass("launched");
      close();
    }
  }
  //Registration API
  var api = {
    registerEventManager:function(eventManagerAPI){
      console.log("register event manager")
      EventManger = eventManagerAPI;
      //TO-DO
      //Do global one-time event registrations
    },
    registerMediaManager:function(mediaAPI){
      __mediaManager = mediaAPI;
      __mediaManager.register({
        eventsManager:EventManger
      });
    },
    registerModuleModel:function(moduleModel){
      __moduleModel = moduleModel;
      __initModule();
    },
    registerUI:function(uiAPI){
      __ui = uiAPI;
      __ui.register({
        eventsManager:EventManger, moduleModelAPI:__moduleModel
      });
    },
    registerPlugin:function(pluginAPI){
      pluginAPI.register({
        eventsManager:EventManger, moduleModelAPI:function(){
          return __moduleModel
        }
      })
    },
    registerPageRenderer:function(pageRendererAPI){
      __pageRenderer = pageRendererAPI;
      __pageRenderer.register({
        eventsManager:EventManger, moduleModelAPI:__moduleModel
      });
    }
  }
  //Start
  __init();
  //API
  return api;
})();
if(!window.console){
  window.console = {
    log:function(){
    },error:function(){
    }
  }
}
function onCourseWinLoaded() {
}
function onCourseWinClose() {
}
function alignPopup(){
  var popup_left = (($(window).width() - $(".mfp-content.contentpopup-container.small").width())/2)+'px';
  var popup_top = (($(window).height() - $(".mfp-content.contentpopup-container.small").height()) / 2) + 'px';
  $(".mfp-container").css("position", "fixed");
  $(".mfp-container").css("top", 0);
  $(".mfp-container").css("left", 0);
  //CSS scroll update for android device only
  var deviceAgent = navigator.userAgent.toLowerCase();
  if(deviceAgent.match(/android/i)){
    $(".mfp-container").css("overflow", "auto");
  }
  //CSS scroll update for iphone/ipod only
  if((deviceAgent.match(/iPhone/i)) || (deviceAgent.match(/iPod/i))) {
    $(".mfp-container").css("overflow", "scroll");
  }
  $(".mfp-content.contentpopup-container.small").css("position", "fixed");
  $(".mfp-content.contentpopup-container.small").css("top", popup_top);
  $(".mfp-content.contentpopup-container.small").css("left", popup_left);
  $(".mfp-content.contentpopup-container.small").css("margin", "0px auto");
  $('.mfp-bg').css("position", "fixed")
  $('.mfp-bg').css("top", 0)
  $('.mfp-bg').css("left", 0)
}