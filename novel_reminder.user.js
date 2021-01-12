// ==UserScript==
// @name         Novel Reminder
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Insert a panel to help you remind names of characters, especially when names are similar or difficult to memorize *looking at korean novels*
// @author       Maxoux
// @match        https://www.webnovel.com/book/*/*
// @match        https://*boxnovel.com/novel/*/*
// @match        http://readfreenovel.com/*/*
// @match        https://wuxiaworld.site/novel/*
// @match        https://daonovel.com/novel/*
//
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/vue/dist/vue.js
// @require      https://unpkg.com/uuid@latest/dist/umd/uuidv4.min.js
// @require      https://kit.fontawesome.com/4d41395a13.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.15/lodash.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/randomcolor/0.6.1/randomColor.min.js
// @require      https://cdn.jsdelivr.net/npm/vue-js-modal@1.3.28/dist/index.min.js
// @resource     css https://raw.githubusercontent.com/maxoux/novel_reminder/master/style.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// Temporary holded library for future use (maybe)
// @require      https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.8.1/spectrum.min.js
// @resource     spec https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.8.1/spectrum.min.css

const script_version = "1.0";
const host = "http://novel.laize.pro"


const repositories = {
    webnovel: {
        get_novel_id: () => window.location.href.split('/')[4],
        get_novel_name: () => $("header a.dib.ell").prop('title')
    },
    daonovel: {
        get_novel_id: () => window.location.href.split('/')[4],
        get_novel_name: () => $(".breadcrumb li")[1].innerText,
        get_chapter_nb: () => Number.parseInt(window.location.href.split('/')[5].slice(8)),
        get_novel_link: () => window.location.href.split('/').slice(0, 5).join('/'),
        get_chapter_link: (chapter) => repo.handle('get_novel_link') + "/chapter-" + chapter,
        fetch_chapter_name: (html) => $(html).find(".breadcrumb .active")[0].innerHTML.trim(),
        fetch_chapter_div: (html) => $(html).find(".text-left")[0],
    },
    boxnovel: {
        get_novel_id: () => window.location.href.split('/')[4],
        get_novel_name: () => $(".breadcrumb a")[1].innerText,
    },
    readfreenovel: {
        get_novel_id: () => window.location.href.split('/')[3],
        get_novel_name: () => $(".black-link")[0].innerText,
    },
    wuxiaworld: {
        get_novel_id: () => window.location.href.split('/')[4],
        get_novel_name: () => $(".breadcrumb li")[1].innerText,
        get_chapter_nb: () => Number.parseInt(window.location.href.split('/')[5].slice(8)),
        get_novel_link: () => window.location.href.split('/').slice(0, 5).join('/'),
        get_chapter_link: (chapter) => repo.handle('get_novel_link') + "/chapter-" + chapter,
        fetch_chapter_name: (html) => $(html).find(".breadcrumb .active")[0].innerHTML.trim(),
        fetch_chapter_div: (html) => $(html).find(".text-left")[0],
    },
    googleusercontent: {
        get_novel_id: () => window.location.href.split('/')[3],
        get_novel_name: () => $(".breadcrumb li")[1].innerText
    },
}

class RepositoryManager {
    
    repository_list;
    actual_repository;
    actual_repository_name;

    constructor(repository_list) {
        this.repository_list = repository_list;
        this.actual_repository = RepositoryManager.select(this.repository_list);
        this.actual_repository_name = RepositoryManager.get_website();

        if (!this.actual_repository)
            throw new Error("Repository for this website [%s] not found !", RepositoryManager.get_website());
    }

    // Function who select and apply object depending of which website we are, similar to Platform.select in react-native
    static select(obj) {
        if (obj[RepositoryManager.get_website()])
            return obj[RepositoryManager.get_website()];
        else if (obj.default)
            return obj.default;
        else
            return null;
    }

    // Function to determine what website is currently on, used to determine novel id and name, css tweak, etc...
    static get_website() {
        return window.location.host.split('.').reverse()[1];
    }

    // Handle all website related intialization (additionnal script, css, etc.)
    init() {
        this.addAdditionnalScripts();
    }

    isHandlerAvailable(handler_name) {
        if (!this.actual_repository[handler_name])
            return false;
        else
            return true;
    }

    checkMultipleHandler(handlers) {
        for (let i in handlers) {
            if (!this.isHandlerAvailable(handlers[i]))
                return false;
        }
        return true;
    }

    handle(handler_name, ...opts) {
        if (!this.actual_repository[handler_name])
            throw new Error(`Handler ${this.actual_repository_name}->${handler_name}() don't exist !`);
        else
            return this.actual_repository[handler_name](...opts);
    }

}

const repo = new RepositoryManager(repositories);

