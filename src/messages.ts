import { QuickPickItem } from 'vscode';

export default {
    installToolkit: 'Install Intel® oneAPI Toolkit',
    continue: 'Continue',
    ignore: 'Ignore',
    defaultEnv: 'Default environment without oneAPI',
    defaultOneAPI: 'Default oneAPI config',
    reload: 'Reload',
    skip: 'Skip',
    completeUninstall: (deprExtName: string) => { return `Completed uninstalling ${deprExtName} extension. Please reload Visual Studio Code.`; },
    uninstallDepr: 'Uninstall deprecated',
    deprVersion: (deprExtName: string, actualExtName: string) => { return `${deprExtName} is a deprecated version of the ${actualExtName}. This may lead to the unavailability of overlapping functions.`; },
    notChangeEnv: 'Do not change the environment.',
    alternateEnv: 'Alternate environment is not available. Open settings and search for SETVARS_CONFIG to specify the path to your custom configuration file.',
    failedToActivate: 'Failed to activate the \'Environment Configurator for Intel Software Developer Tools\' extension. The extension is only supported on Linux and Windows.',
    failedToCheckPwsh: 'Failed to determine powershell version. The environment will not be set.',
    autoEnvScriptSearch: (envScriptName: string) => { return `Try to find ${envScriptName} automatically.`; },
    customConfigFile: 'No setvars_config files are specified in the settings. Open settings and search for SETVARS_CONFIG to specify the path to your custom configuration file.',
    learnConfig: 'Learn more about SETVARS_CONFIG',
    learnConfigLinkWin: 'https://www.intel.com/content/www/us/en/develop/documentation/oneapi-programming-guide/top/oneapi-development-environment-setup/use-the-setvars-script-with-windows/use-a-config-file-for-setvars-bat-on-windows.html',
    learnConfigLinkLinMac: 'https://www.intel.com/content/www/us/en/develop/documentation/oneapi-programming-guide/top/oneapi-development-environment-setup/use-the-setvars-script-with-linux-or-macos/use-a-config-file-for-setvars-sh-on-linux-or-macos.html',
    foundSetvars: (setvarsConfigPath: string) => { return `Environment set using the config file found in ${setvarsConfigPath}.`; },
    envScriptFound: (envScriptToUse: string) => { return `oneAPI environment script was found in the following path: ${envScriptToUse}`; },
    errorEnvScriptPath: (fileExtension: string) => { return `Could not find path to environment script.${fileExtension}. Probably Intel® oneAPI Toolkit is not installed or you can set path to setvars.${fileExtension} manually.`; },
    errorSetvarsPath: (fileExtension: string) => { return `Path to setvars.${fileExtension} is invalid.\n Open settings and search for ONEAPI_ROOT to specify the path to the installation folder, then use the command palette to Initialize environment variables.${fileExtension}.`; },
    errorRunSetVars: (code?: any, signal?: any) => { return `Error: ${code || signal}. Open settings and search for SETVARS and change the value of SETVARS_CONFIG to specify your custom configuration file, or change the value of ONEAPI_ROOT to specify your installation folder.`; },
    errorConfigFile: (tmp: QuickPickItem) => { return `Could not find the ${tmp.label} file on the path ${tmp.description} .  Open settings and search for SETVARS_CONFIG to specify the path to your custom configuration file.`; },
    errorOneApi: (err: Error) => { return `Error: ${err} oneAPI environment not applied. Open settings and search for SETVARS and change the value of SETVARS_CONFIG to specify your custom configuration file, or change the value of ONEAPI_ROOT to specify your installation folder`; },
    errorOneApiInstalled: 'The oneAPI environment has already been initialized outside of the configurator, which may interfere with environment management in Visual Studio Code. Do not initialize the oneAPI product environment before running Visual Studio Code.',
    errorEnvSameName: (activeEnv: string) => { return `The environment of the same name is already exist. ${activeEnv} environment was redefined`; },
    multipleEnvScriptPaths: 'Found multiple paths to oneAPI environment script. Choose which one to use:',
    notApplyConfigFile: 'Do not apply the configuration file.',
    notConfiguredEnvVars: 'Environment variables were not configured, so environment is not set. No further action needed.',
    noEnvScriptByPath: (envScriptName: string) => { return `Could not find ${envScriptName} at the path specified in ONEAPI_ROOT.`; },
    selectConfigFile: 'Please select which configuration file you want to use:',
    selectConfigFileEnv: 'Select the config file to be used to set the environment:',
    skipEnvScriptSearch: (envScriptName: string) => { return `Skip ${envScriptName} search`; },
    settingUp: 'Setting up the oneAPI environment...',
    openSettings: 'Open settings',
    openSettingsToChangeRoot: 'Open settings and change ONEAPI_ROOT to specify the installation folder.',
    toolkitsLink: 'https://www.intel.com/content/www/us/en/developer/tools/oneapi/toolkits.html',
    setPathToEnvScript: 'Set path to environment script manually',
    removedEnv: 'oneAPI environment has been successfully removed.',
    intelOneApiCompiler: 'Intel oneAPI DPC++/C++ Compiler',
    cmakeKitJsonFile: 'cmake-kits.json',
    vscodeDir: '.vscode',
    escapeKey: 'Esc',
    isOneApiEnvSetBeforeExit: 'isOneApiEnvSetBeforeExit',
    zzz: 'end of message list, do not use in application'
};
