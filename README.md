# Environment Configurator for Intel(R) oneAPI Toolkits

#### [Repository](https://github.com/intel/vscode-environment-and-launch-configurator) | [Issues](https://github.com/intel/vscode-environment-and-launch-configurator/issues) | [Documentation](https://software.intel.com/content/www/us/en/develop/documentation/using-vs-code-with-intel-oneapi/intel-oneapi-extensions-for-visual-studio-code/environment-configurator-extension.html) | [Code Samples](https://github.com/oneapi-src/oneAPI-samples)
***
This extension configures the system environment and settings for Intel(R) oneAPI toolkits and their products.
***

## Set oneAPI Environment
1.	Press `Ctrl+Shift+P ( or View -> Command Palette... )` to open the Command Palette.
2.	Type **Intel oneAPI** to view options of the installed extensions.
3.	Click on `Intel oneAPI: Initialize default environment variables`.
4.	If Visual Studio Code* asks for a location, locate your setvars script:
    Linux: the script is located in ``<install dir>/intel/oneapi``. The default installation location is ``/opt/intel/oneapi``
    Windows: the script is located in ``<install dir>\Intel\oneAPI\``. The default installation location is ``C:\Program Files (x86)\Intel\oneAPI``.

* The current environment applies to all tasks, launch and new terminals, regardless of which folder it was originally associated with.
* Previously created terminals always contain only the environment in which they were created, regardless of the current.

### Specify a permanent path to oneAPI toolkit

You can specify the direct path to oneAPI install dir in order to avoid searching for the environment every time the environment is initialized.

For this you need:
1.	Press `Ctrl+, ( or File -> Preferences -> Settings )` to open the Settings;
2.  Find `Environment Configurator for Intel oneAPI Toolkits` in `Extensions` tab;
3.  In the "ONEAPI_ROOT" field, specify the path to the installation directory of the oneAPI toolkit.


## Using setvars_config files for oneAPI Environment
You can limit the initialization of the environment to a specific set of oneAPI components, and also initialize the environment for a specific version of the component.

For this you need:
1.	Press `Ctrl+, ( or File -> Preferences -> Settings )` to open the Settings;
2.  Find `Environment Configurator for Intel oneAPI Toolkits` in `Extensions` tab;
3.  Click on `Add Item` in `SETVARS_CONFIG` field and provide path to you setvars config file;
4.  Then open the Command Pallette and select `Intel oneAPI: Initialize custom environment variables using SETVARS_CONFIG`.
5.	To switch the environment click on `Intel oneAPI: Switch environment` select the сonfig that the environment is associated with.
6.	To delete the oneAPI environment, open the Command Pallette and select `Intel oneAPI: Clear environment variables`


* Note that the name of the configuration file can be arbitrary, but it will be used as an environment identifier. Using different files with the same name will result in the reinitialization of the environment and not the creation of a new one

## Contributing 
Install Visual Studio Code (at least version 1.46) and open this project within it.
You may also need `yarn` installed, and of course `node+npm`

```bash
npm install -g yarn
yarn install
code .
```

At this point you should be able to run the extension in the "Extension Development Host".

## License
This extension is released under MIT.

