import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ImageHoverProvider implements vscode.HoverProvider {
    // 支持的图片格式
    private imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico'];

    // 匹配图片URL的正则表达式
    private urlRegex = /(?:https?:\/\/[^\s\)'"]+\.(?:png|jpg|jpeg|gif|bmp|svg|webp|ico))|(?:(?:\.\.?\/|\/)[^\s\)'"]*\.(?:png|jpg|jpeg|gif|bmp|svg|webp|ico))|(?:[a-zA-Z]:[\\/][^\s\)'"]*\.(?:png|jpg|jpeg|gif|bmp|svg|webp|ico))/gi;

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position, this.urlRegex);

        if (!range) {
            // 尝试获取当前行，查找引号内的路径
            const line = document.lineAt(position.line);
            const lineText = line.text;
            const imageUrl = this.findImageUrlAtPosition(lineText, position.character);

            if (imageUrl) {
                return this.createHover(imageUrl, document);
            }
            return null;
        }

        const imageUrl = document.getText(range);
        return this.createHover(imageUrl, document);
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

    private createHover(imageUrl: string, document: vscode.TextDocument): vscode.Hover | null {
        const config = vscode.workspace.getConfiguration('imagePreview');
        const maxWidth = config.get<number>('maxWidth', 400);
        const maxHeight = config.get<number>('maxHeight', 400);

        let resolvedPath = imageUrl;

        // 处理相对路径
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
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
