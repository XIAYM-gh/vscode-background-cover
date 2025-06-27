<h1 align="center">
  <br>
    <img src="https://user-images.githubusercontent.com/14969576/61449520-b55d9900-a987-11e9-9dc9-e81fa416688c.png" alt="logo" width="200">
  <br>
  VS Code - Background Cover
  <br>

  <br>
</h1>

<p align="center">
Add an image you like to cover the entire vscode.
</p>

> [!WARNING]
>
> **This extension works by editing the vscode's JS files.**  
> Therefore, a notification will appear after installing or vscode updates. You can click on [never show again] to avoid it.

> **If it does not open and does not work after multiple attempts, please restore the file manually**
>
> - path : Microsoft VS Code\resources\app\out\vs\workbench\
> - workbench.desktop.main.js.bak => workbench.desktop.main.js

## Changes

This fork refactored most of the codebase & removed many unnecessary functionalities.

## Installing

This fork is not officailly published.

To use this fork, please:
 - Clone the repository
 - Run `npm i` inside the cloned folder (or whatever tool you like)
 - Run `npx @vscode/vsce@latest package` to package the extension
 - Start VSCode, navigate to "Extensions" and click on "Install from VSIX" in the menu
 - Select the output VSIX and enjoy

## Uninstalling

Is the picture still there after uninstalling the extension?

Then please turn off the extension manually and open vscode again, which will automatically perform the final cleaning operation and restart.

## Acknowledgement

[Original Repository](https://github.com/AShujiao/vscode-background-cover)

**Enjoy!**

The world is worth fighting for.
