# Environment Configurator for Intel® oneAPI Toolkits

#### [Repository](https://github.com/intel/vscode-environment-and-launch-configurator) | [Issues](https://github.com/intel/vscode-environment-and-launch-configurator/issues) | [Documentation](https://www.intel.com/content/www/us/en/develop/documentation/using-vs-code-with-intel-oneapi/top/local-host-top/local-host.html#developing-a-visual-studio-code-project_configure-the-oneapi-environment) | [Code Samples](https://github.com/oneapi-src/oneAPI-samples)
***
This extension configures the system environment and settings for Intel® oneAPI toolkits and their products. To learn about more
extensions for oneAPI Toolkits, see [Using Visual Studio Code with Intel® oneAPI toolkits](https://www.intel.com/content/www/us/en/docs/oneapi/user-guide-vs-code).
***

## Set oneAPI Environment

You can initialize your environment with following steps.

1.  Install one of [Intel® oneAPI Toolkits](https://www.intel.com/content/www/us/en/developer/tools/oneapi/toolkits.html#base-kit). Use Intel® oneAPI Base Toolkit as a default.
2.  Open your project in VSCode and press `Ctrl+Shift+P (or View -> Command Palette...)` to open the Command Palette.
2. Type **Intel oneAPI** to view options of the installed extensions.
3. Click on `Intel oneAPI: Initialize default environment variables`.
4. If Visual Studio Code* asks for a location, locate your setvars script. **Linux**: the script is located in `<install dir>/intel/oneapi`. The default installation location is `/opt/intel/oneapi`. **Windows**: the script is located in `<install dir>\Intel\oneAPI\`. The default installation location is `C:\Program Files (x86)\Intel\oneAPI`.

The current environment applies to all tasks, launch and new terminals, regardless of which folder it was originally associated with.

Previously created terminals contain only the environment in which they were created, regardless of the environment applied to a new terminal.

## Specify a Permanent Path to Intel oneAPI Toolkit Installations

You can specify the direct path to the oneAPI install directory in order to avoid searching for the environment every time the environment is initialized.

1. Press `Ctrl+, (or File -> Preferences -> Settings)` to open the Settings.
2. On the left side of the Settings window, select `Extensions>Environment Configurator for Intel® oneAPI Toolkits`.
3. In the "ONEAPI_ROOT" field, specify the path to the installation directory of the oneAPI toolkit.

## Using setvars_config files for oneAPI Environment
You can limit the initialization of the environment to a specific set of oneAPI components, and also initialize the environment for a specific version of the component.

Due to changes in directory layout, 2024.0 version of Intel® oneAPI Toolkits include 2 environment setup scripts - setvars and oneapi-vars. Note that oneapi-vars script **doesn't work with config files**, so you can only use setvars script for this case.

For this you need:
1. Press `Ctrl+, ( or File -> Preferences -> Settings )` to open the Settings.
2. On the left side of the Settings window, select `Extensions>Environment Configurator for Intel® oneAPI Toolkits`.
3. In the `SETVARS_CONFIG` area, click `Add Item` and provide the path to your setvars configuration file.
4. Press `Ctrl+Shift+P` to open the Command Palette. `Type oneAPI` and select `Intel oneAPI: Initialize custom environment variables using SETVARS_CONFIG`.
5. To switch the environment, click `Intel oneAPI: Switch environment` and select the configuration file that the environment is associated with.
6. To delete the oneAPI environment, open the Command Palette and select `Intel oneAPI: Clear environment variables`.

Also the name of the configuration file can be arbitrary, but it will be used as an environment identifier. Using different files with the same name will result in the reinitialization of the current environment and not the creation of a new one.

## Contributing
Install Visual Studio Code (at least version 1.83.1) and open this project within it.
You may also need `node+npm` installed:

```bash
npm i
code .
```

At this point you should be able to run the extension in the "Extension Development Host".

## License
This extension is released under MIT.

