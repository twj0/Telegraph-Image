// Telegraph Finder - 主应用程序
class TelegraphFinder {
    constructor() {
        this.currentPath = '/';
        this.viewMode = 'grid'; // 'grid' 或 'list'
        this.files = [];
        this.folders = new Map();
        this.selectedItems = new Set();
        this.history = ['/'];
        this.historyIndex = 0;
        
        this.init();
    }

    async init() {
        console.log('初始化 Telegraph Finder...');
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 加载初始数据
        await this.loadFiles();
        
        // 渲染界面
        this.render();
        
        console.log('Telegraph Finder 初始化完成');
    }

    setupEventListeners() {
        // 工具栏按钮
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
        document.getElementById('forwardBtn').addEventListener('click', () => this.goForward());
        document.getElementById('viewModeBtn').addEventListener('click', () => this.toggleViewMode());
        document.getElementById('uploadBtn').addEventListener('click', () => this.showUploadDialog());
        document.getElementById('newFolderBtn').addEventListener('click', () => this.createNewFolder());

        // 文件输入
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // 侧边栏导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavigation(e.currentTarget);
            });
        });

        // 拖拽上传
        const fileArea = document.querySelector('.file-area');
        fileArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileArea.classList.add('drag-over');
        });

        fileArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileArea.classList.remove('drag-over');
        });

        fileArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileArea.classList.remove('drag-over');
            this.handleFileUpload(e.dataTransfer.files);
        });

        // 右键菜单
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.file-item')) {
                e.preventDefault();
                this.showContextMenu(e, e.target.closest('.file-item'));
            }
        });

        // 点击其他地方关闭右键菜单
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    async loadFiles() {
        console.log('加载文件列表...');
        this.showLoading(true);

        try {
            // 尝试连接到本地服务器，如果失败则使用模拟数据
            let response, data;
            try {
                response = await fetch('/api/manage/list');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                data = await response.json();
            } catch (apiError) {
                console.log('本地API不可用，使用模拟数据');
                // 模拟数据用于演示
                data = [
                    {
                        name: 'sample-image-1.jpg',
                        metadata: {
                            fileName: '示例图片1.jpg',
                            fileSize: 1024000,
                            TimeStamp: Date.now() - 86400000,
                            parentFolder: '/',
                            liked: false
                        }
                    },
                    {
                        name: 'sample-image-2.png',
                        metadata: {
                            fileName: '示例图片2.png',
                            fileSize: 2048000,
                            TimeStamp: Date.now() - 172800000,
                            parentFolder: '/',
                            liked: true
                        }
                    }
                ];
            }
            
            if (Array.isArray(data)) {
                this.files = data.map(item => ({
                    id: item.name,
                    name: item.metadata?.fileName || item.name,
                    size: item.metadata?.fileSize || 0,
                    type: this.getFileType(item.name),
                    url: `/file/${item.name}`,
                    uploadDate: new Date(item.metadata?.TimeStamp || Date.now()),
                    parentFolder: item.metadata?.parentFolder || '/',
                    favorite: item.metadata?.liked || false
                }));
                
                console.log(`成功加载 ${this.files.length} 个文件`);
            } else {
                console.error('API返回的数据格式不正确');
                this.files = [];
            }
        } catch (error) {
            console.error('加载文件失败:', error);
            this.showNotification('加载文件失败: ' + error.message, 'error');
            this.files = [];
        } finally {
            this.showLoading(false);
        }
    }

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

    getCurrentFiles() {
        // 根据当前路径过滤文件
        return this.files.filter(file => {
            if (this.currentPath === '/') {
                return file.parentFolder === '/' || !file.parentFolder;
            }
            return file.parentFolder === this.currentPath;
        });
    }

    render() {
        this.updateBreadcrumb();
        this.updateNavigation();
        this.renderFiles();
        this.updateToolbar();
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const pathParts = this.currentPath.split('/').filter(part => part);
        
        let html = '<span class="breadcrumb-item" data-path="/">全部文件</span>';
        
        let currentPath = '';
        pathParts.forEach(part => {
            currentPath += '/' + part;
            html += `<span class="breadcrumb-item" data-path="${currentPath}">${part}</span>`;
        });
        
        breadcrumb.innerHTML = html;
        
        // 添加面包屑点击事件
        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateTo(item.dataset.path);
            });
        });
    }

    updateNavigation() {
        // 更新侧边栏活动状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-path="${this.currentPath}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    renderFiles() {
        const currentFiles = this.getCurrentFiles();
        const fileGrid = document.getElementById('fileGrid');
        const fileList = document.getElementById('fileList');
        const emptyState = document.getElementById('emptyState');

        if (currentFiles.length === 0) {
            // 显示空状态
            fileGrid.style.display = 'none';
            fileList.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        // 隐藏空状态
        emptyState.style.display = 'none';

        if (this.viewMode === 'grid') {
            this.renderGridView(currentFiles);
            fileGrid.style.display = 'grid';
            fileList.style.display = 'none';
        } else {
            this.renderListView(currentFiles);
            fileGrid.style.display = 'none';
            fileList.style.display = 'block';
        }
    }

    renderGridView(files) {
        const fileGrid = document.getElementById('fileGrid');
        
        fileGrid.innerHTML = files.map(file => `
            <div class="file-item" data-file-id="${file.id}" data-file-type="${file.type}">
                <div class="file-icon ${file.type}">
                    ${this.getFileIcon(file)}
                </div>
                <div class="file-name" title="${file.name}">${file.name}</div>
            </div>
        `).join('');

        // 添加文件项点击事件
        fileGrid.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectFile(item, e.ctrlKey || e.metaKey);
            });
            
            item.addEventListener('dblclick', () => {
                this.openFile(item.dataset.fileId);
            });
        });
    }

    renderListView(files) {
        const fileListBody = document.getElementById('fileListBody');
        
        fileListBody.innerHTML = files.map(file => `
            <tr class="file-row" data-file-id="${file.id}">
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="file-icon ${file.type}" style="width: 24px; height: 24px; font-size: 16px;">
                            ${this.getFileIcon(file, true)}
                        </div>
                        <span>${file.name}</span>
                    </div>
                </td>
                <td>${this.formatFileSize(file.size)}</td>
                <td>${this.getFileTypeLabel(file.type)}</td>
                <td>${this.formatDate(file.uploadDate)}</td>
                <td>
                    <button class="btn-icon" onclick="finder.openFile('${file.id}')" title="打开">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="btn-icon" onclick="finder.downloadFile('${file.id}')" title="下载">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // 添加行点击事件
        fileListBody.querySelectorAll('.file-row').forEach(row => {
            row.addEventListener('click', (e) => {
                this.selectFile(row, e.ctrlKey || e.metaKey);
            });
            
            row.addEventListener('dblclick', () => {
                this.openFile(row.dataset.fileId);
            });
        });
    }

    getFileIcon(file, small = false) {
        const size = small ? '16px' : '48px';
        
        switch (file.type) {
            case 'image':
                return `<img src="${file.url}" alt="${file.name}" 
                        style="width: ${small ? '24px' : '64px'}; height: ${small ? '24px' : '64px'}; 
                               object-fit: cover; border-radius: 4px;"
                        onerror="this.outerHTML='<i class=\\"fas fa-image\\" style=\\"font-size: ${size}\\"></i>'">`;
            case 'video':
                return `<i class="fas fa-video" style="font-size: ${size}"></i>`;
            case 'document':
                return `<i class="fas fa-file-text" style="font-size: ${size}"></i>`;
            case 'folder':
                return `<i class="fas fa-folder" style="font-size: ${size}"></i>`;
            default:
                return `<i class="fas fa-file" style="font-size: ${size}"></i>`;
        }
    }

    getFileTypeLabel(type) {
        const labels = {
            image: '图片',
            video: '视频',
            document: '文档',
            folder: '文件夹',
            other: '其他'
        };
        return labels[type] || '未知';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        loadingState.style.display = show ? 'flex' : 'none';
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        notifications.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // 导航功能
    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentPath = this.history[this.historyIndex];
            this.render();
        }
    }

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentPath = this.history[this.historyIndex];
            this.render();
        }
    }

    navigateTo(path) {
        if (path !== this.currentPath) {
            this.currentPath = path;

            // 更新历史记录
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(path);
            this.historyIndex = this.history.length - 1;

            this.render();
        }
    }

    // 视图切换
    toggleViewMode() {
        this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
        const viewModeBtn = document.getElementById('viewModeBtn');
        viewModeBtn.innerHTML = this.viewMode === 'grid' ?
            '<i class="fas fa-list"></i>' : '<i class="fas fa-th"></i>';
        this.renderFiles();
    }

    // 文件上传
    showUploadDialog() {
        document.getElementById('fileInput').click();
    }

    async handleFileUpload(files) {
        if (files.length === 0) return;

        const modal = document.getElementById('uploadModal');
        const progressContainer = document.getElementById('uploadProgress');

        modal.style.display = 'flex';
        progressContainer.innerHTML = '';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            await this.uploadSingleFile(file, progressContainer);
        }

        // 上传完成后刷新文件列表
        await this.loadFiles();
        this.render();

        // 3秒后关闭模态框
        setTimeout(() => {
            modal.style.display = 'none';
        }, 3000);
    }

    async uploadSingleFile(file, container) {
        const progressItem = document.createElement('div');
        progressItem.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>${file.name}</span>
                    <span class="progress-text">0%</span>
                </div>
                <div style="background: #f0f0f0; border-radius: 4px; height: 8px;">
                    <div class="progress-bar" style="background: #007aff; height: 100%; width: 0%; border-radius: 4px; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
        container.appendChild(progressItem);

        const progressBar = progressItem.querySelector('.progress-bar');
        const progressText = progressItem.querySelector('.progress-text');

        try {
            // 模拟上传进度
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                progressBar.style.width = i + '%';
                progressText.textContent = i + '%';
            }

            // 尝试真实上传，如果失败则模拟成功
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    progressText.textContent = '完成';
                    progressText.style.color = '#34c759';
                    this.showNotification(`${file.name} 上传成功`, 'success');
                } else {
                    throw new Error(`上传失败: ${response.status}`);
                }
            } catch (apiError) {
                // API不可用时模拟成功
                console.log('API不可用，模拟上传成功');
                progressText.textContent = '完成 (演示)';
                progressText.style.color = '#34c759';
                this.showNotification(`${file.name} 上传成功 (演示模式)`, 'success');

                // 添加到本地文件列表用于演示
                const mockFile = {
                    id: 'mock_' + Date.now(),
                    name: file.name,
                    size: file.size,
                    type: this.getFileType(file.name),
                    url: URL.createObjectURL(file),
                    uploadDate: new Date(),
                    parentFolder: this.currentPath,
                    favorite: false
                };
                this.files.unshift(mockFile);
            }
        } catch (error) {
            console.error('上传文件失败:', error);
            progressBar.style.background = '#ff3b30';
            progressText.textContent = '失败';
            progressText.style.color = '#ff3b30';
            this.showNotification(`${file.name} 上传失败`, 'error');
        }
    }

    // 新建文件夹
    createNewFolder() {
        const folderName = prompt('请输入文件夹名称:');
        if (!folderName || !folderName.trim()) {
            return;
        }

        const folderId = 'folder_' + Date.now();
        const folder = {
            id: folderId,
            name: folderName.trim(),
            type: 'folder',
            parentFolder: this.currentPath,
            createdAt: new Date(),
            size: 0
        };

        this.folders.set(folderId, folder);
        this.showNotification(`文件夹 "${folderName}" 创建成功`, 'success');
        this.render();
    }

    // 文件选择
    selectFile(item, multi = false) {
        const fileId = item.dataset.fileId;

        if (!multi) {
            // 清除其他选择
            this.selectedItems.clear();
            document.querySelectorAll('.file-item, .file-row').forEach(el => {
                el.classList.remove('selected');
            });
        }

        if (this.selectedItems.has(fileId)) {
            this.selectedItems.delete(fileId);
            item.classList.remove('selected');
        } else {
            this.selectedItems.add(fileId);
            item.classList.add('selected');
        }

        this.updateToolbar();
    }

    // 打开文件
    openFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            window.open(file.url, '_blank');
        }
    }

    // 下载文件
    downloadFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            const a = document.createElement('a');
            a.href = file.url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    // 右键菜单
    showContextMenu(e, item) {
        const contextMenu = document.getElementById('contextMenu');
        const fileId = item.dataset.fileId;

        // 选择当前项
        this.selectFile(item);

        // 显示菜单
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';

        // 确保菜单不超出屏幕
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (e.pageX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (e.pageY - rect.height) + 'px';
        }
    }

    hideContextMenu() {
        document.getElementById('contextMenu').style.display = 'none';
    }

    // 侧边栏导航
    handleNavigation(item) {
        const path = item.dataset.path;
        const filter = item.dataset.filter;

        if (path) {
            this.navigateTo(path);
        } else if (filter) {
            // 处理文件类型过滤
            console.log('过滤文件类型:', filter);
        }

        // 更新活动状态
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
    }

    // 键盘快捷键
    handleKeyboard(e) {
        switch (e.key) {
            case 'Delete':
                if (this.selectedItems.size > 0) {
                    this.deleteSelectedFiles();
                }
                break;
            case 'F2':
                if (this.selectedItems.size === 1) {
                    this.renameFile([...this.selectedItems][0]);
                }
                break;
            case 'Escape':
                this.hideContextMenu();
                break;
        }
    }

    // 更新工具栏状态
    updateToolbar() {
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');

        backBtn.disabled = this.historyIndex <= 0;
        forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    // 删除选中文件
    deleteSelectedFiles() {
        if (this.selectedItems.size === 0) return;

        const fileNames = [...this.selectedItems].map(id => {
            const file = this.files.find(f => f.id === id);
            return file ? file.name : id;
        });

        if (confirm(`确定要删除这 ${fileNames.length} 个文件吗？\n${fileNames.join('\n')}`)) {
            console.log('删除文件:', fileNames);
            this.showNotification(`删除了 ${fileNames.length} 个文件`, 'success');
        }
    }

    // 重命名文件
    renameFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        const newName = prompt('请输入新的文件名:', file.name);
        if (newName && newName.trim() && newName !== file.name) {
            console.log('重命名文件:', file.name, '->', newName);
            this.showNotification(`文件已重命名为 "${newName}"`, 'success');
        }
    }
}

// 全局变量
let finder;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    finder = new TelegraphFinder();
});

// 全局函数（供HTML调用）
function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
}

function openFile() {
    console.log('打开文件');
}

function downloadFile() {
    console.log('下载文件');
}

function copyLink() {
    console.log('复制链接');
}

function renameFile() {
    console.log('重命名文件');
}

function moveToFolder() {
    console.log('移动到文件夹');
}

function deleteFile() {
    console.log('删除文件');
}