// Additionnal script to apply per website, not in repository for clarity reasons
function additionnal_script() {
    var script = {
        webnovel: () => {
            $('#page').css('margin-left', '0px');

            GM_addStyle ( `
                .no-select {
                    user-select: auto !important;
                }
            ` );
        },
        boxnovel: () => {
	        $('.reading-content').css('margin-right', '300px');
            $('.select-pagination').css('transform', 'translateX(-300px)');
        },
        readfreenovel: () => {
            // Remove listeners who make you change chapter when you type 'd', 'a', 'left', etc.
            unsafeWindow.$('*').unbind();

            GM_addStyle ( `
                .chapter-content3 {
                    user-select: auto !important;
                }
            ` );

        },
        wuxiaworld: () => {
            GM_addStyle ( `
                .site-content .main-col {
                    padding-right: 275px !important;
                }
                body {
                }
                .c-blog-post .entry-content {
                }
                .body-wrap {
                }
            ` );

            $("a[href='https://wuxiaworld.site']").remove();
            $(".btn.back").remove();

        },
        daonovel: () => {
            GM_addStyle ( `
                .site-content .main-col {
                    padding-right: 275px !important;
                }
                body {
                }
                .c-blog-post .entry-content {
                }
                .body-wrap {
                }
            ` );

            $("a[href='https://wuxiaworld.site']").remove();
            $(".btn.back").remove();

        },
        googleusercontent: () => {
            GM_addStyle ( `
                body {
                    padding-right: 400px !important
                }
                .c-blog-post .entry-content {
                    color: black !important;
                }
                .body-wrap {
                }
            ` );

            $("a[href='https://wuxiaworld.site']").remove();

        }
    }

    var additionnal = RepositoryManager.select(script);
    console.log('Additional script for this website : ', additionnal);

    if (additionnal)
        additionnal();
}

// Method to inject the panel in the body, using fixed component in body is the most permissive way, but we can insert it wherever we want
function panel_injector() {
    var body = $('body');

    console.log('[Body Component] : ', body);
    body.append(panel_html);

}

function replaceHtml(text_element, word_to_style, class_name) {
    html = text_element.html();
    re = new RegExp(word_to_style,"gi");
    new_html = html.replace(re, "<span class='"+class_name+"'>"+word_to_style+"</span>");
    text_element.html(new_html);
}

function name_injector(onClickFn, character_list) {
    console.time("name_injector")
    // First, backup chapter if not already did
    var chapter_div = repo.handle("fetch_chapter_div", $("body"));

    // Save, or restore before treatment
    if (!window.savedChapter)
        window.savedChapter = $(chapter_div).clone();
    else
        $(chapter_div).html(window.savedChapter.html());
    
    var search_string = character_list.reduce((prev, character) => {
        var names = character.getNamesFilter();
        return [...prev, ...names];
    }, [])

    search_string = search_string.map((name) => `(${name})`).join("|");
    var regex = new RegExp(search_string, "g");
    var newHtml = $(chapter_div).html().replace(regex, (value) => {
        return `<span class="reminder_injected">${value}</span>`
    });
    $(chapter_div).html(newHtml)

    // HTML injected correctly. Fetching all injected div to add interactivity and proper styles

    $(".reminder_injected").each(function() {
        var character = character_list.find((char) => char.hasThisAlias(this.innerHTML));
        this.style = character.getStyle();

        $(this).click(() => {
            onClickFn(character.id);
            return false;
        });

    })
    console.timeEnd("name_injector")

}

function selectColor(colors, colorNum){
    const nbColors = 50;

    return randomColor({count: nbColors, seed: repo.handle('get_novel_id')})[colorNum % nbColors];

    if (colors < 5) colors = 5; // defaults to one color - avoid divide by zero
    return "hsl(" + (colorNum * (360 / colors) % 360) + ",100%,50%)";
}

function selectColorbak(numOfSteps, step) {
    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
    // Adam Cole, 2011-Sept-14
    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    var r, g, b;
    var h = step / numOfSteps;
    var i = ~~(h * 6);
    var f = h * 6 - i;
    var q = 1 - f;
    switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
    }
    var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return (c);
}

// Function who translate save of old versions of the script in incremental way, ensure update if the save format have changed
function save_migrate(save, save_version) {

    // Subfunction to simplify character update for all novels in save
    function updateAllCharacters(save, fn) {
        _.forEach(save, (character_list, novel_id) => {
            if (novel_id == "_info")
                return ;

            save[novel_id] = character_list.map((character) => fn(character));
        });
    };

    const save_migration_dict = [
        {
            version: "0.5",
            fn: (save) => {

                updateAllCharacters(save, (character) => {
                    character.name = (character.first_name + " " + character.last_name).trim();
                    delete character.first_name;
                    delete character.last_name;
                    return character;
                })

                return save;
            },
            version: "0.8",
            fn: (save) => {
                save._info.synchro_key = uuidv4();

                return save;
            }
        }
    ]

    var version_iterator = 0;
    while (version_iterator != save_migration_dict.length && save_version > save_migration_dict[version_iterator].version)
        version_iterator++;

    if (version_iterator == save_migration_dict.length) {
        console.log('No migration needed');
        return save;
    }

    console.log('Detected older save version, save need %d upgrades.', save_migration_dict.length - version_iterator);

    var tmp_save = save;;
    while (version_iterator != save_migration_dict.length) {
        tmp_save = _.cloneDeep(tmp_save);
        tmp_save = save_migration_dict[version_iterator].fn(tmp_save);
        console.log('Save patch %s applied, result : ', save_migration_dict[version_iterator].version, tmp_save);
        version_iterator++;
    }

    console.log('Save fully patched !');
    return tmp_save;
}

