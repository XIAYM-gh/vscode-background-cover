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
	env,
	Uri,
	extensions,
	InputBoxOptions,
	ConfigurationTarget
} from 'vscode';

import { FileDom } from './FileDom';
import { ImgItem } from './ImgItem';
import { getContext } from './Global';
import vsHelp from './VSHelper';
import bleandHelper from './BleandHelper';

export class PickList {
	public static itemList: PickList | undefined;

	// 下拉列表
	private readonly quickPick: QuickPick<ImgItem> | any;

	private _disposables: Disposable[] = [];

	// 当前配置
	private config: WorkspaceConfiguration;

	// 当前配置的背景图路径
	private imgPath: string;

	// 当前配置的背景图透明度
	private opacity: number;

	// 图片类型 1:本地文件，2：https
	private imageFileType: number;

	// 当前配置的背景图尺寸模式
	private sizeModel: string;

	private blur: number;

	private randUpdate: boolean = false;

	// 初始下拉列表
	public static createItemList() {
		const config: WorkspaceConfiguration = workspace.getConfiguration('backgroundCover');
		const list: QuickPick<ImgItem> = window.createQuickPick<ImgItem>();
		list.placeholder = 'What is your command? / 君欲何为？';
		list.totalSteps = 2;
		const items: ImgItem[] = [
			{
				label: '$(file-media) Select an Image',
				description: '选择一张背景图',
				imageType: 1
			},
			{
				label: '$(file-directory) Add a Directory',
				description: '添加图片目录',
				imageType: 2
			},
			{
				label: '$(settings) Set Background Opacity',
				description: '透明度',
				imageType: 5
			},
			{
				label: '$(settings) Set Background Blur Strength',
				description: '模糊度',
				imageType: 18
			},
			{
				label: '$(layout) Image Size Adaptive Mode',
				description: '尺寸适应模式',
				imageType: 15
			},
			{
				label: '$(pencil) From Image URL',
				description: '输入图片路径 (Local Path / HTTPS)',
				imageType: 6
			},
			{
				label: '$(eye-closed) Disable Background Image',
				description: '关闭背景图',
				imageType: 7
			}
		];

		if (config.autoStatus) {
			items.push({
				label: '$(sync) Disable Start-up Replacement',
				description: '关闭启动自动更换',
				imageType: 10
			});
		} else {
			items.push({
				label: '$(sync) Enable Start-up Replacement',
				description: '开启启动自动更换',
				imageType: 11
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
				if (value === 'YES') {
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
		if (!config.randomImageFolder || !config.autoStatus) {
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
		if (!config.randomImageFolder) {
			window.showWarningMessage('Please add a directory first! / 请先添加一个目录！');
			return false;
		}

		PickList.itemList = new PickList(config);
		PickList.itemList.setRandUpdate(true);
		PickList.itemList.autoUpdateBackground();
		PickList.itemList = undefined;
		//return commands.executeCommand( 'workbench.action.reloadWindow' );
	}

	// 列表构造方法
	private constructor(config: WorkspaceConfiguration, pickList?: QuickPick<ImgItem>) {
		this.config = config;
		this.imgPath = config.imagePath;
		this.opacity = config.opacity;
		this.sizeModel = config.sizeModel || 'cover';
		this.imageFileType = 0;
		this.blur = config.blur;

		if (pickList) {
			this.quickPick = pickList;
			this.quickPick.onDidAccept((e: any) =>
				this.listChange(this.quickPick.selectedItems[0].imageType, this.quickPick.selectedItems[0].path)
			);

			this.quickPick.onDidHide(
				() => {
					this.dispose();
				},
				null,
				this._disposables
			);

			this.quickPick.show();
		}
	}

	// 列表点击事件分配
	private listChange(type: number, path?: string) {
		switch (type) {
			case 1:
				this.imgList(); // 展示图片列表
				break;
			case 2:
				this.openFieldDialog(2); // 弹出选择文件夹对话框
				break;
			case 3:
				this.openFieldDialog(1); // 弹出选择图片文件对话框
				break;
			case 4:
				this.updateBackgound(path); // 选择列表内图片，更新背景css
				break;
			case 5:
				this.showInputBox(2); // 更改透明度
				break;
			case 6:
				this.showInputBox(1); // 输入图片路径更新背景
				break;
			case 7:
				this.updateDom(true); // 关闭背景图片展示
				break;
			case 8:
				commands.executeCommand('workbench.action.reloadWindow'); // 重新加载窗口，使设置生效
				break;
			case 9:
				this.quickPick.hide(); // 隐藏设置弹窗
				break;
			case 10:
				this.setConfigValue('autoStatus', false, false);
				this.quickPick.hide();

				vsHelp.showInfo('Successfully disabled start-up replacement / 成功禁用自动切换背景图');
				break;
			case 11:
				if (!this.config.randomImageFolder) {
					window.showWarningMessage('Please add a directory first! / 请添加目录后再来开启！');
				} else {
					this.setConfigValue('autoStatus', true, false);
				}

				this.quickPick.hide();
				vsHelp.showInfo('Successfully enabled start-up replacement / 成功启用自动切换背景图');
				break;
			case 13:
				this.gotoPath(path);
				break;
			case 14:
				PickList.gotoFilePath(path);
				break;
			case 15:
				this.sizeModelView();
				break;
			case 16:
				this.setSizeModel(path);
				break;
			case 18:
				this.showInputBox(3); // 修改模糊度
				break;
		}
	}

	private gotoPath(path?: string) {
		if (path == undefined) {
			return window.showWarningMessage('gotoPath(path?): Invalid argument provided');
		}

		env.openExternal(Uri.parse(path));
	}

	public static gotoFilePath(path?: string) {
		if (path == undefined) {
			return window.showWarningMessage('gotoFilePath(path?): Invalid argument provided');
		}

		const tmpUri: string = path;
		const extPath = extensions.getExtension('xiaym-gh.background-cover')?.extensionPath;
		const tmpPath = 'file:///' + extPath + tmpUri;

		commands.executeCommand('vscode.openFolder', Uri.parse(tmpPath));
	}

	private sizeModelView() {
		const items: ImgItem[] = [
			{
				label: '$(diff-ignored) Fill (default)',
				description: '填充(默认) ' + (this.sizeModel == 'cover' ? '$(check)' : ''),
				imageType: 16,
				path: 'cover'
			},
			{
				label: '$(layout-menubar) Repeat',
				description: '平铺' + (this.sizeModel == 'repeat' ? '$(check)' : ''),
				imageType: 16,
				path: 'repeat'
			},
			{
				label: '$(diff-added) Contain',
				description: '拉伸' + (this.sizeModel == 'contain' ? '$(check)' : ''),
				imageType: 16,
				path: 'contain'
			},
			{
				label: '$(diff-modified) Noop (center)',
				description: '无适应(居中)' + (this.sizeModel == 'not_center' ? '$(check)' : ''),
				imageType: 16,
				path: 'not_center'
			},
			{
				label: '$(layout) Noop (bottom right)',
				description: '无适应(右下角)' + (this.sizeModel == 'not_right_bottom' ? '$(check)' : ''),
				imageType: 16,
				path: 'not_right_bottom'
			},
			{
				label: '$(layout) Noop (top right)',
				description: '无适应(右上角)' + (this.sizeModel == 'not_right_top' ? '$(check)' : ''),
				imageType: 16,
				path: 'not_right_top'
			},
			{
				label: '$(layout) Noop (left)',
				description: '无适应(靠左)' + (this.sizeModel == 'not_left' ? '$(check)' : ''),
				imageType: 16,
				path: 'not_left'
			},
			{
				label: '$(layout) Noop (right)',
				description: '无适应(靠右)' + (this.sizeModel == 'not_right' ? '$(check)' : ''),
				imageType: 16,
				path: 'not_right'
			},
			{
				label: '$(layout) Noop (top)',
				description: '无适应(靠上)' + (this.sizeModel == 'not_top' ? '$(check)' : ''),
				imageType: 16,
				path: 'not_top'
			},
			{
				label: '$(layout) Noop (bottom)',
				description: '无适应(靠下)' + (this.sizeModel == 'not_bottom' ? '$(check)' : ''),
				imageType: 16,
				path: 'not_bottom'
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
	 * 启动时自动更新背景
	 */
	private autoUpdateBackground() {
		if (this.checkFolder(this.config.randomImageFolder)) {
			// 获取目录下的所有图片
			const files: string[] = this.getFolderImgList(this.config.randomImageFolder);

			// 是否存在图片
			if (files.length > 0) {
				// 获取一个随机路径存入数组中
				const randomFile = files[Math.floor(Math.random() * files.length)];
				const file = path.join(this.config.randomImageFolder, randomFile);
				this.listChange(4, file);
			}
		}

		return true;
	}

	// 根据图片目录展示图片列表
	private imgList(folderPath?: string) {
		const items: ImgItem[] = [
			{
				label: '$(diff-added) Manual selection from Disk',
				description: '从本地手动选取一张背景图',
				imageType: 3
			}
		];

		const randomPath: any = folderPath ? folderPath : this.config.randomImageFolder;
		if (this.checkFolder(randomPath)) {
			// 获取目录下的所有图片
			const files: string[] = this.getFolderImgList(randomPath);

			// 是否存在图片
			if (files.length > 0) {
				// 获取一个随机路径存入数组中
				const randomFile = files[Math.floor(Math.random() * files.length)];
				items.push({
					label: '$(light-bulb) Random selection',
					description: '随机自动选择 (Ctrl + Shift + F7)',
					imageType: 4,
					path: path.join(randomPath, randomFile)
				});
				items.push({
					label: '',
					description: '',
					imageType: 0,
					kind: QuickPickItemKind.Separator
				});
				items.push(...files.map(e => new ImgItem('$(tag) ' + e, e, 4, path.join(randomPath, e))));
			}
		}

		this.quickPick.items = items;
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
		if (!folderPath) {
			return false;
		}

		// 判断路径是否存在
		if (!fs.existsSync(path.resolve(folderPath))) {
			return false;
		}

		// 判断是否为目录路径
		if (!fs.statSync(folderPath).isDirectory()) {
			return false;
		}

		return true;
	}

	// 创建一个输入框
	private showInputBox(type: number) {
		if (type <= 0 || type > 10) {
			return false;
		}

		const placeStringArr: string[] = [
			'',
			'Please enter the image path, supporting local path and HTTPS',
			'Opacity: 0.00 - 1, current: ' + this.opacity,
			'Image blur strength: 0 - 100, current: ' + this.blur,
			'',
			'',
			'',
			'',
			'',
			''
		];

		const promptStringArr: string[] = [
			'',
			'请输入图片路径，支持本地路径和 HTTPS',
			'图片不透明度：0 - 0.8, 当前值：' + this.opacity,
			'图片模糊度：0 - 100, 当前值：' + this.blur,
			'',
			'',
			'',
			'',
			'',
			''
		];

		const placeString = placeStringArr[type];
		const promptString = promptStringArr[type];

		const option: InputBoxOptions = {
			ignoreFocusOut: true,
			password: false,
			placeHolder: placeString,
			prompt: promptString
		};

		window.showInputBox(option).then(value => {
			// 未输入值返回 undefined
			if (!value) {
				return;
			}

			if (type === 1) {
				// 判断是否存在
				if (!fs.existsSync(path.resolve(value)) && value.substring(0, 8).toLowerCase() !== 'https://') {
					window.showWarningMessage('Permission denied or file not found! / 无权限访问或文件不存在！');
					return false;
				}
			} else if (type == 2) {
				const opacity = parseFloat(value);
				if (opacity < 0 || opacity > 0.8 || isNaN(opacity)) {
					window.showWarningMessage('The opacity value must be between 0 and 0.8!');
					return false;
				}
			} else if (type == 3) {
				const blurStrength = parseFloat(value);
				if (blurStrength < 0 || blurStrength > 100 || isNaN(blurStrength)) {
					window.showWarningMessage('The blur strength value must be between 0 and 100!');
					return false;
				}
			}

			// set配置
			const keyArr = ['', 'imagePath', 'opacity', 'blur', '', '', '', '', '', ''];
			const setKey = keyArr[type];

			this.setConfigValue(setKey, type === 1 ? value : parseFloat(value), true);
		});
	}

	private setSizeModel(value?: string) {
		if (!value) {
			return vsHelp.showInfo('No parameter value was obtained / 未获取到参数值');
		}

		this.setConfigValue('sizeModel', value, true);
	}

	public setImageFileType(value: number) {
		this.imageFileType = value;
	}

	// 更新配置
	public updateBackgound(path?: string) {
		if (!path) {
			return vsHelp.showInfo('Invalid image path provided / 未获取到图片路径');
		}

		this.setConfigValue('imagePath', path);
	}

	// 文件、目录选择
	private async openFieldDialog(type: number) {
		const filters = type === 1 ? { Images: ['png', 'jpg', 'gif', 'jpeg', 'jfif', 'webp', 'bmp'] } : undefined;
		const folderUris = await window.showOpenDialog({
			canSelectFiles: type === 1,
			canSelectFolders: type === 2,
			canSelectMany: false,
			openLabel: 'Select folder',
			filters: filters
		});

		if (!folderUris) {
			return false;
		}

		const { fsPath } = folderUris[0];
		if (type === 2) {
			this.setConfigValue('randomImageFolder', fsPath, false);
			return this.imgList(fsPath);
		}

		if (type === 1) {
			return this.setConfigValue('imagePath', fsPath);
		}

		return false;
	}

	// 更新配置
	private setConfigValue(name: string, value: any, updateDom: Boolean = true) {
		// 更新变量
		this.config.update(name, value, ConfigurationTarget.Global);

		switch (name) {
			case 'opacity':
				this.opacity = value;
				break;
			case 'imagePath':
				this.imgPath = value;
				break;
			case 'sizeModel':
				this.sizeModel = value;
				break;
			case 'blur':
				this.blur = value;
				break;
			default:
				break;
		}

		// 是否需要更新Dom
		if (updateDom) {
			this.updateDom();
		}

		return true;
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
		const dom = new FileDom(this.config, this.imgPath, this.opacity, this.sizeModel, this.blur, colorThemeKind);
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
							imageType: 8
						},
						{ label: '$(x) NO, LATER', description: '稍后手动重启', imageType: 9 }
					];
					this.quickPick.ignoreFocusOut = true;
					this.quickPick.show();
				} else {
					// 通过在线图库更新提示弹窗
					if (this.imageFileType === 2) {
						// 弹出提示框确认是否重启
						const value = await window.showInformationMessage(`"${this.imgPath}" | Reloading takes effect? / 重新加载生效？`, 'YES', 'NO');
						if (value === 'YES') {
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
