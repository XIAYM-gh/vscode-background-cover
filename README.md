<h1 align="center">
  <br>
    <img src="https://user-images.githubusercontent.com/14969576/61449520-b55d9900-a987-11e9-9dc9-e81fa416688c.png" alt="logo" width="200">
  <br>
  VS Code - Background Cover (Simplified)
  <br>

  <br>
</h1>

<p align="center">
Add an image you like to cover the entire vscode. Without any annoying features.
</p>

> [!WARNING]
>
> **This extension modifies VS Code's JavaScript files.**  
> As a result, you may see a notification after installation or when VS Code updates. You can click [never show again] to dismiss it.

> **If it repeatedly fails, please restore the file manually.**
>
> - Path: Microsoft VS Code/resources/app/out/vs/workbench/
> - Rename: workbench.desktop.main.js.bak => workbench.desktop.main.js

## Changes

This fork refactors most of the codebase & removes unnecessary features.

We have:

- Simplified the codebase
- Made the language proper & more understandable
- Added support for multiple folders

## Installation

You can download a pre-built VSIX from GitHub Releases, or install directly from the [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=xiaym-gh.background-cover-simplified).

To build the extension yourself:

- Clone this repository
- Run `npm i` in the project directory (or use your preferred package manager)
- Run `npx @vscode/vsce@latest package` to package the extension
- Open VS Code, go to "Extensions", and select "Install from VSIX" from the menu
- Choose the generated VSIX file and enjoy!

## Uninstallation

Before uninstalling, please manually disable the background image.

## Acknowledgement

[Original Repository](https://github.com/AShujiao/vscode-background-cover)

## Enjoy!

The world is worth fighting for.