class Character {
    constructor({name, text, color, alias}) {
		this.id = uuidv4();
        this.name = name;
        this.text = text || "";
		this.color = color || null;
        this.default_color = null;
		this.alias = [];

		if (alias)
			this.setAliases(alias);
	}

    export() {
        var exported = [
            "name",
            "text",
            "color",
            "alias"
        ]

        var data = {};
        exported.forEach((label) => data[label] = this[label]);

        return data;
    }

	getName() {
		return this.name;
	}

	getNamesFilter() {
		return [this.getName(), ...this.alias]
	}

	setAliases(alias) {
        if (alias == "")
            this.alias = [];
		else if (alias && typeof alias == "string")
			this.alias = alias.split(',');
		else
			this.alias = alias;

        this.alias = this.alias.map((alias) => alias.trim());
	}

    setDefaultColor(color) {
        this.default_color = color;
    }

    hasThisAlias(alias) {
        var aliases = this.getNamesFilter();

        for (let i in aliases) {
            if (aliases[i].indexOf(alias) != -1)
                return true;
        }

        return false;
    }

	// Styling for founded names in novel
	getStyle() {
		var style = {
			"color": this.color || this.default_color,
			"font-weight": "bold",
			"cursor": "pointer",
            "-webkit-text-stroke": "0.45px grey"
		};

		return _.map(style, (value, key) => `${key}:${value}`).join(';');
	}

	onClick() {
		console.log('[Character] Character selected : ', this);
        var text = `ID : ${this.id}\nName : ${this.getName()}\nAlias : ${this.alias.length ? this.alias.join(', ') : 'None'}\nDescription: ${this.text}`
        alert(text);
	}
}

