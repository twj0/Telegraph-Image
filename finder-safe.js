// 安全版本的 macOS Finder - 解决迭代问题

class MacOSFinderSafe {
    constructor() {
        console.log('初始化安全版 MacOS Finder...');
        this.currentPath = [];
        this.files = [];
        this.folders = new Map();
        this.uploadQueue = [];
        this.selectedItems = new Set();
        this.draggedItem = null;
        
        // 使用简单的对象而不是Map来避免迭代问题
        this.folderStructure = {
            root: []
        };
        
        // 延迟初始化，确保DOM完全加载
        setTimeout(() => this.init(), 100);
    }

    init() {
        console.log('开始初始化安全版...');
        
        // 检查必要的DOM元素
        if (!this.checkRequiredElements()) {
            console.error('必要的DOM元素缺失，无法初始化');
            this.showFallbackInterface();
            return;
        }
        
        console.log('DOM元素检查通过');
        
        try {
            this.initializeFolders();
            console.log('文件夹初始化完成');

            this.loadFolderStructure();
            console.log('文件夹结构加载完成');

            this.setupBasicEventListeners();
            console.log('基础事件监听器设置完成');

            this.updateBreadcrumb();
            console.log('面包屑更新完成');

            this.loadFiles();
            console.log('开始加载文件...');

        } catch (error) {
            console.error('初始化过程中出错:', error);
            this.showFallbackInterface();
        }
    }

