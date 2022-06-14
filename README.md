# Paste Picture

Paste image directly from clipboard to markdown/asciidoc(or other file)!

**Support Mac/Windows/Linux!** And support config destination folder.

![](https://raw.githubusercontent.com/Andersonfeng/vscode-extension-paste-image/main/res/vscode%E6%94%B9%E8%BF%9B%E6%8F%92%E4%BB%B6.gif)

Now you can enable `pastePicture.showFilePathConfirmInputBox` to modify file path before save:

![confirm-inputbox](https://raw.githubusercontent.com/mushanshitiancai/vscode-paste-image/master/res/confirm-inputbox.png)

## Usage

1. capture screen to clipboard
2. Open the command palette: `Ctrl+Shift+P` (`Cmd+Shift+P` on Mac)
3. Type: "Paste Image" or you can use default keyboard binding: `Ctrl+Alt+V` (`Cmd+Alt+V` on Mac).
4. Image will be saved in the folder that contains current editing file
5. The relative path will be paste to current editing file 

## Config

- `pastePicture.defaultName`

    The default image file name.

    The value of this config will be pass to the 'format' function of moment library(a js time manipulation library), you can read document https://momentjs.com/docs/#/displaying/format/ for advanced usage.

    And you can use variable:

    - `${currentFileName}`: the current file name with ext.
    - `${currentFileNameWithoutExt}`: the current file name without ext.

    Default value is `Y-MM-DD-HH-mm-ss`.

- `pastePicture.path`

    The destination to save image file.
    
    You can use variable:
    
    - `${currentFileDir}`: the path of directory that contain current editing file. 
    - `${projectRoot}`: the path of the project opened in vscode.
    - `${currentFileName}`: the current file name with ext.
    - `${currentFileNameWithoutExt}`: the current file name without ext.

    Default value is `${currentFileDir}`.

- `pastePicture.basePath`

    The base path of image url.
    
    You can use variable:
    
    - `${currentFileDir}`: the path of directory that contain current editing file. 
    - `${projectRoot}`: the path of the project opened in vscode.
    - `${currentFileName}`: the current file name with ext.
    - `${currentFileNameWithoutExt}`: the current file name without ext.

    Default value is `${currentFileDir}`.

- `pastePicture.forceUnixStyleSeparator`

    Force set the file separator style to unix style. If set false, separator style will follow the system style. 
    
    Default is `true`.

- `pastePicture.prefix`

    The string prepend to the resolved image path before paste.

    Default is `""`.

- `pastePicture.suffix`

    The string append to the resolved image path before paste.

    Default is `""`.

- `pastePicture.encodePath`

    How to encode image path before insert to editor. Support options:

    - `none`: do nothing, just insert image path to text
    - `urlEncode`: url encode whole image path
    - `urlEncodeSpace`: url encode only space character(space to %20)

    Default is `urlEncodeSpace`.

- `pastePicture.namePrefix`

    The string prepend to the image file name.

    You can use variable:
    
    - `${currentFileDir}`: the path of directory that contain current editing file. 
    - `${projectRoot}`: the path of the project opened in vscode.
    - `${currentFileName}`: the current file name with ext.
    - `${currentFileNameWithoutExt}`: the current file name without ext.

    Default is `""`.

- `pastePicture.nameSuffix`

    The string append to the image name.

    You can use variable:
    
    - `${currentFileDir}`: the path of directory that contain current editing file. 
    - `${projectRoot}`: the path of the project opened in vscode.
    - `${currentFileName}`: the current file name with ext.
    - `${currentFileNameWithoutExt}`: the current file name without ext.

- `pastePicture.markdownFormat`
    The markdown format you want to paste
    - `original` : `![]({fileName})`
    - `html` : `<img src='fileName' height="100%" width="100%">` 
    - 
    when `html` is selected , you can config the `htmlImageSyntaxPrefix` and `htmlImageSyntaxSuffix`
  -  `pastePicture.htmlImageSyntaxPrefix` default `<img src='`
  -  `pastePicture.htmlImageSyntaxSuffix` default `' height='100%' width='100%'/>`

refer to https://github.com/mushanshitiancai/vscode-paste-image and add html format 

参考 https://github.com/mushanshitiancai/vscode-paste-image 并增加配置以html方式粘贴到markdown文件上