'use strict';
import * as vscode from 'vscode';

let lastCommandText;
let activeTerminals = {};
const SPEC_TERMINAL_NAME = 'Running Specs';
const ZEUS_TERMINAL_NAME = 'Zeus Start';

vscode.window.onDidCloseTerminal((terminal: vscode.Terminal) => {
    if (activeTerminals[terminal.name]) {
        delete activeTerminals[terminal.name];
    }
});

export function runSpecFile(options: {path?: string; lineNumber?: number; commandText?: string} = {}){
    let editor: vscode.TextEditor = vscode.window.activeTextEditor,
        fileName: string = vscode.workspace.asRelativePath(options.path || editor.document.fileName);

    if (!editor || !isSpecDirectory(fileName) && !isSpec(fileName) && !options.commandText) {
        return;
    }

    let isZeusInit = isZeusActive() && !activeTerminals[ZEUS_TERMINAL_NAME];

    if (isZeusInit) {
        zeusTerminalInit();
    }

    if (isZeusInit) {
        let interval = getZeusStartTimeout();

        if (interval > 0) {
            vscode.window.showInformationMessage('Starting Zeus ...');
        }

        setTimeout(() => {
            executeInTerminal(fileName, options);
        }, interval);
    } else {
        executeInTerminal(fileName, options);
    }
}

export function runLastSpec() {
    if (lastCommandText) {
        runSpecFile({commandText: lastCommandText});
    }
}

function executeInTerminal(fileName, options) {
    let specTerminal: vscode.Terminal = activeTerminals[SPEC_TERMINAL_NAME];

    if (!specTerminal) {
        specTerminal = vscode.window.createTerminal(SPEC_TERMINAL_NAME);
        activeTerminals[SPEC_TERMINAL_NAME] = specTerminal;
    }

    if (shouldClearTerminal()) {
        vscode.commands.executeCommand('workbench.action.terminal.clear');
    }

    specTerminal.show(shouldFreserveFocus());

    let lineNumberText = options.lineNumber ? `:${options.lineNumber}` : '',
        commandText = options.commandText || `${getSpecCommand()} ${fileName}${lineNumberText}`;

    specTerminal.sendText(commandText);

    lastCommandText = commandText;
}

function getSpecCommand() {
    if (customSpecCommand()) {
        return customSpecCommand();
    } else if (isZeusActive()) {
        return 'zeus test';
    } else {
        return 'bundle exec rspec';
    }
}

function shouldFreserveFocus() {
    return !vscode.workspace.getConfiguration("ruby").get('specFocusTerminal');
}

function shouldClearTerminal() {
    return vscode.workspace.getConfiguration("ruby").get('specClearTerminal');
}

function customSpecCommand() {
    return vscode.workspace.getConfiguration("ruby").get('specCommand');
}

function isZeusActive() {
    return vscode.workspace.getConfiguration("ruby").get('specGem') == "zeus";
}

function getZeusStartTimeout() {
    return <number> vscode.workspace.getConfiguration("ruby").get('zeusStartTimeout');
}

function zeusTerminalInit() {
    let zeusTerminal = vscode.window.createTerminal(ZEUS_TERMINAL_NAME)
    activeTerminals[ZEUS_TERMINAL_NAME] = zeusTerminal;
    zeusTerminal.sendText("zeus start");
}

function isSpec(fileName: string) {
    return fileName.indexOf('_spec.rb') > -1;
}

function isSpecDirectory(fileName: string) {
    return fileName.indexOf('spec') > -1 && fileName.indexOf('.rb') == -1
}
