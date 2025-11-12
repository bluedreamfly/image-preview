import * as vscode from 'vscode';
import { ImageHoverProvider } from './imageHoverProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Image Preview extension is now active');

    // 为所有语言注册hover provider
    const hoverProvider = new ImageHoverProvider();

    // 注册到所有文件类型
    const disposable = vscode.languages.registerHoverProvider(
        { scheme: 'file', pattern: '**/*' },
        hoverProvider
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Image Preview extension is now deactivated');
}
