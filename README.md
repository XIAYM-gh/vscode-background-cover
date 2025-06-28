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
> **This extension works by editing the vscode's Javascript files.**  
> Therefore, a notification will appear after installing or vscode updates. You can click on [never show again] to avoid it.

> **If it repeatedly fails, please restore the file manually.**
>
> - Path: Microsoft VS Code/resources/app/out/vs/workbench/
> - Rename: workbench.desktop.main.js.bak => workbench.desktop.main.js

## Changes

This fork refactored most of the codebase & removed many unnecessary functionalities.

## Installing

You can find existing VSIX from GitHub Releases, or install directly from [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=xiaym-gh.background-cover-simplified).

To build this extension, please:

- Clone the repository
- Run `npm i` inside the cloned folder (or whatever tool you like)
- Run `npx @vscode/vsce@latest package` to package the extension
- Start VSCode, navigate to "Extensions" and click on "Install from VSIX" in the menu
- Select the output VSIX and enjoy

## Uninstalling

Before uninstalling, please disable the background image manually!

## Acknowledgement

[Original Repository](https://github.com/AShujiao/vscode-background-cover)

## Enjoy!

The world is worth fighting for.
