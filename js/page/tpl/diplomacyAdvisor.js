import CacheService from '../../helper/cache.js';
import IkalogsRu from '../../helper/ikalogsRu.js';
import Parent from './dummy.js';

class Page extends Parent {

    async init() {
        this.cache = CacheService.getModuleCache('diplomacyAdvisor');
        this.lazyload = [];
        this.$parent = $(document.getElementById("tab_diplomacyAdvisor"));
        if (this.options.get('diplomacy_links', true)) {
            await this.makeActiveLinks()
        }
        if (this.options.get('diplomacy_fast_accept', true)) {
            await this.makeFastAccept()
        }

        if (this.options.get('diplomacy_tab_members', true)) {
            await this.addMembersTab();
            this.changeTabsText();
        }

        this.ikariamPremiumToggle([$('.templateView .premiumAccount').closest('.contentBox01h'), $('.templateView .ambrosia, .templateView .chargeAmbrosia')]);
    }

    //Изменение названий закладок
    changeTabsText() {
        let tabs = {
            '.tab_diplomacyAdvisor': LANGUAGE.getLocalizedString('diplomacy_message'),
            '.tab_diplomacyIslandBoard': LANGUAGE.getLocalizedString('diplomacy_agora'),
            '.tab_diplomacyTreaty': LANGUAGE.getLocalizedString('diplomacy_treaty'),
            '.tab_diplomacyAlly': LANGUAGE.getLocalizedString('diplomacy_alliance')
        };

        _.each(tabs, (text, selector) => {
            let $el = $(selector);
            let m = $el.text().match(/(\(\d+\))/);

            if (m && m.length >= 2) {
                text += ` ${m[1]}`;
            }

            $el.text(text);
        });
    }

    //Добавление вкладки со списком игроков альянса
    async addMembersTab() {
        let $tab = $('#js_tab_diplomacyMembers');

        if (!$tab.length) {
            const tpl = await this.render('diplomacy-members');
            $tab = $(tpl);
            $('#js_tab_diplomacyAlly').after($tab);
        }

        if (($('#diplomacyAllyMemberlist').length > 0) && $(".filter.diplomacy .filterEntry:first-child:not(.active)")) {
            $tab.addClass('selected').siblings().removeClass('selected');
        }
    }

    async checkIfCached(key, action) {
        if (!(key in this.cache)) {
            this.cache[key] = await action();
        }
        return this.cache[key];
    }


