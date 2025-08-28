// 独立版本的 macOS Finder - 不依赖后端KV存储

class MacOSFinderStandalone {
    constructor() {
        console.log('初始化独立版 MacOS Finder...');
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
        console.log('开始初始化独立版...');
        
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
            
            // 显示提示信息而不是加载文件
            this.showKVNotConfiguredMessage();
            
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

    showKVNotConfiguredMessage() {
        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (fileGrid) {
            fileGrid.innerHTML = `
                <div style="text-align: center; padding: 40px; max-width: 600px; margin: 0 auto;">
                    <div style="font-size: 48px; color: #007aff; margin-bottom: 20px;">
                        <i class="fas fa-database"></i>
                    </div>
                    <h2 style="color: #1d1d1f; margin-bottom: 16px;">需要配置 KV 存储</h2>
                    <p style="color: #666; line-height: 1.6; margin-bottom: 24px;">
                        Telegraph Finder 需要 Cloudflare KV 存储来管理文件。请按以下步骤配置：
                    </p>
                    <div style="text-align: left; background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                        <h3 style="margin-bottom: 12px; color: #1d1d1f;">配置步骤：</h3>
                        <ol style="color: #666; line-height: 1.8;">
                            <li>登录 <strong>Cloudflare Dashboard</strong></li>
                            <li>进入你的 <strong>Pages 项目</strong></li>
                            <li>找到 <strong>Settings → Functions</strong></li>
                            <li>在 <strong>KV namespace bindings</strong> 部分添加：
                                <ul style="margin-top: 8px;">
                                    <li>Variable name: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px;">img_url</code></li>
                                    <li>KV namespace: 选择或创建一个命名空间</li>
                                </ul>
                            </li>
                            <li>保存并重新部署</li>
                        </ol>
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <a href="/" style="background: #007aff; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fas fa-arrow-left"></i>
                            返回原版界面
                        </a>
                        <button onclick="location.reload()" style="background: #34c759; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fas fa-refresh"></i>
                            重新检查
                        </button>
                        <button onclick="window.finder.testUpload()" style="background: #ff9500; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fas fa-upload"></i>
                            测试上传
                        </button>
                    </div>
                </div>
            `;
            fileGrid.style.display = 'block';
        }
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }

    showFallbackInterface() {
        console.log('显示备用界面');
        const fileGrid = document.getElementById('fileGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (fileGrid) {
            fileGrid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; color: #ff3b30; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>界面初始化失败</h3>
                    <p style="margin: 16px 0;">请检查以下问题：</p>
                    <ul style="text-align: left; display: inline-block; margin: 16px 0;">
                        <li>浏览器是否支持现代 JavaScript</li>
                        <li>网络连接是否正常</li>
                        <li>页面是否完全加载</li>
                    </ul>
                    <div style="margin-top: 24px;">
                        <a href="/" style="background: #007aff; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-right: 12px;">返回原版界面</a>
                        <button onclick="location.reload()" style="background: #34c759; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">刷新页面</button>
                    </div>
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
                this.testUpload();
            });
        }

        // 移动端上传按钮
        const mobileUploadBtn = document.getElementById('mobileUploadBtn');
        if (mobileUploadBtn) {
            mobileUploadBtn.addEventListener('click', () => {
                console.log('移动端上传按钮被点击');
                this.testUpload();
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
                this.showNotification('请先配置 KV 存储以使用文件夹功能', 'info');
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
                this.showNotification('请先配置 KV 存储以使用搜索功能', 'info');
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

    testUpload() {
        console.log('测试上传功能');
        
        // 显示上传测试界面
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            padding: 20px; box-sizing: border-box;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 30px; max-width: 500px; width: 100%;">
                <h2 style="margin-bottom: 20px; color: #1d1d1f;">测试上传功能</h2>
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                    即使没有配置 KV 存储，基础的上传功能仍然可以使用。
                    文件会上传到 Telegraph，但无法进行文件夹管理。
                </p>
                <div style="margin-bottom: 20px;">
                    <input type="file" id="testFileInput" multiple style="margin-bottom: 12px;">
                    <button onclick="window.finder.doTestUpload()" style="background: #007aff; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                        开始上传测试
                    </button>
                </div>
                <div style="text-align: right;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #8e8e93; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                        关闭
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async doTestUpload() {
        const fileInput = document.getElementById('testFileInput');
        const files = fileInput.files;
        
        if (files.length === 0) {
            this.showNotification('请先选择文件', 'error');
            return;
        }

        console.log('开始测试上传', files.length, '个文件');
        
        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                this.showNotification(`正在上传 ${file.name}...`, 'info');
                
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('上传成功:', result);
                    this.showNotification(`${file.name} 上传成功！`, 'success');
                    
                    // 显示上传结果
                    if (result && result[0] && result[0].src) {
                        this.showUploadResult(file.name, result[0].src);
                    }
                } else {
                    throw new Error(`上传失败: ${response.status}`);
                }
                
            } catch (error) {
                console.error('上传失败:', error);
                this.showNotification(`${file.name} 上传失败: ${error.message}`, 'error');
            }
        }
    }

    showUploadResult(fileName, url) {
        const resultDiv = document.createElement('div');
        resultDiv.style.cssText = `
            position: fixed; top: 20px; left: 20px; right: 20px;
            background: white; border-radius: 8px; padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 10001;
            max-width: 400px; margin: 0 auto;
        `;
        
        resultDiv.innerHTML = `
            <h3 style="margin-bottom: 12px; color: #34c759;">上传成功！</h3>
            <p style="margin-bottom: 12px; word-break: break-all;"><strong>文件名:</strong> ${fileName}</p>
            <p style="margin-bottom: 16px; word-break: break-all;"><strong>链接:</strong> <a href="${url}" target="_blank">${url}</a></p>
            <button onclick="this.parentElement.remove()" style="background: #007aff; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; float: right;">
                关闭
            </button>
            <div style="clear: both;"></div>
        `;
        
        document.body.appendChild(resultDiv);
        
        setTimeout(() => {
            if (resultDiv.parentNode) {
                resultDiv.parentNode.removeChild(resultDiv);
            }
        }, 10000);
    }

    navigateToSystemFolder(folderId) {
        console.log('导航到系统文件夹:', folderId);
        this.currentPath = [folderId];
        this.updateBreadcrumb();
        this.showKVNotConfiguredMessage();
    }

    navigateBack() {
        console.log('导航返回');
        if (this.currentPath.length > 0) {
            this.currentPath.pop();
            this.updateBreadcrumb();
            this.showKVNotConfiguredMessage();
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
        this.showNotification('请使用"测试上传"按钮进行上传', 'info');
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
        }, 5000);
    }
}

// 初始化独立版本
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化独立版本');
    window.finder = new MacOSFinderStandalone();
});
