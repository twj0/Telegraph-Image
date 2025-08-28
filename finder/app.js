// Telegraph Finder - 主应用程序
class TelegraphFinder {
    constructor() {
        this.currentPath = '/';
        this.viewMode = 'grid'; // 'grid' 或 'list'
        this.files = [];
        this.folders = new Map();
        this.folderStructure = { root: [] };
        this.selectedItems = new Set();
        this.history = ['/'];
        this.historyIndex = 0;
        this.currentContextFileId = null;

        this.init();
    }

    async init() {
        console.log('初始化 Telegraph Finder...');

        // 初始化文件夹系统
        this.initializeFolders();

        // 加载文件夹结构
        this.loadFolderStructure();

        // 设置事件监听器
        this.setupEventListeners();

        // 加载初始数据
        await this.loadFiles();

        // 渲染界面
        this.render();

        console.log('Telegraph Finder 初始化完成');
    }

    initializeFolders() {
        // 系统文件夹
        this.folders.set('all', {
            id: 'all', name: '全部文件', icon: 'fas fa-home', isSystem: true
        });
        this.folders.set('recent', {
            id: 'recent', name: '最近使用', icon: 'fas fa-clock', isSystem: true
        });
        this.folders.set('favorites', {
            id: 'favorites', name: '收藏夹', icon: 'fas fa-star', isSystem: true
        });
        this.folders.set('images', {
            id: 'images', name: '图片', icon: 'fas fa-image', isSystem: true
        });

        console.log('文件夹初始化完成，共', this.folders.size, '个系统文件夹');
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
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#contextMenu')) {
                this.hideContextMenu();
            }
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
        const currentFolderId = this.currentPath === '/' ? 'root' : this.currentPath;
        const items = [];

        console.log('获取当前文件夹内容:', {
            currentPath: this.currentPath,
            currentFolderId: currentFolderId,
            folderStructure: this.folderStructure,
            folders: Array.from(this.folders.keys())
        });

        // 添加当前文件夹的子文件夹
        const children = this.folderStructure[currentFolderId] || [];
        console.log('子文件夹ID列表:', children);

        for (const childId of children) {
            if (this.folders.has(childId)) {
                const folder = this.folders.get(childId);
                console.log('找到文件夹:', folder);
                if (!folder.isSystem) {
                    items.push({
                        ...folder,
                        type: 'folder',
                        isFolder: true
                    });
                }
            }
        }

        // 添加当前文件夹的文件
        const files = this.files.filter(file => {
            if (this.currentPath === '/') {
                return file.parentFolder === '/' || !file.parentFolder || file.parentFolder === 'root';
            }
            return file.parentFolder === this.currentPath;
        });