const panel_html = `
<div id="reminder_panel" style="position: fixed; right: 70px; bottom: 5vh; height: 80vh; width: 300px; background-color: white; padding: 30px; border-radius: 5px; box-shadow: 0px 0px 20px -8px rgba(0,0,0,0.75);">
	<div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column">
		<div style="display: flex; flex-direction: row; justify-content: space-between">
			<h4 style="color: darkgrey">{{actual_panel_name}}</h4>
			<div class="reminder_button" v-on:click="addCharacter">Add</div>
		</div>
		<div style="overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column">

            <div v-show="mode == 'main'">
                <div class="menu_container" style="display: flex; flex-wrap: wrap; ">
                    <div class="menu_item" @click="onMenuClick(menu)" v-for="menu in menu_list">
                        <div class="menu_icon" style="flex-grow: 1; width: 100%; display: flex; align-items: center; justify-content: center">
                            <i :class="menu.icon" style="font-size: 45px"></i>
                        </div>
                        <div style="width: 100%; text-align: center; font-size: 15px; font-weight: 600">{{menu.name}}</div>
                    </div>
                </div>
            </div>

            <div v-show="mode == 'sync'" style="height: 100%">
                <div class="key_info" style="display: flex; align-items: center">
                    <div style="align-self: center; margin-right: 10px;">key: </div>
                    <input type="text" v-model="synchronization_key" style="height: 16px; font-size: 10px; border: 1px solid grey; width: 100%"></input>
                </div>
                <div style="width: 100%; display: flex; justify-content: space-between">
                    <div>status: </div>
                    <div>
                        {{cloud_status}}
                        <i class="fas fa-egg" :style="{ color: {'DISCONNECTED': 'grey', 'CONNECTING': 'orange', 'FAILED': 'red', 'CONNECTED': 'green'}[cloud_status] }"></i>
                    </div>
                </div>
                <div v-if="cloud_status == 'CONNECTED'" style="width: 100%; display: flex; justify-content: space-between">
                    <div>sync status: </div>
                    <div>
                        {{sync_status}}
                        <i class="fas fa-egg" :style="{ color: {'IDDLE': 'grey', 'INFO': 'blue', 'SYNCING': 'orange', 'FAILED': 'red', 'SYNCED': 'green'}[sync_status] }"></i>
                    </div>
                </div>
                <div v-if="cloud_status == 'DISCONNECTED'">
                    <p style="font-size: 11px; margin-top: 20px">
                        Hi ! Here is a little side project to synchronize your characters across devices !<br/>
                        After connection, click on export to upload your settings, then copy/paste the key on your target computer and click on import !<br/>
                        Warning: This is a side project uploaded on a personnal server, so please don't be rash with this feature :<br/>
                            - Don't put things unrelated to novels<br/>
                            - Don't try to overflow or penetrate the server<br/>
                        Any detected abuse will lead to disable this feature for everyone.<br/>
                        Beside this, i don't know how much time this service will be available, depending on other's project and future usage of server's ressources.<br/>
                        But hey, it's a free thing for my fellow camarades from a passionnate, so please enjoy :D<br/>
                    </p>
                    <div style="width: 100%; display: flex; align-items: center; justify-content: center;"><div style="cursor: pointer" @click="connect">Connect</div></div>
                </div>
                <div v-if="cloud_status == 'FAILED'">
                    <p style="font-size: 11px; margin-top: 20px">
                        Oups... Seems the connection with the serv have failed :/<br/>
                        If it's not your connection, the server address have maybe changed and you need to find an update.<br/>
                        If you haven't find any.. Sorry, seems this feature have been shut down, hope you all have enjoyed when it was time !<br/>
                        ps : You can still retry of course, try your luck ?<br/>
                    </p>
                    <div style="width: 100%; display: flex; align-items: center; justify-content: center;"><div style="cursor: pointer" @click="connect">Retry</div></div>
                </div>
                <div v-if="cloud_status == 'CONNECTED'">

                    <div style="margin-top: 20px">
                        <div>Server online !</div>
                        <div>{{cloud_uptime_string}}</div>
                        <div>Nb of settings: {{cloud_score}}. {{cloud_comment}}</div>
                    </div>
                    <div style="margin-top: 20px" v-if="sync_backup === false">
                        <div>This key never has been used !</div>
                    </div>
                    <div style="margin-top: 20px" v-if="sync_backup">
                        <div>Settings found !</div>
                        <div>Last uploaded: {{sync_backup.updated_at}}</div>
                        <div>Novels registered: {{backup_info.novel_count}}</div>
                        <div>Total characters: {{backup_info.character_count}}</div>
                    </div>
                    <div style="margin-top: 20px">
                        <a class="cloud_button" @click="connect">Refresh connection</a><br/>
                        <a class="cloud_button" @click="cloudFind">Check this key</a><br/>
                        <a class="cloud_button" @click="upload">Upload your novels</a><br/>
                        <a class="cloud_button" @click="restore">Download your novels</a><br/>
                        <a class="cloud_button" @click="cloudDelete">Delete online save</a><br/>
                    </div>

                </div>
            </div>

            <div v-show="mode == 'character'">
		    	<div class="character_container" v-for="character in character_list" :key="character.id" style="margin-bottom: 10px">
			    	<div @click="editCharacter(character.id)" :style="character.getStyle() + '; font-size: 18px'">{{character.getName()}}</div>

                    <div class="character_description">{{character.text}}</div>
			    </div>
            </div>

            <div v-show="mode == 'export'">
                <div v-for="(novel, id) in saved_data">
                    <h4 v-if="id != '_info'" @click="editNovel(id)" style="cursor: pointer">{{saved_data._info && saved_data._info.novel_list[id] ? saved_data._info.novel_list[id] : id}}</h4>
                </div>
            </div>


		</div>

		<div style="width: 100%">


			<div v-if="adding" style="display: flex; flex-direction: column; color: black !important">
				<input v-model="edition.name" placeholder="Name" style="height: 20px; padding: 0; width: calc(50% - 20px); border: 1px black solid; color: black"></input>
				<textarea ref="text_input" v-model="edition.text" placeholder="Comment" style="border: 1px black solid; color: black" />
				<input v-model="edition.alias" placeholder="Aliases, separated by ','" style="height: 20px; padding: 0; width: 100%; border: 1px black solid; color: black"></input>
				<input v-model="edition.color" type='text' placeholder="Color (like '#FF0000')" style="color: black" />
				<div class="cloud_button" @click="saveCharacter">Save</div>
                <div class="cloud_button" @click="deleteCharacter(edition.id)" v-if="edition.id">Delete</div>
                <div class="cloud_button" @click="onMenuClick('Search', edition.name)">Search</div>
				<div class="cloud_button" @click="disableEdit">Cancel</div>
			</div>

			<div v-if="selected_novel" style="display: flex; flex-direction: column">
				<textarea rows="10" v-model="export_import_data" placeholder="Comment" style="border: 1px black solid" />
				<div style="cursor: pointer" class="reminder_button" @click="saveNovel(selected_novel, export_import_data); setMode('character')">Save</div>
				<div style="cursor: pointer" class="reminder_button" @click="selected_novel = null">Cancel</div>
			</div>


			<div style="display: flex; flex-direction: row; justify-content: space-between">
				<div style="cursor: pointer" @click="refresh">Refresh</div>
				<div style="cursor: pointer" @click="setMode('main')">Menu</div>
				<div v-if="false && mode == 'character'" style="cursor: pointer" @click="setMode('export')">export</div>
                <div v-if="false && mode == 'export'" style="cursor: pointer" @click="setMode('character')">characters</div>
			</div>
		</div>
    </div>

    <modal name="searchbox" :draggable="true" :resizable="true" >
        <div class="search_container">

            <div class="search_header">
                <div class="search_bar"><input v-model="search.name" type="text" placeholder="Name of character"></input></div>
                <select class="search_direction" v-model="search.direction">
                    <option value="to_right">From chapter 1 to {{ chapter_nb }}</option>
                    <option value="to_left">From chapter {{ chapter_nb }} to 1</option>
                </select>
                <div v-if="search.status == 'IDDLE'" style="align-self: center" @click="searchStart"><a class="cloud_button">Search</a></div>
                <div v-if="search.status == 'SEARCHING'"style="align-self: center" @click="searchCancel"><a class="cloud_button">Cancel</a></div>
                <span style="flex-grow: 1"></span>
                <span class="search_status"></span>
                <span class="search_progress">{{search.direction == 'to_right' ? search.search_chapter_nb : (chapter_nb - search.search_chapter_nb)}}/{{chapter_nb}}</span>
            </div>

            <div class="search_result_container" v-if="search.result">
                <div v-for="chapter in search.result" style="margin-bottom: 30px">
                    <div v-if="chapter.list.length != 0">
                        <div style="display: flex;"><a class="search_chapter_link" :href="chapter.link" target="_blank"><i class="fas fa-link"></i></a><h4>{{chapter.chapter_name}}</h4></div>
                        <div v-for="extract in chapter.list" style="background-color: lightgrey; padding: 5px; margin: 5px 0; border-radius: 3px">
                            [...]<span v-html="extract"></span>[...]
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </modal>

</div>
`

