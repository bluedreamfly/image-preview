import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios, { AxiosError } from 'axios';

export interface AssetMapping {
    [key: string]: string;
}

export class AssetResolver {
    private assetMappings: AssetMapping = {};
    private workspaceRoot: string | undefined;
    private refreshTimer: NodeJS.Timeout | undefined;
    private lastApiUpdate: number = 0;
    private isRefreshing: boolean = false;
    private currentActivityId: string = '';

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        this.loadAssetMappings();
        this.startAutoRefresh();
    }

    /**
     * 从项目根目录读取 activityId
     */
    private readActivityId(): string {
        if (!this.workspaceRoot) {
            return '';
        }

        const config = vscode.workspace.getConfiguration('imagePreview');
        const activityIdFileName = config.get<string>('activityIdFile', '.activityId');
        const activityIdPath = path.join(this.workspaceRoot, activityIdFileName);

        try {
            if (fs.existsSync(activityIdPath)) {
                const content = fs.readFileSync(activityIdPath, 'utf-8');
                // 去除首尾空白字符和换行符
                const activityId = content.trim();
                if (activityId) {
                    console.log(`Read activity ID from ${activityIdFileName}: ${activityId}`);
                    return activityId;
                }
            }
        } catch (error) {
            console.error(`Failed to read activity ID from ${activityIdPath}:`, error);
        }

        return '';
    }

    /**
     * 从配置文件加载资源映射
     */
    private async loadAssetMappings(): Promise<void> {
        // 先加载本地文件
        await this.loadLocalAssetMappings();

        // 再从API加载
        await this.loadAssetMappingsFromApi();
    }

    /**
     * 从本地文件加载资源映射
     */
    private loadLocalAssetMappings(): void {
        if (!this.workspaceRoot) {
            return;
        }

        // 尝试加载多个可能的配置文件位置
        const possibleConfigPaths = [
            path.join(this.workspaceRoot, '.image-assets.json'),
            path.join(this.workspaceRoot, 'assets.config.json'),
            path.join(this.workspaceRoot, '.vscode', 'image-assets.json'),
        ];

        // 同时读取用户配置的自定义路径
        const config = vscode.workspace.getConfiguration('imagePreview');
        const customPath = config.get<string>('assetMappingPath');

        if (customPath && this.workspaceRoot) {
            possibleConfigPaths.unshift(path.join(this.workspaceRoot, customPath));
        }

        for (const configPath of possibleConfigPaths) {
            if (fs.existsSync(configPath)) {
                try {
                    const content = fs.readFileSync(configPath, 'utf-8');
                    const mappings = JSON.parse(content);
                    this.assetMappings = { ...this.assetMappings, ...mappings };
                    console.log(`Loaded asset mappings from: ${configPath}`);
                } catch (error) {
                    console.error(`Failed to load asset mappings from ${configPath}:`, error);
                }
            }
        }
    }

    /**
     * 从API加载资源映射
     */
    private async loadAssetMappingsFromApi(silent: boolean = false): Promise<void> {
        const config = vscode.workspace.getConfiguration('imagePreview');
        const apiUrl = config.get<string>('assetApiUrl');
        const timeout = config.get<number>('apiTimeout', 5000);
        const showNotification = config.get<boolean>('showRefreshNotification', false);

        if (!apiUrl) {
            return;
        }

        // 从文件读取 activityId
        const activityId = this.readActivityId();

        // 保存当前的 activityId
        this.currentActivityId = activityId;

        try {
            console.log(`Loading asset mappings from API: ${apiUrl}${activityId ? ` (x-activity-id: ${activityId})` : ''}`);
            const mappings = await this.fetchAssetMappings(apiUrl, timeout, activityId);

            if (mappings && typeof mappings === 'object') {
                const previousCount = Object.keys(this.assetMappings).length;
                this.assetMappings = { ...this.assetMappings, ...mappings };
                const newCount = Object.keys(mappings).length;
                this.lastApiUpdate = Date.now();

                console.log(`Loaded ${newCount} asset mappings from API`);

                if (!silent && showNotification) {
                    vscode.window.showInformationMessage(
                        `Asset mappings refreshed: ${newCount} items loaded`
                    );
                } else if (!silent) {
                    vscode.window.showInformationMessage(
                        `Successfully loaded ${newCount} asset mappings from API`
                    );
                }
            } else {
                console.error('Invalid response format from API');
                if (!silent) {
                    vscode.window.showErrorMessage('Invalid asset mappings format from API');
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to load asset mappings from API: ${errorMessage}`);
            if (!silent) {
                vscode.window.showWarningMessage(
                    `Failed to load asset mappings from API: ${errorMessage}. Using local mappings only.`
                );
            }
        }
    }

    /**
     * 从URL获取资源映射
     */
    private async fetchAssetMappings(url: string, timeout: number, activityId?: string): Promise<AssetMapping> {
        try {
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'User-Agent': 'VSCode-ImagePreview-Extension'
            };

            // 如果有 activityId，添加到请求头
            if (activityId) {
                headers['x-activity-id'] = activityId;
            }

            const response = await axios.get<AssetMapping>(url, {
                timeout: timeout,
                headers: headers,
                validateStatus: (status) => status === 200
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    throw new Error(`Request timeout after ${timeout}ms`);
                } else if (error.response) {
                    throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
                } else if (error.request) {
                    throw new Error('No response received from server');
                } else {
                    throw new Error(`Request failed: ${error.message}`);
                }
            }
            throw error;
        }
    }

    /**
     * 重新加载资源映射（用于配置文件更新后）
     */
    public async reload(): Promise<void> {
        this.assetMappings = {};
        await this.loadAssetMappings();
    }

    /**
     * 根据资源标识符获取图片URL
     */
    public resolveAsset(assetId: string): string | null {
        return this.assetMappings[assetId] || null;
    }

    /**
     * 获取上次API更新的时间戳
     */
    public getLastApiUpdateTime(): number {
        return this.lastApiUpdate;
    }

    /**
     * 检查是否需要刷新并在需要时刷新
     */
    public async checkAndRefreshIfNeeded(): Promise<void> {
        // 如果正在刷新，跳过
        if (this.isRefreshing) {
            return;
        }

        const config = vscode.workspace.getConfiguration('imagePreview');
        const threshold = config.get<number>('refreshOnHoverThreshold', 300000); // 默认5分钟
        const apiUrl = config.get<string>('assetApiUrl');

        // 如果未配置API URL或阈值为0，不进行刷新
        if (!apiUrl || threshold <= 0) {
            return;
        }

        // 从文件读取当前的 activityId
        const activityId = this.readActivityId();

        // 检查 activityId 是否变化
        const activityIdChanged = activityId !== this.currentActivityId;

        const timeSinceLastUpdate = Date.now() - this.lastApiUpdate;

        // 如果 activityId 变化或超过阈值，触发刷新
        if (activityIdChanged || timeSinceLastUpdate > threshold) {
            if (activityIdChanged) {
                console.log(`Activity ID changed from "${this.currentActivityId}" to "${activityId}", reloading...`);
            } else {
                console.log(`Hover-triggered refresh: time since last update ${Math.round(timeSinceLastUpdate / 1000)}s exceeds threshold ${Math.round(threshold / 1000)}s`);
            }

            this.isRefreshing = true;
            try {
                // 如果 activityId 变化，清空现有映射
                if (activityIdChanged) {
                    this.assetMappings = {};
                }
                await this.loadAssetMappingsFromApi(true);
            } finally {
                this.isRefreshing = false;
            }
        }
    }

    /**
     * 检查字符串是否为资源标识符
     */
    public isAssetIdentifier(text: string): boolean {
        // 匹配模式: __ASSET_数字_数字
        const assetPattern = /^__ASSET_\d+_\d+$/;
        return assetPattern.test(text);
    }

    /**
     * 获取所有已加载的资源标识符
     */
    public getAllAssetIds(): string[] {
        return Object.keys(this.assetMappings);
    }

    /**
     * 添加或更新资源映射
     */
    public addMapping(assetId: string, imageUrl: string): void {
        this.assetMappings[assetId] = imageUrl;
    }

    /**
     * 获取资源映射统计信息
     */
    public getStats(): { total: number; loaded: boolean; lastApiUpdate?: string; activityId?: string } {
        const stats: { total: number; loaded: boolean; lastApiUpdate?: string; activityId?: string } = {
            total: Object.keys(this.assetMappings).length,
            loaded: Object.keys(this.assetMappings).length > 0
        };

        if (this.lastApiUpdate > 0) {
            const date = new Date(this.lastApiUpdate);
            stats.lastApiUpdate = date.toLocaleString();
        }

        if (this.currentActivityId) {
            stats.activityId = this.currentActivityId;
        }

        return stats;
    }

    /**
     * 启动自动刷新
     */
    private startAutoRefresh(): void {
        this.stopAutoRefresh(); // 先清除旧的定时器

        const config = vscode.workspace.getConfiguration('imagePreview');
        const interval = config.get<number>('autoRefreshInterval', 60000);
        const apiUrl = config.get<string>('assetApiUrl');

        // 如果设置了API URL并且间隔大于0，则启动自动刷新
        if (apiUrl && interval > 0) {
            console.log(`Starting auto-refresh with interval: ${interval}ms`);
            this.refreshTimer = setInterval(() => {
                console.log('Auto-refreshing asset mappings...');
                this.loadAssetMappingsFromApi(true).catch(error => {
                    console.error('Auto-refresh failed:', error);
                });
            }, interval);
        }
    }

    /**
     * 停止自动刷新
     */
    private stopAutoRefresh(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
            console.log('Auto-refresh stopped');
        }
    }

    /**
     * 重启自动刷新（配置变化时调用）
     */
    public restartAutoRefresh(): void {
        this.startAutoRefresh();
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        this.stopAutoRefresh();
    }
}
