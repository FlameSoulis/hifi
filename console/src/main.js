'use strict'

var electron = require('electron');
var app = electron.app;  // Module to control application life.
var Menu = require('menu');
var Tray = require('tray');
var shell = require('shell');
var os = require('os');
var childProcess = require('child_process');
var path = require('path');

var hfprocess = require('./modules/hf-process.js');
var Process = hfprocess.Process;
var ProcessGroup = hfprocess.ProcessGroup;

const ipcMain = electron.ipcMain;

var tray = null;

var path = require('path');
var TRAY_ICON = path.join(__dirname, '../resources/console-tray.png');

var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
    // Someone tried to run a second instance, focus the window (if there is one)
    return true;
});

if (shouldQuit) {
    app.quit();
    return;
}

// Check command line arguments to see how to find binaries
var argv = require('yargs').argv;
var pathFinder = require('./modules/path-finder.js');

var interfacePath = null;
var dsPath = null;
var acPath = null;

var debug = argv.debug;

if (argv.localDebugBuilds || argv.localReleaseBuilds) {
    interfacePath = pathFinder.discoveredPath("Interface", argv.localReleaseBuilds);
    dsPath = pathFinder.discoveredPath("domain-server", argv.localReleaseBuilds);
    acPath = pathFinder.discoveredPath("assignment-client", argv.localReleaseBuilds);
}

function openFileBrowser(path) {
    var type = os.type();
    if (type == "Windows_NT") {
        childProcess.exec('start ' + path);
    } else if (type == "Darwin") {
        childProcess.exec('open ' + path);
    } else if (type == "Linux") {
        childProcess.exec('xdg-open ' + path);
    }
}

// if at this point any of the paths are null, we're missing something we wanted to find
// TODO: show an error for the binaries that couldn't be found

function startInterface(url) {
    var argArray = [];

    // check if we have a url parameter to include
    if (url) {
        argArray = ["--url", url];
    }

    // create a new Interface instance - Interface makes sure only one is running at a time
    var pInterface = new Process('interface', interfacePath, argArray);
    pInterface.start();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
    // hide the dock icon
    app.dock.hide()

    // Create tray icon
    tray = new Tray(TRAY_ICON);
    tray.setToolTip('High Fidelity');

    var contextMenu = Menu.buildFromTemplate([
        {
            label: 'Go Home',
            click: function() { startInterface('hifi://localhost'); }
        },
        {
            type: 'separator'
        },
        {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: function() { app.quit(); }
        }
    ]);

    tray.setContextMenu(contextMenu);

    var logPath = path.join(app.getAppPath(), 'logs');

    if (interfacePath && dsPath && acPath) {
        var homeServer = new ProcessGroup('home', [
            new Process('domain-server', dsPath),
            new Process('ac-monitor', acPath, ['-n6', '--log-directory', logPath])
        ]);

        // make sure we stop child processes on app quit
        app.on('quit', function(){
            homeServer.stop();
        });

        var processes = {
            home: homeServer
        };

        // handle process updates
        // homeServer.on('process-update', sendProcessUpdate);
        // homeServer.on('state-update', sendProcessGroupUpdate);

        // start the home server
        homeServer.start();

        ipcMain.on('start-interface', function(event, arg) {

        });

        ipcMain.on('restart-server', function(event, arg) {
            homeServer.restart();
        });

        ipcMain.on('stop-server', function(event, arg) {
            homeServer.stop();
        });

        ipcMain.on('open-logs', function(event, arg) {
            openFileBrowser(logPath);
        });

        ipcMain.on('update-all-processes', function(event, arg) {
            // // enumerate our processes and call sendProcessUpdate to update
            // // the window with their status
            // for (let process of homeServer.processes) {
            //     sendProcessUpdate(process);
            // }
            //
            // sendProcessGroupUpdate(homeServer);
        });
    }
});
