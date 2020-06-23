// ==UserScript==
// @name         Novel Reminder
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Insert a panel to help you remind names of characters, especially when names are similar or difficult to memorize *looking at korean novels*
// @author       Maxoux
// @match        https://www.webnovel.com/book/*/*
// @match        https://*boxnovel.com/novel/*/*
// @match        http://readfreenovel.com/*/*
//
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/vue/dist/vue.js
// @require      https://unpkg.com/uuid@latest/dist/umd/uuidv4.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.15/lodash.core.js
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

// Temporary holded library for future use (maybe)
// @require      https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.8.1/spectrum.min.js
// @resource     spec https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.8.1/spectrum.min.css


// Function to determine what website is currently on, used to determine novel id and name, css tweak, etc...
function get_website() {
    return window.location.host.split('.').reverse()[1];
}

// Function who select and apply object depending of which website we are, similar to Platform.select in react-native
function select(obj) {
    if (obj[get_website()])
        return obj[get_website()];
    else if (obj.default)
        return obj.default;
    else
        return null;
}

// Function to fetch the novel id, used to differentiate which characters to load, could be name or id but must be unique
function get_novel_id() {

    var novel_id_getter = {
        webnovel: () => window.location.href.split('/')[4],
        boxnovel: () => window.location.href.split('/')[4],
        readfreenovel: () => window.location.href.split('/')[3]
    }

    return select(novel_id_getter)();
}

// Function to fetch novel name, used to determinate novels when we want to import/export datas
function get_novel_name() {
    var novel_name_getter = {
        webnovel: () => $("header a.dib.ell").prop('title'),
        boxnovel: () => $(".breadcrumb a")[1].innerText,
        readfreenovel: () => $(".black-link")[0].innerText
    }

    return select(novel_name_getter)();
}

// Method to inject the panel in the body, using fixed component in body is the most permissive way, but we can insert it wherever we want
function panel_injector() {
    var body = $('body');

    console.log('body : ', body);
    body.append(panel_html);

}

// Function for names injection, wrap names with div, fetch css in Character class and insert it
function name_injector(onClickFn, character_list) {

	// Coloration of all names (and corresponding aliases)
	character_list.forEach((char) => {
        //console.log('Injecting for : ', char);
		var names = char.getNamesFilter();
        //console.log('Names/aliases : ', names);

		names.forEach((name, i) => {
			var found = $(`p:contains("${name}")`).not(`.edited-${i}-${char.id}`);
			//console.log('search for ', name);
			//console.log('Found %d elements.', found.length || 0, found);

			if (!found || !found.length)
				return ;


			$(found).each(function() {
				//console.log('Computing : ', this);
				var el = $(this).html()
				var modified_html = el.split(name).join(`<span class="injected_${char.id}" style="${char.getStyle()}">${name}</span>`);
				this.innerHTML = modified_html;
			})

			$(found).addClass(`.edited-${i}-${char.id}`);
		})
	})

	// Example for onclick use, must be injected after name injection since div can be modified multiples times during injection (in case of multiple Character in one paragraph)
	character_list.forEach(({id}) => {
		var occurences = $(`.injected_${id}`).click(() => onClickFn(id));
	})

}

// APPLICATION

//Libs
function selectColor_bak(colorNum, colors){
    console.log('generate %d/%d', colors, colorNum);
    if (colors < 1) colors = 1; // defaults to one color - avoid divide by zero
    return "hsl(" + (colorNum * (360 / colors) % 360) + ",100%,50%)";
}

