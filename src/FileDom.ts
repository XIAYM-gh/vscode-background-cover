import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as lockfile from 'lockfile';
import * as fse from 'fs-extra';
import * as sudo from 'sudo-prompt';
import { env, Uri, window, WorkspaceConfiguration } from 'vscode';
import { getContext } from './Global';

const jsName: string = 'workbench.desktop.main.js';
const cssName: string = 'workbench.desktop.main.css';
const bakName: string = 'workbench.desktop.main.js.bak';
const jsFilePath = path.join(env.appRoot, 'out', 'vs', 'workbench', jsName);
const cssFilePath = path.join(env.appRoot, 'out', 'vs', 'workbench', cssName);
const bakFilePath = path.join(env.appRoot, 'out', 'vs', 'workbench', bakName);

enum SystemType {
	WINDOWS = 'Windows_NT',
	MACOS = 'Darwin',
	LINUX = 'Linux'
}

function sudoExec(command: string, options: any = { name: 'backgroundCover' }): Promise<string> {
	return new Promise((resolve, reject) => {
		sudo.exec(command, options, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else if (stderr) {
				reject(new Error(stderr ? stderr.toString() : ''));
			} else {
				resolve(stdout ? stdout.toString() : '');
			}
		});
	});
}

export class FileDom {
	private readonly filePath: string;
	private readonly extName = 'backgroundCover';
	private readonly imageOpacity: number;
	private readonly sizeModel: string;
	private readonly blur: number;
	private readonly blendModel: string;
	private readonly systemType: string;
	private imagePath: string;
	private upCssContent: string = '';
	private bakStatus: boolean = false;
	private bakJsContent: string = '';
	private workConfig: WorkspaceConfiguration;

	constructor(
		workConfig: WorkspaceConfiguration,
		imagePath: string,
		opacity: number,
		sizeModel: string = 'cover',
		blur: number = 0,
		blendModel: string = ''
	) {
		this.workConfig = workConfig;
		this.blendModel = blendModel || this.workConfig.get('blendModel', '');
		this.filePath = jsFilePath;
		this.imagePath = imagePath;
		this.imageOpacity = Math.min(opacity, 0.8);
		this.sizeModel = sizeModel || 'cover';
		this.blur = blur;
		this.blendModel = blendModel;
		this.systemType = os.type();

		this.initializeImage();
	}

	private async initializeImage(): Promise<void> {
		if (!this.imagePath.toLowerCase().startsWith('https://')) {
			if (this.systemType == SystemType.MACOS) {
				await this.imageToBase64();
			} else {
				this.localImgToVsc();
			}
		}
	}

	public async install(): Promise<boolean> {
		// 文件是否存在
		const isExist = await fse.pathExists(this.filePath);
		if (!isExist) {
			await window.showErrorMessage(
				`background-cover 不支持您的 VSCode 版本，请报告此问题 / background-cover is incompatible with your version of VSCode, please report this issue.`
			);

			return false;
		}

		// 获取全局变量是否已经清除
		const vsContext = getContext();
		const clearCssNum = Number(vsContext.globalState.get('ext_backgroundCover_clear_v2')) || 0;
		// 尝试5次清除旧版css文件
		if (clearCssNum <= 5) {
			// 验证旧版css文件是否需要清除
			const cssContent = this.getContent(cssFilePath);

			if (this.isPatched(cssContent)) {
				// 清除旧版css文件
				this.upCssContent = this.clearCssContent(cssContent);
			} else {
				// 不存在旧版css文件，设置全局变量
				vsContext.globalState.update('ext_backgroundCover_clear_v2', clearCssNum + 1);
			}
		}

		// 备份文件是否存在
		const bakExist = await fse.pathExists(bakFilePath);
		if (!bakExist) {
			this.bakStatus = true;
			// 触发备份提醒用户稍等片刻
			window.showInformationMessage(
				`首次使用，正在获取权限并备份文件，请稍后... / Getting permission and backing up files, please wait...`
			);
		}

		const lockPath = os.tmpdir() + '/vscode-background.lock';

		try {
			// 加锁
			await new Promise((resolve, reject) => {
				lockfile.lock(lockPath, { retries: 10, retryWait: 100 }, err => {
					if (err) {
						reject(err);
						return;
					}

					resolve(null);
				});
			});

			const content = this.getJs().trim();
			if (!content) {
				return false;
			}

			const bakContent = this.clearCssContent(this.getContent(this.filePath));
			if (this.bakStatus) {
				this.bakJsContent = bakContent;
			}

			const newContent = bakContent + content;
			return await this.saveContent(newContent);
		} catch (error: any) {
			await window.showErrorMessage(`Installation failed: ${error.message}`);

			return false;
		} finally {
			// 解锁
			lockfile.unlock(lockPath, err => {
				if (err) {
					console.error(`Failed to unlock ${lockPath}:`, err);
				}
			});
		}
	}

	// 获取文件权限通用方法
	public async getFilePermission(filePath: string): Promise<void> {
		switch (this.systemType) {
			case SystemType.WINDOWS:
				await sudoExec(`takeown /f "${filePath}" /a`);
				await sudoExec(`icacls "${filePath}" /grant Users:F`);
				break;
			case SystemType.MACOS:
				await sudoExec(`chmod a+rwx "${filePath}"`);
				break;
			case SystemType.LINUX:
				await sudoExec(`chmod 666 "${filePath}"`);
				break;
		}
	}

