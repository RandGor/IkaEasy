'use strict';

(function() {
    const MESSAGE_TYPE = 'FROM_IKAEASY_V4';

    const isSafeGameUrl = (value) => {
        if (typeof value !== 'string' || !value) {
            return false;
        }

        try {
            const url = new URL(value, window.location.origin);
            return url.origin === window.location.origin;
        } catch (error) {
            return false;
        }
    };

    const pageCommands = {
        ajaxHandlerCall(payload) {
            if (isSafeGameUrl(payload.url)) {
                ajaxHandlerCall(payload.url);
            }
        },

        submitForm(payload) {
            const form = document.getElementById(payload.formId);
            if (form && form.tagName === 'FORM') {
                ajaxHandlerCallFromForm(form);
            }
        },

        setActionRequest(payload) {
            if (typeof payload.actionRequest === 'string') {
                ikariam.model.actionRequest = payload.actionRequest;
            }
        },

        showBubbleTip(payload) {
            if (Number.isInteger(payload.type) && Number.isInteger(payload.id) && typeof payload.text === 'string') {
                BubbleTips.bindBubbleTip(payload.type, payload.id, payload.text);
            }
        },

        adjustMainboxScrollbar() {
            const scrollbar = ikariam.templateView && ikariam.templateView.mainbox && ikariam.templateView.mainbox.scrollbar;
            if (scrollbar && typeof scrollbar.adjustSize === 'function') {
                scrollbar.adjustSize();
            }
        },

        destroyTemplateAndShowTip(payload) {
            if (typeof payload.text !== 'string') {
                return;
            }
            ikariam.TemplateView.destroyTemplateView();
            BubbleTips.bindBubbleTip(1, 11, payload.text);
        },

        updateActiveCity(payload) {
            const cityId = Number(payload.cityId);
            if (!Number.isInteger(cityId) || cityId <= 0) {
                return;
            }

            const selectedCity = `city_${cityId}`;
            if (ikariam.model.relatedCityData) {
                ikariam.model.relatedCityData.selectedCity = selectedCity;
                ikariam.model.relatedCityData.selectedCityId = cityId;
            }
            if (ikariam.model.headerData && ikariam.model.headerData.cityDropdownMenu) {
                ikariam.model.headerData.cityDropdownMenu.selectedCity = selectedCity;
                ikariam.model.headerData.cityDropdownMenu.selectedCityId = cityId;
            }
            const cityInput = document.getElementById('js_cityIdOnChange');
            if (cityInput) {
                cityInput.value = cityId;
            }
        },

        openAjaxResponse(payload) {
            if (!isSafeGameUrl(payload.url)) {
                return;
            }
            $.ajax({
                url: payload.url,
                method: 'GET',
                dataType: 'text'
            }).done(function(response) {
                ajax.Responder.parseResponse(response);
            }).fail(function(request, status, error) {
                console.error(payload.errorMessage || 'IkaEasy game request failed', status, error);
            });
        },

        claimDailyBonus() {
            const form = document.getElementById('dailybonus');
            if (!form || form.tagName !== 'FORM') {
                return;
            }
            ajaxHandlerCallFromForm(form);
            $('body').trigger('click.dropDown');
            ikariam.getMultiPopupController().closePopup();
        },

        confirmBuildingDemolition(payload) {
            if (typeof payload.text !== 'string' || !isSafeGameUrl(payload.url)) {
                return;
            }

            const action = `ajaxHandlerCall(${JSON.stringify(payload.url)});ikariam.closePopup();return false;`;
            ikariam.createPopup(
                'reportConfirmPopup',
                payload.text,
                [payload.text, [action], LocalizationStrings.yes, LocalizationStrings.abort],
                1
            );

            const $tip = $('.bubble_tip');
            const left = parseInt($tip.css('left'));
            const top = parseInt($tip.css('top'));
            $tip.css({'left': left - 70, top: top - 20});
        }
    };

    window.addEventListener('message', function (event) {
        if (event.source !== window || event.origin !== window.location.origin || !event.data || event.data.type !== MESSAGE_TYPE) {
            return;
        }

        if (event.data.cmd === 'page_command' && Object.prototype.hasOwnProperty.call(pageCommands, event.data.action)) {
            try {
                pageCommands[event.data.action](event.data.payload || {});
            } catch (error) {
                console.error(`IkaEasy page command failed: ${event.data.action}`, error);
            }
        }
    });

    const CONSOLE_ENABLED = true;

    if (CONSOLE_ENABLED) {
        var i = document.createElement('iframe');
        i.style.display = 'none';
        document.body.appendChild(i);
        window.console = i.contentWindow.console;
    }

    class Front {
        constructor() {
            this._last = '';
            this._lastRequest = 0;
            this._viewData = {};

            this._updateResources();

            // Инициализируем таймер, который будет искать изменения
            setInterval(this.loop.bind(this), 50);

            let self = this;
            if ((window.ajax) && (window.ajax.Responder) && (window.ajax.Responder.parseResponse)) {
                window.ajax.Responder.parseResponse = function (f) {
                    return function(resp) {

                        resp = JSON.parse(resp);
                        resp.forEach((r) => {
                            if (r[0] === 'updateTemplateData' && r[1] && r[1].load_js && r[1].load_js.params) {
                                try {
                                    const cinemaParams = JSON.parse(r[1].load_js.params);
                                    localStorage.setItem('ikaeasy_cinema_template_data', JSON.stringify({
                                        videoId: cinemaParams.videoID,
                                        videos: cinemaParams.videos || []
                                    }));
                                } catch (error) {
                                    console.warn('IkaEasy Cinema template data parsing failed:', error);
                                }
                            }

                            if (r[0] === 'changeView') {
                                let viewName = r[1][0];
                                self._viewData[viewName] = null;

                                if (typeof r[1][2] === 'object') {
                                    let rr = r[1][2];
                                    if (rr.viewScriptParams) {
                                        if (rr.viewScriptParams.localization) {
                                            delete rr.viewScriptParams.localization;
                                        }

                                        self._viewData[viewName] = rr.viewScriptParams;
                                    }
                                }
                                return false;
                            }
                        });

                        window.postMessage({ type: 'FROM_IKAEASY_V3', cmd: 'form', form: resp }, '*');
                        return f.apply(this, arguments);
                    };
                }(window.ajax.Responder.parseResponse);
            }
            this.httpListener();
        }

        send(data = null) {
            let tpl = this.getTemplateId();
            window.postMessage({ type: 'FROM_IKAEASY_V3', cmd: 'update', bg: this._getBgId(), tpl: tpl, data: data, viewData: this._viewData[tpl] }, '*');
        }

        loop() {
            let tpl = this.getTemplateId();

            if (!this._lastRequest) {
                this._lastRequest = ikariam.model.requestTime;
            }

            if (!tpl) {
                this._viewData = {};
            }

            if (((tpl !== this._last)) || (ikariam.model.requestTime !== this._lastRequest)) {
                this._updateResources();
                this._lastRequest = ikariam.model.requestTime;
                this._last = tpl;
            }
        }

        _updateResources() {
            if (typeof LocalizationStrings !== 'undefined') {
                LocalizationStrings.glass = LocalizationStrings.crystal;
            } else {
                LocalizationStrings.glass = 'Glass'
            }

            let model = ikariam.model;
            let trasferVars = {
                isOwnCity: model.isOwnCity,
                allyId: parseInt(model.avatarAllyId),
                avatarId: parseInt(model.avatarId),
                actionRequest: model.actionRequest,
                resources: model.currentResources,
                wineSpendings: model.wineSpendings,
                cities: model.relatedCityData,
                localizationStrings: LocalizationStrings,
                ships: model.freeTransporters,
                maxResources: model.maxResources,
                serverTimeOffset: (Date.now() - model.initialServerTime),
                initialBrowserTime: model.initialBrowserTime,
                serverName: model.serverName,
                maxActionPoints: model.maxActionPoints,
                advisorData: model.advisorData,
                gold: {
                    income: model.income || 0,
                    badTaxAccountant: model.badTaxAccountant || 0,
                    scientistsUpkeep: model.scientistsUpkeep || 0,
                    upkeep: model.upkeep || 0
                },

                producedTradegood: model.producedTradegood,
                tradegoodProduction: model.tradegoodProduction,
                resourceProduction: model.resourceProduction,
            };

            if (ikariam.templateView) {
                trasferVars.templateView = ikariam.templateView.script;
            } else {
                trasferVars.templateView = null;
            }

            trasferVars.cities.selectedCityId = parseInt(trasferVars.cities.selectedCity.replace('city_', ''));

            if (this._getBgId() === 'city') {
                trasferVars.city = ikariam.backgroundView.screen.data;
                trasferVars.island = { islandId: ikariam.backgroundView.screen.data.islandId };
            } else if (this._getBgId() === 'island') {
                let data = ikariam.backgroundView.screen.data;
                trasferVars.island = {
                    islandId:   data.id,
                    tradegood:  data.tradegoodLevel,
                    wonderType: data.wonder,
                    wonder:     data.wonderLevel,
                    wood:       data.resourceLevel,
                    cities:     data.cities
                };
            }

            this.send(trasferVars);
        }

        getTemplateId (){
            if ((ikariam.templateView) && (ikariam.templateView.id)) {
                return ikariam.templateView.id;
            }

            return null;
        }

        _getBgId(){
            return ikariam.backgroundView.id || document.getElementsByTagName('body')[0].id;
        }

        
        httpListener(){
            const diagnosticsKey = 'ikaeasy_cinema_diagnostics';
            const xhrPrototype = XMLHttpRequest.prototype;

            const saveCinemaDiagnostic = function(entry) {
                let entries = [];
                try {
                    entries = JSON.parse(localStorage.getItem(diagnosticsKey)) || [];
                } catch (error) {
                    entries = [];
                }

                entries.push(Object.assign({ timestamp: new Date().toISOString() }, entry));
                localStorage.setItem(diagnosticsKey, JSON.stringify(entries.slice(-12)));
            };

            if (!xhrPrototype.ikaeasyCinemaDiagnostics) {
                const originalOpen = xhrPrototype.open;
                const originalSend = xhrPrototype.send;

                xhrPrototype.open = function(method, url) {
                    this.ikaeasyCinemaRequest = /AdVideoRewardAction/i.test(String(url || '')) ? {
                        method: method,
                        url: String(url)
                    } : null;

                    return originalOpen.apply(this, arguments);
                };

                xhrPrototype.send = function(data) {
                    const cinemaRequest = this.ikaeasyCinemaRequest;
                    if (cinemaRequest) {
                        saveCinemaDiagnostic({
                            phase: 'request',
                            method: cinemaRequest.method,
                            url: cinemaRequest.url,
                            requestData: typeof data === 'string' ? data : null
                        });

                        this.addEventListener('loadend', function() {
                            let response = '';
                            try {
                                response = this.responseText || '';
                            } catch (error) {
                                response = '[responseText unavailable]';
                            }

                            saveCinemaDiagnostic({
                                phase: 'response',
                                method: cinemaRequest.method,
                                url: cinemaRequest.url,
                                status: this.status,
                                statusText: this.statusText || '',
                                response: response.slice(0, 50000)
                            });

                            window.postMessage({
                                type: 'FROM_IKAEASY_V3',
                                cmd: 'cinema-ajax',
                                request: {
                                    type: cinemaRequest.method,
                                    data: response,
                                    url: cinemaRequest.url,
                                    status: this.status
                                }
                            }, '*');
                        }, { once: true });
                    }

                    return originalSend.apply(this, arguments);
                };

                xhrPrototype.ikaeasyCinemaDiagnostics = true;
            }

            $(document).ajaxSuccess(function(event, request, options) {
                window.postMessage({
                    type: 'FROM_IKAEASY_V3',
                    cmd: 'ajax',
                    request: {
                        type: options.type,
                        data: request.responseText,
                        url: options.url
                    }
                });
            });
        }
        
    }

    const _front = new Front();
})();
