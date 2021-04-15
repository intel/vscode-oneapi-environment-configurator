# Environment and Launch Configurator for Intel oneAPI Toolkits

#### [Repository](https://github.com/intel/vscode-environment-and-launch-configurator) | [Issues](https://github.com/intel/vscode-environment-and-launch-configurator/issues) | [Documentation](https://software.intel.com/content/www/us/en/develop/documentation/using-vs-code-with-intel-oneapi/using-the-environment-and-launch-configurator-extension.html) | [Code Samples](https://github.com/oneapi-src/oneAPI-samples)
***
This extension configures the system environment and settings for Intel oneAPI toolkits and their products.
***

## Use
Before you start, make sure that you have oneAPI BaseKit or other installed.
Note: To use the environment features in Windows, you need to have PowerShell 7 or higher.
For more information, see sections **Intel oneAPI toolkits and components** and **Other extensions for oneAPI**.
- Launch the command palette to access the options:
    * Press `Ctrl+Shift+P` ( or `View -> Command Palette…` ) and type Intel oneAPI.
- Adding and removing oneAPI environments for local and remote cases:
    * Choose the option `Intel oneAPI: Set oneAPI environment`.
    * All tasks, launches, and terminals created after that will contain the oneAPI environment.
    * To delete the oneAPI environment choose the option `Intel oneAPI: Unset oneAPI environment`

- Preparing tasks from make / cmake files:
    * Choose the option `Intel oneAPI: Generate tasks` and follow the prompts to add targets from your make/cmake oneAPI project. If the oneAPI environment is not present it will be automatically added to the current VSCode instance.
    * Now you can run targets from make/cmake in the oneAPI environment via `Terminal -> Run task...`
- Preparing launch configuration for running/debugging oneAPI projects:
    * Choose the option `Intel oneAPI: Generate launch configurations` and follow the prompts. If the oneAPI environment is not present it will be automatically added to the current VSCode instance. 
    * The result is a configuration for debugging and running that uses the gdb-oneapi debugger and is available in the Run tab ( or `Ctrl+Shift+D` ). 

## Intel oneAPI toolkits and components
* General links: 
    - [oneAPI page](https://software.intel.com/en-us/oneapi)
    - [Intel oneAPI Toolkit Samples](https://github.com/oneapi-src/oneAPI-samples).
* To get started with oneAPI development may be useful:
    - [Installing Intel® oneAPI Toolkits via APT](https://software.intel.com/content/www/us/en/develop/articles/installing-intel-oneapi-toolkits-via-apt.html)
    - [Remote Visual Studio Code Development with Intel® oneAPI Toolkits on Linux](https://software.intel.com/content/www/us/en/develop/documentation/remote-vscode-development-on-linux/top.html)
    - [Remote Visual Studio Code Development with oneAPI on Windows Subsystem for Linux](https://software.intel.com/content/www/us/en/develop/documentation/remote-vscode-development-on-wsl/top.html)
    - [Using Visual Studio Code with DevCloud](https://devcloud.intel.com/oneapi/documentation/connect-with-vscode/)

## Other extensions for oneAPI
- [Sample Browser for Intel oneAPI Toolkits](https://marketplace.visualstudio.com/items?itemName=intel-corporation.oneapi-analyzers-launcher)
- [Launcher for Intel oneAPI Analyzers](https://marketplace.visualstudio.com/items?itemName=intel-corporation.oneapi-analyzers-launcher)

## How to use IntelliSense for oneAPI code
 1. Make sure that the [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) is already installed.
 2. Press `Ctrl+Shift+P` and choose the option `C/C++ Edit Configurations (JSON)`. As a result, a c_cpp_properties.json file will be created in .vscode folder.
 3. Edit the file so that it looks like in the example:
 ```
    {
    "configurations": [
            {
                "name": "Linux",
                "includePath": [
                    "${workspaceFolder}/**",
                    "/opt/intel/oneapi/**"
                ],
                "defines": [],
                "compilerPath": /opt/intel/oneapi/compiler/latest/linux/bin/dpcpp",
                "cStandard": "c17",
                "cppStandard": "c++17",
                "intelliSenseMode": "linux-clang-x64"
            }
        ],
        "version": 4
            }
```
4. If necessary, replace the path to the oneAPI components with the one that is relevant for your installation folder.
5. IntelliSense for oneAPI is ready.

## Contributing 
Install Visual Studio Code (at least version 1.46) and open this project within it.
You may also need `yarn` installed, and of course `node+npm`

```bash
npm install -g yarn
yarn install
code .
```

At this point you should be able to run the extension in the "Extension Development Host"

## License
This extension is released under MIT.

