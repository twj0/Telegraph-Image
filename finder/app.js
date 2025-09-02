// Telegraph Finder - 主应用程序
// 极简版Telegraph图片查看器
class SimpleImageViewer {
    constructor() {
        this.images = [];
        this.loading = false;

        console.log('🚀 Simple Image Viewer 启动...');
        this.init();
    }

    async init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    }

    async start() {
        console.log('📸 开始加载图片...');

        // 隐藏加载状态，显示内容区域
        this.hideLoading();

        // 绑定基本事件
        this.bindEvents();

        // 加载图片
        await this.loadImages();

        // 渲染图片
        this.renderImages();

        console.log('✅ 图片加载完成');
    }

    hideLoading() {
        const loadingElement = document.querySelector('.loading-state');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        // 显示主要内容
        const fileArea = document.querySelector('.file-area');
        if (fileArea) {
            fileArea.style.display = 'block';
        }
    }

    bindEvents() {
        // 上传按钮
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });
        }

        // 文件输入
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
            });
        }
    }

    async loadImages() {
        console.log('📸 加载图片列表...');

        try {
            const response = await fetch('/api/manage/list');
            if (response.ok) {
                const data = await response.json();
                this.images = this.filterImages(data);
                console.log(`✅ 加载了 ${this.images.length} 张图片`);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('🎭 API不可用，使用演示数据');
            this.images = this.getDemoImages();
        }
    }

    filterImages(files) {
        if (!Array.isArray(files)) return [];

        return files
            .filter(file => this.isImageFile(file.name))
            .map(file => ({
                id: file.name,
                name: file.metadata?.fileName || file.name,
                size: file.metadata?.fileSize || 0,
                url: `/file/${file.name}`,
                uploadDate: new Date(file.metadata?.TimeStamp || Date.now())
            }))
            .sort((a, b) => b.uploadDate - a.uploadDate);
    }

    isImageFile(filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
        const ext = filename.split('.').pop().toLowerCase();
        return imageExtensions.includes(ext);
    }

    getDemoImages() {
        return [
            {
                id: 'demo_1',
                name: '演示图片1.jpg',
                size: 1024000,
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzQyODVmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuekuuS+i+WbvueJhzE8L3RleHQ+PC9zdmc+',
                uploadDate: new Date(Date.now() - 86400000)
            },
            {
                id: 'demo_2',
                name: '演示图片2.png',
                size: 2048000,
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM0Yzc1OSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuekuuS+i+WbvueJhzI8L3RleHQ+PC9zdmc+',
                uploadDate: new Date(Date.now() - 172800000)
            },
            {
                id: 'demo_3',
                name: '演示图片3.jpg',
                size: 1536000,
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmOTUwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuekuuS+i+WbvueJhzM8L3RleHQ+PC9zdmc+',
                uploadDate: new Date(Date.now() - 259200000)
            }
        ];
    }

    testNewFolderButton() {
        const newFolderBtn = document.getElementById('newFolderBtn');
        if (newFolderBtn) {
            console.log('✅ 新建文件夹按钮找到');
        } else {
            console.error('❌ 新建文件夹按钮未找到');
        }
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
            console.log('🖱️ 右键点击事件触发');
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                console.log('✅ 找到文件项，显示右键菜单');
                e.preventDefault();
                this.showContextMenu(e, fileItem);
            } else {
                console.log('❌ 未找到文件项');
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

    // 获取当前显示的图片列表
    getCurrentImages() {
        let filteredImages = [...this.images];

        // 根据当前过滤器筛选
        switch (this.currentFilter) {
            case 'recent':
                // 最近7天上传的图片
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                filteredImages = filteredImages.filter(img => img.uploadDate > weekAgo);
                break;
            case 'favorites':
                // 收藏的图片
                filteredImages = filteredImages.filter(img => img.favorite);
                break;
            case 'all':
            default:
                // 显示所有图片
                break;
        }

        console.log(`📸 当前显示 ${filteredImages.length} 张图片 (过滤器: ${this.currentFilter})`);
        return filteredImages;
    }

    // 防抖渲染机制
    render() {
        // 如果正在渲染，取消之前的渲染
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        // 使用requestAnimationFrame确保在下一帧渲染
        this.animationFrame = requestAnimationFrame(() => {
            this.performRender();
        });
    }

    performRender() {
        if (this.isRendering) return;

        this.isRendering = true;
        const startTime = performance.now();

        try {
            this.updateSidebar();
            this.renderImages();
            this.updateToolbar();

            const renderTime = performance.now() - startTime;
            console.log(`🎨 渲染完成，耗时: ${renderTime.toFixed(2)}ms`);
        } finally {
            this.isRendering = false;
            this.lastRenderTime = performance.now();
        }
    }

    // 快速渲染（仅更新必要部分）
    quickRender(components = []) {
        if (components.length === 0) {
            this.render();
            return;
        }

        this.animationFrame = requestAnimationFrame(() => {
            components.forEach(component => {
                switch (component) {
                    case 'files':
                        this.renderFiles();
                        break;
                    case 'sidebar':
                        this.updateSidebar();
                        break;
                    case 'breadcrumb':
                        this.updateBreadcrumb();
                        break;
                    case 'toolbar':
                        this.updateToolbar();
                        break;
                }
            });
        });
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

    renderImages() {
        const currentImages = this.getCurrentImages();
        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');

        if (currentImages.length === 0) {
            // 平滑隐藏图片视图
            this.hideImageViews();
            // 显示空状态
            setTimeout(() => {
                emptyState.style.display = 'flex';
            }, 150);
            return;
        }

        // 隐藏空状态
        emptyState.style.display = 'none';

        if (this.viewMode === 'grid') {
            this.switchToGridView(currentImages);
        } else {
            this.switchToListView(currentImages);
        }
    }

    hideFileViews() {
        const fileGrid = document.getElementById('fileGrid');
        const fileList = document.getElementById('fileList');

        fileGrid.classList.remove('show');
        fileList.classList.remove('show');

        setTimeout(() => {
            fileGrid.style.display = 'none';
            fileList.style.display = 'none';
        }, 300);
    }

    switchToGridView(files) {
        const fileGrid = document.getElementById('fileGrid');
        const fileList = document.getElementById('fileList');

        // 先隐藏列表视图
        fileList.classList.remove('show');

        setTimeout(() => {
            fileList.style.display = 'none';

            // 渲染网格视图
            this.renderGridView(files);
            fileGrid.style.display = 'grid';

            // 触发显示动画
            requestAnimationFrame(() => {
                fileGrid.classList.add('show');
            });
        }, fileList.classList.contains('show') ? 150 : 0);
    }

    switchToListView(files) {
        const fileGrid = document.getElementById('fileGrid');
        const fileList = document.getElementById('fileList');

        // 先隐藏网格视图
        fileGrid.classList.remove('show');

        setTimeout(() => {
            fileGrid.style.display = 'none';

            // 渲染列表视图
            this.renderListView(files);
            fileList.style.display = 'block';

            // 触发显示动画
            requestAnimationFrame(() => {
                fileList.classList.add('show');
            });
        }, fileGrid.classList.contains('show') ? 150 : 0);
    }

    renderGridView(items) {
        const fileGrid = document.getElementById('fileGrid');

        // 如果文件数量超过阈值，启用虚拟滚动
        if (items.length > 100) {
            this.renderVirtualGrid(items);
            return;
        }

        // 正常渲染
        fileGrid.innerHTML = items.map((item, index) => `
            <div class="file-item ${item.isFolder ? 'folder' : ''}"
                 data-file-id="${item.id}"
                 data-file-type="${item.type}"
                 data-is-folder="${item.isFolder || false}"
                 style="animation-delay: ${Math.min(index * 0.05, 0.5)}s">
                <div class="file-icon ${item.type}">
                    ${this.getFileIcon(item)}
                </div>
                <div class="file-name" title="${item.name}">${item.name}</div>
            </div>
        `).join('');

        // 添加文件项点击事件
        this.bindFileItemEvents(fileGrid);
    }

    renderVirtualGrid(items) {
        const fileGrid = document.getElementById('fileGrid');
        const container = fileGrid.parentElement;

        // 计算可见区域
        const containerRect = container.getBoundingClientRect();
        this.containerHeight = containerRect.height;

        const itemsPerRow = Math.floor(containerRect.width / 140); // 120px + 20px gap
        const rowHeight = 140; // 120px + 20px gap

        const startRow = Math.floor(this.scrollTop / rowHeight);
        const endRow = Math.min(
            startRow + Math.ceil(this.containerHeight / rowHeight) + 2,
            Math.ceil(items.length / itemsPerRow)
        );

        const startIndex = startRow * itemsPerRow;
        const endIndex = Math.min(endRow * itemsPerRow, items.length);

        // 清空并重新渲染可见项
        fileGrid.innerHTML = '';
        fileGrid.style.height = `${Math.ceil(items.length / itemsPerRow) * rowHeight}px`;
        fileGrid.style.paddingTop = `${startRow * rowHeight}px`;

        const visibleItems = items.slice(startIndex, endIndex);
        fileGrid.innerHTML = visibleItems.map(item => `
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

        this.bindFileItemEvents(fileGrid);
        console.log(`🎯 虚拟滚动: 渲染 ${endIndex - startIndex} / ${items.length} 项`);
    }

    bindFileItemEvents(container) {
        container.querySelectorAll('.file-item').forEach(item => {
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

        // 添加关闭按钮
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span style="flex: 1;">${message}</span>
                <button class="notification-close" style="background: none; border: none; color: #999; cursor: pointer; padding: 4px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // 添加关闭按钮事件
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });

        notifications.appendChild(notification);

        // 3秒后自动移除
        const autoRemoveTimer = setTimeout(() => {
            this.removeNotification(notification);
        }, 3000);

        // 鼠标悬停时暂停自动移除
        notification.addEventListener('mouseenter', () => {
            clearTimeout(autoRemoveTimer);
        });

        // 鼠标离开时重新开始计时
        notification.addEventListener('mouseleave', () => {
            setTimeout(() => {
                this.removeNotification(notification);
            }, 1000);
        });
    }

    removeNotification(notification) {
        if (!notification.parentNode) return;

        // 添加移除动画
        notification.classList.add('removing');

        // 动画完成后移除元素
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
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

    // 视图切换 - 优化动画效果
    toggleViewMode() {
        const viewModeBtn = document.getElementById('viewModeBtn');

        // 添加点击动画
        viewModeBtn.style.transform = 'scale(0.9)';

        setTimeout(() => {
            this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
            viewModeBtn.innerHTML = this.viewMode === 'grid' ?
                '<i class="fas fa-list"></i>' : '<i class="fas fa-th"></i>';

            // 恢复按钮大小
            viewModeBtn.style.transform = 'scale(1)';

            // 平滑切换视图
            this.renderFiles();

            // 显示切换提示
            this.showNotification(
                `已切换到${this.viewMode === 'grid' ? '网格' : '列表'}视图`,
                'success'
            );
        }, 100);
    }

    // 文件上传
    showUploadDialog() {
        document.getElementById('fileInput').click();
    }

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        // 验证文件
        const validFiles = [];
        const invalidFiles = [];

        for (let file of files) {
            if (this.isImageFile(file.name)) {
                if (file.size <= 50 * 1024 * 1024) { // 50MB限制
                    validFiles.push(file);
                } else {
                    invalidFiles.push(`${file.name} (文件过大，限制50MB)`);
                }
            } else {
                invalidFiles.push(`${file.name} (不支持的格式)`);
            }
        }

        // 显示无效文件警告
        if (invalidFiles.length > 0) {
            this.showNotification(`以下文件无法上传: ${invalidFiles.join(', ')}`, 'warning');
        }

        if (validFiles.length === 0) {
            this.showNotification('没有有效的图片文件可上传', 'error');
            return;
        }

        // 逐个上传文件
        for (let file of validFiles) {
            await this.uploadImage(file);
        }
    }

    async uploadImage(file) {
        console.log('📤 开始上传图片:', file.name);
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ 上传成功:', result);
                this.showNotification(`图片 "${file.name}" 上传成功！`, 'success');
                
                // 等待1秒确保服务器处理完成
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 强制刷新图片列表
                await this.loadImages(true);
                this.renderImages();
                
                console.log('🔄 图片列表已刷新');
            } else {
                const errorText = await response.text();
                console.error('❌ 上传失败:', response.status, errorText);
                this.showNotification(`上传失败: ${response.status} ${errorText}`, 'error');
            }
        } catch (error) {
            console.error('❌ 上传异常:', error);
            this.showNotification('上传失败：' + error.message, 'error');
        }
    }

    // 新建文件夹
    createNewFolder() {
        console.log('🧪 开始创建新文件夹');

        // 立即显示创建中状态
        this.showNotification('正在创建文件夹...', 'info');

        const folderName = prompt('请输入文件夹名称:');
        if (!folderName || !folderName.trim()) {
            console.log('❌ 用户取消或输入空名称');
            return;
        }

        const folderId = 'folder_' + Date.now();

        console.log('📁 创建文件夹:', {
            folderName: folderName.trim(),
            folderId: folderId,
            currentPath: this.currentPath
        });

        const folder = {
            id: folderId,
            name: folderName.trim(),
            isFolder: true,
            type: 'folder',
            parentFolder: this.currentPath,
            createdAt: new Date(),
            size: 0,
            url: '#folder',
            isCreating: true // 标记为创建中
        };

        // 立即添加到界面（乐观更新）
        this.files.unshift(folder);
        this.folders.set(folderId, folder);

        // 立即渲染，提供即时反馈
        this.quickRender(['files', 'sidebar']);

        // 异步保存到本地存储
        setTimeout(() => {
            try {
                const existingFolders = JSON.parse(localStorage.getItem('finder_folders') || '[]');
                existingFolders.push(folder);
                localStorage.setItem('finder_folders', JSON.stringify(existingFolders));
                console.log('✅ 文件夹已保存到localStorage');

                // 移除创建中标记
                folder.isCreating = false;
                this.quickRender(['files']);

            } catch (error) {
                console.error('❌ 保存文件夹失败:', error);
                // 如果保存失败，从界面移除
                this.files = this.files.filter(f => f.id !== folderId);
                this.folders.delete(folderId);
                this.quickRender(['files', 'sidebar']);
                this.showNotification('文件夹创建失败', 'error');
                return;
            }

            // 发送到服务器（如果可用）
            this.createFolderOnServer(folderName.trim(), this.currentPath);

            this.showNotification(`文件夹 "${folderName}" 创建成功`, 'success');
        }, 50); // 50ms延迟，确保UI更新完成
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
            console.log('🗂️ 开始加载文件夹结构...');

            // 从localStorage加载文件夹结构
            const savedStructure = localStorage.getItem('finder_folder_structure');
            if (savedStructure) {
                this.folderStructure = JSON.parse(savedStructure);
                console.log('✅ 文件夹结构已加载:', this.folderStructure);
            } else {
                console.log('⚠️ 未找到保存的文件夹结构，使用默认结构');
                this.folderStructure = { root: [] };
            }

            // 加载每个文件夹的详细信息
            let loadedFolders = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('folder_')) {
                    try {
                        const folderData = localStorage.getItem(key);
                        const folder = JSON.parse(folderData);
                        folder.isFolder = true;
                        this.folders.set(folder.id, folder);
                        loadedFolders++;
                        console.log('📁 加载文件夹:', folder.name, folder.id);
                    } catch (error) {
                        console.error('❌ 加载文件夹失败:', key, error);
                    }
                }
            }

            console.log(`✅ 文件夹加载完成，共加载 ${loadedFolders} 个自定义文件夹`);
            console.log('📊 当前文件夹映射:', Array.from(this.folders.keys()));

        } catch (error) {
            console.error('❌ 加载文件夹结构失败:', error);
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

    // 右键菜单 - 优化动画效果
    showContextMenu(e, item) {
        const contextMenu = document.getElementById('contextMenu');
        const fileId = item.dataset.fileId;

        console.log('显示右键菜单，文件ID:', fileId);

        // 选择当前项
        this.selectFile(item);

        // 存储当前操作的文件ID
        this.currentContextFileId = fileId;

        // 先隐藏菜单（如果已显示）
        contextMenu.classList.remove('show');
        contextMenu.classList.add('hide');

        // 设置位置
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';

        // 确保菜单不超出屏幕
        requestAnimationFrame(() => {
            const rect = contextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                contextMenu.style.left = (e.pageX - rect.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                contextMenu.style.top = (e.pageY - rect.height) + 'px';
            }

            // 显示动画
            contextMenu.classList.remove('hide');
            contextMenu.classList.add('show');
        });

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
        const contextMenu = document.getElementById('contextMenu');

        // 添加隐藏动画
        contextMenu.classList.remove('show');
        contextMenu.classList.add('hide');

        // 动画完成后隐藏元素
        setTimeout(() => {
            contextMenu.style.display = 'none';
            contextMenu.classList.remove('hide');
        }, 100);

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
            // 使用Telegraph的删除API
            const response = await fetch(`/api/manage/delete/${fileId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log('✅ 服务器删除成功');
            } else {
                console.log('⚠️ 服务器删除失败，仅本地删除');
            }
        } catch (error) {
            console.log('🎭 服务器不可用，仅本地删除');
        }
    }

    renderImages() {
        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');

        if (!fileGrid) {
            console.error('❌ 找不到fileGrid元素');
            return;
        }

        if (this.images.length === 0) {
            // 显示空状态
            if (emptyState) emptyState.style.display = 'flex';
            fileGrid.style.display = 'none';
            return;
        }

        // 隐藏空状态，显示图片网格
        if (emptyState) emptyState.style.display = 'none';
        fileGrid.style.display = 'grid';

        // 渲染图片
        fileGrid.innerHTML = this.images.map(image => `
            <div class="file-item" data-image-id="${image.id}">
                <div class="file-icon image">
                    <img src="${image.url}" alt="${image.name}" loading="lazy"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mH5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg=='">
                </div>
                <div class="file-name" title="${image.name}">${image.name}</div>
                <div class="file-size">${this.formatFileSize(image.size)}</div>
            </div>
        `).join('');

        // 绑定点击事件
        this.bindImageEvents();

        console.log(`✅ 渲染了 ${this.images.length} 张图片`);
    }

    bindImageEvents() {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            item.addEventListener('click', () => {
                const imageId = item.dataset.imageId;
                const image = this.images.find(img => img.id === imageId);
                if (image) {
                    this.showImagePreview(image);
                }
            });

            // 右键菜单
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, item.dataset.imageId);
            });
        });
    }

    showImagePreview(image) {
        // 简单的图片预览 - 在新窗口打开
        window.open(image.url, '_blank');
    }

    showContextMenu(e, imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        // 简单的右键菜单
        const menu = [
            `📋 复制链接: ${window.location.origin}${image.url}`,
            `📥 下载图片`,
            `🗑️ 删除图片`
        ];

        const action = prompt('选择操作:\n' + menu.join('\n') + '\n\n输入数字 (1-3):');

        switch(action) {
            case '1':
                this.copyToClipboard(window.location.origin + image.url);
                break;
            case '2':
                this.downloadImage(image);
                break;
            case '3':
                this.deleteImage(imageId);
                break;
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('链接已复制到剪贴板！');
        }).catch(() => {
            prompt('请手动复制链接:', text);
        });
    }

    downloadImage(image) {
        const link = document.createElement('a');
        link.href = image.url;
        link.download = image.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('开始下载图片', 'info');
    }

    async deleteImage(imageId) {
        if (!confirm('确定要删除这张图片吗？')) return;

        try {
            const response = await fetch(`/api/manage/delete/${imageId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // 从列表中移除
                this.images = this.images.filter(img => img.id !== imageId);
                this.renderImages();
                alert('图片删除成功！');
            } else {
                alert('删除失败，请重试');
            }
        } catch (error) {
            alert('删除失败：' + error.message);
        }
    }


    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 全局变量，用于HTML中的onclick调用
let finder;
window.app = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    finder = new TelegraphFinder();
    window.app = finder;
});

// 全局函数（供HTML调用）
function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
}

// 处理文件上传 - 使用后台软进度条
async function handleFileUpload(files) {
    if (!files || files.length === 0) return;

    // 导入配置
    const { CONFIG, Utils } = await import('./config.js');

    // 验证文件
    const validFiles = [];
    const invalidFiles = [];

    for (let file of files) {
        if (Utils.isValidImageFile(file.name)) {
            if (Utils.isValidFileSize(file.size)) {
                validFiles.push(file);
            } else {
                invalidFiles.push(`${file.name} (文件过大，限制${Utils.formatFileSize(CONFIG.UPLOAD.MAX_FILE_SIZE)})`);
            }
        } else {
            invalidFiles.push(`${file.name} (不支持的格式)`);
        }
    }

    // 显示无效文件警告
    if (invalidFiles.length > 0) {
        finder.showNotification(`以下文件无法上传: ${invalidFiles.join(', ')}`, 'warning');
    }

    if (validFiles.length === 0) {
        finder.showNotification('没有有效的图片文件可上传', 'error');
        return;
    }

    // 使用后台上传
    for (let file of validFiles) {
        finder.createBackgroundUploadTask(file);
    }
}

// 创建后台上传任务
function createBackgroundUploadTask(file) {
    const container = document.getElementById('backgroundUploadContainer');
    const taskId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const taskElement = document.createElement('div');
    taskElement.className = 'upload-task';
    taskElement.id = taskId;
    taskElement.innerHTML = `
        <div class="upload-task-header">
            <div class="upload-task-info">
                <div class="upload-task-name" title="${file.name}">${file.name}</div>
                <div class="upload-task-status">准备上传...</div>
            </div>
            <button class="upload-task-close" onclick="app.cancelUploadTask('${taskId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="upload-progress-bar">
            <div class="upload-progress-fill" style="width: 0%"></div>
        </div>
    `;
    
    container.appendChild(taskElement);
    
    // 开始上传
    finder.performBackgroundUpload(file, taskId);
}

// 执行后台上传
async function performBackgroundUpload(file, taskId) {
    const taskElement = document.getElementById(taskId);
    const statusElement = taskElement.querySelector('.upload-task-status');
    const progressFill = taskElement.querySelector('.upload-progress-fill');
    
    try {
        statusElement.textContent = '上传中...';
        
        // 模拟上传进度
        for (let i = 0; i <= 90; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            progressFill.style.width = i + '%';
            statusElement.textContent = `上传中... ${i}%`;
        }

        const formData = new FormData();
        formData.append('file', file);

        // 尝试多个上传端点
        const endpoints = ['/upload', '../upload', '/functions/upload'];
        let uploadSuccess = false;
        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint + '?t=' + Date.now(), {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    uploadSuccess = true;
                    
                    // 上传成功
                    progressFill.style.width = '100%';
                    statusElement.textContent = '上传完成';
                    taskElement.classList.add('success');
                    
                    finder.showNotification(`${file.name} 上传成功！`, 'success');
                    
                    // 刷新图片列表
                    setTimeout(async () => {
                        await finder.loadImages(true);
                        finder.renderImages();
                    }, 1000);
                    
                    break;
                }
            } catch (error) {
                lastError = error;
                continue;
            }
        }

        if (!uploadSuccess) {
            throw lastError || new Error('所有上传端点都失败');
        }

    } catch (error) {
        console.error('❌ 上传失败:', error);
        
        // 上传失败
        progressFill.style.width = '100%';
        statusElement.textContent = '上传失败';
        taskElement.classList.add('error');
        
        finder.showNotification(`${file.name} 上传失败: ${error.message}`, 'error');
    }
    
    // 3秒后自动移除任务
    setTimeout(() => {
        taskElement.classList.add('completed');
        setTimeout(() => {
            if (taskElement.parentNode) {
                taskElement.parentNode.removeChild(taskElement);
            }
        }, 300);
    }, 3000);
}

// 取消上传任务
function cancelUploadTask(taskId) {
    const taskElement = document.getElementById(taskId);
    if (taskElement) {
        taskElement.classList.add('completed');
        setTimeout(() => {
            if (taskElement.parentNode) {
                taskElement.parentNode.removeChild(taskElement);
            }
        }, 300);
    }
}

// 初始化右键菜单
function initContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    let currentImageItem = null;

    // 监听右键点击
    document.addEventListener('contextmenu', (e) => {
        const imageItem = e.target.closest('.image-item');
        if (imageItem) {
            e.preventDefault();
            currentImageItem = imageItem;
            finder.showContextMenu(e.pageX, e.pageY, imageItem);
        } else {
            finder.hideContextMenu();
        }
    });

    // 监听点击其他地方隐藏菜单
    document.addEventListener('click', () => {
        finder.hideContextMenu();
    });

    // 监听ESC键隐藏菜单
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            finder.hideContextMenu();
        }
    });
}

// 显示右键菜单
async function showContextMenu(x, y, imageItem) {
    const { CONFIG } = await import('./config.js');
    const contextMenu = document.getElementById('contextMenu');
    const imageData = JSON.parse(imageItem.dataset.image);
    
    // 清除之前的选中状态
    document.querySelectorAll('.image-item.context-selected').forEach(item => {
        item.classList.remove('context-selected');
    });
    
    // 标记当前选中项
    imageItem.classList.add('context-selected');
    
    // 生成菜单项
    contextMenu.innerHTML = CONFIG.CONTEXT_MENU.ITEMS.map(item => {
        if (item.type === 'separator') {
            return '<div class="context-menu-separator"></div>';
        }
        
        const dangerClass = item.danger ? ' danger' : '';
        return `
            <div class="context-menu-item${dangerClass}" data-action="${item.action}">
                <i class="${item.icon}"></i>
                ${item.label}
            </div>
        `;
    }).join('');
    
    // 绑定菜单项点击事件
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            finder.handleContextMenuAction(action, imageData, imageItem);
            finder.hideContextMenu();
        });
    });
    
    // 定位菜单
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('show');
    
    // 确保菜单不超出屏幕
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = (y - rect.height) + 'px';
    }
}

// 隐藏右键菜单
function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.classList.remove('show');
    
    // 清除选中状态
    document.querySelectorAll('.image-item.context-selected').forEach(item => {
        item.classList.remove('context-selected');
    });
}

// 处理右键菜单动作
async function handleContextMenuAction(action, imageData, imageItem) {
    const { Utils } = await import('./config.js');
    
    switch (action) {
        case 'preview':
            finder.previewImage(imageData);
            break;
            
        case 'copyLink':
            const success = await Utils.copyToClipboard(imageData.url);
            finder.showNotification(success ? '链接已复制到剪贴板' : '复制失败', success ? 'success' : 'error');
            break;
            
        case 'copyMarkdown':
            const markdown = `![${imageData.name}](${imageData.url})`;
            const mdSuccess = await Utils.copyToClipboard(markdown);
            finder.showNotification(mdSuccess ? 'Markdown已复制到剪贴板' : '复制失败', mdSuccess ? 'success' : 'error');
            break;
            
        case 'copyHtml':
            const html = `<img src="${imageData.url}" alt="${imageData.name}" />`;
            const htmlSuccess = await Utils.copyToClipboard(html);
            finder.showNotification(htmlSuccess ? 'HTML已复制到剪贴板' : '复制失败', htmlSuccess ? 'success' : 'error');
            break;
            
        case 'download':
            finder.downloadImage(imageData);
            break;
            
        case 'toggleFavorite':
            finder.toggleFavorite(imageData, imageItem);
            break;
            
        case 'rename':
            finder.renameImage(imageData, imageItem);
            break;
            
        case 'move':
            finder.moveImage(imageData);
            break;
            
        case 'delete':
            finder.deleteImage(imageData, imageItem);
            break;
    }
}

// 预览图片
function previewImage(imageData) {
    const modal = document.getElementById('previewModal');
    const img = document.getElementById('previewImage');
    const info = document.getElementById('previewImageInfo');
    
    img.src = imageData.url;
    img.alt = imageData.name;
    
    info.innerHTML = `
        <strong>文件名:</strong> ${imageData.name}<br>
        <strong>大小:</strong> ${imageData.size ? finder.formatFileSize(imageData.size) : '未知'}<br>
        <strong>上传时间:</strong> ${imageData.uploadDate ? new Date(imageData.uploadDate).toLocaleString() : '未知'}<br>
        <strong>链接:</strong> <code>${imageData.url}</code>
    `;
    
    // 使用Bootstrap模态框
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// 下载图片
function downloadImage(imageData) {
    const link = document.createElement('a');
    link.href = imageData.url;
    link.download = imageData.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    finder.showNotification('开始下载图片', 'info');
}

// 切换收藏状态
function toggleFavorite(imageData, imageItem) {
    imageData.favorite = !imageData.favorite;
    
    // 更新UI
    const favoriteIcon = imageItem.querySelector('.favorite-mark');
    if (imageData.favorite) {
        if (!favoriteIcon) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-star favorite-mark';
            imageItem.appendChild(icon);
        }
        finder.showNotification('已添加到收藏', 'success');
    } else {
        if (favoriteIcon) {
            favoriteIcon.remove();
        }
        finder.showNotification('已从收藏中移除', 'info');
    }
    
    // 保存到本地存储
    finder.saveFavorites();
}

// 重命名图片
function renameImage(imageData, imageItem) {
    const newName = prompt('请输入新的文件名:', imageData.name);
    if (newName && newName.trim() && newName !== imageData.name) {
        imageData.name = newName.trim();
        
        // 更新UI
        const nameElement = imageItem.querySelector('.image-name');
        if (nameElement) {
            nameElement.textContent = imageData.name;
        }
        
        finder.showNotification('文件已重命名', 'success');
    }
}

// 移动图片
function moveImage(imageData) {
    finder.showNotification('移动功能开发中...', 'info');
}

// 删除图片
function deleteImage(imageData, imageItem) {
    if (confirm(`确定要删除图片 "${imageData.name}" 吗？`)) {
        // 从列表中移除
        const index = finder.images.findIndex(f => f.id === imageData.id);
        if (index > -1) {
            finder.images.splice(index, 1);
        }
        
        // 从UI中移除
        imageItem.remove();
        
        finder.showNotification('图片已删除', 'success');
    }
}

// 保存收藏状态
function saveFavorites() {
    const favorites = finder.images.filter(f => f.favorite).map(f => f.id);
    localStorage.setItem('telegraph_favorites', JSON.stringify(favorites));
}

// 加载收藏状态
function loadFavorites() {
    try {
        const favorites = JSON.parse(localStorage.getItem('telegraph_favorites') || '[]');
        finder.images.forEach(file => {
            file.favorite = favorites.includes(file.id);
        });
    } catch (error) {
        console.warn('加载收藏状态失败:', error);
    }
}