	public async uninstall(): Promise<boolean> {
		try {
			const content = this.clearCssContent(this.getContent(this.filePath));
			await this.saveContent(content);
			//await commands.executeCommand('workbench.action.reloadWindow');

			return true;
		} catch (error) {
			await window.showErrorMessage(`Uninstallation failed: ${error}`);

			return false;
		}
	}

	private getContent(filePath: string): string {
		return fs.readFileSync(filePath, 'utf-8');
	}

	private async saveContent(content: string): Promise<boolean> {
		// 追加新内容到原文件
		try {
			await fse.writeFile(this.filePath, content, { encoding: 'utf-8' });
		} catch (err) {
			// 权限不足,根据不同系统获取创建文件权限
			await this.getFilePermission(this.filePath);
			await fse.writeFile(this.filePath, content, { encoding: 'utf-8' });
		}

		// 清除旧版css文件
		if (this.upCssContent) {
			try {
				await fse.writeFile(cssFilePath, this.upCssContent, { encoding: 'utf-8' });
			} catch (err) {
				// 权限不足,根据不同系统获取创建文件权限
				await this.getFilePermission(cssFilePath);
				await fse.writeFile(cssFilePath, this.upCssContent, { encoding: 'utf-8' });
			}

			this.upCssContent = '';
		}

		// 备份文件
		if (this.bakStatus) {
			await this.bakFile();
		}

		return true;
	}

	private async bakFile(): Promise<void> {
		try {
			await fse.writeFile(bakFilePath, this.bakJsContent, { encoding: 'utf-8' });
		} catch (err) {
			// 权限不足,根据不同系统获取创建文件权限
			if (this.systemType == SystemType.WINDOWS) {
				// 使用cmd命令创建文件
				await sudoExec(`echo. > "${bakFilePath}"`);
				await sudoExec(`icacls "${bakFilePath}" /grant Users:F`);
			} else if (this.systemType == SystemType.MACOS) {
				// 使用命令创建文件并赋予权限
				await sudoExec(`touch "${bakFilePath}"`);
				await sudoExec(`chmod a+rwx "${bakFilePath}"`);
			} else if (this.systemType == SystemType.LINUX) {
				// 使用命令创建文件并赋予权限
				await sudoExec(`touch "${bakFilePath}"`);
				await sudoExec(`chmod 666 "${bakFilePath}"`);
			}

			await fse.writeFile(bakFilePath, this.bakJsContent, { encoding: 'utf-8' });
		}
	}

	private getJs(): string {
		return `
        /*ext-${this.extName}-start*/
        const style = document.createElement('style');
        style.textContent = \`${this.getCss()}\`;
        document.head.appendChild(style);
        /*ext-${this.extName}-end*/
        `;
	}

	private getCss(): string {
		// 透明度最大 0.8
		const opacity = Math.min(this.imageOpacity, 0.8);

		// 图片填充方式
		let sizeModelVal: string | undefined;
		let repeatVal = 'no-repeat';
		let positionVal = 'center';
		switch (this.sizeModel) {
			case 'cover':
				sizeModelVal = 'cover';
				break;
			case 'contain':
				sizeModelVal = '100% 100%';
				break;
			case 'repeat':
				sizeModelVal = 'auto';
				repeatVal = 'repeat';
				break;
			case 'noop_center':
				sizeModelVal = 'auto';
				break;
			case 'noop_right_bottom':
				sizeModelVal = 'auto';
				positionVal = 'right 96%';
				break;
			case 'noop_right_top':
				sizeModelVal = 'auto';
				positionVal = 'right 30px';
				break;
			case 'noop_left':
				sizeModelVal = 'auto';
				positionVal = 'left';
				break;
			case 'noop_right':
				sizeModelVal = 'auto';
				positionVal = 'right';
				break;
			case 'noop_top':
				sizeModelVal = 'auto';
				positionVal = 'top';
				break;
			case 'noop_bottom':
				sizeModelVal = 'auto';
				positionVal = 'bottom';
				break;
		}

		return `
		body::before{
			content: "";
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			position: absolute;
			background-size: ${sizeModelVal};
			background-repeat: ${repeatVal};
			background-position: ${positionVal};
			opacity: ${opacity};
			background-image:url('${this.imagePath}');
			z-index: 2;
			pointer-events: none;
			filter: blur(${this.blur}px);
			mix-blend-mode: ${this.blendModel};
		}
		`;
	}

	private async imageToBase64(): Promise<boolean> {
		try {
			const extname = path.extname(this.imagePath).substring(1);
			const imageBuffer = await fs.promises.readFile(path.resolve(this.imagePath));
			this.imagePath = `data:image/${extname};base64,${imageBuffer.toString('base64')}`;
			return true;
		} catch {
			return false;
		}
	}

	private localImgToVsc(): void {
		const separator = this.systemType == SystemType.LINUX ? '' : '/';
		this.imagePath = Uri.parse(`vscode-file://vscode-app${separator}${this.imagePath}`).toString();
	}

	private clearCssContent(content: string): string {
		const regex = new RegExp(`\\/\\*ext-${this.extName}-start\\*\\/[\\s\\S]*?\\/\\*ext-${this.extName}-end\\*\\/`, 'g');
		return content.replace(regex, '').trim();
	}

	// 获取文件里是否存在补丁样式代码
	public isPatched(content: string): boolean {
		return !!content.match(/\/\*ext-backgroundCover-start\*\/[\s\S]*?\/\*ext-backgroundCover-end\*\//g);
	}
}