    //Создание активных ссылок
    async makeActiveLinks() {
        const $messages = this.$parent.find('#deleteMessages .table01');
        const regExpUrl = /(?<!.=["'])https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&\/=]*)/g;
        const html = $messages.html().replace(regExpUrl, (url) => {
            url = url.toLocaleString();

            // Картинки показываем сразу
            if (/\.(jpe?g|gif|png)$/.test(url)) {
                // TODO: ?
                return this.checkIfCached(url, async () => {
                    return await this.render('diplomacy-link-image', { url: url, img: url });
                });
            }

            // clip2net - подгружаем и показываем
            if (/https?:\/\/clip2net\.com/.test(url)) {
                if (url in this.cache) {
                    return `<div class="ikaeasy_cli2pnet_replace ikaeasy_replace_done">${this.cache[url]}</div>`
                }
                this.lazyload.push(() => this.setClip2net(url))
                return `<div class="ikaeasy_cli2pnet_replace" data-url="${url}">${url}</div>`
            }

            // ikalogs
            if (/https?:\/\/ikalogs.ru\/report\/.*/.test(url)) {
                const [, , , , battleId] = url.split('/');
                this.lazyload.push(() => this.ikaLogsReport(battleId, url))
                return `<div class="ikaeasy_ikalogs_replace" data-url="${url}">${url}</div>`
            }

            // Просто ссылка
            return `<a href="${url}" target="_blank" class="externalURL">${_.escape(url)}</a>`;
        });

        // bug: we need to find element again, as until we get here sometimes
        // ikariam updating the dom, so we are not replacing current element, but cached...
        this.$parent.find('#deleteMessages .table01').html(html);
        this.initLazyLoad();

    }

    /**
 * Создаёт и показывает модальное окно с HTML-содержимым.
 * @param {string} htmlContent - HTML для отображения.
 */
    showModal(htmlContent) {
        // Удаляем уже существующее окно, если оно есть
        const existingModal = document.getElementById('customModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Создаём структуру модального окна
        const modal = document.createElement('div');
        modal.id = 'customModal';
        modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
        background: white;
        width: 80%;
        max-width: 800px;
        max-height: 80%;
        overflow: auto;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        position: relative;
    `;

        const closeButton = document.createElement('button');
        closeButton.textContent = '✖';
        closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
    `;
        closeButton.onclick = () => modal.remove();

        const contentWrapper = document.createElement('div');
        contentWrapper.style.padding = '20px';
        contentWrapper.innerHTML = htmlContent; // Вставляем полученный HTML

        modalContent.appendChild(closeButton);
        modalContent.appendChild(contentWrapper);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
 * Отправляет сообщение через игровой интерфейс (аналог curl).
 * @param {Object} caller - объект отслеживающий отправку сообщения.
 * @param {Object} options - параметры сообщения.
 * @param {number} options.receiverId - ID получателя.
 * @param {number} options.msgType - тип сообщения (79 — принять договор, 80 — отказаться и т.д.).
 * @param {string} options.content - текст сообщения.
 * @param {string} options.actionRequest - CSRF-токен (извлекается из страницы).
 * @param {number} options.currentCityId - ID текущего города.
 * @param {number} [options.relType=0] - тип связи.
 * @param {number} [options.relAction=0] - действие связи.
 * @param {number} [options.relCity=0] - город связи.
 * @param {number} [options.isMission=0] - флаг миссии.
 * @param {number} [options.closeView=0] - закрыть окно после отправки.
 * @param {number} [options.allyId=0] - ID альянса.
 * @param {string} [options.backgroundView='city'] - вид фона.
 * @param {string} [options.templateView='sendIKMessage'] - шаблон представления.
 * @returns {Promise<string>} - ответ сервера в виде текста.
 */
    sendMessage(options) {
        const {
            caller,
            receiverId,
            msgType,
            content,
            actionRequest,
            currentCityId,
            relType = 0,
            relAction = 0,
            relCity = 0,
            isMission = 0,
            closeView = 0,
            allyId = 0,
            backgroundView = 'city',
            templateView = 'sendIKMessage'
        } = options;

        const url = 'https://s52-ru.ikariam.gameforge.com/index.php';
        const params = new URLSearchParams();
        params.append('action', 'Messages');
        params.append('function', 'send');
        params.append('receiverId', receiverId);
        params.append('relType', relType);
        params.append('relAction', relAction);
        params.append('relCity', relCity);
        params.append('msgType', msgType);
        params.append('content', content);
        params.append('isMission', isMission);
        params.append('closeView', closeView);
        params.append('allyId', allyId);
        params.append('backgroundView', backgroundView);
        params.append('currentCityId', currentCityId);
        params.append('templateView', templateView);
        params.append('actionRequest', actionRequest);
        params.append('ajax', '1');

        caller.append("<br>" + LANGUAGE.getLocalizedString('diplomacy_fast_message_processing'));

        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include', // отправка куки сессии
            body: params.toString()
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                caller.replaceWith(LANGUAGE.getLocalizedString('diplomacy_fast_message_success'));
                return data;
            })
            .catch(error => {
                console.error('Ошибка при отправке сообщения:', error);
                caller.append("<br>" + LANGUAGE.getLocalizedString('diplomacy_fast_message_error'));
                throw error;
            });
    }

    getActionRequest() {
        // Поиск по id
        let $input = $('#js_ChangeCityActionRequest');
        if ($input.length && $input.val()) {
            return $input.val();
        }
        // Fallback по name
        $input = $('input[name="actionRequest"]');
        if ($input.length && $input.val()) {
            return $input.val();
        }
        console.warn('actionRequest не найден');
        return null;
    }

    //Создание активных ссылок
    async makeFastAccept() {
        const $reactions = this.$parent.find('#deleteMessages .table01 .reaction');
        if ($reactions.length === 0) return;

        $reactions.each((index, reaction) => {
            const $reaction = $(reaction);

            // Находим все оригинальные ссылки внутри .reaction (исключая уже добавленные кнопки)
            if ($($reaction).children('.fastMessageAcceptButton').length > 0) {
                return;
            }
            const $originalLinks = $reaction.children('a');


            //LANGUAGE.getLocalizedString('diplomacy_message')
            // Для каждой оригинальной ссылки добавляем кнопку логирования после неё
            $originalLinks.each((i, link) => {
                const $link = $(link);
                const $logButton = $('<a>', {
                    href: '#',
                    class: 'fastMessageAcceptButton',
                    style: 'margin: 12px;',
                    text: LANGUAGE.getLocalizedString('diplomacy_fast_message_accept'),
                    click: (e) => {
                        e.preventDefault();
                        let messageLink = link.href;
                        if (messageLink) {
                            let searchParams = new URL(messageLink).searchParams;
                            let msgType = searchParams.get("msgType");
                            let receiverId = searchParams.get("receiverId");
                            let actionRequest = this.getActionRequest();
                            let currentCityId = $('li.ownCity').attr('selectvalue');

                            let requestParams = {
                                caller: $reaction,
                                receiverId: receiverId,
                                msgType: msgType,
                                content: '',
                                actionRequest: actionRequest,
                                currentCityId: currentCityId,
                            }
                            this.sendMessage(requestParams);
                        } else {
                            console.log('Ссылка не найдена в строке');
                        }
                    }
                });
                $link.after($logButton);
            });
        });
    }

    initLazyLoad() {
        for (const fn of this.lazyload) {
            fn();
        }
    }

    async getClip2net(url) {
        return new Promise(resolve => {
            chrome.runtime.sendMessage({ cmd: 'ajax_html', url: url }, (res) => resolve(res));
        });
    }

    async setClip2net(url) {
        if (!(url in this.cache)) {
            const res = await this.getClip2net(url);
            const href = '//clip2net.com/' + $(res).find('div.image-pic img').attr('src').replace(/^\//, '');
            this.cache[url] = await this.render('diplomacy-link-image', { url: url, img: href });
        }

        $(`.ikaeasy_cli2pnet_replace[data-url="${url}"]:not(.ikaeasy_replace_done)`).html(this.cache[url]).addClass("ikaeasy_replace_done");
    }

    async ikaLogsReport(battleId, url) {
        if (!(url in this.cache)) {
            this.cache[url] = 'loading';
            const { report, users, summary } = await IkalogsRu.getBattleInfo(battleId);
            this.cache[url] = await this.render('diplomacy-ikalogs', { url: url, report, users, summary });
        }

        if (this.cache[url] === 'loading') {
            return;
        }
        $(`.ikaeasy_ikalogs_replace[data-url="${url}"]:not(.ikaeasy_replace_done)`).html(this.cache[url]).addClass("ikaeasy_replace_done");
    }
}

export default Page;
