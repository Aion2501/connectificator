function addGmcpHandlers() {
    /*
    Gmcp.handle("room.info", function() {
        console.log("In room " + Gmcp.gmcp()['room']['info']['num']);
    });
    */
}

function changelog() {
    var changes = [
        "Basic working client",
        "Keypad navigation! Use your numeric keypad, with NumLock \"on\", to walk the world. Plus and Minus go down and up. 5 issues the \"look\" command.",
        "Pathificator now remembers favorite rooms and displays them on the top of the list."
    ]
    var version = changes.length
    var oldVersion = parseInt(window.localStorage.getItem('version')) || 0
    console.assert(version >= oldVersion)
    var changelog = "Changelog:\n"
    for (i = oldVersion; i < version; ++i)
        changelog += "\nv" + (i+1) + ":\n" + changes[i] + '\n'
    if (changelog != "Changelog:\n")
        alert(changelog)
    window.localStorage.setItem('version', version)
}

var triggers = null;

function start() {
    var ui = null;
    function send(text) {
        if (text[0] == ';')
            text = text.slice(1);
        else
            text = text.replace(/;/g, "\n");
        socket.send(text + "\n");
        text.split(/\n/).forEach(function(line) {
            ui.output('⇨' + line + '\n');
        });
        ui.blit();
    }
    var gmcp = Gmcp();
    ui = Ui(send);
    /* var */ triggers = Triggers(send);
    function onMudOutput(str) {
        ui.output(str)
        triggers.run(str)
    }
    var socket = Socket(onMudOutput, ui.blit, gmcp);
    var pathificator = Pathificator(send, gmcp, ui.focusOnInput, ui.toMenu);
    addGmcpHandlers();
    var pInput = document.getElementById('pInput');
    var stuffList = document.getElementById('stuffList');
    pInput.onclick = function() { pInput.select(); };
    pInput.oninput = function() { pathificator.findRoom(pInput, stuffList);};
    changelog();
}
