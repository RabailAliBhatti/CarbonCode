export const IPC = {
    // Dialog channels (renderer -> main, invoke)
    DIALOG_OPEN_FILE: 'dialog:open-file',
    DIALOG_SAVE_FILE: 'dialog:save-file',
    DIALOG_SHOW_MESSAGE: 'dialog:show-message',
    DIALOG_OPEN_FOLDER: 'dialog:open-folder',

    // File channels (renderer -> main, invoke)
    FILE_READ: 'file:read',
    FILE_READ_DIRECTORY: 'file:read-directory',

    // State channels (renderer -> main, invoke)
    STATE_SET_DIRTY: 'state:set-dirty',

    // Compiler channels (renderer -> main, invoke)
    COMPILER_DETECT: 'compiler:detect',
    COMPILER_BROWSE: 'compiler:browse',
    COMPILER_SET_CUSTOM_PATH: 'compiler:set-custom-path',
    COMPILER_GET_INFO: 'compiler:get-info',
    COMPILER_RUN: 'compiler:run',

    // Java channels (renderer -> main, invoke)
    JAVA_DETECT: 'java:detect',
    JAVA_BROWSE_COMPILER: 'java:browse-compiler',
    JAVA_SET_CUSTOM_PATH: 'java:set-custom-path',

    // Process channels (renderer -> main, invoke)
    PROCESS_START: 'process:start',
    PROCESS_WRITE: 'process:write',
    PROCESS_STOP: 'process:stop',

    // Process event channels (main -> renderer, send)
    PROCESS_STDOUT: 'process:stdout',
    PROCESS_STDERR: 'process:stderr',
    PROCESS_EXIT: 'process:exit',

    // Debugger channels (renderer -> main, invoke)
    DEBUGGER_START: 'debugger:start',
    DEBUGGER_STOP: 'debugger:stop',
    DEBUGGER_STEP_OVER: 'debugger:step-over',
    DEBUGGER_STEP_INTO: 'debugger:step-into',
    DEBUGGER_STEP_OUT: 'debugger:step-out',
    DEBUGGER_CONTINUE: 'debugger:continue',
    DEBUGGER_GET_STATE: 'debugger:get-state',
    DEBUGGER_SET_BREAKPOINT: 'debugger:set-breakpoint',
    DEBUGGER_REMOVE_BREAKPOINT: 'debugger:remove-breakpoint',

    // Debugger event channels (main -> renderer, send)
    DEBUGGER_STATE_CHANGED: 'debugger:state-changed',
    DEBUGGER_STDOUT: 'debugger:stdout',
    DEBUGGER_STDERR: 'debugger:stderr',

    // Menu channels (main -> renderer, send)
    MENU_NEW_FILE: 'menu:new-file',
    MENU_OPEN_FILE: 'menu:open-file',
    MENU_SAVE: 'menu:save',
    MENU_SAVE_AS: 'menu:save-as',
    MENU_CLOSE_FOLDER: 'menu:close-folder',
    MENU_RUN: 'menu:run',
    MENU_STOP: 'menu:stop',
    MENU_TOGGLE_EXPLORER: 'menu:toggle-explorer',
    MENU_DEBUG_START: 'menu:debug-start',
    MENU_DEBUG_STOP: 'menu:debug-stop',
    MENU_DEBUG_STEP_OVER: 'menu:debug-step-over',
    MENU_DEBUG_STEP_INTO: 'menu:debug-step-into',
    MENU_DEBUG_STEP_OUT: 'menu:debug-step-out',
    MENU_DEBUG_CONTINUE: 'menu:debug-continue',
    MENU_DEBUG_TOGGLE_BREAKPOINT: 'menu:debug-toggle-breakpoint',

    // System channels (renderer -> main, invoke)
    GET_AUTHOR_NAME: 'get-author-name',

    // Analytics channels (renderer -> main, invoke)
    ANALYTICS_TRACK: 'analytics:track',
    ANALYTICS_SET_CONSENT: 'analytics:set-consent',
    ANALYTICS_GET_CONSENT: 'analytics:get-consent',
    ANALYTICS_HAS_BEEN_ASKED: 'analytics:has-been-asked',

    // File watch channels (renderer -> main, invoke)
    FILE_WATCH_START: 'file:watch-start',
    FILE_WATCH_STOP: 'file:watch-stop',

    // File watch event channels (main -> renderer, send)
    FILE_CHANGED: 'file:changed',

    // Shell channels (renderer -> main, invoke)
    SHELL_OPEN_EXTERNAL: 'shell:open-external',
} as const
