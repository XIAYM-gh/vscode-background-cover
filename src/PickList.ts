import * as fs from 'fs';
import * as path from 'path';
import {
	QuickPick,
	Disposable,
	QuickPickItemKind,
	workspace,
	WorkspaceConfiguration,
	window,
	commands,
	InputBoxOptions,
	ConfigurationTarget
} from 'vscode';

import { FileDom } from './FileDom';
import { ListItem } from './ListItem';
import { getContext } from './Global';
import { FilePickerType, ImageFileType, InputBoxType, OperationType } from './Enums';
import bleandHelper from './BleandHelper';

export class PickList {
	public static itemList: PickList | undefined;

	// 目录列表
	private static imageFolders: string[] = [];

	// 下拉列表
	private readonly quickPick: QuickPick<ListItem> | any;

	private _disposables: Disposable[] = [];

	// 当前配置
	private config: WorkspaceConfiguration;

	// 当前配置的背景图路径
	private imgPath: string;

	// 当前配置的背景图不透明度
	private opacity: number;

	// 图片类型 1:本地文件，2：https
	private imageFileType: ImageFileType;

	// 当前配置的背景图尺寸适配模式
	private sizeMode: string;

	private blurStrength: number;

	private randUpdate: boolean = false;

	// 初始下拉列表
	public static createItemListAndShow() {
		const config: WorkspaceConfiguration = workspace.getConfiguration('backgroundCover');
		this.imageFolders = config.get('randomImageFolders')!;

		const list: QuickPick<ListItem> = window.createQuickPick<ListItem>();
		list.placeholder = 'What is your command? / 君欲何为？';
		list.totalSteps = 2;
		const items: ListItem[] = [
			{
				label: '$(file-media) Select an Image',
				description: '选择一张背景图',
				operation: OperationType.SELECT_IMAGE
			},
			{
				label: '$(file-directory) Manage Images Folders',
				description: '管理图片目录',
				operation: OperationType.MANAGE_FOLDERS
			},
			{
				label: '$(settings) Set Background Opacity',
				description: '不透明度',
				operation: OperationType.SET_OPACITY
			},
			{
				label: '$(settings) Set Background Blur Strength',
				description: '模糊度',
				operation: OperationType.SET_BLUR_STRENGTH
			},
			{
				label: '$(layout) Image Size Adaptive Mode',
				description: '尺寸适应模式',
				operation: OperationType.SET_ADAPTATION_MODE
			},
			{
				label: '$(pencil) From Image URL',
				description: '输入图片路径 (Local Path / HTTPS)',
				operation: OperationType.SET_FROM_URL
			},
			{
				label: '$(eye-closed) Disable Background Image',
				description: '关闭背景图',
				operation: OperationType.DISABLE_IMAGE
			}
		];

		if (config.changeOnStartup) {
			items.push({
				label: '$(sync) Disable Start-up Replacement',
				description: '关闭启动自动更换',
				operation: OperationType.DISABLE_AUTO_REPLACEMENT
			});
		} else {
			items.push({
				label: '$(sync) Enable Start-up Replacement',
				description: '开启启动自动更换',
				operation: OperationType.ENABLE_AUTO_REPLACEMENT
			});
		}

		list.items = items;
		list.title = '背景图设置';

		PickList.itemList = new PickList(config, list);
	}

	/**
	 * 主题变更后自动更新背景
	 */
	public static autoUpdateBlendModel() {
		const config = workspace.getConfiguration('backgroundCover');

		// 是否存在背景图片
		if (config.imagePath == '') {
			return;
		}

		const blendStr = getContext().globalState.get('backgroundCoverBlendModel');
		const nowBlenaStr = bleandHelper.autoBlendModel();
		if (blendStr == nowBlenaStr) {
			return false;
		}

		// 弹出提示框确认是否重启
		window
			.showInformationMessage(
				'The appearance mode has changed, would you like to update the background blending mode? / 主题模式发生变更，是否更新背景混合模式？',
				'YES',
				'NO'
			)
			.then(value => {
				if (value == 'YES') {
					PickList.itemList = new PickList(config);
					PickList.itemList.updateDom(false, nowBlenaStr as string).then(() => {
						commands.executeCommand('workbench.action.reloadWindow');
					});
				}
			});
	}