    checkRequiredElements() {
        const requiredElements = [
            'fileGrid', 'emptyState', 'uploadBtn', 'fileInput', 
            'newFolderBtn', 'backButton', 'breadcrumbPath', 'pathInfo'
        ];

        const missingElements = [];
        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                missingElements.push(elementId);
            }
        }

        if (missingElements.length > 0) {
            console.error('缺少以下元素:', missingElements);
            return false;
        }
        return true;
    }

    showFallbackInterface() {
        const fileGrid = document.getElementById('fileGrid');
        if (fileGrid) {
            fileGrid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; color: #ff3b30; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>界面初始化失败</h3>
                    <p style="margin: 16px 0;">正在使用安全模式...</p>
                    <div style="margin-top: 24px;">
                        <button onclick="location.reload()" style="background: #34c759; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">刷新页面</button>
                    </div>
                </div>
            `;
            fileGrid.style.display = 'block';
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

    loadFolderStructure() {
        try {
            // 从localStorage加载文件夹结构
            const savedStructure = localStorage.getItem('finder_folder_structure');
            if (savedStructure) {
                const structure = JSON.parse(savedStructure);
                this.folderStructure = structure || { root: [] };
                console.log('加载的文件夹结构:', this.folderStructure);
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

            console.log('文件夹结构加载完成，共', this.folders.size, '个文件夹');
        } catch (error) {
            console.error('加载文件夹结构失败:', error);
            this.folderStructure = { root: [] };
        }
    }

    async loadFiles() {
        console.log('开始加载文件...');
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

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
                    this.showNotification('服务器响应格式错误', 'error');
                    this.renderEmptyState();
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
                
                this.renderCurrentView();
                
            } else {
                console.error('API请求失败:', response.status, response.statusText);
                this.showNotification(`加载文件失败: ${response.status}`, 'error');
                this.renderEmptyState();
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('请求超时');
                this.showNotification('请求超时，请检查网络连接', 'error');
            } else {
                console.error('加载文件失败:', error);
                this.showNotification('网络错误，无法加载文件', 'error');
            }
            this.renderEmptyState();
        }
    }

    renderEmptyState() {
        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (fileGrid) fileGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
    }

    renderCurrentView() {
        console.log('渲染当前视图，文件数量:', this.files.length);
        
        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!fileGrid || !emptyState) {
            console.error('无法找到必要的显示元素');
            return;
        }

        if (this.files.length === 0) {
            this.renderEmptyState();
        } else {
            fileGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            
            // 获取当前文件夹的内容
            const currentItems = this.getCurrentFolderItems();

            // 渲染文件和文件夹
            fileGrid.innerHTML = currentItems.map(item => {
                if (item.isFolder) {
                    return `
                        <div class="file-item folder" data-item-id="${item.id}" ondblclick="finder.openFolder('${item.id}')">
                            <div class="file-icon folder">
                                <i class="fas fa-folder"></i>
                            </div>
                            <div class="file-name">${item.name}</div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="file-item" data-item-id="${item.id}">
                            <div class="file-icon ${item.type}">
                                ${item.type === 'image' ?
                                    `<img src="${item.url}" alt="${item.name}" loading="lazy"
                                          style="width: 64px; height: 64px; object-fit: cover; border-radius: 6px;"
                                          onerror="this.outerHTML='<i class=\\"fas fa-image\\"></i>'">` :
                                    `<i class="fas fa-file"></i>`
                                }
                            </div>
                            <div class="file-name">${item.name}</div>
                        </div>
                    `;
                }
            }).join('');

            console.log('文件渲染完成，共', currentItems.length, '项');
        }
    }

    setupBasicEventListeners() {
        // 上传按钮
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });
        }

        // 文件输入变化
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }

        // 新建文件夹
        const newFolderBtn = document.getElementById('newFolderBtn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => {
                this.createNewFolder();
            });
        }

        // 返回按钮
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.navigateBack();
            });
        }

        // 侧边栏导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToSystemFolder(item.dataset.folder);
            });
        });
    }

    navigateToSystemFolder(folderId) {
        console.log('导航到系统文件夹:', folderId);
        this.currentPath = [folderId];
        this.updateBreadcrumb();
        this.renderCurrentView();
    }

    navigateBack() {
        if (this.currentPath.length > 0) {
            this.currentPath.pop();
            this.updateBreadcrumb();
            this.renderCurrentView();
        }
    }

    updateBreadcrumb() {
        const breadcrumbPath = document.getElementById('breadcrumbPath');
        const backButton = document.getElementById('backButton');
        
        if (breadcrumbPath) {
            if (this.currentPath.length === 0) {
                breadcrumbPath.innerHTML = '<span class="breadcrumb-item current">全部文件</span>';
            } else {
                const folderName = this.folders.get(this.currentPath[0])?.name || '未知文件夹';
                breadcrumbPath.innerHTML = `<span class="breadcrumb-item current">${folderName}</span>`;
            }
        }
        
        if (backButton) {
            backButton.disabled = this.currentPath.length === 0;
        }
    }

    handleFileSelect(files) {
        console.log('处理文件选择:', files.length, '个文件');
        this.showNotification('文件上传功能开发中', 'info');
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
            return 'image';
        }
        return 'file';
    }

    getCurrentFolderItems() {
        const currentFolderId = this.currentPath.length > 0 ? this.currentPath[this.currentPath.length - 1] : 'root';

        // 获取当前文件夹的子项
        const children = this.folderStructure[currentFolderId] || [];
        const items = [];

        // 添加文件夹
        for (const childId of children) {
            if (this.folders.has(childId)) {
                items.push(this.folders.get(childId));
            }
        }

        // 添加文件（只在根目录显示）
        if (currentFolderId === 'root') {
            for (const file of this.files) {
                if (!file.parentFolder || file.parentFolder === 'root') {
                    items.push(file);
                }
            }
        }

        return items;
    }

    createNewFolder() {
        const folderName = prompt('请输入文件夹名称:');
        if (!folderName || !folderName.trim()) {
            return;
        }

        const folderId = 'folder_' + Date.now();
        const currentFolderId = this.currentPath.length > 0 ? this.currentPath[this.currentPath.length - 1] : 'root';

        // 创建文件夹对象
        const folder = {
            id: folderId,
            name: folderName.trim(),
            isFolder: true,
            createdAt: new Date(),
            parentFolder: currentFolderId
        };

        // 添加到文件夹映射
        this.folders.set(folderId, folder);

        // 添加到文件夹结构
        if (!this.folderStructure[currentFolderId]) {
            this.folderStructure[currentFolderId] = [];
        }
        this.folderStructure[currentFolderId].push(folderId);

        // 保存到本地存储
        this.saveFolderStructure();

        // 重新渲染
        this.renderCurrentView();

        this.showNotification(`文件夹 "${folderName}" 创建成功`, 'success');
    }

    openFolder(folderId) {
        console.log('打开文件夹:', folderId);
        this.currentPath.push(folderId);
        this.updateBreadcrumb();
        this.renderCurrentView();
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

    showNotification(message, type = 'info') {
        console.log('显示通知:', message, type);

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            border-radius: 8px; color: white; font-weight: 500; z-index: 10000;
            background: ${type === 'success' ? '#34c759' : type === 'error' ? '#ff3b30' : '#007aff'};
            max-width: 300px; word-wrap: break-word;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// 初始化安全版本
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化安全版本');
    window.finder = new MacOSFinderSafe();
});