function launch_app() {

    Vue.use(window["vue-js-modal"].default);

    var app = new Vue({
        el: '#reminder_panel',
        data: {
			character_list: [
			],
			edition: {
                id: null,
				name: "",
				text: "",
				color: "",
				alias: ""
			},
			adding: false,
            mode: "character",
            selected_novel: null,
            export_import_data: null,

            tooltip_div: null,

            // Synchronization part
            synchronization_key: null,
            cloud_status: 'DISCONNECTED',
            cloud_uptime: null,
            cloud_score: null,
            sync_status: 'IDDLE',
            sync_backup: null,

            // Research part
            search: {
                name: "Zong Cheng",
                status: 'IDDLE',
                search_chapter_nb: 0,
                direction: 'to_left',
                result: null
            }
		},
		mounted: function() {
			/*$('#custom').spectrum({
				color: "#f00"
			})
			$('#custom').on('change.spectrum', (color) => this.setColor(color.toHexString()));*/
            this.load();
            Vue.nextTick(this.refresh);

            window.onmouseup = _.debounce(this.selectionHandler, 150, {leading: false, trailing: true});


		},
        methods: {
            onMenuClick: function(menu, props) {
                console.log("Opening menu : %s => ", menu, props || '');

                if (typeof menu == "string")  {
                    var autoMenu = this.menu_list.find((item) => item.name == menu);
                    if (!autoMenu)
                        throw new Error("Menu ${menu} not found.");
                    menu = autoMenu;
                }

                if (menu.requiredFeatures) {
                    if (!repo.checkMultipleHandler(menu.requiredFeatures)) {
                        alert("Sorry, this feature is not available on this website yet, please tell me if you want it !");
                        return ;
                    }
                }

                if (menu.action)
                    menu.action(props);
                if (menu.panel)
                    this.setMode(menu.panel)
            },
            searchOpen: function(name) {
                this.search.name = name;
                this.$modal.show("searchbox");
            },
            searchCancel: function() {
                this.search.status = 'IDDLE';
            },
            searchStart: function() {

                function replaceHtml(text_element, word_to_style, class_name) {
                    html = text_element.html();
                    re = new RegExp(word_to_style,"gi");
                    new_html = html.replace(re, "<span class='"+class_name+"'>"+word_to_style+"</span>");
                    text_element.html(new_html);
                }

                function newRequest(chapter) {
                    console.log("generating new request for chapter ", chapter);
                    var promise = new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: repo.handle('get_chapter_link', chapter),
                            onload: (res) => resolve(res)
                        })
                    })

                    promise = promise.then((res) => {
                        return onChapterFetched(chapter, res)
                    });

                    return promise;
                }

                const onChapterFetched = (chapter, res) => {

                    var promise = new Promise((resolve, reject) => {

                        const name = this.search.name;

                        // parse html response
                        var page = $.parseHTML(res.response);
                        var raw = $(page).find(".text-left")[0].outerHTML;
                        var resultBeforeInjection = $(raw).find(`p:contains(${name})`);

                        // console.log("keyword : ", `p:contains(${name})`);
                        // console.log("raw response : ", raw);
                        // console.log("Result before injection : ", resultBeforeInjection);
    
                        // Inject bold and fetch result
                        var list = [];
                        resultBeforeInjection.each(function(extract) {
                            replaceHtml($(this), name, "search_finded_name");
                            list.push(this.innerHTML);
                        })
                        // console.log("list of research", list);

                        if (!this.search.result)
                            this.search.result = []
    
                        this.search.result.push({
                            chapter_name: repo.handle('fetch_chapter_name', page),
                            list: list,
                            link: repo.handle('get_chapter_link', chapter)
                        })
    
                        if (this.search.direction == 'to_right')
                            this.search.search_chapter_nb++;
                        else
                            this.search.search_chapter_nb--;
    
                        // Check if new request needed
                        // console.log("last chapter searched : ", this.search.search_chapter_nb);
                        var needNewRequest;
                        if (this.search.status != "SEARCHING") {
                            console.log("Chain Request cancelled");
                            needNewRequest = false;
                        }
                        else if (this.search.direction == "to_right" && this.search.search_chapter_nb >= this.chapter_nb)
                            needNewRequest = false;
                        else if (this.search.direction == "to_left" && this.search.search_chapter_nb <= 1)
                            needNewRequest = false;
                        else
                            needNewRequest = true;
    
                        // console.log("new request needed ? ", needNewRequest);
                        if (!needNewRequest)
                            return resolve();

                        return newRequest(this.search.search_chapter_nb);
                    })

                    return promise;

                }

                this.search.result = [];
                
                console.log("Launching request chain.");
                var first_search = this.search.direction == 'to_right' ? 1 : this.chapter_nb;

                this.search.search_chapter_nb = first_search;
                this.search.status = 'SEARCHING';
                newRequest(first_search)
                    .then(() => {
                        console.log("All chapter checked.");
                        this.search.status = 'IDDLE';
                    })
            },
            connect: function() {
                this.cloud_status = "CONNECTING";

                GM_xmlhttpRequest({
                    method: "GET",
                    url: `${host}/novel-settings/info`,
                    headers: {
                      "Accept": "application/json"            // If not specified, browser defaults will be used.
                    },
                    onload: (res) => {
                        console.log("response: ", res);

                        if (res.status < 200 || res.status > 299) {
                            this.cloud_status = "FAILED";
                            return ;
                        }
                        var response = JSON.parse(res.response);
                        this.cloud_uptime = response.uptime;
                        this.cloud_score = response.settings_count;
                        this.cloud_status = "CONNECTED";

                    }
                  });

            },
            cloudFind: function() {
                //{'IDDLE': 'grey', 'INFO': 'blue', 'SYNCING': 'orange', 'FAILED': 'red', 'SYNCED': 'green'}

                if (!this.synchronization_key || !this.synchronization_key.length) {
                    this.sync_status = 'FAILED';
                    return Promise.reject();
                }

                var promise = new Promise((resolve, reject) => {
                    this.sync_status = "SYNCING";

                    GM_xmlhttpRequest({
                        method: "GET",
                        url: `${host}/novel-settings/find/${this.synchronization_key}`,
                        headers: {
                          "Accept": "application/json"            // If not specified, browser defaults will be used.
                        },
                        onload: (res) => {
                            console.log("response: ", res);

                            if (res.status == 404) {
                                this.sync_status = "INFO";
                                this.sync_backup = false;
                                return resolve();
                            }
                            else if (res.status < 200 || res.status > 299) {
                                this.sync_status = "FAILED";
                                return reject();
                            }

                            var response = JSON.parse(res.response);
                            response.settings = JSON.parse(response.settings);

                            console.log("BAckup fetched : ", response);
                            this.sync_backup = response;
                            this.sync_status = "INFO";
                            return resolve(response);
                        }
                      });
                })

                return promise;

            },
            cloudDelete: function() {

                var promise = new Promise((resolve, reject) => {
                    this.sync_status = "SYNCING";
                    var key = this.synchronization_key;

                    GM_xmlhttpRequest({
                        method: "DELETE",
                        url: `${host}/novel-settings/${key}`,
                        headers: {
                            "Accept": "application/json",       // If not specified, browser defaults will be used.
                        },
                        onload: (res) => {

                            if (res.status < 200 || res.status > 299) {
                                this.sync_status = "FAILED";
                                return reject();
                            }

                            this.sync_backup = null;
                            this.saveSyncKey(key);
                            return resolve();
                        }
                      });
                })

                promise = promise
                            .then(() => {
                                return this.connect();
                            })
                            .then(() => {
                                this.sync_status = "SYNCED";
                            })
                            .catch(() => {
                                this.sync_status = 'FAILED';
                            })

                return promise;
            },
            upload: function() {

                var promise = new Promise((resolve, reject) => {
                    this.sync_status = "SYNCING";
                    var key = this.synchronization_key;
                    var save = this.save();
                    console.log("Save to upload : ", save);

                    GM_xmlhttpRequest({
                        method: "POST",
                        url: `${host}/novel-settings`,
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"           // If not specified, browser defaults will be used.
                        },
                        data: JSON.stringify({
                            key: key,
                            settings: JSON.stringify(save),
                        }),
                        onload: (res) => {
                            console.log("response: ", res);

                            if (res.status < 200 || res.status > 299) {
                                this.sync_status = "FAILED";
                                return reject();
                            }

                            var response = JSON.parse(res.response)[0];
                            console.log("parsed response", response);
                            response.settings = JSON.parse(response.settings);

                            console.log("Backup fetched : ", response);
                            this.sync_backup = response;
                            this.saveSyncKey(key);
                            return resolve();
                        }
                      });
                })

                promise = promise
                            .then(() => {
                                return this.cloudFind();
                            })
                            .then(() => {
                                this.sync_status = "SYNCED";
                            })
                            .catch(() => {
                                this.sync_status = 'FAILED';
                            })

                return promise;

            },
            restore: function() {
                return this.cloudFind()
                            .then((data) => {
                                if (!data)
                                    return Promise.reject();
                                console.log("Datas to restore : ", data);
                                window.localStorage.setItem("reminder_data", JSON.stringify(data.settings));
                                this.load();
                            })
                            .then(() => {
                                this.sync_status = 'SYNCED';
                            })
                            .catch(() => {
                                this.sync_status = 'FAILED';
                            })
            },

            selectionHandler: function() {

                var selection = window.getSelection();      // get the selection then
                var range = selection.getRangeAt(0);     // the range at first selection group
                var rect = range.getBoundingClientRect();
                var name = selection.toString();


                // console.log('New Selection ! ', selection);
                // console.log('range ? ', range);
                // console.log('Rectnagle : ', rect);

                if (this.tooltip_div) {
                    this.tooltip_div.parentNode.removeChild(this.tooltip_div);
                    this.tooltip_div = null;
                }

                if (rect.width == 0 || name.length < 4 || name.length > 30)
                    return ;

                var div = document.createElement('div');   // make box
                div.textContent = `Add character [${name}]`

                div.style.boxShadow = "0px 0px 20px -8px rgba(0,0,0,0.75)";
                div.style.backgroundColor = "white";
                div.style.position = 'fixed';              // fixed positioning = easy mode
                div.style.top = (rect.top - 50) + 'px';       // set coordinates
                div.style.left = rect.left + 'px';
                div.style.height = "auto"; // and size
                div.style.width = "auto";
                div.style.padding = "5px 10px"
                div.style.borderRadius = "5px";
                div.style.fontSize = "16px";
                div.style.cursor = "pointer";
                div.style.transition = "all 0.2s";
                div.style.opacity = 0;

                setTimeout(() => {
                    div.style.opacity = 1;
                }, 1)

                div.onclick = () => {
                    console.log('Adding the caharac !!', name)
                    this.addCharacter();
                    this.edition.name = name;

                    this.$nextTick(() => {
                        this.$refs.text_input.focus();
                    })
                }

                this.tooltip_div = div;
                document.body.appendChild(div);
            },
            editNovel: function(id) {
                this.export_import_data = JSON.stringify(this.saved_data[id], null, 2);
                this.selected_novel = id;
            },
            setMode: function(mode) {
                // Generate a key if go to sync but haven't one
                if (mode == "sync" && !this.synchronization_key) {
                    this.synchronization_key = uuidv4();
                    this.saveSyncKey();
                }

                this.selected_novel = null;
                this.adding = false;
                this.mode = mode;
            },
            load: function() {
                var novel_id = repo.handle('get_novel_id');
                console.log('novel id : ', novel_id);
				var data = window.localStorage.getItem("reminder_data");
				console.log('datas readed : ', data);
                if (!data || !data.length)
                    return ;
				try {
					data = JSON.parse(data);
				}
				catch(e) {
                    console.error(e);
					data = {};
				}

                // Apply migration savefile on the fly, isn't saved immediately if migration was needed.
                data = save_migrate(data, data._info ? data._info.version : "0.1");

                if (!data[novel_id])
                    return ;

				this.character_list = [];
				console.log('datas for novel : ', data[novel_id]);

                data[novel_id].forEach((perso) => {
                    this.character_list.push(new Character(perso))
                });

                this.synchronization_key = data._info.synchro_key;

                this.generateDefaultColors();
            },
            saveSyncKey: function(key) {
                this.synchronization_key = key;

                var data = window.localStorage.getItem("reminder_data");
                data = JSON.parse(data);
                data._info.synchro_key = key;
                window.localStorage.setItem("reminder_data", JSON.stringify(data));
            },
            save: function() {
                var datas = this.character_list.map((char) => char.export());
                var novel_id = repo.handle('get_novel_id');

                console.log("Attempt to saving datas : ", datas);
                return this.saveNovel(novel_id, JSON.stringify(datas));
            },
            saveNovel: function(novel_id, forced_data) {
                // If novel_id and forced_data are set, we are in the importation mode.

                var character_data;
                novel_id = novel_id || repo.handle('get_novel_id');

                character_data = JSON.parse(forced_data);

                // Get saved datas
                var data = window.localStorage.getItem("reminder_data");

                if (!data || !data.length)
                    data = {};
                else
                    data = JSON.parse(data);

                // Extract metadatas and update it
                var metadata = data._info || {novel_list: {}, version: null, synchro_key: uuidv4()};
                // For now we just override version savedata, in case of needed backward compatibility in the future
                metadata.version = script_version;

                metadata.novel_list[novel_id] = repo.handle('get_novel_name');

                data._info = metadata;

                data[novel_id] = character_data;
				window.localStorage.setItem("reminder_data", JSON.stringify(data));
                console.log('saved : ', data)
                // this.load();
				return data;
            },
			disableEdit: function() {
				this.edition.name = "";
				this.edition.text = "";
				this.edition.alias = "";
                this.edition.color = null;
				this.edition.id = null;
				this.adding = false;
			},
			deleteCharacter: function(id) {
				console.log('lodash : ', _);
				this.character_list = _.filter(this.character_list, (c) => c.id != id);
				this.save();
				this.disableEdit();
			},
            editCharacter: function(id) {
                var character = _.find(this.character_list, {id});
                this.edition.name = character.name;
				this.edition.text = character.text;
				this.edition.alias = character.alias;
				this.edition.id = character.id;
                this.edition.color = character.color;
				this.adding = true;
            },
			addCharacter: function() {
				this.adding = true;
			},
            // Function to generate defaults color for each character who don't have one
            generateDefaultColors: function() {
                var characters = this.character_without_color;
                console.log('%d characters need generated colors : ', characters.length, characters);

                if (!characters.length)
                    return ;

                characters.forEach((char, pos) => {
                    char.setDefaultColor(selectColor(characters.length + 2, pos + 1));
                })
            },
			setColor: function(color) {
				console.log('ok', color.toHexString);
			},
			saveCharacter: function() {
				if (!this.edition.name)
					return ;

				if (!this.edition.id) {
					var char = new Character({
						name: this.edition.name,
						text: this.edition.text,
						alias: this.edition.alias,
                        color: this.edition.color
					});
					this.character_list.push(char);
				}
				// Saving existing character
				else {
					var character = _.find(this.character_list, {id: this.edition.id});
					character.name = this.edition.name;
					character.text = this.edition.text;
					character.color = this.edition.color;
					character.setAliases(this.edition.alias);
				}
				console.log('list : ', this.character_list)

                this.generateDefaultColors();
				this.refresh();
                this.save();
                this.disableEdit();
			},
			characterOnClick: function(id) {
				var character = _.find(this.character_list, {id});
				console.log('on click for : ', character);
				character.onClick();
			},
			refresh: function() {
				name_injector(this.characterOnClick, this.character_list);
			}
		},
        computed: {
            character_without_color: function() {
                return _.filter(this.character_list, (char) => !char.color);
            },
            saved_data: function() {
                var data = window.localStorage.getItem("reminder_data");
                return JSON.parse(data);
            },
            novel_list: function() {
                var data = _.cloneDeep(this.saved_data);
                data._info = null;
                return _.values(data);
            },
            novel_name: () => repo.handle('get_novel_name'),
            actual_panel_name: function() {
                var name;

                if (this.mode == "main")
                    name = "Menu";
                else
                    name = this.menu_list.find((menu) => menu.panel == this.mode).name;

                const suffix_dict = {
                    "character": () => ` (${this.character_list.length})`
                };

                if (suffix_dict[this.mode])
                    return name + suffix_dict[this.mode]();
                else
                    return name;

            },
            menu_list: function() {
                return [
                    {
                        name: "Characters",
                        panel: "character",
                        icon: "fas fa-user"
                    },
                    {
                        name: "Export",
                        panel: "export",
                        icon: "fas fa-file-export"
                    },
                    {
                        name: "Online Sync",
                        panel: "sync",
                        icon: "fas fa-globe-europe"
                    },
                    {
                        name: "Search",
                        action: (props) => this.searchOpen(props),
                        icon: "fas fa-search",
                        requiredFeatures: [
                            'get_chapter_nb', 
                            'get_novel_link', 
                            'get_chapter_link', 
                            'fetch_chapter_name'
                        ]
                    }
                    // {
                    //     name: "Settings",
                    //     panel: "main",
                    //     icon: "fas fa-cogs",
                    // },
                ]
            },
            cloud_uptime_string: function() {
                var days = this.cloud_uptime / (3600*24);
                if (days == 0)
                    return `The server is running since today !`;
                else
                    return `The server is running for ${Math.round(days)} days !`
            },
            cloud_comment: () => "",
            backup_info: function() {
                if (!this.sync_backup)
                    return {};

                var character_count = _.reduce(this.sync_backup.settings, (prev, item, index) => {
                    if (index != '_info')
                        return prev + item.length;
                    else
                        return prev;
                }, 0)

                return {
                    novel_count: _.size(this.sync_backup.settings._info.novel_list),
                    character_count: character_count,
                }
            },
            chapter_nb: function() {
                if (repo.isHandlerAvailable('get_chapter_nb'))
                    return repo.handle('get_chapter_nb');
                else
                    return "(unknow)"
            }
         }
    })
}

(function() {
    'use strict';
    setTimeout(() => {
        // Disabled importation for color picker, not sure if it will be practical since use of auto-generated colors (and i'm a lazy guy)
        //var cssTxt  = GM_getResourceText("spec");
        //GM_addStyle(novel_css);
        var css = GM_getResourceText("css")
        console.log("[CSS] ", css);
        if (css) {
            GM_addStyle(css);
        }
        else {
            console.log("No css style, assuming dev mode");
            GM_xmlhttpRequest({
                method: 'GET',
                url: "http://localhost:8080/style.css",
                onload: (res) => {
                    console.log("css fetched : ", res.response);
                    GM_addStyle(res.response);
                }
            })
        }

        additionnal_script();

        setTimeout(() => {
            panel_injector();
            launch_app();
        }, 0)
    }, 100)
})();
