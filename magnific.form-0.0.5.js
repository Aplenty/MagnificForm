var InlineFormQueue = null;
var PopupCloseIsToOpenNewForm = false;

function InlineForm() {

	var self = this;

	var _url;
	var _params;
	var _easyToClickAway;
	var _loadedCallback;
	var _submittedCallback;
	var _closedCallback;
	var _httpMethod;
	var _showBreadcrumb;
	var _addToQueue;
	var _clearPopupsOnClose;
	var _popupName;
	var _refreshOnNavigate;
	var _popupRedisplayCallback;
	var _htmlResult = null;
	var _popup = null; //the actual popup DOM
	var _hasBeenDisplayedBefore = false;
	var _html = null;
    var _latestresponse;

	self.tmp = function() {
		return _popup;
	}

	self.getPopupName = function() {
		return _popupName;
	};

	self.RunCloseCallback = function() {
		if (_closedCallback != null) {
			_closedCallback();
		}
	};

	self.getPopupDom = function () {
	    return _popup;
	};


	//quick method for self.init (most common options)
	self.QuickInit = function (url, loadedCallback, submittedCallback, closedCallback) {
		self.init(url, null, false, loadedCallback, submittedCallback, closedCallback, null, false, false, true, "", null, null);
	};

	//quick method for self.init (most common options) with some added popup from popup options
	self.QuickInitWithQueue = function (url, loadedCallback, submittedCallback, closedCallback, clearPopupsOnClose, popupName, popupRedisplayCallback) {
		self.init(url, null, false, loadedCallback, submittedCallback, closedCallback, null, true, true, clearPopupsOnClose, popupName, popupRedisplayCallback, null);
	};

    //quick method for self.init (most common options)
	self.QuickInitHtml = function (html, loadedCallback, submittedCallback, closedCallback, popupName) {
		self.init(null, null, false, loadedCallback, submittedCallback, closedCallback, null, false, false, true, popupName, null, html);
	};

    //quick method for self.init (most common options) with some added popup from popup options
	self.QuickInitHtmlWithQueue = function (html, loadedCallback, submittedCallback, closedCallback, clearPopupsOnClose, popupName, popupRedisplayCallback) {
		self.init(null, null, false, loadedCallback, submittedCallback, closedCallback, null, true, true, clearPopupsOnClose, popupName, popupRedisplayCallback, html);
	};



	//url - the url to load in the popup
	//urlParams - any url parameters that are to be sent with
	//easyToClickAway - if true it will only close popups on the X and ESC key (instead of anywhere in the background). This plugin also closed popup on successfull submit of data
	//loadedCallback - a callback method that will be called when the popup is loaded. very handy for attaching scripts and behaviour to things in the popup, sends with the content of the popup as parameter
	//submittedCallback - sends you the respons that was returned from the server after a form submit (you get one parameter with the return data). This plugin also can redirect, redisplay popup and if successful close the popup so this is a less commonly used callback
	//closedCallback - called when the popup is being closed, it makes no difference if closed by user or closed due to successfull submit. no parameter sent with. good for updating the view underneath the popup
	//httpMethod - the http method can be "GET", any other value (including null) makes it assume "POST" which is default
	//showBreadcrumb - When opening a popup from another popup it can be configured to show a breadcrumb that allows going back to a previous popup
	//addToQueue - if true this popup will be added to the queue enabling popups that this popup in turn opens to navigate back to it
	//clearPopupsOnClose - if true we only go back to previous popups via breadcrumb as all kinds of close will clear queue and go back to page
	//popupName - the name that will be in the breadcrumb if activated
    //popupRedisplayCallback - A callback that is called when a popup is redisplayed, good for updating data that change from further popups. Sends with the html of the popup, same os loadedCallback
    //html - Lets the caller populte the dialog with it's own Html instead of laoding it fron Url (requires that Url == null)
	self.init = function (url, urlParams, easyToClickAway, loadedCallback, submittedCallback, closedCallback, httpMethod, showBreadcrumb, addToQueue, clearPopupsOnClose, popupName, popupRedisplayCallback, html) {

		//We alwayc start by closing any possible popup that might be open. This is because the popup does not load with all events properly otherwise
		PopupCloseIsToOpenNewForm = true;
		$.magnificPopup.close();

		var params = urlParams;
		if (typeof urlParams == "undefined" || urlParams == null || urlParams == "") {
			params = {};
		}

		if (typeof httpMethod == "undefined" || httpMethod == null || httpMethod == "" || httpMethod != "GET") {
		    httpMethod = "POST";
		}

		//put all in variables so we can save the whole object with it's state
		_url = url;
		_params = params;
		_easyToClickAway = easyToClickAway;
		_loadedCallback = loadedCallback;
		_submittedCallback = submittedCallback;
		_closedCallback = closedCallback;
		_httpMethod = httpMethod;
		_showBreadcrumb = showBreadcrumb;
		_addToQueue = addToQueue;
		_clearPopupsOnClose = clearPopupsOnClose;
		_popupName = popupName;
		_popupRedisplayCallback = popupRedisplayCallback;
		_html = html;

		if (_addToQueue) {

			if (InlineFormQueue == null) {
				InlineFormQueue = new Array();
			}

			InlineFormQueue.push(self);
		}

		if (_url != null) {
		    $.blockUI({ message: $(".loading-anim").html() });

		    $.ajax({
		        type: _httpMethod,
		        url: _url,
		        data: _params
		    }).done(function (msg) {

		        $.unblockUI();

		        _htmlResult = msg.Html;
		        if (typeof _htmlResult == 'undefined') {
		            _htmlResult = msg;
		        }

		        self.DisplayPopup();

		    }).fail(function (jqXHR, textStatus) {
		        console.log("Error with form load: " + textStatus);

		        $.blockUI({ message: '<div class="blockui-info-box">[[[Something went wrong. Try again and if the error remains please contact the system administrator.]]] <a href="#" onclick="afterFailureForm(); return false;">[[[Ok]]]</a></div>' });
		    });
		}
		else if (_html != null)
		{

		    _htmlResult = _html;

		    self.DisplayPopup();
		}
	};

	self.DisplayPopup = function() {

		if (_htmlResult == null) {
			alert("[[[Error fetching the form from the server.]]]");
		}

		var bindPopupForm = false;

		//If we don't have a popup since before we create it now
		if (_popup == null && !_hasBeenDisplayedBefore) {

			var popup = $("<div>").addClass("white-popup");

			if (_showBreadcrumb) {
				var breadCrumb = $("<ul>").addClass("breadcrumbs");

				for (index = 0; index < InlineFormQueue.length; ++index) {

					var li = $("<li>");

					//last element we display without link
					if (index < InlineFormQueue.length - 1) {
						var link = $("<a href='#' onclick='loadFormFromQueue(" + index + "); return false;'>").text(InlineFormQueue[index].getPopupName());
					    li.append(link);
					} else {
					    li.text(_popupName).addClass("current"); //this is the current one
					}

					breadCrumb.append(li);
				}

				popup.append(breadCrumb);
			}

			var content = $("<div class='popup-content'>");
			content.append(_htmlResult);
			popup.append(content);

			bindPopupForm = true;


            // Convenience method for automatically mapping the cancel button so it closes the form <button class="cancel">[[[Cancel]]]"</button>
			content.find("button.cancel, input[type=button].cancel").on("click", function (event) {
		        event.stopPropagation();
		        event.preventDefault();
		        event.stopImmediatePropagation();


		        $.magnificPopup.close();
		    });


			_popup = popup;
		}
		//We have a form but must update the content
		else if ($.type(_htmlResult) === "string" && _popup.find(".popup-content").html().trim() != _htmlResult.trim()) {
		    // TODO: The line below was supposed to write out html from the response into the window. But caused a number of errors with nesting popups and sortableLists that didn't reload.
		    //_popup.find(".popup-content").html(_htmlResult.trim());
		    bindPopupForm = true;
		}
		else if ($.type(_htmlResult) === "object" && (_htmlResult.hasOwnProperty("Success") || _htmlResult.hasOwnProperty("Redirect"))) {
		    // The form have been submitted without ajax ([[data-ajax='no']]), and we have gotten a result back in form of an object. If we have gotten an OperationResult / RedirectResult back, handle it
		    interpretResponse(_htmlResult);
		}
		

		if (bindPopupForm)
		{
		    _popup.find("form").not("[data-ajax='no']").ajaxForm({
				beforeSubmit: function() {
				    $.blockUI({ message: '' });
				    _popup.block({ message: $(".loading-anim").html() });
					//_popup.block({ message: '<div class="blockui-info-box">[[[Loading]]]</div>' });
				},
				success: function(responseText, statusText, xhr) {
					$.unblockUI();
					_popup.unblock();
					interpretResponse(responseText);
				},
				error: function() {
					$.magnificPopup.close();
					$.blockUI({ message: '<div class="blockui-info-box">[[[Something went wrong. Try again and if the error remains please contact the system administrator.]]] <a href="#" onclick="afterFailureForm(); return false;">[[[Ok]]]</a></div>' });
				},
			});
		}


		$.magnificPopup.open({
			callbacks:
			{
				open: function () {

					//if we managed to display the popup we do want to close it when we click close (with close action)
					PopupCloseIsToOpenNewForm = false;

					if (_hasBeenDisplayedBefore) {

						//if we just reopen an existing popup we call the redisplay callback
						if (_popupRedisplayCallback != null) {
							_popupRedisplayCallback(this.content);
						}
					} else { //we show this popup for the first time

						_hasBeenDisplayedBefore = true;

						//If we use foundation, wire it up in the form
						if (typeof popup.foundation == "function") {
							popup.foundation();
						}

						if (_loadedCallback != null) {
							_loadedCallback(this.content);
						}
					}


				},
				afterClose: function () {

					//we do not execute close logik when it's because we open a new popup
					if (!PopupCloseIsToOpenNewForm) {
						PopupCloseIsToOpenNewForm = false;


						//if we on close want to go back to previous popup we load it up here
						if (!_clearPopupsOnClose) {

							//if we added ourselves to queue of popups it's now time to remove ourselves.
							if (_addToQueue && InlineFormQueue != null) {
								InlineFormQueue.pop();
							}

							//there is a previous popup to show
							if (InlineFormQueue != null && InlineFormQueue.length > 0) {

									//we cleared of the one we are closing so the last one is now the one to show.
									InlineFormQueue[InlineFormQueue.length - 1].DisplayPopup();
							}
						} else {

							//We want to make sure to call the first elements close callback so the underlying page can update it's content
							if (InlineFormQueue != null && InlineFormQueue.length > 0) {
								InlineFormQueue[0].RunCloseCallback();
							}

							//If we want to clear the queue on form close
							InlineFormQueue = null;
						}


						if (_closedCallback != null) {
						    _closedCallback(_latestresponse);
						}

					}
				}
			},
			items: {
				src: _popup,
				type: 'inline'
			},
			closeOnContentClick: _easyToClickAway,
			closeOnBgClick: _easyToClickAway
		});


	};

	var interpretResponse = function(response) {

	    _latestresponse = response; // Save the latest response, for sending out in the close events

	    if (!$.isEmptyObject(response) && response.hasOwnProperty("OperationSuccess") && response.OperationSuccess) {

			//we close the popup before running submitted callback so if we open new popup from there, there is no old popup running
			$.magnificPopup.close();

			if (_submittedCallback != null) {
				_submittedCallback(response);
			}

			//We allow for direct redirect without mixing in further js
			if (response.hasOwnProperty("Redirect"))
			{
				window.location = response.Redirect;
			}
		}
		else
		{
			//If we have explicityly set Success to false we try to use validator lib form-validation-{version}.js if it exists
	    	if (!$.isEmptyObject(response) && response.hasOwnProperty("OperationSuccess") && !response.OperationSuccess &&
				typeof Validator !== 'undefined' && typeof Validator.ClearValidationTags === 'function' && typeof Validator.DisplayErrors === 'function')
			{

					//We check that we seem to have gotten validation data back from server
					//handle a few different formats of error
					if (response.hasOwnProperty("Data"))
					{
						Validator.ClearValidationTags();
						Validator.DisplayErrors(response.Data);
					}
					else if (!$.isEmptyObject(response) && response.hasOwnProperty("Error") && response.Error != "") {
						alert(response.Error);
					}
					else if (!$.isEmptyObject(response) && response.hasOwnProperty("ErrorMessage") && response.ErrorMessage != "") {
						alert(response.ErrorMessage);
					}
					else if (!$.isEmptyObject(response) && response.hasOwnProperty("OperationMessage") && response.ErrorMessage != "") {
					    alert(response.OperationMessage);
					}
			}
			else
			{
				//We have not been given something in validation format, or we don't have a validator present
				
				
				//we look to see if we got an error text to display. This should really be a last resort.
				//Normally you would instead give out new html with an error nicely posted on it.
				if (!$.isEmptyObject(response) && response.hasOwnProperty("Error") && response.Error != "") {
					alert(response.Error);
				} else {

					//we if nothing else has come true we assume we have gotten a new page to display
					_htmlResult = response.Html;
					if (typeof _htmlResult == 'undefined') {
						_htmlResult = response;
					}

					self.DisplayPopup();
				}
			}	
		}

	};
}

function afterFailureForm() {
	$.unblockUI();
}

function loadFormFromQueue(index) {

	if (InlineFormQueue == null || InlineFormQueue.length == 0 || index < 0) {
		return;
	}

	//we close the current popup,since you can't have clicked that one anyway so we know we want it closed
	$.magnificPopup.close();

	//remove all elements after the one we clicked.
	for (var i = InlineFormQueue.length - 1; i > index; --i) {
		InlineFormQueue.pop();
	}

	//now the one we clicked is the last one so we display it
	InlineFormQueue[InlineFormQueue.length - 1].DisplayPopup();

}