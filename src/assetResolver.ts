import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface AssetMapping {
    [key: string]: string;
}

export class AssetResolver {
    private assetMappings: AssetMapping = {};
    private workspaceRoot: string | undefined;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        this.loadAssetMappings();
    }

    /**
     * 从配置文件加载资源映射
     */
    private loadAssetMappings(): void {
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
     * 重新加载资源映射（用于配置文件更新后）
     */
    public reload(): void {
        this.assetMappings = {};
        this.loadAssetMappings();
    }

    /**
     * 根据资源标识符获取图片URL
     */
    public resolveAsset(assetId: string): string | null {
        return this.assetMappings[assetId] || null;
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
    public getStats(): { total: number; loaded: boolean } {
        return {
            total: Object.keys(this.assetMappings).length,
            loaded: Object.keys(this.assetMappings).length > 0
        };
    }
}
