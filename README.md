# Environment and Launch Configurator for Intel® oneAPI Toolkits

#### [Repository](https://github.com/intel/vscode-environment-and-launch-configurator) | [Issues](https://github.com/intel/vscode-environment-and-launch-configurator/issues) | [Documentation](https://software.intel.com/content/www/us/en/develop/documentation/using-vs-code-with-intel-oneapi/using-the-environment-and-launch-configurator-extension.html) | [Code Samples](https://github.com/oneapi-src/oneAPI-samples)
***
The Environment and Launch Configuration for Intel® oneAPI Toolkits Extension is a lightweight extension that provides control of the oneAPI development environment and makes it easier to configure oneAPI projects for build, run, and debug in Visual Studio Code* (VS Code).
***

## Use
Before you begin, make sure that you have an Intel oneAPI toolkit installed.

Note: To use the environment features in Windows*, you need to have PowerShell 7 or higher.
For more information, see sections **Intel oneAPI toolkits and components** and **Other extensions for oneAPI**.

To install the extension:
1.	Open the Extension Marketplace in VS Code and search for oneAPI.
2.	Install the extension titled **Environment and Launch Configurator for Intel oneAPI Toolkits**.

## Set oneAPI Environment
1.	Press `Ctrl+Shift+P ( or View -> Command Palette… )` to open the Command Palette.
2.	Type **Intel oneAPI** to view options of the installed extensions.
3.	Click on `Intel oneAPI: Set oneAPI environment`. All tasks, launches, and terminals created from VS Code will now contain the oneAPI environment.

    * To delete the oneAPI environment, open the Command Pallette and select `Intel oneAPI: Unset oneAPI environment`

## Preparing Tasks from Make / CMake Files
1.	Using the VS Code explorer, click `File>Open Folder`.
2.	Navigate to the folder where your project is located and click `OK`.
3.	Press `Ctrl+Shift+P ( or View -> Command Palette… )` to open the Command Palette.
4.	Type **Intel oneAPI** and select `Intel oneAPI: Generate tasks`.
5.	Follow the prompts to add targets from your make/cmake oneAPI project.
6.	Run the target by selecting `Terminal > Run task...`
7.	Select the task to run.

## Prepare Launch Configuration
This extension enables the ability to prepare launch configurations for running and debugging projects created using Intel oneAPI toolkits:
1. Using the VS Code explorer, click `File>Open Folder`.
2. Navigate to the folder where your project is located and click `OK`.
3. Press `Ctrl+Shift+P ( or View -> Command Palette… )` to open the Command Palette.
4. Type **Intel oneAPI** and select `Intel oneAPI: Generate launch configurations`.
5. Follow the prompts to add launch configurations.
6. Using the VS Code Explorer, open the C++ file for your project.
7. The configuration is now available to debug and run using the gdb-oneapi debugger. To debug and run, click on the **Run** icon or press `Ctrl+Shift+D`.


## Intel oneAPI toolkits and components
* General links:
    - [Intel oneAPI Product Information](https://software.intel.com/en-us/oneapi)
    - [Intel oneAPI Toolkit Samples](https://github.com/oneapi-src/oneAPI-samples)
* To get started with oneAPI development:
    - [Installing Intel® oneAPI Toolkits via APT](https://software.intel.com/content/www/us/en/develop/articles/installing-intel-oneapi-toolkits-via-apt.html)
    - [Remote VS Code Development on Linux* or Windows Subsystem for Linux](https://software.intel.com/content/www/us/en/develop/documentation/using-vs-code-with-intel-oneapi/ssh-development-with-visual-studio-code.html)
    - [Remote VS Code Development in a Docker* Container](https://software.intel.com/content/www/us/en/develop/documentation/using-vs-code-with-intel-oneapi/remote-visual-studio-code-development-in-a-docker-container.html)
    - [Using Visual Studio Code with DevCloud](https://devcloud.intel.com/oneapi/documentation/connect-with-vscode/)

## Other extensions for oneAPI
- [Sample Browser for Intel oneAPI Toolkits](https://marketplace.visualstudio.com/items?itemName=intel-corporation.oneapi-analyzers-launcher)
- [Launcher for Intel oneAPI Analyzers](https://marketplace.visualstudio.com/items?itemName=intel-corporation.oneapi-analyzers-launcher)

## How to use IntelliSense for oneAPI Code
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
You may also need `yarn` installed, and `node+npm`

```bash
npm install -g yarn
yarn install
code .
```

At this point you should be able to run the extension in the "Extension Development Host".

## License
This extension is released under MIT.

*Other names and brands may be claimed as the property of others.
