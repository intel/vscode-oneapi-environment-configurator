# Environment Configurator for Intel® oneAPI Toolkits

#### [Repository](https://github.com/intel/vscode-environment-and-launch-configurator) | [Issues](https://github.com/intel/vscode-environment-and-launch-configurator/issues) | [Documentation](https://software.intel.com/content/www/us/en/develop/documentation/using-vs-code-with-intel-oneapi/using-the-environment-and-launch-configurator-extension.html) | [Code Samples](https://github.com/oneapi-src/oneAPI-samples)
***
This extension configures the system environment and settings for Intel® oneAPI toolkits and their products.
***

## Set oneAPI Environment
1.	Press `Ctrl+Shift+P ( or View -> Command Palette... )` to open the Command Palette.
2.	Type **Intel oneAPI** to view options of the installed extensions.
3.	Click on `Intel oneAPI: Initialize default environment variables`.
4.  If Visual Studio Code* asks for a location, locate your setvars script:
    Linux: the script is located in ``<install dir>/intel/oneapi``. The default installation location is ``/opt/intel/oneapi``.
    Windows: the script is located in ``<install dir>\Intel\oneAPI\``. The default installation location is ``C:\Program Files (x86)\Intel\oneAPI``
5.	In the case of multiple folders in workspace, select the appropriate one. All tasks, launches, and terminals created from VS Code will now contain the oneAPI environment.
6.	In cases where multiple environments are required repeat the previous steps by selecting a different working folder in workspace.
7.	To switch the environment click on `Intel oneAPI: Switch environment` select the folder that the environment is associated with.
8.	To delete the oneAPI environment, open the Command Pallette and select `Intel oneAPI: Clear environment variables`

* The current environment applies to all tasks, launch and new terminals, regardless of which folder it was originally associated with.
* Previously created terminals always contain only the environment in which they were created, regardless of the current.


You can limit the initialization of the environment to a specific set of oneAPI components, and also initialize the environment for a specific version of the component. For this you need to add key-value "SETVARS_CONFIG": "full/path/to/your/config.txt" to the settings.json file:
```json
{
    "SETVARS_CONFIG": "full/path/to/your/config.txt"
}
```
Then open the Command Pallette and select `Intel oneAPI: Initialize custom environment variables`

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

