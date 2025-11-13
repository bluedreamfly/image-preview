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
        assetResolver.reload().catch(error => {
            console.error('Failed to reload asset mappings:', error);
        });
    });
    configWatcher.onDidCreate(() => {
        console.log('Asset mapping file created, loading...');
        assetResolver.reload().catch(error => {
            console.error('Failed to reload asset mappings:', error);
        });
    });

    context.subscriptions.push(configWatcher);

    // 监听 activityId 文件的变化
    const activityIdWatcher = vscode.workspace.createFileSystemWatcher('**/.activityId');
    activityIdWatcher.onDidChange(() => {
        console.log('Activity ID file changed, reloading...');
        assetResolver.reload().catch(error => {
            console.error('Failed to reload asset mappings:', error);
        });
    });
    activityIdWatcher.onDidCreate(() => {
        console.log('Activity ID file created, loading...');
        assetResolver.reload().catch(error => {
            console.error('Failed to reload asset mappings:', error);
        });
    });
    activityIdWatcher.onDidDelete(() => {
        console.log('Activity ID file deleted, reloading...');
        assetResolver.reload().catch(error => {
            console.error('Failed to reload asset mappings:', error);
        });
    });

    context.subscriptions.push(activityIdWatcher);

    // 监听配置变化（特别是API URL变化）
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('imagePreview.assetApiUrl') ||
                e.affectsConfiguration('imagePreview.apiTimeout') ||
                e.affectsConfiguration('imagePreview.activityIdFile')) {
                console.log('API configuration changed, reloading...');
                assetResolver.reload().catch(error => {
                    console.error('Failed to reload asset mappings:', error);
                });
            }

            // 如果刷新间隔或API URL变化，重启自动刷新
            if (e.affectsConfiguration('imagePreview.autoRefreshInterval') ||
                e.affectsConfiguration('imagePreview.assetApiUrl')) {
                console.log('Auto-refresh configuration changed, restarting...');
                assetResolver.restartAutoRefresh();
            }
        })
    );

    // 注册重新加载资源映射的命令
    const reloadCommand = vscode.commands.registerCommand('imagePreview.reloadAssets', async () => {
        try {
            await assetResolver.reload();
            const stats = assetResolver.getStats();
            let message = `Asset mappings reloaded. Total assets: ${stats.total}`;
            if (stats.activityId) {
                message += `\nActivity ID: ${stats.activityId}`;
            }
            if (stats.lastApiUpdate) {
                message += `\nLast API update: ${stats.lastApiUpdate}`;
            }
            vscode.window.showInformationMessage(message);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to reload assets: ${errorMessage}`);
        }
    });

    context.subscriptions.push(reloadCommand);

    // 注册 assetResolver 的 dispose 方法
    context.subscriptions.push({
        dispose: () => assetResolver.dispose()
    });

    // 显示加载的资源统计信息
    const stats = assetResolver.getStats();
    if (stats.loaded) {
        console.log(`Loaded ${stats.total} asset mappings`);
        if (stats.activityId) {
            console.log(`Activity ID: ${stats.activityId}`);
        }
        if (stats.lastApiUpdate) {
            console.log(`Last API update: ${stats.lastApiUpdate}`);
        }
    }

    // 显示自动刷新状态
    const config = vscode.workspace.getConfiguration('imagePreview');
    const refreshInterval = config.get<number>('autoRefreshInterval', 60000);
    const apiUrl = config.get<string>('assetApiUrl');
    if (apiUrl && refreshInterval > 0) {
        console.log(`Auto-refresh enabled with interval: ${refreshInterval}ms (${refreshInterval / 1000}s)`);
    }

    // 显示 activityId 文件配置
    const activityIdFile = config.get<string>('activityIdFile', '.activityId');
    console.log(`Activity ID will be read from: ${activityIdFile}`);
}

export function deactivate() {
    console.log('Image Preview extension is now deactivated');
}
