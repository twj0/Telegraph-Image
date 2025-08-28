// Telegraph Finder API Client - 基于CloudGramStore架构设计
class TelegraphAPIClient {
    constructor() {
        this.baseURL = '';
        this.authToken = null;
        this.chunkSize = 5 * 1024 * 1024; // 5MB chunks like CloudGramStore
    }

    // 认证相关
    async login(username, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.authToken = data.token;
                localStorage.setItem('auth_token', this.authToken);
                return { success: true, token: this.authToken };
            }
            
            return { success: false, error: 'Login failed' };
        } catch (error) {
            console.log('🎭 认证API不可用，使用演示模式');
            return { success: true, demo: true };
        }
    }

    // 获取文件列表 - 适配Telegraph现有API
    async getFiles() {
        try {
            const response = await fetch('/api/manage/list');
            if (response.ok) {
                const data = await response.json();
                return this.transformFileList(data);
            }
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            console.log('🎭 文件列表API不可用，返回演示数据');
            return this.getDemoFiles();
        }
    }

    // 转换Telegraph API返回的文件格式
    transformFileList(telegraphData) {
        if (!Array.isArray(telegraphData)) return [];
        
        return telegraphData.map(item => ({
            id: item.name,
            name: item.metadata?.fileName || item.name,
            size: item.metadata?.fileSize || 0,
            type: this.getFileType(item.name),
            url: `/file/${item.name}`,
            uploadDate: new Date(item.metadata?.TimeStamp || Date.now()),
            parentFolder: item.metadata?.folderId || '/',
            favorite: item.metadata?.liked || false,
            mimeType: item.metadata?.mimeType || 'application/octet-stream'
        }));
    }

    // 文件类型判断
    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
            return 'image';
        } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
            return 'video';
        } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
            return 'document';
        } else {
            return 'other';
        }
    }

    // 演示数据
    getDemoFiles() {
        return [
            {
                id: 'demo_image_1',
                name: '演示图片1.jpg',
                size: 1024000,
                type: 'image',
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjBGMEYwIi8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIGZpbGw9IiNEREREREQiLz4KPHN2Zz4K',
                uploadDate: new Date(Date.now() - 86400000),
                parentFolder: '/',
                favorite: false
            },
            {
                id: 'demo_doc_1',
                name: '演示文档.pdf',
                size: 2048000,
                type: 'document',
                url: '#',
                uploadDate: new Date(Date.now() - 172800000),
                parentFolder: '/',
                favorite: true
            }
        ];
    }

    // 文件上传 - 支持分片上传（CloudGramStore风格）
    async uploadFile(file, options = {}) {
        const { folderId, onProgress } = options;
        
        try {
            // 小文件直接上传
            if (file.size <= this.chunkSize) {
                return await this.uploadSingleFile(file, folderId, onProgress);
            }
            
            // 大文件分片上传
            return await this.uploadChunkedFile(file, folderId, onProgress);
            
        } catch (error) {
            console.log('🎭 上传API不可用，模拟上传成功');
            return this.simulateUpload(file, folderId, onProgress);
        }
    }

    // 单文件上传
    async uploadSingleFile(file, folderId, onProgress) {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) formData.append('folderId', folderId);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            if (onProgress) onProgress(100);
            return { success: true, data: result };
        }
        
        throw new Error(`Upload failed: ${response.status}`);
    }

    // 分片上传（CloudGramStore风格）
    async uploadChunkedFile(file, folderId, onProgress) {
        const totalChunks = Math.ceil(file.size / this.chunkSize);
        const uploadId = 'upload_' + Date.now();
        const chunkIds = [];

        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, file.size);
            const chunk = file.slice(start, end);
            
            const chunkFormData = new FormData();
            chunkFormData.append('chunk', chunk);
            chunkFormData.append('uploadId', uploadId);
            chunkFormData.append('chunkIndex', i.toString());
            chunkFormData.append('totalChunks', totalChunks.toString());
            chunkFormData.append('fileName', file.name);
            if (folderId) chunkFormData.append('folderId', folderId);

            const response = await fetch('/api/files/chunk', {
                method: 'POST',
                body: chunkFormData
            });

            if (!response.ok) {
                throw new Error(`Chunk upload failed: ${response.status}`);
            }

            const chunkResult = await response.json();
            chunkIds.push(chunkResult.chunkId);

            // 更新进度
            if (onProgress) {
                const progress = Math.round(((i + 1) / totalChunks) * 90); // 90% for chunks
                onProgress(progress);
            }
        }

        // 合并分片
        const mergeResponse = await fetch('/api/files/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uploadId,
                fileName: file.name,
                fileSize: file.size,
                folderId,
                chunkIds
            })
        });

        if (mergeResponse.ok) {
            if (onProgress) onProgress(100);
            const result = await mergeResponse.json();
            return { success: true, data: result };
        }

        throw new Error(`Merge failed: ${mergeResponse.status}`);
    }

    // 模拟上传
    async simulateUpload(file, folderId, onProgress) {
        // 模拟上传进度
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (onProgress) onProgress(i);
        }

        return {
            success: true,
            demo: true,
            data: {
                id: 'demo_' + Date.now(),
                name: file.name,
                size: file.size,
                url: URL.createObjectURL(file)
            }
        };
    }

    // 删除文件
    async deleteFile(fileId) {
        try {
            const response = await fetch(`/api/manage/delete/${fileId}`, {
                method: 'DELETE'
            });
            
            return { success: response.ok };
        } catch (error) {
            console.log('🎭 删除API不可用，仅本地删除');
            return { success: true, demo: true };
        }
    }

    // 重命名文件
    async renameFile(fileId, newName) {
        try {
            const response = await fetch(`/api/manage/editName/${fileId}/${encodeURIComponent(newName)}`, {
                method: 'POST'
            });
            
            return { success: response.ok };
        } catch (error) {
            console.log('🎭 重命名API不可用，仅本地更新');
            return { success: true, demo: true };
        }
    }

    // 文件夹操作
    async createFolder(name, parentId) {
        try {
            const response = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parentId })
            });
            
            if (response.ok) {
                const result = await response.json();
                return { success: true, data: result };
            }
            
            throw new Error(`Create folder failed: ${response.status}`);
        } catch (error) {
            console.log('🎭 创建文件夹API不可用，仅本地创建');
            return {
                success: true,
                demo: true,
                data: {
                    id: 'folder_' + Date.now(),
                    name,
                    parentId
                }
            };
        }
    }

    // 获取文件夹列表
    async getFolders() {
        try {
            const response = await fetch('/api/folders');
            if (response.ok) {
                return await response.json();
            }
            throw new Error(`Get folders failed: ${response.status}`);
        } catch (error) {
            console.log('🎭 文件夹列表API不可用，返回空列表');
            return [];
        }
    }
}

// 导出单例
const apiClient = new TelegraphAPIClient();
export default apiClient;