function selectColor(numOfSteps, step) {
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

class Character {
    constructor({first_name, last_name, text, color, alias}) {
		this.id = uuidv4();
        this.first_name = first_name;
        this.last_name = last_name;
        this.text = text || "";
		this.color = color || null;
        this.default_color = null;
		this.alias = [];

		if (alias)
			this.setAliases(alias);
	}

    export() {
        var exported = [
            "first_name",
            "last_name",
            "text",
            "color",
            "alias"
        ]

        var data = {};
        exported.forEach((label) => data[label] = this[label]);

        return data;
    }

	getName() {
		return `${this.first_name} ${this.last_name}`
	}

	getNamesFilter() {
		return [this.getName(), ...this.alias]
	}

	setAliases(alias) {
		if (alias && typeof alias == "string")
			this.alias = alias.split(',');
		else
			this.alias = alias;

        this.alias = this.alias.map((alias) => alias.trim());
	}

    setDefaultColor(color) {
        this.default_color = color;
    }

	// Styling for founded names in novel
	getStyle() {
		var style = {
			"color": this.color || this.default_color,
			"font-weight": "bold",
			"cursor": "pointer",
            "-webkit-text-stroke": "0.3px grey"
		};

		return _.map(style, (value, key) => `${key}:${value}`).join(';');
	}

	onClick() {
		console.log('im : ', this);
        var text = `ID : ${this.id}\nName : ${this.getName()}\nAlias : ${this.alias.length ? this.alias.join(', ') : 'None'}\nDescription: ${this.text}`
        alert(text);
	}
}

const panel_html = `
<div id="reminder_panel" style="position: fixed; right: 70px; bottom: 5vh; height: 80vh; width: 300px; background-color: white; padding: 30px; border-radius: 5px; box-shadow: 0px 0px 20px -8px rgba(0,0,0,0.75);">
	<div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column">
		<div style="display: flex; flex-direction: row; justify-content: space-between">
			<h4>{{mode}}</h4>
			<div class="reminder_button" v-on:click="addCharacter">Add</div>
		</div>
		<div style="overflow-y: auto; flex-grow: 1">
            <div v-if="mode == 'character'">
		    	<div v-for="character in character_list" :key="character.id">
			    	<div @click="editCharacter(character.id)" :style="character.getStyle() + '; font-size: 18px'">{{character.getName()}}</div>

                    <div>{{character.text}}</div>
			    </div>
            </div>
            <div v-if="mode == 'export'">
                <div v-for="(novel, id) in saved_data">
                    <h4 v-if="id != '_info'" @click="editNovel(id)" style="cursor: pointer">{{saved_data._info && saved_data._info.novel_list[id] ? saved_data._info.novel_list[id] : id}}</h4>
                </div>
            </div>
		</div>

		<div style="width: 100%">
			<div v-if="adding" style="display: flex; flex-direction: column">
				<input v-model="edition.first" placeholder="First Name" style="height: 20px; padding: 0; width: calc(50% - 20px); border: 1px black solid" v-model="edition.first"></input>
				<input v-model="edition.last" placeholder="Last Name" style="height: 20px; padding: 0; width: calc(50% - 20px); border: 1px black solid" v-model="edition.last"></input>
				<textarea v-model="edition.text" placeholder="Comment" style="border: 1px black solid" />
				<input v-model="edition.alias" placeholder="Aliases, separated by ','" style="height: 20px; padding: 0; width: 100%; border: 1px black solid" v-model="edition.alias"></input>
				<input v-if="false" type='text' id="custom" />
				<div style="cursor: pointer" class="reminder_button" @click="saveCharacter">Save</div>
				<div style="cursor: pointer" class="reminder_button" @click="deleteCharacter(edition.id)" v-if="edition.id">Delete</div>
				<div style="cursor: pointer" class="reminder_button" @click="disableEdit">Cancel</div>
			</div>
			<div v-if="selected_novel" style="display: flex; flex-direction: column">
				<textarea rows="10" v-model="export_import_data" placeholder="Comment" style="border: 1px black solid" />
				<div style="cursor: pointer" class="reminder_button" @click="save(true, selected_novel, export_import_data); setMode('character')">Save</div>
				<div style="cursor: pointer" class="reminder_button" @click="selected_novel = null">Cancel</div>
			</div>
			<div style="display: flex; flex-direction: row; justify-content: space-between">
				<div style="cursor: pointer" @click="refresh">Refresh</div>
				<div v-if="mode == 'character'" style="cursor: pointer" @click="setMode('export')">export</div>
                <div v-if="mode == 'export'" style="cursor: pointer" @click="setMode('character')">characters</div>
			</div>
		</div>
	</div>
</div>
`

function launch_app() {
    var app = new Vue({
        el: '#reminder_panel',
        data: {
			character_list: [
			],
			edition: {
                id: null,
				first: "",
				last: "",
				text: "",
				color: "",
				alias: ""
			},
			adding: false,
            mode: "character",
            selected_novel: null,
            export_import_data: null
		},
		mounted: function() {
			/*$('#custom').spectrum({
				color: "#f00"
			})
			$('#custom').on('change.spectrum', (color) => this.setColor(color.toHexString()));*/
            this.load();
            this.refresh();
		},
        methods: {
            editNovel: function(id) {
                this.export_import_data = JSON.stringify(this.saved_data[id]);
                this.selected_novel = id;
            },
            setMode: function(mode) {
                this.selected_novel = null;
                this.adding = false;
                this.mode = mode;
            },
            load: function() {
                var novel_id = get_novel_id();
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
					data = [];
				}

                if (!data[novel_id])
                    return ;

				this.character_list = [];
				console.log('datas for novel : ', data[novel_id]);

                data[novel_id].forEach((perso) => {
                    this.character_list.push(new Character(perso))
                });

                this.generateDefaultColors();
            },
            save_bak: function(force_datas) {
                // Disabling all saves
                return

                if (force_datas) {
                    window.localStorage.setItem("reminder_data", force_datas);
                    return ;
                }

				var novel_id = get_novel_id();
                var data = window.localStorage.getItem("reminder_data");

                if (!data || !data.length)
                    data = {};
                else
                    data = JSON.parse(data);

                data[novel_id] = this.character_list;
				window.localStorage.setItem("reminder_data", JSON.stringify(data));
				return data;
			},
            save: function(import_mode, novel_id, forced_data) {
                // If novel_id and forced_data are set, we are in the importation mode.

                var character_data;
                novel_id = novel_id || get_novel_id();

                // Prepare export
                if (!import_mode)
                    character_data = this.character_list.map((char) => char.export());
                else
                    character_data = JSON.parse(forced_data);

                // Get saved datas
                var data = window.localStorage.getItem("reminder_data");

                if (!data || !data.length)
                    data = {};
                else
                    data = JSON.parse(data);

                // Extract metadatas and update it
                var metadata = data._info || {novel_list: {}, version: null};
                // For now we just override version savedata, in case of needed backward compatibility in the future
                metadata.version = 0.5;
                if (!import_mode)
                    metadata.novel_list[novel_id] = get_novel_name();

                data._info = metadata;

                data[novel_id] = character_data;
				window.localStorage.setItem("reminder_data", JSON.stringify(data));
                console.log('saved : ', data)
                this.load();
				return data;
            },
			exportData: function() {
                var datas = window.localStorage.getItem("reminder_data");
				datas = prompt("Datas", datas);
				this.save(datas);
				this.load();
			},
			disableEdit: function() {
				this.edition.first = "";
				this.edition.last = "";
				this.edition.text = "";
				this.edition.alias = "";
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
                this.edition.first = character.first_name;
				this.edition.last = character.last_name;
				this.edition.text = character.text;
				this.edition.alias = character.alias;
				this.edition.id = character.id;
				this.adding = true;
            },
			addCharacter: function() {
				this.adding =  true;
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
				if (!this.edition.first || !this.edition.last)
					return ;

				if (!this.edition.id) {
					var char = new Character({
						first_name: this.edition.first,
						last_name: this.edition.last,
						text: this.edition.text,
						alias: this.edition.alias
					});
					this.character_list.push(char);
				}
				// Saving existing character
				else {
					var character = _.find(this.character_list, {id: this.edition.id});
					character.first_name = this.edition.first;
					character.last_name = this.edition.last;
					character.text = this.edition.text;
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
                var data = lodash.cloneDeep(this.saved_data);
                data._info = null;
                return lodash.values(data);
            }
         }
    })
}

(function() {
	'use strict';
    // Disabled importation for color picker, not sure if it will be practical since using auto-generated colors (and i'm a lazy guy)
	//var cssTxt  = GM_getResourceText("spec");
	//GM_addStyle (cssTxt);

    panel_injector();
	launch_app();

    // TODO : separate css injection depending on the website.

    // move text to left for webnovel
	$('#page').css('margin-left', '0px');

    // avoid text and buttons under the panel for boxnovel
	$('.reading-content').css('margin-right', '300px');
    $('.select-pagination').css('transform', 'translateX(-300px)');
})();
