import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios, { AxiosError } from 'axios';

export interface AssetMapping {
    [key: string]: string;
}

// 每个工作区的资源映射数据
interface WorkspaceAssetData {
    mappings: AssetMapping;
    activityId: string;
    lastUpdate: number;
}

export class AssetResolver {
    // 使用 Map 存储每个工作区的资源映射，key 为工作区路径
    private workspaceAssets: Map<string, WorkspaceAssetData> = new Map();
    private workspaceRoot: string | undefined;
    private refreshTimer: NodeJS.Timeout | undefined;
    private isRefreshing: boolean = false;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        this.loadAssetMappings();
        this.startAutoRefresh();
    }

    /**
     * 从项目根目录读取 activityId
     * @param workspaceFolderPath 指定的工作区文件夹路径，如果不提供则使用第一个工作区
     */
    private readActivityId(workspaceFolderPath?: string): string {
        const targetPath = workspaceFolderPath || this.workspaceRoot;

        if (!targetPath) {
            return '';
        }

        const config = vscode.workspace.getConfiguration('imagePreview');
        const activityIdFileName = config.get<string>('activityIdFile', '.activityId');
        const activityIdPath = path.join(targetPath, activityIdFileName);

        try {
            if (fs.existsSync(activityIdPath)) {
                const content = fs.readFileSync(activityIdPath, 'utf-8');
                // 去除首尾空白字符和换行符
                const activityId = content.trim();
                if (activityId) {
                    console.log(`Read activity ID from ${activityIdPath}: ${activityId}`);
                    return activityId;
                }
            }
        } catch (error) {
            console.error(`Failed to read activity ID from ${activityIdPath}:`, error);
        }

        return '';
    }

    /**
     * 根据文档URI获取对应的工作区文件夹路径
     */
    private getWorkspaceFolderForDocument(documentUri?: vscode.Uri): string | undefined {
        if (!documentUri) {
            return this.workspaceRoot;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
        return workspaceFolder?.uri.fsPath || this.workspaceRoot;
    }

    /**
     * 从配置文件加载资源映射
     */
    private async loadAssetMappings(): Promise<void> {
        if (!this.workspaceRoot) {
            return;
        }

        // 先加载本地文件
        this.loadLocalAssetMappingsForWorkspace(this.workspaceRoot);

        // 检查是否需要从API加载
        const workspaceData = this.workspaceAssets.get(this.workspaceRoot);
        const hasLocalData = workspaceData && Object.keys(workspaceData.mappings).length > 0;
        const lastUpdate = workspaceData?.lastUpdate || 0;
        const timeSinceLastUpdate = Date.now() - lastUpdate;
        const threshold = 300000; // 5分钟

        // 如果本地不存在数据，或者距离上次API更新超过5分钟，则请求接口
        if (!hasLocalData || timeSinceLastUpdate > threshold) {
            console.log(`Loading from API: ${!hasLocalData ? 'no local data' : `last update ${Math.round(timeSinceLastUpdate / 1000)}s ago exceeds ${threshold / 1000}s threshold`}`);
            await this.loadAssetMappingsFromApiForWorkspace(this.workspaceRoot);
        } else {
            console.log(`Using local data, last API update ${Math.round(timeSinceLastUpdate / 1000)}s ago`);
        }
    }

    /**
     * 为指定工作区加载本地资源映射
     */
    private loadLocalAssetMappingsForWorkspace(workspacePath: string): void {
        // 尝试加载多个可能的配置文件位置
        const possibleConfigPaths = [
            path.join(workspacePath, '.image-assets.json'),
            path.join(workspacePath, 'assets.config.json'),
            path.join(workspacePath, '.vscode', 'image-assets.json'),
        ];

        // 同时读取用户配置的自定义路径
        const config = vscode.workspace.getConfiguration('imagePreview');
        const customPath = config.get<string>('assetMappingPath');

        if (customPath) {
            possibleConfigPaths.unshift(path.join(workspacePath, customPath));
        }

        for (const configPath of possibleConfigPaths) {
            if (fs.existsSync(configPath)) {
                try {
                    const content = fs.readFileSync(configPath, 'utf-8');
                    const mappings = JSON.parse(content);

                    // 获取或创建该工作区的数据
                    const workspaceData = this.workspaceAssets.get(workspacePath) || {
                        mappings: {},
                        activityId: '',
                        lastUpdate: 0
                    };

                    workspaceData.mappings = { ...workspaceData.mappings, ...mappings };
                    this.workspaceAssets.set(workspacePath, workspaceData);

                    console.log(`Loaded asset mappings from: ${configPath}`);
                } catch (error) {
                    console.error(`Failed to load asset mappings from ${configPath}:`, error);
                }
            }
        }
    }

    /**
     * 为指定工作区从API加载资源映射
     */
    private async loadAssetMappingsFromApiForWorkspace(workspacePath: string, silent: boolean = false): Promise<void> {
        const config = vscode.workspace.getConfiguration('imagePreview');
        const apiUrl = config.get<string>('assetApiUrl');
        const timeout = config.get<number>('apiTimeout', 5000);
        const showNotification = config.get<boolean>('showRefreshNotification', false);

        if (!apiUrl) {
            return;
        }

        // 从文件读取 activityId
        const activityId = this.readActivityId(workspacePath);

        try {
            console.log(`Loading asset mappings from API for ${workspacePath}: ${apiUrl}${activityId ? ` (x-activity-id: ${activityId})` : ''}`);
            const mappings = await this.fetchAssetMappings(apiUrl, timeout, activityId);

            if (mappings && typeof mappings === 'object') {
                // 获取或创建该工作区的数据
                const workspaceData = this.workspaceAssets.get(workspacePath) || {
                    mappings: {},
                    activityId: '',
                    lastUpdate: 0
                };

                workspaceData.mappings = { ...workspaceData.mappings, ...mappings };
                workspaceData.activityId = activityId;
                workspaceData.lastUpdate = Date.now();

                this.workspaceAssets.set(workspacePath, workspaceData);

                const newCount = Object.keys(mappings).length;
                console.log(`Loaded ${newCount} asset mappings from API for workspace ${workspacePath}`);

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
        this.workspaceAssets.clear();
        await this.loadAssetMappings();
    }

    /**
     * 根据资源标识符获取图片URL
     * @param assetId 资源标识符
     * @param documentUri 文档URI，用于确定所属工作区
     */
    public resolveAsset(assetId: string, documentUri?: vscode.Uri): string | null {
        const workspacePath = this.getWorkspaceFolderForDocument(documentUri);
        if (!workspacePath) {
            return null;
        }

        const workspaceData = this.workspaceAssets.get(workspacePath);
        return workspaceData?.mappings[assetId] || null;
    }

    /**
     * 获取上次API更新的时间戳
     * @param documentUri 文档URI，用于确定所属工作区
     */
    public getLastApiUpdateTime(documentUri?: vscode.Uri): number {
        const workspacePath = this.getWorkspaceFolderForDocument(documentUri);
        if (!workspacePath) {
            return 0;
        }

        const workspaceData = this.workspaceAssets.get(workspacePath);
        return workspaceData?.lastUpdate || 0;
    }

    /**
     * 检查是否需要刷新并在需要时刷新
     * @param documentUri 当前文档的URI，用于多工作区场景
     */
    public async checkAndRefreshIfNeeded(documentUri?: vscode.Uri): Promise<void> {
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

        // 根据文档获取对应的工作区文件夹，然后读取 activityId
        const workspaceFolderPath = this.getWorkspaceFolderForDocument(documentUri);
        if (!workspaceFolderPath) {
            return;
        }

        const activityId = this.readActivityId(workspaceFolderPath);

        // 获取该工作区的数据
        const workspaceData = this.workspaceAssets.get(workspaceFolderPath);
        const currentActivityId = workspaceData?.activityId || '';
        const lastUpdate = workspaceData?.lastUpdate || 0;

        // 检查 activityId 是否变化
        const activityIdChanged = activityId !== currentActivityId;

        const timeSinceLastUpdate = Date.now() - lastUpdate;

        // 如果 activityId 变化或超过阈值，触发刷新
        if (activityIdChanged || timeSinceLastUpdate > threshold) {
            if (activityIdChanged) {
                console.log(`Activity ID changed from "${currentActivityId}" to "${activityId}" for workspace ${workspaceFolderPath}, reloading...`);
            } else {
                console.log(`Hover-triggered refresh for workspace ${workspaceFolderPath}: time since last update ${Math.round(timeSinceLastUpdate / 1000)}s exceeds threshold ${Math.round(threshold / 1000)}s`);
            }

            this.isRefreshing = true;
            try {
                // 如果 activityId 变化，清空该工作区的现有映射
                if (activityIdChanged) {
                    this.workspaceAssets.set(workspaceFolderPath, {
                        mappings: {},
                        activityId: '',
                        lastUpdate: 0
                    });
                }
                await this.loadAssetMappingsFromApiForWorkspace(workspaceFolderPath, true);
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
     * @param documentUri 文档URI，用于确定所属工作区
     */
    public getAllAssetIds(documentUri?: vscode.Uri): string[] {
        const workspacePath = this.getWorkspaceFolderForDocument(documentUri);
        if (!workspacePath) {
            return [];
        }

        const workspaceData = this.workspaceAssets.get(workspacePath);
        return workspaceData ? Object.keys(workspaceData.mappings) : [];
    }

    /**
     * 添加或更新资源映射
     * @param assetId 资源ID
     * @param imageUrl 图片URL
     * @param documentUri 文档URI，用于确定所属工作区
     */
    public addMapping(assetId: string, imageUrl: string, documentUri?: vscode.Uri): void {
        const workspacePath = this.getWorkspaceFolderForDocument(documentUri);
        if (!workspacePath) {
            return;
        }

        const workspaceData = this.workspaceAssets.get(workspacePath) || {
            mappings: {},
            activityId: '',
            lastUpdate: 0
        };

        workspaceData.mappings[assetId] = imageUrl;
        this.workspaceAssets.set(workspacePath, workspaceData);
    }

    /**
     * 获取资源映射统计信息
     * @param documentUri 文档URI，用于确定所属工作区。如果不提供，返回所有工作区的汇总统计
     */
    public getStats(documentUri?: vscode.Uri): { total: number; loaded: boolean; lastApiUpdate?: string; activityId?: string } {
        const workspacePath = documentUri ? this.getWorkspaceFolderForDocument(documentUri) : this.workspaceRoot;

        if (workspacePath) {
            // 返回特定工作区的统计信息
            const workspaceData = this.workspaceAssets.get(workspacePath);

            const stats: { total: number; loaded: boolean; lastApiUpdate?: string; activityId?: string } = {
                total: workspaceData ? Object.keys(workspaceData.mappings).length : 0,
                loaded: workspaceData ? Object.keys(workspaceData.mappings).length > 0 : false
            };

            if (workspaceData && workspaceData.lastUpdate > 0) {
                const date = new Date(workspaceData.lastUpdate);
                stats.lastApiUpdate = date.toLocaleString();
            }

            if (workspaceData && workspaceData.activityId) {
                stats.activityId = workspaceData.activityId;
            }

            return stats;
        } else {
            // 返回所有工作区的汇总统计信息
            let totalAssets = 0;
            for (const [_, data] of this.workspaceAssets) {
                totalAssets += Object.keys(data.mappings).length;
            }

            return {
                total: totalAssets,
                loaded: totalAssets > 0
            };
        }
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
                if (this.workspaceRoot) {
                    this.loadAssetMappingsFromApiForWorkspace(this.workspaceRoot, true).catch((error: Error) => {
                        console.error('Auto-refresh failed:', error);
                    });
                }
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
