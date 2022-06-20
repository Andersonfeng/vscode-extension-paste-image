'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import { spawn } from 'child_process';
import * as moment from 'moment';

class Logger {
	static channel: vscode.OutputChannel;

	static log(message: any) {
		if (this.channel) {
			let time = moment().format("MM-DD HH:mm:ss");
			this.channel.appendLine(`[${time}] ${message}`);
		}		
	}

	static showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined> {
		this.log(message);
		return vscode.window.showInformationMessage(message, ...items);
	}

	static showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined> {
		this.log(message);
		return vscode.window.showErrorMessage(message, ...items);
	}
}

export function activate(context: vscode.ExtensionContext) {
	Logger.channel = vscode.window.createOutputChannel("pastePicture")
	context.subscriptions.push(Logger.channel);	

	let disposable = vscode.commands.registerCommand('extension.pastePicture', () => {
		try {
			Paster.paste();
		} catch (e) {
			Logger.showErrorMessage(e as string)
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
}

class Paster {
	static PATH_VARIABLE_CURRNET_FILE_DIR = /\$\{currentFileDir\}/g;
	static PATH_VARIABLE_PROJECT_ROOT = /\$\{projectRoot\}/g;
	static PATH_VARIABLE_CURRNET_FILE_NAME = /\$\{currentFileName\}/g;
	static PATH_VARIABLE_CURRNET_FILE_NAME_WITHOUT_EXT = /\$\{currentFileNameWithoutExt\}/g;

	static PATH_VARIABLE_IMAGE_FILE_PATH = /\$\{imageFilePath\}/g;
	static PATH_VARIABLE_IMAGE_ORIGINAL_FILE_PATH = /\$\{imageOriginalFilePath\}/g;
	static PATH_VARIABLE_IMAGE_FILE_NAME = /\$\{imageFileName\}/g;
	static PATH_VARIABLE_IMAGE_FILE_NAME_WITHOUT_EXT = /\$\{imageFileNameWithoutExt\}/g;
	static PATH_VARIABLE_IMAGE_SYNTAX_PREFIX = /\$\{imageSyntaxPrefix\}/g;
	static PATH_VARIABLE_IMAGE_SYNTAX_SUFFIX = /\$\{imageSyntaxSuffix\}/g;

	static FILE_PATH_CONFIRM_INPUTBOX_MODE_ONLY_NAME = "onlyName";
	static FILE_PATH_CONFIRM_INPUTBOX_MODE_PULL_PATH = "fullPath";

	static defaultNameConfig: string;
	static folderPathConfig: string;
	static basePathConfig: string;
	static prefixConfig: string;
	static suffixConfig: string;
	static forceUnixStyleSeparatorConfig: boolean;
	static encodePathConfig: string;
	static namePrefixConfig: string;
	static nameSuffixConfig: string;
	static insertPatternConfig: string;
	static showFilePathConfirmInputBox: boolean;
	static filePathConfirmInputBoxMode: string;
	static markdownFormat: string;
	static htmlImageSyntaxPrefix: string;
	static htmlImageSyntaxSuffix: string;

	public static paste() {
		// get current edit file path
		let editor = vscode.window.activeTextEditor;
		if (!editor) return;

		let fileUri = editor.document.uri;
		if (!fileUri) return;
		if (fileUri.scheme === 'untitled') {
			Logger.showInformationMessage('Before pasting the image, you need to save current file first.');
			return;
		}
		let filePath = fileUri.fsPath;
		let folderPath = path.dirname(filePath);
		let projectPath = vscode.workspace.rootPath;

		// get selection as image file name, need check
		var selection = editor.selection;
		var selectText = editor.document.getText(selection);
		if (selectText && /[\\:*?<>|]/.test(selectText)) {
			Logger.showInformationMessage('Your selection is not a valid filename!');
			return;
		}

		// load config pasteImage.defaultName
		this.defaultNameConfig = vscode.workspace.getConfiguration('pastePicture')['defaultName'];
		if (!this.defaultNameConfig) {
			this.defaultNameConfig = "Y-MM-DD-HH-mm-ss"
		}

		// load config pasteImage.path
		this.folderPathConfig = vscode.workspace.getConfiguration('pastePicture')['path'];
		if (!this.folderPathConfig) {
			this.folderPathConfig = "${currentFileDir}";
		}
		if (this.folderPathConfig.length !== this.folderPathConfig.trim().length) {
			Logger.showErrorMessage(`The config pasteImage.path = '${this.folderPathConfig}' is invalid. please check your config.`);
			return;
		}
		// load config pasteImage.basePath
		this.basePathConfig = vscode.workspace.getConfiguration('pastePicture')['basePath'];
		if (!this.basePathConfig) {
			this.basePathConfig = "";
		}
		if (this.basePathConfig.length !== this.basePathConfig.trim().length) {
			Logger.showErrorMessage(`The config pasteImage.path = '${this.basePathConfig}' is invalid. please check your config.`);
			return;
		}
		// load other config
		this.prefixConfig = vscode.workspace.getConfiguration('pastePicture')['prefix'];
		this.suffixConfig = vscode.workspace.getConfiguration('pastePicture')['suffix'];
		this.forceUnixStyleSeparatorConfig = vscode.workspace.getConfiguration('pastePicture')['forceUnixStyleSeparator'];
		this.forceUnixStyleSeparatorConfig = !!this.forceUnixStyleSeparatorConfig;
		this.encodePathConfig = vscode.workspace.getConfiguration('pastePicture')['encodePath'];
		this.namePrefixConfig = vscode.workspace.getConfiguration('pastePicture')['namePrefix'];
		this.nameSuffixConfig = vscode.workspace.getConfiguration('pastePicture')['nameSuffix'];
		this.insertPatternConfig = vscode.workspace.getConfiguration('pastePicture')['insertPattern'];
		this.showFilePathConfirmInputBox = vscode.workspace.getConfiguration('pastePicture')['showFilePathConfirmInputBox'] || false;
		this.filePathConfirmInputBoxMode = vscode.workspace.getConfiguration('pastePicture')['filePathConfirmInputBoxMode'];
		this.markdownFormat = vscode.workspace.getConfiguration('pastePicture')['markdownFormat'];
		this.htmlImageSyntaxPrefix = vscode.workspace.getConfiguration('pastePicture')['htmlImageSyntaxPrefix'];
		this.htmlImageSyntaxSuffix = vscode.workspace.getConfiguration('pastePicture')['htmlImageSyntaxSuffix'];

		// replace variable in config
		this.defaultNameConfig = this.replacePathVariable(this.defaultNameConfig, projectPath, filePath, (x) => `[${x}]`);
		this.folderPathConfig = this.replacePathVariable(this.folderPathConfig, projectPath, filePath);
		this.basePathConfig = this.replacePathVariable(this.basePathConfig, projectPath, filePath);
		this.namePrefixConfig = this.replacePathVariable(this.namePrefixConfig, projectPath, filePath);
		this.nameSuffixConfig = this.replacePathVariable(this.nameSuffixConfig, projectPath, filePath);
		this.insertPatternConfig = this.replacePathVariable(this.insertPatternConfig, projectPath, filePath);

		// "this" is lost when coming back from the callback, thus we need to store it here.
		const instance = this;
		this.getImagePath(filePath, selectText, this.folderPathConfig, this.showFilePathConfirmInputBox, this.filePathConfirmInputBoxMode, function (err, imagePath) {
			try {
				// is the file existed?
				let existed = fs.existsSync(imagePath);
				if (existed) {
					Logger.showInformationMessage(`File ${imagePath} existed.Would you want to replace?`, 'Replace', 'Cancel').then(choose => {
						if (choose != 'Replace') return;

						instance.saveAndPaste(editor as vscode.TextEditor, imagePath);
					});
				} else {
					instance.saveAndPaste(editor as vscode.TextEditor, imagePath);
				}
			} catch (err) {
				Logger.showErrorMessage(`fs.existsSync(${imagePath}) fail. message=${err}`);
				return;
			}
		});
	}

	public static saveAndPaste(editor: vscode.TextEditor, imagePath: string) {
		this.createImageDirWithImagePath(imagePath).then(imagePath => {
			// save image and insert to current edit file
			this.saveClipboardImageToFileAndGetPath(imagePath as string, (imagePath, imagePathReturnByScript) => {
				if (!imagePathReturnByScript) return;
				if (imagePathReturnByScript === 'no image') {
					Logger.showInformationMessage('There is not an image in the clipboard.');
					return;
				}

				imagePath = this.renderFilePath(editor.document.languageId, this.basePathConfig, imagePath, this.forceUnixStyleSeparatorConfig, this.prefixConfig, this.suffixConfig);

				editor.edit(edit => {
					let current = editor.selection;

					if (current.isEmpty) {
						edit.insert(current.start, imagePath);
					} else {
						edit.replace(current, imagePath);
					}
				});
			});
		}).catch(err => {
			if (err instanceof PluginError) {
				Logger.showErrorMessage(err.message as string);
			} else {
				Logger.showErrorMessage(`Failed make folder. message=${err.message}`);
			}
			return;
		});
	}

	public static getImagePath(filePath: string, selectText: string, folderPathFromConfig: string,
		showFilePathConfirmInputBox: boolean, filePathConfirmInputBoxMode: string,
		callback: (err: any, imagePath: string) => void) {
		// image file name
		let imageFileName = "";
		if (!selectText) {
			imageFileName = this.namePrefixConfig + moment().format(this.defaultNameConfig) + this.nameSuffixConfig + ".png";
		} else {
			imageFileName = this.namePrefixConfig + selectText + this.nameSuffixConfig + ".png";
		}

		let filePathOrName;
		if (filePathConfirmInputBoxMode == Paster.FILE_PATH_CONFIRM_INPUTBOX_MODE_PULL_PATH) {
			filePathOrName = makeImagePath(imageFileName);
		} else {
			filePathOrName = imageFileName;
		}

		if (showFilePathConfirmInputBox) {
			vscode.window.showInputBox({
				prompt: 'Please specify the filename of the image.',
				value: filePathOrName
			}).then((result) => {
				if (result) {
					if (!result.endsWith('.png')) result += '.png';

					if (filePathConfirmInputBoxMode == Paster.FILE_PATH_CONFIRM_INPUTBOX_MODE_ONLY_NAME) {
						result = makeImagePath(result);
					}

					callback(null, result);
				}
				return;
			});
		} else {
			callback(null, makeImagePath(imageFileName));
			return;
		}

		function makeImagePath(fileName: string) {
			// image output path
			let folderPath = path.dirname(filePath);
			let imagePath = "";

			// generate image path
			if (path.isAbsolute(folderPathFromConfig)) {
				imagePath = path.join(folderPathFromConfig, fileName);
			} else {
				imagePath = path.join(folderPath, folderPathFromConfig, fileName);
			}

			return imagePath;
		}
	}

	/**
	 * create directory for image when directory does not exist
	 */
	private static createImageDirWithImagePath(imagePath: string) {
		return new Promise((resolve, reject) => {
			let imageDir = path.dirname(imagePath);

			fs.stat(imageDir, (err, stats) => {
				if (err == null) {
					if (stats.isDirectory()) {
						resolve(imagePath);
					} else {
						reject(new PluginError(`The image dest directory '${imageDir}' is a file. Please check your 'pasteImage.path' config.`))
					}
				} else if (err.code == "ENOENT") {
					fse.ensureDir(imageDir, (err: any) => {
						if (err) {
							reject(err);
							return;
						}
						resolve(imagePath);
					});

				} else {
					reject(err);
				}
			});
		});
	}

	/**
	 * use applescript to save image from clipboard and get file path
	 */
	private static saveClipboardImageToFileAndGetPath(imagePath: string, cb: (imagePath: string, imagePathFromScript: string) => void) {
		if (!imagePath) return;

		let platform = process.platform;
		if (platform === 'win32') {

			// Windows
			const scriptPath = path.join(__dirname, '../res/pc.ps1');

			let command = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
			let powershellExisted = fs.existsSync(command)
			if (!powershellExisted) {
				command = "powershell"
			}

			let arg_arr = [
				'-noprofile', //不使用任何配置打开powershell
				'-noninteractive', //不向用户显示交互式提示
				'-nologo',  //启动时隐藏版权横幅
				'-sta', //使用单线程单元启动 PowerShell
				'-executionpolicy', //设置当前会话的默认执行策略，并将其保存在环境变量中
				'unrestricted',
				'-windowstyle', 'hidden', //为会话设置窗口样式。 有效值包括 Normal、Minimized、Maximized 和 Hidden
				'-file', scriptPath, //如果 文件 的值是文件路径，脚本将在本地范围 (“dot-sourced”) 中运行，以便脚本创建的函数和变量在当前会话中可用
				imagePath as string
			];

			const powershell = spawn(command, arg_arr);
			powershell.on('error', function (e: { code: string; toString: () => string; }) {
				if (e.code == "ENOENT") {
					Logger.showErrorMessage(`The powershell command is not in you PATH environment variables. Please add it and retry.`);
				} else {
					Logger.showErrorMessage(e.toString());
				}
			});
			powershell.on('exit', function (code: any, signal: any) {
			});

			powershell.on('message', function (message, sendHandle) {
			})

			powershell.stdout.on('data', function (data: Buffer) {
				cb(imagePath as string, data.toString().trim());
			});


		}
		else if (platform === 'darwin') {
			// Mac
			let scriptPath = path.join(__dirname, '../../res/mac.applescript');

			let ascript = spawn('osascript', [scriptPath, imagePath as string]);
			ascript.on('error', function (e: { toString: () => string; }) {
				Logger.showErrorMessage(e.toString());
			});
			ascript.on('exit', function (code: any, signal: any) {
				// console.log('exit',code,signal);
			});
			ascript.stdout.on('data', function (data: Buffer) {
				cb(imagePath as string, data.toString().trim());
			});
		} else {
			// Linux 

			let scriptPath = path.join(__dirname, '../../res/linux.sh');

			let ascript = spawn('sh', [scriptPath, imagePath]);
			ascript.on('error', function (e: { toString: () => string; }) {
				Logger.showErrorMessage(e.toString());
			});
			ascript.on('exit', function (code: any, signal: any) {
				// console.log('exit',code,signal);
			});
			ascript.stdout.on('data', function (data: Buffer) {
				let result = data.toString().trim();
				if (result == "no xclip") {
					Logger.showInformationMessage('You need to install xclip command first.');
					return;
				}
				cb(imagePath, result);
			});
		}
	}

	/**
	 * render the image file path dependen on file type
	 * e.g. in markdown image file path will render to ![](path)
	 */
	public static renderFilePath(languageId: string, basePath: string, imageFilePath: string, forceUnixStyleSeparator: boolean, prefix: string, suffix: string): string {
		if (basePath) {
			imageFilePath = path.relative(basePath, imageFilePath);
		}

		if (forceUnixStyleSeparator) {
			imageFilePath = normalize(imageFilePath);
		}

		let originalImagePath = imageFilePath;
		let ext = path.extname(originalImagePath);
		let fileName = path.basename(originalImagePath);
		let fileNameWithoutExt = path.basename(originalImagePath, ext);

		imageFilePath = `${prefix}${imageFilePath}${suffix}`;

		if (this.encodePathConfig == "urlEncode") {
			imageFilePath = encodeURI(imageFilePath)
		} else if (this.encodePathConfig == "urlEncodeSpace") {
			imageFilePath = imageFilePath.replace(/ /g, "%20");
		}

		let imageSyntaxPrefix = "";
		let imageSyntaxSuffix = ""
		switch (languageId) {
			case "markdown":
				//todo 添加一个标识field ,是用原生markdown 还是html
				if (this.markdownFormat == "original") {
					imageSyntaxPrefix = `![](`
					imageSyntaxSuffix = `)`
				} else if (this.markdownFormat == "html") {
					// imageSyntaxPrefix = `<img src="`
					// imageSyntaxSuffix = `" height="100%" width="100%"/>`
					imageSyntaxPrefix = this.htmlImageSyntaxPrefix
					imageSyntaxSuffix = this.htmlImageSyntaxSuffix
				}
				break;
			case "asciidoc":
				imageSyntaxPrefix = `image::`
				imageSyntaxSuffix = `[]`
				break;
		}

		let result = this.insertPatternConfig
		result = result.replace(this.PATH_VARIABLE_IMAGE_SYNTAX_PREFIX, imageSyntaxPrefix);
		result = result.replace(this.PATH_VARIABLE_IMAGE_SYNTAX_SUFFIX, imageSyntaxSuffix);

		result = result.replace(this.PATH_VARIABLE_IMAGE_FILE_PATH, imageFilePath);
		result = result.replace(this.PATH_VARIABLE_IMAGE_ORIGINAL_FILE_PATH, originalImagePath);
		result = result.replace(this.PATH_VARIABLE_IMAGE_FILE_NAME, fileName);
		result = result.replace(this.PATH_VARIABLE_IMAGE_FILE_NAME_WITHOUT_EXT, fileNameWithoutExt);

		return result;
	}

	public static replacePathVariable(pathStr: string, projectRoot: string | undefined, curFilePath: string, postFunction: (arg0: string) => string = (x) => x): string {
		let currentFileDir = path.dirname(curFilePath);
		let ext = path.extname(curFilePath);
		let fileName = path.basename(curFilePath);
		let fileNameWithoutExt = path.basename(curFilePath, ext);

		pathStr = pathStr.replace(this.PATH_VARIABLE_PROJECT_ROOT, postFunction(projectRoot as string));
		pathStr = pathStr.replace(this.PATH_VARIABLE_CURRNET_FILE_DIR, postFunction(currentFileDir));
		pathStr = pathStr.replace(this.PATH_VARIABLE_CURRNET_FILE_NAME, postFunction(fileName));
		pathStr = pathStr.replace(this.PATH_VARIABLE_CURRNET_FILE_NAME_WITHOUT_EXT, postFunction(fileNameWithoutExt));
		return pathStr;
	}
}

class PluginError {
	constructor(public message?: string) {
	}
}

export function normalize(input: string): string { return input }