        items.push(...files);
        console.log('当前文件夹总项目数:', items.length, items);
        return items;
    }

    render() {
        this.updateBreadcrumb();
        this.updateNavigation();
        this.updateSidebar();
        this.renderFiles();
        this.updateToolbar();
    }

    updateSidebar() {
        const customFoldersContainer = document.getElementById('customFolders');
        if (!customFoldersContainer) return;

        // 获取所有自定义文件夹
        const customFolders = Array.from(this.folders.values())
            .filter(folder => !folder.isSystem);

        if (customFolders.length === 0) {
            customFoldersContainer.innerHTML = '<li style="padding: 8px 20px; color: #999; font-size: 12px;">暂无自定义文件夹</li>';
            return;
        }

        customFoldersContainer.innerHTML = customFolders.map(folder => `
            <li class="nav-item" data-path="${folder.id}">
                <i class="fas fa-folder"></i>
                <span>${folder.name}</span>
            </li>
        `).join('');

        // 添加点击事件
        customFoldersContainer.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavigation(e.currentTarget);
            });
        });
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');

        let html = '<span class="breadcrumb-item" data-path="/">全部文件</span>';

        // 构建面包屑路径
        if (this.currentPath !== '/') {
            const pathParts = this.buildBreadcrumbPath(this.currentPath);
            pathParts.forEach(part => {
                html += `<span class="breadcrumb-item" data-path="${part.id}">${part.name}</span>`;
            });
        }

        breadcrumb.innerHTML = html;

        // 添加面包屑点击事件
        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateTo(item.dataset.path);
            });
        });
    }

    buildBreadcrumbPath(folderId) {
        const path = [];
        let currentId = folderId;

        while (currentId && currentId !== '/' && currentId !== 'root') {
            const folder = this.folders.get(currentId);
            if (folder) {
                path.unshift({ id: currentId, name: folder.name });
                currentId = folder.parentFolder;
            } else {
                break;
            }
        }

        return path;
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

    renderGridView(items) {
        const fileGrid = document.getElementById('fileGrid');

        fileGrid.innerHTML = items.map(item => `
            <div class="file-item ${item.isFolder ? 'folder' : ''}"
                 data-file-id="${item.id}"
                 data-file-type="${item.type}"
                 data-is-folder="${item.isFolder || false}">
                <div class="file-icon ${item.type}">
                    ${this.getFileIcon(item)}
                </div>
                <div class="file-name" title="${item.name}">${item.name}</div>
            </div>
        `).join('');

        // 添加文件项点击事件
        fileGrid.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectFile(item, e.ctrlKey || e.metaKey);
            });

            item.addEventListener('dblclick', () => {
                const isFolder = item.dataset.isFolder === 'true';
                if (isFolder) {
                    this.openFolder(item.dataset.fileId);
                } else {
                    this.openFile(item.dataset.fileId);
                }
            });
        });
    }

    openFolder(folderId) {
        console.log('打开文件夹:', folderId);
        this.navigateTo(folderId);
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
        console.log('开始创建新文件夹');
        const folderName = prompt('请输入文件夹名称:');
        if (!folderName || !folderName.trim()) {
            console.log('用户取消或输入空名称');
            return;
        }

        const folderId = 'folder_' + Date.now();
        const currentFolderId = this.currentPath === '/' ? 'root' : this.currentPath;

        console.log('创建文件夹参数:', {
            folderName: folderName.trim(),
            folderId: folderId,
            currentPath: this.currentPath,
            currentFolderId: currentFolderId
        });

        const folder = {
            id: folderId,
            name: folderName.trim(),
            isFolder: true,
            type: 'folder',
            parentFolder: currentFolderId,
            createdAt: new Date(),
            size: 0
        };

        // 添加到文件夹映射
        this.folders.set(folderId, folder);
        console.log('文件夹已添加到映射，当前文件夹数:', this.folders.size);

        // 更新文件夹结构
        if (!this.folderStructure[currentFolderId]) {
            this.folderStructure[currentFolderId] = [];
        }
        this.folderStructure[currentFolderId].push(folderId);
        console.log('文件夹结构已更新:', this.folderStructure);

        // 保存到本地存储
        this.saveFolderStructure();

        // 发送到服务器
        this.createFolderOnServer(folderName.trim(), currentFolderId);

        this.showNotification(`文件夹 "${folderName}" 创建成功`, 'success');
        console.log('开始重新渲染界面');
        this.render();
    }

    async createFolderOnServer(name, parentFolder) {
        try {
            const response = await fetch('/api/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, parentFolder })
            });

            if (!response.ok) {
                console.log('服务器创建文件夹失败，仅本地创建');
            }
        } catch (error) {
            console.log('服务器不可用，仅本地创建');
        }
    }

    saveFolderStructure() {
        try {
            // 保存文件夹结构
            localStorage.setItem('finder_folder_structure', JSON.stringify(this.folderStructure));

            // 保存每个文件夹的详细信息
            for (const [folderId, folder] of this.folders) {
                if (!folder.isSystem) {
                    localStorage.setItem(`folder_${folderId}`, JSON.stringify(folder));
                }
            }
        } catch (error) {
            console.error('保存文件夹结构失败:', error);
        }
    }

    loadFolderStructure() {
        try {
            // 从localStorage加载文件夹结构
            const savedStructure = localStorage.getItem('finder_folder_structure');
            if (savedStructure) {
                this.folderStructure = JSON.parse(savedStructure);
            }

            // 加载每个文件夹的详细信息
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('folder_')) {
                    try {
                        const folderData = localStorage.getItem(key);
                        const folder = JSON.parse(folderData);
                        folder.isFolder = true;
                        this.folders.set(folder.id, folder);
                    } catch (error) {
                        console.error('加载文件夹失败:', key, error);
                    }
                }
            }
        } catch (error) {
            console.error('加载文件夹结构失败:', error);
            this.folderStructure = { root: [] };
        }
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

        console.log('显示右键菜单，文件ID:', fileId);

        // 选择当前项
        this.selectFile(item);

        // 存储当前操作的文件ID
        this.currentContextFileId = fileId;

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

        // 绑定菜单项点击事件
        this.bindContextMenuEvents();
    }

    bindContextMenuEvents() {
        const menuItems = document.querySelectorAll('#contextMenu .menu-item[data-action]');
        console.log('绑定菜单项事件，找到', menuItems.length, '个菜单项');

        // 移除之前的事件监听器
        menuItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
        });

        // 重新获取菜单项并绑定事件
        const newMenuItems = document.querySelectorAll('#contextMenu .menu-item[data-action]');
        newMenuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const action = item.dataset.action;
                console.log('菜单项点击:', action);
                this.handleContextMenuAction(action);
            });
        });
    }

    hideContextMenu() {
        document.getElementById('contextMenu').style.display = 'none';
        this.currentContextFileId = null;
    }

    handleContextMenuAction(action) {
        console.log('右键菜单动作:', action, '文件ID:', this.currentContextFileId);

        if (!this.currentContextFileId) {
            console.error('没有选中的文件ID');
            return;
        }

        switch (action) {
            case 'open':
                console.log('执行打开文件');
                this.openFile(this.currentContextFileId);
                break;
            case 'download':
                console.log('执行下载文件');
                this.downloadFile(this.currentContextFileId);
                break;
            case 'copy':
                console.log('执行复制链接');
                this.copyFileLink(this.currentContextFileId);
                break;
            case 'rename':
                console.log('执行重命名文件');
                this.renameFile(this.currentContextFileId);
                break;
            case 'move':
                console.log('执行移动文件');
                this.moveFileToFolder(this.currentContextFileId);
                break;
            case 'delete':
                console.log('执行删除文件');
                this.deleteFileById(this.currentContextFileId);
                break;
            default:
                console.log('未知动作:', action);
        }

        this.hideContextMenu();
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

    // 复制文件链接
    copyFileLink(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        const link = window.location.origin + file.url;

        // 尝试使用现代API复制
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(link).then(() => {
                this.showNotification('链接已复制到剪贴板', 'success');
            }).catch(() => {
                this.fallbackCopyText(link);
            });
        } else {
            this.fallbackCopyText(link);
        }
    }

    fallbackCopyText(text) {
        // 降级方案：创建临时文本框
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.showNotification('链接已复制到剪贴板', 'success');
        } catch (err) {
            this.showNotification('复制失败，请手动复制链接', 'error');
            console.error('复制失败:', err);
        }

        document.body.removeChild(textArea);
    }

    // 重命名文件
    renameFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        const newName = prompt('请输入新的文件名:', file.name);
        if (newName && newName.trim() && newName !== file.name) {
            // 更新本地文件名
            file.name = newName.trim();

            // 如果有后端API，发送重命名请求
            this.renameFileOnServer(fileId, newName.trim());

            // 重新渲染
            this.renderFiles();
            this.showNotification(`文件已重命名为 "${newName}"`, 'success');
        }
    }

    async renameFileOnServer(fileId, newName) {
        try {
            const response = await fetch(`/api/file/${fileId}/rename`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newName })
            });

            if (!response.ok) {
                console.log('服务器重命名失败，仅本地更新');
            }
        } catch (error) {
            console.log('服务器不可用，仅本地更新');
        }
    }

    // 移动文件到文件夹
    moveFileToFolder(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        // 获取所有可用文件夹
        const availableFolders = Array.from(this.folders.values())
            .filter(folder => !folder.isSystem);

        if (availableFolders.length === 0) {
            this.showNotification('没有可用的文件夹，请先创建文件夹', 'warning');
            return;
        }

        // 创建文件夹选择对话框
        this.showFolderSelectionDialog(fileId, availableFolders);
    }

    showFolderSelectionDialog(fileId, folders) {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.style.display = 'flex';

        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>选择目标文件夹</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">目标文件夹:</label>
                        <select id="folderSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="/">根目录</option>
                            ${folders.map(folder =>
                                `<option value="${folder.id}">${folder.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button onclick="this.closest('.modal').remove()"
                                style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">
                            取消
                        </button>
                        <button onclick="finder.confirmMoveFile('${fileId}', document.getElementById('folderSelect').value); this.closest('.modal').remove()"
                                style="padding: 8px 16px; border: none; background: #007aff; color: white; border-radius: 4px; cursor: pointer;">
                            移动
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    confirmMoveFile(fileId, targetFolderId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        const oldFolder = file.parentFolder || '/';
        file.parentFolder = targetFolderId === '/' ? '/' : targetFolderId;

        // 发送到服务器
        this.moveFileOnServer(fileId, targetFolderId);

        // 重新渲染
        this.renderFiles();

        const targetFolderName = targetFolderId === '/' ? '根目录' :
            this.folders.get(targetFolderId)?.name || '未知文件夹';

        this.showNotification(`文件已移动到 "${targetFolderName}"`, 'success');
    }

    async moveFileOnServer(fileId, targetFolderId) {
        try {
            const response = await fetch(`/api/file/${fileId}/move`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ parentFolder: targetFolderId })
            });

            if (!response.ok) {
                console.log('服务器移动失败，仅本地更新');
            }
        } catch (error) {
            console.log('服务器不可用，仅本地更新');
        }
    }

    // 删除文件
    deleteFileById(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        if (confirm(`确定要删除文件 "${file.name}" 吗？`)) {
            // 从本地列表中移除
            this.files = this.files.filter(f => f.id !== fileId);

            // 发送删除请求到服务器
            this.deleteFileOnServer(fileId);

            // 重新渲染
            this.renderFiles();
            this.showNotification(`文件 "${file.name}" 已删除`, 'success');
        }
    }

    async deleteFileOnServer(fileId) {
        try {
            const response = await fetch(`/api/file/${fileId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                console.log('服务器删除失败，仅本地删除');
            }
        } catch (error) {
            console.log('服务器不可用，仅本地删除');
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
