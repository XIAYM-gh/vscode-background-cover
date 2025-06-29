/*
 * @Description:
 * @Author: czw
 * @Date: 2023-08-25 10:00:03
 * @FilePath: \vscode-background-cover\src\extension.ts
 */

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, window, ExtensionContext, StatusBarAlignment } from 'vscode';
import { PickList } from './PickList';
import { setContext } from './Global';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
	setContext(context);

	// 创建底部按钮 - 背景图片配置
	const backImgBtn = window.createStatusBarItem(StatusBarAlignment.Right, -999);
	backImgBtn.text = '$(file-media)';
	backImgBtn.command = 'extension.backgroundCover.openMenu';
	backImgBtn.tooltip = 'Switch background image / 切换背景图';
	PickList.autoUpdateBackground();
	backImgBtn.show();

	context.subscriptions.push(
		commands.registerCommand('extension.backgroundCover.openMenu', () => {
			PickList.createItemListAndShow();
		})
	);

	context.subscriptions.push(
		commands.registerCommand('extension.backgroundCover.refresh', () => {
			PickList.randomUpdateBackground();
		})
	);

	// 监听主题变化
	window.onDidChangeActiveColorTheme(() => {
		PickList.autoUpdateBlendModel();
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
