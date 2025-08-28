class MacOSFinder {
    constructor() {
        this.currentPath = [];
        this.files = [];
        this.folders = new Map();
        this.uploadQueue = [];
        this.selectedItems = new Set();
        this.draggedItem = null;
        this.folderStructure = new Map(); // 存储文件夹层级结构
        this.init();
    }

    init() {
        // 检查必要的DOM元素
        if (!this.checkRequiredElements()) {
            console.error('必要的DOM元素缺失，无法初始化');
            return;
        }

        this.setupEventListeners();
        this.initializeFolders();
        this.loadFiles();
        this.updateBreadcrumb();
    }

    checkRequiredElements() {
        const requiredElements = [
            'fileGrid',
            'emptyState',
            'uploadBtn',
            'fileInput',
            'newFolderBtn',
            'backButton',
            'breadcrumbPath',
            'pathInfo',
            'dropZone',
            'uploadProgress'
        ];

        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                console.error(`缺少必要元素: ${elementId}`);
                return false;
            }
        }
        return true;
    }

    setupEventListeners() {
        // 基础事件监听
        this.setupDragAndDrop();
        this.setupFileOperations();
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupContextMenu();
        this.setupKeyboardShortcuts();
    }

    setupFileOperations() {
        // 上传按钮
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // 移动端上传按钮
        const mobileUploadBtn = document.getElementById('mobileUploadBtn');
        if (mobileUploadBtn) {
            mobileUploadBtn.addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });
        }

        // 文件输入变化
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // 新建文件夹
        document.getElementById('newFolderBtn').addEventListener('click', () => {
            this.showNewFolderModal();
        });

        // 新建文件夹模态框事件
        this.setupNewFolderModal();

        // 侧边栏导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToSystemFolder(item.dataset.folder);
            });
        });

        // 视图模式切换
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchViewMode(btn.dataset.view);
            });
        });

        // 搜索功能
        document.querySelector('.search-input').addEventListener('input', (e) => {
            this.searchFiles(e.target.value);
        });
    }

    setupNavigation() {
        // 返回按钮
        document.getElementById('backButton').addEventListener('click', () => {
            this.navigateBack();
        });
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');

        // 防止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // 显示拖拽区域（文件上传）
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                if (e.dataTransfer.types.includes('Files')) {
                    dropZone.classList.add('active');
                }
            });
        });

        // 隐藏拖拽区域
        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                if (e.type === 'dragleave' && !document.contains(e.relatedTarget)) {
                    dropZone.classList.remove('active');
                } else if (e.type === 'drop') {
                    dropZone.classList.remove('active');
                }
            });
        });

        // 处理文件拖拽上传
        document.addEventListener('drop', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                    this.handleFileSelect(files);
                }
            }
        });
    }

    setupNewFolderModal() {
        const modal = document.getElementById('newFolderModal');
        const closeBtn = document.getElementById('closeFolderModal');
        const cancelBtn = document.getElementById('cancelFolderBtn');
        const createBtn = document.getElementById('createFolderBtn');
        const nameInput = document.getElementById('folderNameInput');
        const colorPicker = document.getElementById('folderColorPicker');

        // 关闭模态框
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            nameInput.value = '';
            this.resetColorPicker();
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // 点击遮罩关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
            }
        });

        // 颜色选择
        colorPicker.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-option')) {
                colorPicker.querySelectorAll('.color-option').forEach(option => {
                    option.classList.remove('active');
                });
                e.target.classList.add('active');
            }
        });

        // 创建文件夹
        createBtn.addEventListener('click', () => {
            this.handleCreateFolder();
        });

        // 回车键创建
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleCreateFolder();
            }
        });

        // 输入验证
        nameInput.addEventListener('input', () => {
            const isValid = nameInput.value.trim().length > 0;
            createBtn.disabled = !isValid;
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + A - 全选
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                e.preventDefault();
                this.selectAll();
            }
            
            // Delete/Backspace - 删除选中项
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedItems.size > 0) {
                    this.deleteSelectedItems();
                }
            }
            
            // Escape - 取消选择
            if (e.key === 'Escape') {
                this.clearSelection();
            }
            
            // Enter - 打开选中项
            if (e.key === 'Enter') {
                if (this.selectedItems.size === 1) {
                    const itemId = Array.from(this.selectedItems)[0];
                    this.openItem(itemId);
                }
            }
        });
    }

    initializeFolders() {
        // 系统文件夹
        this.folders.set('all', { 
            id: 'all', 
            name: '全部文件', 
            icon: 'fas fa-home', 
            isSystem: true,
            type: 'system'
        });
        this.folders.set('recent', { 
            id: 'recent', 
            name: '最近使用', 
            icon: 'fas fa-clock', 
            isSystem: true,
            type: 'system'
        });
        this.folders.set('favorites', { 
            id: 'favorites', 
            name: '收藏夹', 
            icon: 'fas fa-star', 
            isSystem: true,
            type: 'system'
        });
        this.folders.set('images', { 
            id: 'images', 
            name: '图片', 
            icon: 'fas fa-image', 
            isSystem: true,
            type: 'system'
        });
        this.folders.set('documents', { 
            id: 'documents', 
            name: '文档', 
            icon: 'fas fa-file-alt', 
            isSystem: true,
            type: 'system'
        });
        this.folders.set('videos', { 
            id: 'videos', 
            name: '视频', 
            icon: 'fas fa-video', 
            isSystem: true,
            type: 'system'
        });
        this.folders.set('audio', { 
            id: 'audio', 
            name: '音频', 
            icon: 'fas fa-music', 
            isSystem: true,
            type: 'system'
        });

        // 初始化文件夹结构
        this.folderStructure.set('root', new Set());
    }

    async loadFiles() {
        try {
            // 添加超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

            const response = await fetch('/api/manage/list', {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const responseText = await response.text();
                console.log('API Response length:', responseText.length);

                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('JSON解析失败:', parseError);
                    console.log('响应内容前200字符:', responseText.substring(0, 200));
                    this.showNotification('服务器响应格式错误', 'error');
                    this.files = [];
                    this.renderCurrentView();
                    return;
                }

                if (Array.isArray(data)) {
                    this.files = data.map(item => ({
                        id: item.name,
                        name: item.metadata?.fileName || item.name,
                        size: item.metadata?.fileSize || 0,
                        type: this.getFileType(item.name),
                        url: `/file/${item.name}`,
                        uploadDate: new Date(item.metadata?.TimeStamp || Date.now()),
                        parentFolder: item.metadata?.parentFolder || 'root',
                        favorite: item.metadata?.liked || false,
                        isFolder: false
                    }));
                    console.log('成功加载', this.files.length, '个文件');
                } else {
                    console.error('API返回的数据不是数组:', typeof data);
                    this.files = [];
                }

                // 加载文件夹结构
                await this.loadFolderStructure();
                this.renderCurrentView();

            } else {
                console.error('API请求失败:', response.status, response.statusText);
                this.showNotification(`加载文件失败: ${response.status}`, 'error');
                this.files = [];
                this.renderCurrentView();
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('请求超时');
                this.showNotification('请求超时，请检查网络连接', 'error');
            } else {
                console.error('加载文件失败:', error);
                this.showNotification('网络错误，无法加载文件', 'error');
            }
            // 显示空状态而不是崩溃
            this.files = [];
            this.renderCurrentView();
        }
    }

    async loadFolderStructure() {
        try {
            // 从localStorage或API加载文件夹结构
            const savedStructure = localStorage.getItem('finder_folder_structure');
            if (savedStructure) {
                const structure = JSON.parse(savedStructure);

                // 确保结构是正确的格式
                if (Array.isArray(structure)) {
                    // 如果是数组格式，转换为Map
                    this.folderStructure = new Map(structure);
                } else if (typeof structure === 'object') {
                    // 如果是对象格式，转换为Map并确保值是Set
                    this.folderStructure = new Map();
                    for (const [key, value] of Object.entries(structure)) {
                        if (Array.isArray(value)) {
                            this.folderStructure.set(key, new Set(value));
                        } else if (value instanceof Set) {
                            this.folderStructure.set(key, value);
                        } else {
                            this.folderStructure.set(key, new Set());
                        }
                    }
                } else {
                    // 如果格式不正确，初始化为空
                    this.folderStructure = new Map();
                }

                // 重建文件夹映射
                for (const [parentId, children] of this.folderStructure) {
                    if (children && typeof children[Symbol.iterator] === 'function') {
                        for (const childId of children) {
                            if (childId && childId.startsWith('folder_')) {
                                const folderData = localStorage.getItem(`folder_${childId}`);
                                if (folderData) {
                                    try {
                                        const folder = JSON.parse(folderData);
                                        folder.isFolder = true;
                                        this.folders.set(childId, folder);
                                    } catch (parseError) {
                                        console.error('解析文件夹数据失败:', childId, parseError);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 确保根目录存在
            if (!this.folderStructure.has('root')) {
                this.folderStructure.set('root', new Set());
            }

        } catch (error) {
            console.error('加载文件夹结构失败:', error);
            // 重置为默认结构
            this.folderStructure = new Map();
            this.folderStructure.set('root', new Set());
        }
    }

    saveFolderStructure() {
        try {
            // 将Map转换为可序列化的格式
            const structureToSave = {};
            for (const [key, value] of this.folderStructure) {
                if (value instanceof Set) {
                    structureToSave[key] = Array.from(value);
                } else if (Array.isArray(value)) {
                    structureToSave[key] = value;
                } else {
                    structureToSave[key] = [];
                }
            }
            localStorage.setItem('finder_folder_structure', JSON.stringify(structureToSave));
        } catch (error) {
            console.error('保存文件夹结构失败:', error);
        }
    }

    getCurrentFolderId() {
        return this.currentPath.length > 0 ? this.currentPath[this.currentPath.length - 1] : 'root';
    }

    navigateToSystemFolder(folderId) {
        this.currentPath = [folderId];
        this.clearSelection();
        this.updateBreadcrumb();
        this.renderCurrentView();
        this.updateNavigation();
    }

    navigateToFolder(folderId) {
        this.currentPath.push(folderId);
        this.clearSelection();
        this.updateBreadcrumb();
        this.renderCurrentView();
        this.updateNavigation();
    }

    navigateBack() {
        if (this.currentPath.length > 0) {
            this.currentPath.pop();
            this.clearSelection();
            this.updateBreadcrumb();
            this.renderCurrentView();
            this.updateNavigation();
        }
    }

    updateNavigation() {
        const backButton = document.getElementById('backButton');
        backButton.disabled = this.currentPath.length === 0;
        
        // 更新侧边栏活动状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (this.currentPath.length > 0) {
            const currentFolder = this.currentPath[0];
            const navItem = document.querySelector(`[data-folder="${currentFolder}"]`);
            if (navItem) {
                navItem.classList.add('active');
            }
        }
    }

    updateBreadcrumb() {
        const breadcrumbPath = document.getElementById('breadcrumbPath');
        const pathInfo = document.getElementById('pathInfo');
        
        let breadcrumbHTML = '';
        
        if (this.currentPath.length === 0) {
            breadcrumbHTML = '<span class="breadcrumb-item current">全部文件</span>';
            pathInfo.textContent = '';
        } else {
            // 构建面包屑路径
            const pathItems = [];
            
            for (let i = 0; i < this.currentPath.length; i++) {
                const folderId = this.currentPath[i];
                const folder = this.folders.get(folderId);
                
                if (folder) {
                    if (i === this.currentPath.length - 1) {
                        pathItems.push(`<span class="breadcrumb-item current">${folder.name}</span>`);
                    } else {
                        pathItems.push(`<a href="#" class="breadcrumb-item" data-path-index="${i}">${folder.name}</a>`);
                    }
                }
            }
            
            breadcrumbHTML = pathItems.join('<span class="breadcrumb-separator">/</span>');
            
            // 显示当前文件夹信息
            const currentItems = this.getCurrentFolderItems();
            const fileCount = currentItems.filter(item => !item.isFolder).length;
            const folderCount = currentItems.filter(item => item.isFolder).length;
            pathInfo.textContent = `${folderCount} 个文件夹，${fileCount} 个文件`;
        }
        
        breadcrumbPath.innerHTML = breadcrumbHTML;
        
        // 添加面包屑点击事件
        breadcrumbPath.querySelectorAll('.breadcrumb-item[data-path-index]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pathIndex = parseInt(item.dataset.pathIndex);
                this.navigateToPath(pathIndex);
            });
        });
    }

    navigateToPath(pathIndex) {
        this.currentPath = this.currentPath.slice(0, pathIndex + 1);
        this.clearSelection();
        this.updateBreadcrumb();
        this.renderCurrentView();
        this.updateNavigation();
    }

    getCurrentFolderItems() {
        const currentFolderId = this.getCurrentFolderId();
        const items = [];

        try {
            if (currentFolderId === 'root' || this.folders.get(currentFolderId)?.isSystem) {
                // 系统文件夹或根目录的特殊处理
                if (currentFolderId === 'all' || currentFolderId === 'root') {
                    // 显示根目录下的所有文件夹和文件
                    const rootChildren = this.folderStructure.get('root');
                    if (rootChildren && typeof rootChildren[Symbol.iterator] === 'function') {
                        for (const childId of rootChildren) {
                            if (childId) {
                                const folder = this.folders.get(childId);
                                if (folder && folder.isFolder) {
                                    items.push(folder);
                                }
                            }
                        }
                    }
                    // 添加根目录下的文件
                    const rootFiles = this.files.filter(file =>
                        !file.parentFolder || file.parentFolder === 'root'
                    );
                    items.push(...rootFiles);

                } else if (currentFolderId === 'recent') {
                    items.push(...this.files
                        .sort((a, b) => b.uploadDate - a.uploadDate)
                        .slice(0, 20));
                } else if (currentFolderId === 'favorites') {
                    items.push(...this.files.filter(file => file.favorite));
                } else if (['images', 'documents', 'videos', 'audio'].includes(currentFolderId)) {
                    const type = currentFolderId.slice(0, -1);
                    items.push(...this.files.filter(file => file.type === type));
                }
            } else {
                // 自定义文件夹
                const children = this.folderStructure.get(currentFolderId);
                if (children && typeof children[Symbol.iterator] === 'function') {
                    for (const childId of children) {
                        if (childId) {
                            const folder = this.folders.get(childId);
                            if (folder && folder.isFolder) {
                                items.push(folder);
                            }
                        }
                    }
                }
                // 添加该文件夹下的文件
                items.push(...this.files.filter(file => file.parentFolder === currentFolderId));
            }
        } catch (error) {
            console.error('获取文件夹项目时出错:', error);
            // 如果出错，至少返回当前文件夹下的文件
            items.push(...this.files.filter(file =>
                file.parentFolder === currentFolderId ||
                (!file.parentFolder && currentFolderId === 'root')
            ));
        }

        return items;
    }

    renderCurrentView() {
        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');

        if (!fileGrid || !emptyState) {
            console.error('必要的DOM元素未找到');
            return;
        }

        const items = this.getCurrentFolderItems();

        if (items.length === 0) {
            fileGrid.style.display = 'none';
            emptyState.style.display = 'flex';

            // 更新空状态消息
            const emptyTitle = emptyState.querySelector('.empty-title');
            const emptySubtitle = emptyState.querySelector('.empty-subtitle');

            if (emptyTitle && emptySubtitle) {
                if (this.files.length === 0) {
                    emptyTitle.textContent = '暂无文件';
                    emptySubtitle.textContent = '拖拽文件到此处开始上传';
                } else {
                    emptyTitle.textContent = '此文件夹为空';
                    emptySubtitle.textContent = '拖拽文件到此处或点击上传按钮';
                }
            }
        } else {
            fileGrid.style.display = 'grid';
            emptyState.style.display = 'none';

            try {
                fileGrid.innerHTML = items.map(item => this.renderItem(item)).join('');
                // 添加事件监听器
                this.attachItemEventListeners();

                // 优化图片加载
                this.optimizeImageLoading();
            } catch (error) {
                console.error('渲染文件项失败:', error);
                fileGrid.innerHTML = '<div class="error-message">渲染失败，请刷新页面</div>';
            }
        }
    }

    renderItem(item) {
        const isSelected = this.selectedItems.has(item.id);
        const selectedClass = isSelected ? 'selected' : '';

        if (item.isFolder) {
            return `
                <div class="file-item ${selectedClass}" data-item-id="${item.id}" data-item-type="folder" draggable="true">
                    <div class="file-icon folder">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="file-name">${item.name}</div>
                </div>
            `;
        } else {
            return `
                <div class="file-item ${selectedClass}" data-item-id="${item.id}" data-item-type="file" draggable="true">
                    <div class="file-icon ${item.type}">
                        ${item.type === 'image' ?
                            `<img src="${item.url}" alt="${item.name}" loading="lazy" onerror="this.outerHTML='<i class=\\"${this.getFileIcon(item.type)}\\"></i>'">` :
                            `<i class="${this.getFileIcon(item.type)}"></i>`
                        }
                    </div>
                    <div class="file-name">${item.name}</div>
                </div>
            `;
        }
    }

    attachItemEventListeners() {
        const fileItems = document.querySelectorAll('.file-item');

        fileItems.forEach(item => {
            // 点击选择
            item.addEventListener('click', (e) => {
                this.handleItemClick(e, item.dataset.itemId);
            });

            // 双击打开
            item.addEventListener('dblclick', (e) => {
                e.preventDefault();
                this.openItem(item.dataset.itemId);
            });

            // 拖拽开始
            item.addEventListener('dragstart', (e) => {
                this.handleDragStart(e, item.dataset.itemId);
            });

            // 拖拽结束
            item.addEventListener('dragend', (e) => {
                this.handleDragEnd(e);
            });

            // 拖拽悬停
            item.addEventListener('dragover', (e) => {
                if (item.dataset.itemType === 'folder') {
                    this.handleDragOver(e, item);
                }
            });

            // 拖拽离开
            item.addEventListener('dragleave', (e) => {
                this.handleDragLeave(e, item);
            });

            // 拖拽放下
            item.addEventListener('drop', (e) => {
                if (item.dataset.itemType === 'folder') {
                    this.handleDrop(e, item.dataset.itemId);
                }
            });
        });
    }

    optimizeImageLoading() {
        const images = document.querySelectorAll('.file-icon img');

        images.forEach(img => {
            // 添加加载状态
            img.addEventListener('loadstart', () => {
                img.style.opacity = '0.5';
            });

            // 加载完成
            img.addEventListener('load', () => {
                img.style.opacity = '1';
                img.style.transition = 'opacity 0.3s ease';
            });

            // 加载失败时的处理
            img.addEventListener('error', () => {
                const fileType = img.closest('.file-item').dataset.itemType;
                const iconClass = this.getFileIcon('image');
                img.outerHTML = `<i class="${iconClass}" style="color: #34C759; font-size: 24px;"></i>`;
            });

            // 如果图片已经加载完成（来自缓存）
            if (img.complete) {
                img.style.opacity = '1';
            }
        });
    }

    handleItemClick(e, itemId) {
        if (e.metaKey || e.ctrlKey) {
            // 多选
            if (this.selectedItems.has(itemId)) {
                this.selectedItems.delete(itemId);
            } else {
                this.selectedItems.add(itemId);
            }
        } else if (e.shiftKey && this.selectedItems.size > 0) {
            // 范围选择
            this.selectRange(itemId);
        } else {
            // 单选
            this.selectedItems.clear();
            this.selectedItems.add(itemId);
        }

        this.updateSelectionDisplay();
    }

    selectRange(endItemId) {
        const items = this.getCurrentFolderItems();
        const startItemId = Array.from(this.selectedItems)[0];
        const startIndex = items.findIndex(item => item.id === startItemId);
        const endIndex = items.findIndex(item => item.id === endItemId);

        if (startIndex !== -1 && endIndex !== -1) {
            const minIndex = Math.min(startIndex, endIndex);
            const maxIndex = Math.max(startIndex, endIndex);

            this.selectedItems.clear();
            for (let i = minIndex; i <= maxIndex; i++) {
                this.selectedItems.add(items[i].id);
            }
        }
    }

    selectAll() {
        const items = this.getCurrentFolderItems();
        this.selectedItems.clear();
        items.forEach(item => this.selectedItems.add(item.id));
        this.updateSelectionDisplay();
    }

    clearSelection() {
        this.selectedItems.clear();
        this.updateSelectionDisplay();
    }

    updateSelectionDisplay() {
        document.querySelectorAll('.file-item').forEach(item => {
            const isSelected = this.selectedItems.has(item.dataset.itemId);
            item.classList.toggle('selected', isSelected);
        });
    }

    openItem(itemId) {
        const folder = this.folders.get(itemId);
        if (folder && folder.isFolder) {
            this.navigateToFolder(itemId);
        } else {
            const file = this.files.find(f => f.id === itemId);
            if (file) {
                if (file.type === 'image') {
                    this.showImagePreview(file);
                } else {
                    window.open(file.url, '_blank');
                }
            }
        }
    }

    handleDragStart(e, itemId) {
        this.draggedItem = itemId;

        // 如果拖拽的项目不在选中项中，则只选中它
        if (!this.selectedItems.has(itemId)) {
            this.selectedItems.clear();
            this.selectedItems.add(itemId);
            this.updateSelectionDisplay();
        }

        // 设置拖拽数据
        e.dataTransfer.setData('text/plain', itemId);
        e.dataTransfer.effectAllowed = 'move';

        // 添加拖拽样式
        e.target.classList.add('dragging');

        // 创建拖拽预览
        this.createDragPreview(e);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedItem = null;

        // 清除所有拖拽状态
        document.querySelectorAll('.drag-over').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    handleDragOver(e, targetElement) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        targetElement.classList.add('drag-over');
    }

    handleDragLeave(e, targetElement) {
        targetElement.classList.remove('drag-over');
    }

    async handleDrop(e, targetFolderId) {
        e.preventDefault();
        e.target.closest('.file-item').classList.remove('drag-over');

        if (this.draggedItem && this.draggedItem !== targetFolderId) {
            await this.moveItemsToFolder(Array.from(this.selectedItems), targetFolderId);
        }
    }

    createDragPreview(e) {
        const preview = document.createElement('div');
        preview.className = 'drag-preview';
        preview.innerHTML = `
            <div class="file-icon">
                <i class="fas fa-file"></i>
            </div>
            <span>${this.selectedItems.size} 项</span>
        `;

        document.body.appendChild(preview);

        // 设置拖拽图像
        e.dataTransfer.setDragImage(preview, 25, 25);

        // 清理预览元素
        setTimeout(() => {
            if (preview.parentNode) {
                preview.parentNode.removeChild(preview);
            }
        }, 0);
    }

    async moveItemsToFolder(itemIds, targetFolderId) {
        try {
            for (const itemId of itemIds) {
                const folder = this.folders.get(itemId);
                const file = this.files.find(f => f.id === itemId);

                if (folder && folder.isFolder) {
                    // 移动文件夹
                    folder.parentFolder = targetFolderId;

                    // 更新文件夹结构
                    for (const [parentId, children] of this.folderStructure) {
                        if (children && typeof children.has === 'function' && children.has(itemId)) {
                            children.delete(itemId);
                            break;
                        } else if (Array.isArray(children) && children.includes(itemId)) {
                            const index = children.indexOf(itemId);
                            children.splice(index, 1);
                            break;
                        }
                    }

                    if (!this.folderStructure.has(targetFolderId)) {
                        this.folderStructure.set(targetFolderId, new Set());
                    }
                    const targetChildren = this.folderStructure.get(targetFolderId);
                    if (targetChildren instanceof Set) {
                        targetChildren.add(itemId);
                    } else if (Array.isArray(targetChildren)) {
                        if (!targetChildren.includes(itemId)) {
                            targetChildren.push(itemId);
                        }
                    }

                    // 保存文件夹数据
                    localStorage.setItem(`folder_${itemId}`, JSON.stringify(folder));

                } else if (file) {
                    // 移动文件
                    file.parentFolder = targetFolderId;

                    // 这里可以调用API更新文件的父文件夹
                    // await this.updateFileParentFolder(itemId, targetFolderId);
                }
            }

            this.saveFolderStructure();
            this.renderCurrentView();
            this.clearSelection();
            this.showNotification(`已移动 ${itemIds.length} 项到文件夹`, 'success');

        } catch (error) {
            console.error('移动项目失败:', error);
            this.showNotification('移动失败', 'error');
        }
    }

    showNewFolderModal() {
        const modal = document.getElementById('newFolderModal');
        const nameInput = document.getElementById('folderNameInput');
        const locationText = document.getElementById('currentLocationText');
        const createBtn = document.getElementById('createFolderBtn');

        // 更新当前位置显示
        const currentFolderId = this.getCurrentFolderId();
        if (currentFolderId === 'root') {
            locationText.textContent = '全部文件';
        } else {
            const folder = this.folders.get(currentFolderId);
            locationText.textContent = folder ? folder.name : '未知位置';
        }

        // 重置表单
        nameInput.value = '';
        createBtn.disabled = true;
        this.resetColorPicker();

        // 显示模态框
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
            nameInput.focus();
        }, 10);
    }

    resetColorPicker() {
        const colorPicker = document.getElementById('folderColorPicker');
        colorPicker.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        colorPicker.querySelector('.color-option').classList.add('active');
    }

    getSelectedColor() {
        const activeColor = document.querySelector('.color-option.active');
        return activeColor ? activeColor.dataset.color : '#4A90E2';
    }

    async handleCreateFolder() {
        const nameInput = document.getElementById('folderNameInput');
        const folderName = nameInput.value.trim();

        if (!folderName) {
            this.showNotification('请输入文件夹名称', 'error');
            return;
        }

        // 检查名称是否重复
        const currentFolderId = this.getCurrentFolderId();
        const existingItems = this.getCurrentFolderItems();
        const nameExists = existingItems.some(item =>
            item.name.toLowerCase() === folderName.toLowerCase()
        );

        if (nameExists) {
            this.showNotification('文件夹名称已存在', 'error');
            nameInput.focus();
            nameInput.select();
            return;
        }

        try {
            const folderId = 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const selectedColor = this.getSelectedColor();

            const newFolder = {
                id: folderId,
                name: folderName,
                parentFolder: currentFolderId,
                isFolder: true,
                isCustom: true,
                color: selectedColor,
                createdAt: new Date().toISOString()
            };

            // 如果有后端API，尝试保存到服务器
            try {
                const response = await fetch('/api/manage/folders-enhanced', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: folderName,
                        color: selectedColor,
                        parentFolder: currentFolderId
                    })
                });

                if (response.ok) {
                    const serverFolder = await response.json();
                    // 使用服务器返回的数据
                    newFolder.id = serverFolder.id;
                    console.log('文件夹已保存到服务器');
                }
            } catch (apiError) {
                console.log('API不可用，使用本地存储:', apiError.message);
            }

            // 添加到本地数据结构
            this.folders.set(newFolder.id, newFolder);

            // 更新文件夹结构
            if (!this.folderStructure.has(currentFolderId)) {
                this.folderStructure.set(currentFolderId, new Set());
            }
            this.folderStructure.get(currentFolderId).add(newFolder.id);

            // 保存到本地存储
            localStorage.setItem(`folder_${newFolder.id}`, JSON.stringify(newFolder));
            this.saveFolderStructure();

            // 如果在根目录，添加到侧边栏
            if (currentFolderId === 'root') {
                this.addFolderToSidebar(newFolder.id, folderName, selectedColor);
            }

            // 关闭模态框
            const modal = document.getElementById('newFolderModal');
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);

            // 刷新视图
            this.renderCurrentView();

            // 添加新建动画
            setTimeout(() => {
                const newFolderElement = document.querySelector(`[data-item-id="${newFolder.id}"]`);
                if (newFolderElement) {
                    newFolderElement.classList.add('newly-created');
                    setTimeout(() => {
                        newFolderElement.classList.remove('newly-created');
                    }, 600);
                }
            }, 50);

            this.showNotification('文件夹创建成功', 'success');

        } catch (error) {
            console.error('创建文件夹失败:', error);
            this.showNotification('创建文件夹失败', 'error');
        }
    }

    addFolderToSidebar(folderId, folderName, color = '#4A90E2') {
        const customSection = document.querySelector('.nav-section:last-child');
        const newFolderItem = document.createElement('a');
        newFolderItem.href = '#';
        newFolderItem.className = 'nav-item';
        newFolderItem.dataset.folder = folderId;
        newFolderItem.innerHTML = `
            <i class="fas fa-folder" style="color: ${color}"></i>
            <span>${folderName}</span>
        `;

        newFolderItem.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToSystemFolder(folderId);
        });

        customSection.appendChild(newFolderItem);
    }

    async handleFileSelect(files) {
        const fileArray = Array.from(files);

        for (const file of fileArray) {
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const uploadId = Date.now() + Math.random();

        this.uploadQueue.push({
            id: uploadId,
            file: file,
            progress: 0,
            status: 'uploading'
        });

        this.showUploadProgress();
        this.updateUploadProgress(uploadId, 0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // 添加当前文件夹信息
            const currentFolderId = this.getCurrentFolderId();
            if (currentFolderId !== 'root' && !this.folders.get(currentFolderId)?.isSystem) {
                formData.append('parentFolder', currentFolderId);
            }

            const progressInterval = setInterval(() => {
                const uploadItem = this.uploadQueue.find(item => item.id === uploadId);
                if (uploadItem && uploadItem.progress < 90) {
                    uploadItem.progress += Math.random() * 20;
                    this.updateUploadProgress(uploadId, uploadItem.progress);
                }
            }, 200);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);

            if (response.ok) {
                const result = await response.json();

                this.updateUploadProgress(uploadId, 100);

                const newFile = {
                    id: result[0].src.split('/').pop(),
                    name: file.name,
                    size: file.size,
                    type: this.getFileType(file.name),
                    url: result[0].src,
                    uploadDate: new Date(),
                    parentFolder: currentFolderId === 'root' ? 'root' : currentFolderId,
                    favorite: false,
                    isFolder: false
                };

                this.files.push(newFile);
                this.renderCurrentView();

                setTimeout(() => {
                    this.removeUploadItem(uploadId);
                }, 2000);

                this.showNotification('文件上传成功', 'success');

            } else {
                throw new Error('上传失败');
            }

        } catch (error) {
            console.error('上传错误:', error);
            this.updateUploadProgress(uploadId, -1);
            this.showNotification('文件上传失败', 'error');

            setTimeout(() => {
                this.removeUploadItem(uploadId);
            }, 3000);
        }
    }

    showUploadProgress() {
        document.getElementById('uploadProgress').style.display = 'block';
    }

    updateUploadProgress(uploadId, progress) {
        const progressContainer = document.getElementById('uploadProgress');
        let progressItem = progressContainer.querySelector(`[data-upload-id="${uploadId}"]`);

        if (!progressItem) {
            const uploadItem = this.uploadQueue.find(item => item.id === uploadId);
            progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            progressItem.dataset.uploadId = uploadId;
            progressItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${uploadItem.file.name}</div>
                    <div class="file-size">${this.formatFileSize(uploadItem.file.size)}</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text">0%</div>
            `;
            progressContainer.appendChild(progressItem);
        }

        const progressFill = progressItem.querySelector('.progress-fill');
        const progressText = progressItem.querySelector('.progress-text');

        if (progress === -1) {
            progressFill.style.background = '#ff3b30';
            progressText.textContent = '失败';
        } else {
            progressFill.style.width = `${Math.min(progress, 100)}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }
    }

    removeUploadItem(uploadId) {
        const progressContainer = document.getElementById('uploadProgress');
        const progressItem = progressContainer.querySelector(`[data-upload-id="${uploadId}"]`);

        if (progressItem) {
            progressItem.remove();
        }

        this.uploadQueue = this.uploadQueue.filter(item => item.id !== uploadId);

        if (this.uploadQueue.length === 0) {
            progressContainer.style.display = 'none';
        }
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
            return 'image';
        } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
            return 'video';
        } else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
            return 'audio';
        } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
            return 'document';
        }
        return 'file';
    }

    getFileIcon(type) {
        const icons = {
            image: 'fas fa-image',
            video: 'fas fa-video',
            audio: 'fas fa-music',
            document: 'fas fa-file-alt',
            file: 'fas fa-file'
        };
        return icons[type] || icons.file;
    }

    showImagePreview(file) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.9); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; padding: 20px; box-sizing: border-box;
        `;

        const img = document.createElement('img');
        img.src = file.url;
        img.style.cssText = `
            max-width: 100%; max-height: 100%; object-fit: contain;
            border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        modal.appendChild(img);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            position: absolute; top: 20px; right: 20px;
            background: rgba(0,0,0,0.5); border: none; color: white;
            width: 44px; height: 44px; border-radius: 22px;
            font-size: 18px; cursor: pointer; z-index: 10001;
        `;

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.body.removeChild(modal);
        });

        modal.appendChild(closeBtn);
        modal.addEventListener('click', () => document.body.removeChild(modal));
        img.addEventListener('click', (e) => e.stopPropagation());

        document.body.appendChild(modal);
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeMobileSidebar();
            }
        });
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        }
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    }

    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                e.preventDefault();
                this.showContextMenu(e, fileItem.dataset.itemId);
            }
        });
    }

    showContextMenu(event, itemId) {
        const item = this.folders.get(itemId) || this.files.find(f => f.id === itemId);
        if (!item) return;

        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
        `;

        const menuItems = [];

        if (item.isFolder) {
            menuItems.push(
                '<div class="context-menu-item" data-action="open"><i class="fas fa-folder-open"></i> 打开</div>',
                '<div class="context-menu-divider"></div>',
                '<div class="context-menu-item" data-action="upload-to"><i class="fas fa-upload"></i> 上传到此文件夹</div>',
                '<div class="context-menu-divider"></div>',
                '<div class="context-menu-item" data-action="rename"><i class="fas fa-edit"></i> 重命名</div>'
            );

            if (item.isCustom) {
                menuItems.push('<div class="context-menu-item" data-action="delete" style="color: #ff3b30;"><i class="fas fa-trash"></i> 删除文件夹</div>');
            }
        } else {
            menuItems.push(
                '<div class="context-menu-item" data-action="preview"><i class="fas fa-eye"></i> 预览</div>',
                '<div class="context-menu-item" data-action="download"><i class="fas fa-download"></i> 下载</div>',
                '<div class="context-menu-item" data-action="copy-link"><i class="fas fa-link"></i> 复制链接</div>',
                '<div class="context-menu-divider"></div>',
                `<div class="context-menu-item" data-action="favorite"><i class="fas fa-star"></i> ${item.favorite ? '取消收藏' : '添加收藏'}</div>`,
                '<div class="context-menu-divider"></div>',
                '<div class="context-menu-item" data-action="delete" style="color: #ff3b30;"><i class="fas fa-trash"></i> 删除</div>'
            );
        }

        menu.innerHTML = menuItems.join('');
        document.body.appendChild(menu);

        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                this.handleContextMenuAction(action, item);
            }
            menu.remove();
        });

        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
    }

    handleContextMenuAction(action, item) {
        switch (action) {
            case 'open':
                this.openItem(item.id);
                break;
            case 'upload-to':
                this.uploadToFolder(item.id);
                break;
            case 'preview':
                this.openItem(item.id);
                break;
            case 'download':
                this.downloadFile(item);
                break;
            case 'copy-link':
                this.copyFileLink(item);
                break;
            case 'favorite':
                this.toggleFavorite(item);
                break;
            case 'rename':
                this.renameItem(item);
                break;
            case 'delete':
                this.deleteItem(item);
                break;
        }
    }

    uploadToFolder(folderId) {
        // 临时设置目标文件夹
        this.tempUploadFolder = folderId;
        document.getElementById('fileInput').click();
    }

    downloadFile(file) {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async copyFileLink(file) {
        try {
            const fullUrl = window.location.origin + file.url;
            await navigator.clipboard.writeText(fullUrl);
            this.showNotification('链接已复制到剪贴板', 'success');
        } catch (error) {
            this.showNotification('复制失败', 'error');
        }
    }

    toggleFavorite(file) {
        file.favorite = !file.favorite;
        this.renderCurrentView();
        this.showNotification(
            file.favorite ? '已添加到收藏夹' : '已从收藏夹移除',
            'success'
        );
    }

    showRenameModal(item) {
        const modal = document.getElementById('renameModal');
        const nameInput = document.getElementById('renameInput');
        const confirmBtn = document.getElementById('confirmRenameBtn');
        const cancelBtn = document.getElementById('cancelRenameBtn');
        const closeBtn = document.getElementById('closeRenameModal');

        // 设置当前重命名的项目
        this.currentRenameItem = item;

        // 设置输入框
        nameInput.value = item.name;
        nameInput.select();

        // 显示模态框
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
            nameInput.focus();
        }, 10);

        // 关闭模态框函数
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            this.currentRenameItem = null;
        };

        // 绑定事件（移除之前的事件监听器）
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newCloseBtn.addEventListener('click', closeModal);
        newCancelBtn.addEventListener('click', closeModal);
        newConfirmBtn.addEventListener('click', () => this.handleRename());

        // 回车确认
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleRename();
            } else if (e.key === 'Escape') {
                closeModal();
            }
        });

        // 点击遮罩关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    async handleRename() {
        const nameInput = document.getElementById('renameInput');
        const newName = nameInput.value.trim();
        const item = this.currentRenameItem;

        if (!newName) {
            this.showNotification('请输入名称', 'error');
            return;
        }

        if (newName === item.name) {
            // 名称没有变化，直接关闭
            document.getElementById('renameModal').classList.remove('show');
            setTimeout(() => {
                document.getElementById('renameModal').style.display = 'none';
            }, 300);
            return;
        }

        // 检查名称是否重复
        const currentItems = this.getCurrentFolderItems();
        const nameExists = currentItems.some(existingItem =>
            existingItem.id !== item.id &&
            existingItem.name.toLowerCase() === newName.toLowerCase()
        );

        if (nameExists) {
            this.showNotification('名称已存在', 'error');
            nameInput.focus();
            nameInput.select();
            return;
        }

        try {
            // 更新项目名称
            item.name = newName;

            if (item.isFolder) {
                // 如果是文件夹，保存到本地存储
                localStorage.setItem(`folder_${item.id}`, JSON.stringify(item));

                // 如果在侧边栏中，更新侧边栏显示
                const sidebarItem = document.querySelector(`[data-folder="${item.id}"] span`);
                if (sidebarItem) {
                    sidebarItem.textContent = newName;
                }
            } else {
                // 如果是文件，这里可以调用API更新文件元数据
                console.log('文件重命名功能需要后端支持');
            }

            // 关闭模态框
            const modal = document.getElementById('renameModal');
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);

            // 刷新视图
            this.renderCurrentView();
            this.showNotification('重命名成功', 'success');

        } catch (error) {
            console.error('重命名失败:', error);
            this.showNotification('重命名失败', 'error');
        }
    }

    async renameItem(item) {
        this.showRenameModal(item);
    }

    async deleteItem(item) {
        const confirmMessage = item.isFolder ?
            `确定要删除文件夹 "${item.name}" 吗？文件夹中的内容也会被删除。` :
            `确定要删除文件 "${item.name}" 吗？`;

        if (confirm(confirmMessage)) {
            try {
                if (item.isFolder) {
                    await this.deleteFolder(item);
                } else {
                    await this.deleteFile(item);
                }
            } catch (error) {
                this.showNotification('删除失败', 'error');
            }
        }
    }

    async deleteFolder(folder) {
        // 删除文件夹及其内容
        this.folders.delete(folder.id);

        // 从文件夹结构中移除
        for (const [parentId, children] of this.folderStructure) {
            if (children.has(folder.id)) {
                children.delete(folder.id);
                break;
            }
        }

        // 删除子文件夹结构
        this.folderStructure.delete(folder.id);

        // 删除本地存储
        localStorage.removeItem(`folder_${folder.id}`);

        // 从侧边栏移除
        const sidebarItem = document.querySelector(`[data-folder="${folder.id}"]`);
        if (sidebarItem) {
            sidebarItem.remove();
        }

        this.saveFolderStructure();
        this.renderCurrentView();
        this.showNotification('文件夹删除成功', 'success');
    }

    async deleteFile(file) {
        const response = await fetch(`/api/manage/delete/${file.id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            this.files = this.files.filter(f => f.id !== file.id);
            this.renderCurrentView();
            this.showNotification('文件删除成功', 'success');
        } else {
            throw new Error('删除失败');
        }
    }

    deleteSelectedItems() {
        if (this.selectedItems.size === 0) return;

        const items = Array.from(this.selectedItems).map(id =>
            this.folders.get(id) || this.files.find(f => f.id === id)
        ).filter(Boolean);

        const confirmMessage = `确定要删除选中的 ${items.length} 项吗？`;

        if (confirm(confirmMessage)) {
            items.forEach(item => this.deleteItem(item));
            this.clearSelection();
        }
    }

    switchViewMode(mode) {
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${mode}"]`).classList.add('active');
    }

    searchFiles(query) {
        if (!query.trim()) {
            this.renderCurrentView();
            return;
        }

        const allItems = [
            ...Array.from(this.folders.values()).filter(f => f.isFolder),
            ...this.files
        ];

        const filteredItems = allItems.filter(item =>
            item.name.toLowerCase().includes(query.toLowerCase())
        );

        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');

        if (filteredItems.length === 0) {
            fileGrid.style.display = 'none';
            emptyState.style.display = 'flex';
            emptyState.querySelector('.empty-title').textContent = '未找到文件';
            emptyState.querySelector('.empty-subtitle').textContent = `没有找到包含 "${query}" 的文件`;
        } else {
            fileGrid.style.display = 'grid';
            emptyState.style.display = 'none';

            fileGrid.innerHTML = filteredItems.map(item => this.renderItem(item)).join('');
            this.attachItemEventListeners();
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#34c759' : type === 'error' ? '#ff3b30' : '#007aff'};
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 初始化 macOS Finder
document.addEventListener('DOMContentLoaded', () => {
    window.finder = new MacOSFinder();
});
