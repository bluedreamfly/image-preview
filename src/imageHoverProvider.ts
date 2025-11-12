import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AssetResolver } from './assetResolver';

export class ImageHoverProvider implements vscode.HoverProvider {
    // 支持的图片格式
    private imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico'];

    // 匹配图片URL的正则表达式
    private urlRegex = /(?:https?:\/\/[^\s\)'"]+\.(?:png|jpg|jpeg|gif|bmp|svg|webp|ico))|(?:(?:\.\.?\/|\/)[^\s\)'"]*\.(?:png|jpg|jpeg|gif|bmp|svg|webp|ico))|(?:[a-zA-Z]:[\\/][^\s\)'"]*\.(?:png|jpg|jpeg|gif|bmp|svg|webp|ico))/gi;

    // 匹配资源标识符的正则表达式 (如 __ASSET_3232_234234)
    private assetRegex = /__ASSET_\d+_\d+/g;

    private assetResolver: AssetResolver;

    constructor(assetResolver: AssetResolver) {
        this.assetResolver = assetResolver;
    }

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        // 首先检查是否为资源标识符
        const assetRange = document.getWordRangeAtPosition(position, this.assetRegex);
        if (assetRange) {
            const assetId = document.getText(assetRange);
            return this.createAssetHover(assetId, document);
        }

        // 检查图片URL
        const range = document.getWordRangeAtPosition(position, this.urlRegex);

        if (!range) {
            // 尝试获取当前行，查找引号内的路径
            const line = document.lineAt(position.line);
            const lineText = line.text;

            // 先检查是否为资源标识符
            const assetId = this.findAssetIdAtPosition(lineText, position.character);
            if (assetId) {
                return this.createAssetHover(assetId, document);
            }

            // 再检查是否为图片URL
            const imageUrl = this.findImageUrlAtPosition(lineText, position.character);
            if (imageUrl) {
                return this.createHover(imageUrl, document);
            }
            return null;
        }

        const imageUrl = document.getText(range);
        return this.createHover(imageUrl, document);
    }

    private findAssetIdAtPosition(lineText: string, charPosition: number): string | null {
        // 匹配引号内的资源标识符
        const quoteRegex = /["'`](__ASSET_\d+_\d+)["'`]/g;
        let match;

        while ((match = quoteRegex.exec(lineText)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;

            if (charPosition >= start && charPosition <= end) {
                return match[1];
            }
        }

        // 直接匹配资源标识符（不在引号内）
        const directRegex = /__ASSET_\d+_\d+/g;
        while ((match = directRegex.exec(lineText)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;

            if (charPosition >= start && charPosition <= end) {
                return match[0];
            }
        }

        return null;
    }

    private findImageUrlAtPosition(lineText: string, charPosition: number): string | null {
        // 匹配引号内的内容
        const quoteRegex = /["'`]([^"'`]+)["'`]/g;
        let match;

        while ((match = quoteRegex.exec(lineText)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;

            if (charPosition >= start && charPosition <= end) {
                const url = match[1];
                // 检查是否为图片URL
                if (this.isImageUrl(url)) {
                    return url;
                }
            }
        }

        // 匹配括号内的内容（如Markdown）
        const parenRegex = /\(([^)]+)\)/g;
        while ((match = parenRegex.exec(lineText)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;

            if (charPosition >= start && charPosition <= end) {
                const url = match[1];
                if (this.isImageUrl(url)) {
                    return url;
                }
            }
        }

        return null;
    }

    private isImageUrl(url: string): boolean {
        const ext = path.extname(url).toLowerCase();
        return this.imageExtensions.includes(ext);
    }

    private createAssetHover(assetId: string, document: vscode.TextDocument): vscode.Hover | null {
        // 从资源解析器获取图片URL
        const imageUrl = this.assetResolver.resolveAsset(assetId);

        if (!imageUrl) {
            // 如果找不到映射，返回提示信息
            const markdown = new vscode.MarkdownString();
            markdown.appendMarkdown(`⚠️ Asset not found: \`${assetId}\`\n\n`);
            markdown.appendMarkdown(`Please check your asset mapping configuration file.\n\n`);
            markdown.appendMarkdown(`Expected locations:\n`);
            markdown.appendMarkdown(`- \`.image-assets.json\`\n`);
            markdown.appendMarkdown(`- \`assets.config.json\`\n`);
            markdown.appendMarkdown(`- \`.vscode/image-assets.json\`\n`);
            return new vscode.Hover(markdown);
        }

        // 使用解析到的URL创建预览
        const hover = this.createHover(imageUrl, document);

        if (hover) {
            // 如果成功创建hover，在markdown中添加资源ID信息
            const markdown = hover.contents[0] as vscode.MarkdownString;
            const newMarkdown = new vscode.MarkdownString();
            newMarkdown.supportHtml = true;
            newMarkdown.isTrusted = true;

            const config = vscode.workspace.getConfiguration('imagePreview');
            const maxWidth = config.get<number>('maxWidth', 400);
            const maxHeight = config.get<number>('maxHeight', 400);

            let resolvedPath = imageUrl;

            // 处理相对路径
            if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
                const documentDir = path.dirname(document.uri.fsPath);
                resolvedPath = path.resolve(documentDir, imageUrl);

                if (!fs.existsSync(resolvedPath)) {
                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                    if (workspaceFolder) {
                        const workspacePath = path.join(workspaceFolder.uri.fsPath, imageUrl);
                        if (fs.existsSync(workspacePath)) {
                            resolvedPath = workspacePath;
                        }
                    }
                }
                resolvedPath = vscode.Uri.file(resolvedPath).toString();
            }

            newMarkdown.appendMarkdown(`![Image Preview](${resolvedPath}|width=${maxWidth},height=${maxHeight})\n\n`);
            newMarkdown.appendMarkdown(`Asset ID: \`${assetId}\`\n\n`);
            newMarkdown.appendMarkdown(`Resolved URL: \`${imageUrl}\``);

            return new vscode.Hover(newMarkdown);
        }

        return null;
    }

    private createHover(imageUrl: string, document: vscode.TextDocument): vscode.Hover | null {
        const config = vscode.workspace.getConfiguration('imagePreview');
        const maxWidth = config.get<number>('maxWidth', 400);
        const maxHeight = config.get<number>('maxHeight', 400);

        let resolvedPath = imageUrl;

        // 处理相对路径
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl?.startsWith('//')) {
            // 如果是相对路径，相对于当前文档解析
            const documentDir = path.dirname(document.uri.fsPath);
            resolvedPath = path.resolve(documentDir, imageUrl);

            // 检查文件是否存在
            if (!fs.existsSync(resolvedPath)) {
                // 尝试相对于工作区根目录
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                if (workspaceFolder) {
                    const workspacePath = path.join(workspaceFolder.uri.fsPath, imageUrl);
                    if (fs.existsSync(workspacePath)) {
                        resolvedPath = workspacePath;
                    } else {
                        return new vscode.Hover(`Image not found: ${imageUrl}`);
                    }
                } else {
                    return new vscode.Hover(`Image not found: ${imageUrl}`);
                }
            }

            // 转换为VSCode可以使用的URI
            resolvedPath = vscode.Uri.file(resolvedPath).toString();
        } else if (imageUrl.startsWith('//')) {
            resolvedPath = `https:${imageUrl}`
        }

        // 创建Markdown内容显示图片
        const markdown = new vscode.MarkdownString();
        markdown.supportHtml = true;
        markdown.isTrusted = true;

        // 使用HTML img标签以支持尺寸限制
        markdown.appendMarkdown(`![Image Preview](${resolvedPath}|width=${maxWidth},height=${maxHeight})\n\n`);
        markdown.appendMarkdown(`Path: \`${imageUrl}\``);

        return new vscode.Hover(markdown);
    }
}
