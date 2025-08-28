// 调试版本的 macOS Finder - 用于排查问题

class MacOSFinderDebug {
    constructor() {
        console.log('初始化 MacOS Finder Debug 版本...');
        this.currentPath = [];
        this.files = [];
        this.folders = new Map();
        this.uploadQueue = [];
        this.selectedItems = new Set();
        this.draggedItem = null;
        this.folderStructure = new Map();
        
        // 延迟初始化，确保DOM完全加载
        setTimeout(() => this.init(), 100);
    }

    init() {
        console.log('开始初始化...');
        
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
        console.log('显示备用界面');
        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (fileGrid) {
            fileGrid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h3>界面初始化失败</h3>
                    <p>请刷新页面重试，或使用 <a href="/">原版界面</a></p>
                </div>
            `;
            fileGrid.style.display = 'block';
        }
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }

    setupBasicEventListeners() {
        // 上传按钮
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                console.log('上传按钮被点击');
                document.getElementById('fileInput').click();
            });
        }

        // 移动端上传按钮
        const mobileUploadBtn = document.getElementById('mobileUploadBtn');
        if (mobileUploadBtn) {
            mobileUploadBtn.addEventListener('click', () => {
                console.log('移动端上传按钮被点击');
                document.getElementById('fileInput').click();
            });
        }

        // 文件输入变化
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                console.log('文件选择变化:', e.target.files.length, '个文件');
                this.handleFileSelect(e.target.files);
            });
        }

        // 新建文件夹
        const newFolderBtn = document.getElementById('newFolderBtn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => {
                console.log('新建文件夹按钮被点击');
                this.createNewFolder();
            });
        }

        // 返回按钮
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                console.log('返回按钮被点击');
                this.navigateBack();
            });
        }

        // 侧边栏导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('侧边栏导航被点击:', item.dataset.folder);
                this.navigateToSystemFolder(item.dataset.folder);
            });
        });

        // 搜索功能
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                console.log('搜索输入:', e.target.value);
                this.searchFiles(e.target.value);
            });
        }

        console.log('基础事件监听器设置完成');
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

        // 初始化文件夹结构
        this.folderStructure.set('root', new Set());
        
        console.log('文件夹初始化完成，共', this.folders.size, '个系统文件夹');
    }

    async loadFiles() {
        console.log('开始加载文件...');
        
        try {
            const response = await fetch('/api/manage/list');
            console.log('API响应状态:', response.status, response.statusText);
            
            if (response.ok) {
                const responseText = await response.text();
                console.log('API响应内容长度:', responseText.length);
                console.log('API响应前100字符:', responseText.substring(0, 100));
                
                let data;
                try {
                    data = JSON.parse(responseText);
                    console.log('JSON解析成功，数据类型:', typeof data, '是否为数组:', Array.isArray(data));
                } catch (parseError) {
                    console.error('JSON解析失败:', parseError);
                    console.log('完整响应内容:', responseText);
                    this.showNotification('服务器响应格式错误', 'error');
                    this.renderEmptyState();
                    return;
                }
                
                if (Array.isArray(data)) {
                    console.log('收到', data.length, '个文件项');
                    this.files = data.map((item, index) => {
                        console.log(`处理文件 ${index}:`, item.name);
                        return {
                            id: item.name,
                            name: item.metadata?.fileName || item.name,
                            size: item.metadata?.fileSize || 0,
                            type: this.getFileType(item.name),
                            url: `/file/${item.name}`,
                            uploadDate: new Date(item.metadata?.TimeStamp || Date.now()),
                            parentFolder: item.metadata?.parentFolder || 'root',
                            favorite: item.metadata?.liked || false,
                            isFolder: false
                        };
                    });
                    console.log('文件处理完成，共', this.files.length, '个文件');
                } else {
                    console.error('API返回的数据不是数组:', data);
                    this.files = [];
                }
                
                this.renderCurrentView();
                
            } else {
                console.error('API请求失败:', response.status, response.statusText);
                this.showNotification(`加载文件失败: ${response.status}`, 'error');
                this.renderEmptyState();
            }
        } catch (error) {
            console.error('加载文件时发生网络错误:', error);
            this.showNotification('网络错误，无法加载文件', 'error');
            this.renderEmptyState();
        }
    }

    renderEmptyState() {
        console.log('渲染空状态');
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
            console.log('显示空状态');
            fileGrid.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            console.log('显示文件网格');
            fileGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            
            // 简单渲染文件
            fileGrid.innerHTML = this.files.map(file => `
                <div class="file-item" data-item-id="${file.id}">
                    <div class="file-icon ${file.type}">
                        ${file.type === 'image' ? 
                            `<img src="${file.url}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px;" onerror="this.outerHTML='<i class=\\"fas fa-file\\"></i>'">` :
                            `<i class="fas fa-file"></i>`
                        }
                    </div>
                    <div class="file-name">${file.name}</div>
                </div>
            `).join('');
            
            console.log('文件渲染完成');
        }
    }

    // 基础工具函数
    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
            return 'image';
        }
        return 'file';
    }

    navigateToSystemFolder(folderId) {
        console.log('导航到系统文件夹:', folderId);
        this.currentPath = [folderId];
        this.updateBreadcrumb();
        this.renderCurrentView();
    }

    navigateBack() {
        console.log('导航返回');
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

    createNewFolder() {
        const folderName = prompt('请输入文件夹名称:');
        if (folderName && folderName.trim()) {
            console.log('创建新文件夹:', folderName);
            this.showNotification('文件夹创建功能开发中', 'info');
        }
    }

    handleFileSelect(files) {
        console.log('处理文件选择:', files.length, '个文件');
        this.showNotification('文件上传功能开发中', 'info');
    }

    searchFiles(query) {
        console.log('搜索文件:', query);
        // 简单的搜索实现
        if (!query.trim()) {
            this.renderCurrentView();
            return;
        }
        // 搜索功能待实现
    }

    showNotification(message, type = 'info') {
        console.log('显示通知:', message, type);
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            border-radius: 8px; color: white; font-weight: 500; z-index: 10000;
            background: ${type === 'success' ? '#34c759' : type === 'error' ? '#ff3b30' : '#007aff'};
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

// 初始化调试版本
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化调试版本');
    new MacOSFinderDebug();
});