	/**
	 * 自动更新背景
	 */
	public static autoUpdateBackground() {
		const config = workspace.getConfiguration('backgroundCover');
		if (!PickList.imageFolders.length || !config.changeOnStartup) {
			return false;
		}

		PickList.itemList = new PickList(config);
		PickList.itemList.autoUpdateBackground();
		return (PickList.itemList = undefined);
	}

	/**
	 * 随机更新一张背景
	 */
	public static randomUpdateBackground() {
		const config = workspace.getConfiguration('backgroundCover');
		if (!config.randomImageFolders) {
			window.showWarningMessage('Please set the images directory first! / 请先设置图片目录！');
			return false;
		}

		PickList.itemList = new PickList(config);
		PickList.itemList.setRandUpdate(true);
		PickList.itemList.autoUpdateBackground();
		PickList.itemList = undefined;
		//return commands.executeCommand( 'workbench.action.reloadWindow' );
	}

	// 列表构造方法
	private constructor(config: WorkspaceConfiguration, pickList?: QuickPick<ListItem>) {
		this.config = config;
		this.imgPath = config.imagePath;
		this.opacity = config.opacity;
		this.sizeMode = config.sizeMode || 'cover';
		this.imageFileType = ImageFileType.UNASSIGNED;
		this.blurStrength = config.blurStrength;

		if (pickList) {
			this.quickPick = pickList;
			this.quickPick.onDidAccept(() =>
				this.listChange(this.quickPick.selectedItems[0].operation, this.quickPick.selectedItems[0].attachment)
			);
			this.quickPick.onDidHide(() => this.dispose(), null, this._disposables);

			this.quickPick.show();
		}
	}

	// 列表点击事件分配
	private listChange(type: OperationType, attachment?: any) {
		switch (type) {
			case OperationType.SELECT_IMAGE:
				this.showImgSelectionMenu();
				break;
			case OperationType.MANAGE_FOLDERS:
				this.showFoldersMenu();
				break;
			case OperationType.IMAGE_MANUAL_SELECTION:
				this.selectFileAndUpdate(FilePickerType.FILE);
				break;
			case OperationType.IMAGE_RANDOM_SELECTION:
				this.autoUpdateBackground();
				break;
			case OperationType.HANDLE_SELECT_IMAGE:
				this.updateBackground(attachment);
				break;

			case OperationType.SET_OPACITY:
				this.showInputBox(InputBoxType.SET_OPACITY); // 更改不透明度
				break;
			case OperationType.SET_BLUR_STRENGTH:
				this.showInputBox(InputBoxType.SET_BLUR_STRENGTH); // 修改模糊度
				break;

			case OperationType.SET_FROM_URL:
				this.showInputBox(InputBoxType.IMAGE_FROM_URL); // 输入图片路径更新背景
				break;

			case OperationType.SET_ADAPTATION_MODE:
				this.showSizeAdaptationMenu();
				break;
			case OperationType.HANDLE_ADAPTATION_MODE:
				this.setSizeAdaptationMode(attachment);
				break;

			case OperationType.DISABLE_IMAGE:
				this.updateDom(true); // 关闭背景图片展示
				break;

			case OperationType.DISABLE_AUTO_REPLACEMENT:
				this.setConfigValue('changeOnStartup', false, false);
				this.quickPick.hide();

				window.showInformationMessage('Successfully disabled start-up replacement / 成功禁用自动切换背景图');
				break;
			case OperationType.ENABLE_AUTO_REPLACEMENT:
				if (!this.config.randomImageFolders) {
					window.showWarningMessage('Please add a directory first! / 请添加目录后再来开启！');
				} else {
					this.setConfigValue('changeOnStartup', true, false);
				}

				this.quickPick.hide();
				window.showInformationMessage('Successfully enabled start-up replacement / 成功启用自动切换背景图');
				break;

			case OperationType.FOLDERS_ADD:
				this.selectFileAndUpdate(FilePickerType.FOLDER);
				break;
			case OperationType.FOLDERS_REMOVE:
				const value = PickList.imageFolders.filter(it => it != attachment);
				this.setConfigValue('randomImageFolders', value, false);
				this.showFoldersMenu();
				break;

			case OperationType.RELOAD_YES:
				commands.executeCommand('workbench.action.reloadWindow'); // 重新加载窗口，使设置生效
				break;
			case OperationType.RELOAD_NO:
				this.quickPick.hide(); // 隐藏设置弹窗
				break;
		}
	}

