import * as vscode from 'vscode';
import { ImageHoverProvider } from './imageHoverProvider';
import { AssetResolver } from './assetResolver';

export function activate(context: vscode.ExtensionContext) {
    console.log('Image Preview extension is now active');

    // 初始化资源解析器
    const assetResolver = new AssetResolver();

    // 为所有语言注册hover provider
    const hoverProvider = new ImageHoverProvider(assetResolver);

    // 注册到所有文件类型
    const disposable = vscode.languages.registerHoverProvider(
        { scheme: 'file', pattern: '**/*' },
        hoverProvider
    );

    context.subscriptions.push(disposable);

    // 监听资源映射配置文件的变化
    const configWatcher = vscode.workspace.createFileSystemWatcher('**/.image-assets.json');
    configWatcher.onDidChange(() => {
        console.log('Asset mapping file changed, reloading...');
        assetResolver.reload();
    });
    configWatcher.onDidCreate(() => {
        console.log('Asset mapping file created, loading...');
        assetResolver.reload();
    });

    context.subscriptions.push(configWatcher);

    // 注册重新加载资源映射的命令
    const reloadCommand = vscode.commands.registerCommand('imagePreview.reloadAssets', () => {
        assetResolver.reload();
        const stats = assetResolver.getStats();
        vscode.window.showInformationMessage(
            `Asset mappings reloaded. Total assets: ${stats.total}`
        );
    });

    context.subscriptions.push(reloadCommand);

    // 显示加载的资源统计信息
    const stats = assetResolver.getStats();
    if (stats.loaded) {
        console.log(`Loaded ${stats.total} asset mappings`);
    }
}

export function deactivate() {
    console.log('Image Preview extension is now deactivated');
}
