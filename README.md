# oneAPI Developer Flow Extension README

A lightweight extension to simplify the basic execution steps for oneAPI users.

## Functionality

oneAPI Developer Flow extension supports:
* Native execution of make targets.
* Building and running make/Cmake samples and custom projects.
* Local and remote usage scenarios.
* Debugging via `gdb-oneapi` from oneAPI Base ToolKit.

## Use

* Open a Visual Studio Code project containing Makefile or CMakeLists.txt.
* Press 'Ctrl+Shift+P' (or View -> Command Palette…) to open VS Code's Command Palette.
* ????
* Gonfigure the generated .vscode/launch.json file by specifying the path to executable and the arguments.
* Generate .vscode/tasks.json file by selecting one of the targets defined in the Makefile.
* Run the task using via Terminal -> Run Task…

## Where to find Intel oneAPI toolkits and components.

This extension does not provide any of the tools that may be required to compile/run the sample.

Please visit [oneAPI oficial site](https://software.intel.com/en-us/oneapi) for details.

The set of oneAPI code samples can be found on the [open-sorce Github repo](https://github.com/oneapi-src/oneAPI-samples).

## Contributing 
Install Visual Studio Code (at least version 1.46) and open this project within it.
You may also need `yarn` installed, and of course `node + npm`

```bash
npm install -g yarn
yarn install
code .
```

At this point you should be able to run the extension in the "Extension Development Host"

## License
This extension is released under MIT.