	private showSizeAdaptationMenu() {
		const items: ListItem[] = [
			{
				label: '$(diff-ignored) Fill (default)',
				description: '填充 (默认) ' + (this.sizeMode == 'cover' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'cover'
			},
			{
				label: '$(layout-menubar) Repeat',
				description: '平铺' + (this.sizeMode == 'repeat' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'repeat'
			},
			{
				label: '$(diff-added) Contain',
				description: '拉伸' + (this.sizeMode == 'contain' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'contain'
			},
			{
				label: '$(diff-modified) Noop (center)',
				description: '无适应 (居中)' + (this.sizeMode == 'noop_center' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'noop_center'
			},
			{
				label: '$(layout) Noop (bottom right)',
				description: '无适应 (右下角)' + (this.sizeMode == 'noop_right_bottom' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'noop_right_bottom'
			},
			{
				label: '$(layout) Noop (top right)',
				description: '无适应 (右上角)' + (this.sizeMode == 'noop_right_top' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'noop_right_top'
			},
			{
				label: '$(layout) Noop (left)',
				description: '无适应 (靠左)' + (this.sizeMode == 'noop_left' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'noop_left'
			},
			{
				label: '$(layout) Noop (right)',
				description: '无适应 (靠右)' + (this.sizeMode == 'noop_right' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'noop_right'
			},
			{
				label: '$(layout) Noop (top)',
				description: '无适应 (靠上)' + (this.sizeMode == 'noop_top' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'noop_top'
			},
			{
				label: '$(layout) Noop (bottom)',
				description: '无适应 (靠下)' + (this.sizeMode == 'noop_bottom' ? '$(check)' : ''),
				operation: OperationType.HANDLE_ADAPTATION_MODE,
				attachment: 'noop_bottom'
			}
		];

		this.quickPick.items = items;
		this.quickPick.show();
	}

	// 释放资源
	private dispose() {
		PickList.itemList = undefined;
		// Clean up our resources
		this.quickPick.hide();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	/**
	 * 启动时自动更新背景 / 随机更新背景图
	 */
	private autoUpdateBackground() {
		const files: string[] = [];
		for (let folder of this.config.randomImageFolders) {
			if (!this.checkFolder(folder)) {
				continue;
			}

			files.push(...this.getFolderImgList(folder).map(image => path.join(folder, image)));
		}

		// 是否存在图片
		if (files.length > 0) {
			// 获取一个随机路径存入数组中
			const randomFile = files[Math.floor(Math.random() * files.length)];
			this.listChange(OperationType.HANDLE_SELECT_IMAGE, randomFile);
		}
	}

	// 根据图片目录展示图片列表
	private showImgSelectionMenu() {
		const items: ListItem[] = [
			{
				label: '$(diff-added) Manual selection from Disk',
				description: '从本地手动选取一张背景图',
				operation: OperationType.IMAGE_MANUAL_SELECTION
			},
			{
				label: '$(light-bulb) Random selection',
				description: '随机自动选择 (Ctrl + Shift + F7)',
				operation: OperationType.IMAGE_RANDOM_SELECTION
			},
			{
				label: '',
				description: '',
				operation: OperationType.NOOP,
				kind: QuickPickItemKind.Separator
			}
		];

		const folders: string[] = this.config.randomImageFolders;
		for (let folder of folders) {
			if (!this.checkFolder(folder)) {
				continue;
			}

			// 获取目录下的所有图片
			const files: string[] = this.getFolderImgList(folder);

			// 是否存在图片
			if (files.length > 0) {
				items.push(
					...files.map(it => new ListItem('$(tag) ' + it, path.basename(folder), OperationType.HANDLE_SELECT_IMAGE, path.join(folder, it)))
				);
			}
		}

		this.quickPick.items = items;
		this.quickPick.show();
	}

	// 目录管理
	private showFoldersMenu() {
		const items: ListItem[] = [
			{
				label: '$(file-directory-create) Add a Folder',
				description: '添加目录',
				operation: OperationType.FOLDERS_ADD
			},
			{
				label: '',
				description: '',
				operation: OperationType.NOOP,
				kind: QuickPickItemKind.Separator
			}
		];

		for (let folder of PickList.imageFolders) {
			const result = this.checkFolder(folder);
			items.push({
				label: '$(file-directory) ' + path.basename(folder),
				description: (result ? '' : '[Invalid] ') + path.resolve(folder),
				operation: OperationType.FOLDERS_REMOVE,
				attachment: folder
			});
		}

		this.quickPick.items = items;
		this.quickPick.placeholder = 'Click on a folder to remove / 点击目录以移除';
		this.quickPick.show();
	}

	/**
	 * 获取目录下的所有图片
	 * @param pathUrl
	 */
	private getFolderImgList(pathUrl: string): string[] {
		if (!pathUrl) {
			return [];
		}

		// 获取目录下的所有图片
		const files: string[] = fs.readdirSync(path.resolve(pathUrl)).filter(s => {
			const lower = s.toLowerCase();
			return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.jfif'].some(it => lower.endsWith(it));
		});

		return files;
	}

	// 检查选择的文件及目录是否正确
	private checkFolder(folderPath: string) {
		return folderPath && fs.existsSync(path.resolve(folderPath)) && fs.statSync(folderPath).isDirectory();
	}

	// 创建一个输入框
	private showInputBox(type: InputBoxType) {
		const placeStringArr: string[] = [
			'Please enter the image path, supporting local path and HTTPS',
			'Image CSS Opacity: 0.00 - 1, current: ' + this.opacity,
			'Image blur strength: 0 - 100, current: ' + this.blurStrength
		];

		const promptStringArr: string[] = [
			'请输入图片路径，支持本地路径和 HTTPS',
			'图片不透明度：0 - 0.8, 当前值：' + this.opacity,
			'图片模糊度：0 - 100, 当前值：' + this.blurStrength
		];

		const placeHolder = placeStringArr[type];
		const prompt = promptStringArr[type];
		const option: InputBoxOptions = {
			ignoreFocusOut: true,
			password: false,
			placeHolder,
			prompt
		};

		window.showInputBox(option).then(value => {
			// 未输入值返回 undefined
			if (!value) {
				return;
			}

			if (type == InputBoxType.IMAGE_FROM_URL) {
				// 判断是否存在
				if (!fs.existsSync(path.resolve(value)) && value.substring(0, 8).toLowerCase() !== 'https://') {
					window.showWarningMessage('Permission denied or file not found! / 无权限访问或文件不存在！');
					return false;
				}
			} else if (type == InputBoxType.SET_OPACITY) {
				const opacity = parseFloat(value);
				if (opacity < 0 || opacity > 0.8 || isNaN(opacity)) {
					window.showWarningMessage('The opacity value must be between 0 and 0.8!');
					return false;
				}
			} else if (type == InputBoxType.SET_BLUR_STRENGTH) {
				const blurStrength = parseFloat(value);
				if (blurStrength < 0 || blurStrength > 100 || isNaN(blurStrength)) {
					window.showWarningMessage('The blur strength value must be between 0 and 100!');
					return false;
				}
			}

			// 保存配置
			const keyArr = ['imagePath', 'opacity', 'blurStrength'];
			this.setConfigValue(keyArr[type], type == InputBoxType.IMAGE_FROM_URL ? value : parseFloat(value), true);
		});
	}

	private setSizeAdaptationMode(value?: string) {
		if (!value) {
			return window.showInformationMessage('No parameter value was obtained / 未获取到参数值');
		}

		this.setConfigValue('sizeMode', value, true);
	}

	// 更新配置
	public updateBackground(path?: string) {
		if (!path) {
			return window.showInformationMessage('Invalid image path provided / 未获取到图片路径');
		}

		this.setConfigValue('imagePath', path);
	}

	// 文件、目录选择
	private async selectFileAndUpdate(type: FilePickerType) {
		const filters = type == FilePickerType.FILE ? { Images: ['png', 'jpg', 'gif', 'jpeg', 'jfif', 'webp', 'bmp'] } : undefined;
		const folderUris = await window.showOpenDialog({
			canSelectFiles: type == FilePickerType.FILE,
			canSelectFolders: type == FilePickerType.FOLDER,
			canSelectMany: false,
			openLabel: 'Select',
			filters
		});

		if (!folderUris) {
			return false;
		}

		const { fsPath } = folderUris[0];
		if (type == FilePickerType.FOLDER) {
			const value = [...new Set([fsPath, ...PickList.imageFolders])];
			this.setConfigValue('randomImageFolders', value, false);
			this.showFoldersMenu();
			return;
		}

		return this.setConfigValue('imagePath', fsPath);
	}

	// 更新配置
	private setConfigValue(name: string, value: any, updateDom: Boolean = true): Thenable<void> {
		// 更新变量
		switch (name) {
			case 'opacity':
				this.opacity = value;
				break;
			case 'imagePath':
				this.imgPath = value;
				break;
			case 'sizeMode':
				this.sizeMode = value;
				break;
			case 'blurStrength':
				this.blurStrength = value;
				break;
			case 'randomImageFolders':
				PickList.imageFolders = value;
				break;
		}

		// 是否需要更新Dom
		if (updateDom) {
			this.updateDom();
		}

		return this.config.update(name, value, ConfigurationTarget.Global);
	}

	public setRandUpdate(value: boolean) {
		this.randUpdate = value;
	}

	// 更新、卸载css
	private async updateDom(uninstall: boolean = false, colorThemeKind: string = ''): Promise<void> {
		// 自动修改混合模式
		if (colorThemeKind == '') {
			colorThemeKind = bleandHelper.autoBlendModel();
		}

		getContext().globalState.update('backgroundCoverBlendModel', colorThemeKind);

		// 写入文件
		const dom = new FileDom(this.imgPath, this.opacity, this.sizeMode, this.blurStrength, colorThemeKind);
		let result = false;

		try {
			if (uninstall) {
				this.config.update('imagePath', '', ConfigurationTarget.Global);
				result = await dom.uninstall();
			} else {
				result = await dom.install();
			}

			if (result) {
				if (this.quickPick) {
					this.quickPick.placeholder = 'Apply changes and reload? / 是否重新加载以使配置生效？';
					this.quickPick.items = [
						{
							label: '$(check) YES',
							description: '立即重新加载窗口生效',
							operation: OperationType.RELOAD_YES
						},
						{ label: '$(x) NO, LATER', description: '稍后手动重启', operation: OperationType.RELOAD_NO }
					];

					this.quickPick.ignoreFocusOut = true;
					this.quickPick.show();
				} else {
					if (this.imageFileType == ImageFileType.HTTPS) {
						// 弹出提示框确认是否重启
						const value = await window.showInformationMessage(`"${this.imgPath}" | Reloading takes effect? / 重新加载生效？`, 'YES', 'NO');
						if (value == 'YES') {
							await commands.executeCommand('workbench.action.reloadWindow');
						}
					}

					// 快捷键更新背景
					if (this.randUpdate) {
						await commands.executeCommand('workbench.action.reloadWindow');
					}
				}
			}
		} catch (error: any) {
			await window.showErrorMessage(`Update failed: ${error.message}`);
		}
	}
}
