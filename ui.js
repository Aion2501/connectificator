var Ui = function(options, send, gmcp) {
    var exports = {};
    var commLog = []; // list of [type, content]
    var commLogTypesEnabled = options['commLogTypesEnabled'] || {};
    var outS = []; // line-split view of screen, bounded by vertical size
    var inputf = document.getElementById('inputfield');
    var outputf = document.getElementById('output');
    var stuffList = document.getElementById('stuffList');
    var stuffListScroll = document.getElementById('stuffListBox');
    var gear = document.getElementById('gearCheckbox');
    var ansi_up = new AnsiUp;
    winHeight = parseInt(document.defaultView.getComputedStyle(document.body)['height'].replace("px", ""));
    lineHeight = parseInt(document.defaultView.getComputedStyle(outputf, null)['line-height'].replace("px", ""));
    var page = Math.floor(winHeight / lineHeight) + 1;
    var maxlen = page * 10;
    var commandHistory = [];
    var commandHistoryIdx = 0;

    exports.commLogOptions = function() {
        commLog.forEach(function(typeAndContent) {
            if (!(typeAndContent[0] in commLogTypesEnabled))
                commLogTypesEnabled[typeAndContent[0]] = true;
        });

        drawTellHistory();

        var elems = [];
        for (type in commLogTypesEnabled) {
            var div = document.createElement('div');
            var checkbox = document.createElement('input');
            checkbox.id = 'comm-checkbox-' + type;
            var label = document.createElement('label');
            label.appendChild(document.createTextNode(type));
            label.htmlFor = 'comm-checkbox-' + type;
            checkbox.type = 'checkbox';
            checkbox.checked = commLogTypesEnabled[type];
            checkbox.onchange = function(type, checkbox) { return function() {
                commLogTypesEnabled[type] = checkbox.checked;
                drawTellHistory();
            }}(type, checkbox);
            checkbox.style.display = 'inline';
            label.style.display = 'inline';
            div.appendChild(checkbox);
            div.appendChild(label);
            elems.push(div);
        }

        var saveBtn = document.createElement('input');
        saveBtn.type = 'submit';
        saveBtn.value = 'Save';
        saveBtn.onclick = function() {
            options['commLogTypesEnabled'] = commLogTypesEnabled;
            options.save();
            stuffList.innerHTML = "";
            exports.dismissPopup();
        }
        elems.push(saveBtn);
        exports.popup("Comm channels", elems);
    }

    function toCommLog(obj) {
        var msg = ansi_up.ansi_to_html(obj.msg);
        commLog.push([obj.chan, msg]);
        if (!gear.checked && (!(obj.chan in commLogTypesEnabled) || commLogTypesEnabled[obj.chan])) {
            var out = [];
            out.push([[msg]]);
            exports.toMenu(out, true, true);
        }
        stuffListScroll.scrollTop = stuffListScroll.scrollHeight;
    }
    gmcp.handle("comm.channel", toCommLog);

    function drawTellHistory() {
        stuffList.innerHTML = "";
        if (commLog.length == 0)
            return;

        var out = [];
        commLog.forEach(function(typeAndContent) {
            if (commLogTypesEnabled[typeAndContent[0]])
                out.push([[typeAndContent[1]]]);
        });
        exports.toMenu(out, false, true);
        stuffListScroll.scrollTop = stuffListScroll.scrollHeight;
    }

    gear.onchange = function(e) {
        if (gear.checked)
            stuffList.innerHTML = "";
        else
            drawTellHistory();
    }

    exports.blit = function() {
        outputf.innerHTML = outS.join('');
        // Only scroll if the user isn't reading backlog
        if (inputf === document.activeElement)
            output.scrollTop = output.scrollHeight;
    };

    function capOutput() {
        outS = outS.slice(Math.max(0, outS.length - maxlen));
    };

    exports.output = function(mudstr, runTriggers) {
        mudstr = mudstr.replace(/\r/g, "");
        mudstr = ansi_up.ansi_to_html(mudstr);
        var split = mudstr.split(/\n/);
        var line = split.shift();
        outS.push(line);
        if (runTriggers)
            runTriggers(line);
        split.forEach(function(line){
            outS.push('\n' + line);
            if (runTriggers)
                runTriggers(line);
        });
        capOutput();
    };

    exports.macros = {
         96: function() {send("d")},
         97: function() {send("sw")},
         98: function() {send("s")},
         99: function() {send("se")},
        100: function() {send("w")},
        101: function() {send("u")},
        102: function() {send("e")},
        103: function() {send("nw")},
        104: function() {send("n")},
        105: function() {send("ne")},
        107: function() {send("d")},
        109: function() {send("u")}
    }

    inputf.onkeydown = function(e) {
        if (e.key == "Enter") {
            onEnter();
        } else if (e.key == "ArrowUp") {
            onArrowUp();
        } else if (e.key == "ArrowDown") {
            onArrowDown();
        } else if (e.keyCode in exports.macros) {
            exports.macros[e.keyCode]();
        } else { // not handled, pass control to the control
            return;
        }
        e.preventDefault();
    }

    function onEnter() {
        commandHistory.push(inputf.value);
        commandHistoryIdx = 0;
        send(inputf.value);
        if ('clearCommand' in options && options['clearCommand'])
            inputf.value = '';
        else
            inputf.select();
    }

    function onArrowUp() {
        if (window.getSelection().type == 'Caret') { // the user typed a partial command
            for (var i = commandHistory.length; i --> 0;) {
                if (commandHistory[i].substr(0, inputf.value.length) == inputf.value) {
                    commandHistoryIdx = commandHistory.length - i - 1;
                    inputf.value = commandHistory[i];
                    inputf.select();
                    return;
                }
            }
        }
        commandHistoryIdx = Math.min(commandHistoryIdx + 1, commandHistory.length - 1);
        inputf.value = commandHistory[commandHistory.length - commandHistoryIdx - 1];
        inputf.select();
    }

    function onArrowDown() {
        commandHistoryIdx = Math.max(commandHistoryIdx - 1, 0);
        inputf.value = commandHistory[commandHistory.length - commandHistoryIdx - 1];
        inputf.select();
    }

    exports.focusOnInput = function() {
        inputf.focus();
    }

    exports.popup = function(title, elems) {
        var h1 = document.createElement('h1');
        h1.appendChild(document.createTextNode(title));
        var p = document.getElementById('popup');
        p.innerHTML = "";
        p.appendChild(h1);
        elems.forEach(e => p.appendChild(e))
        p.style.display = 'block'
    }

    exports.dismissPopup = function() {
        document.getElementById('popup').style.display = 'none'
    }

    // Takes an array of rows, where a row consists of items: [text, (optional callback)]
    exports.toMenu = function(array, noclear, html) {
        if (!noclear)
            stuffList.innerHTML = ""; // XXX
        var _li_ = document.createElement('li');
        var _div_ = document.createElement('div');

        for (var i in array) {
            var rowIn = array[i];
            var rowOut = _li_.cloneNode(false);
            for (var item in array[i]) {
                var cellOut = _div_.cloneNode(false);
                if (!html)
                    cellOut.appendChild(document.createTextNode(array[i][item][0])); /* escapes any possible HTML */
                else
                    cellOut.innerHTML = array[i][item][0]; /* escapes any possible HTML */
                if (array[i][item].length == 2)
                    cellOut.onclick = array[i][item][1];
                rowOut.appendChild(cellOut);
            }
            stuffList.appendChild(rowOut);
        }
    }

    exports.clearStuff = function() {
        if (gear.checked)
            stuffList.innerHTML = "";
        else
            drawTellHistory();
    }

    inputf.select();
    return exports;
};
