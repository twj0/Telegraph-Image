class FileManager {
    constructor() {
        this.currentFolder = 'all';
        this.files = [];
        this.folders = new Map();
        this.uploadQueue = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFiles();
        this.initializeFolders();
    }

    setupEventListeners() {
        // 拖拽上传
        this.setupDragAndDrop();
        
        // 上传按钮
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // 文件输入变化
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // 新建文件夹
        document.getElementById('newFolderBtn').addEventListener('click', () => {
            this.createNewFolder();
        });

        // 侧边栏导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchFolder(item.dataset.folder);
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

        // 移动端菜单控制
        this.setupMobileMenu();
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        const fileView = document.querySelector('.file-view');

        // 防止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // 显示拖拽区域
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, () => {
                dropZone.classList.add('active');
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

        // 处理文件拖拽
        document.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleFileSelect(files);
            }
        });
    }

    async handleFileSelect(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const uploadId = Date.now() + Math.random();
        
        // 添加到上传队列
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

            // 如果当前在自定义文件夹中，添加文件夹ID
            if (this.currentFolder && this.currentFolder !== 'all' && this.folders.get(this.currentFolder)?.isCustom) {
                formData.append('folderId', this.currentFolder);
            }

            // 模拟上传进度
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
                
                // 更新进度到100%
                this.updateUploadProgress(uploadId, 100);
                
                // 添加到文件列表
                const newFile = {
                    id: result[0].src.split('/').pop(),
                    name: file.name,
                    size: file.size,
                    type: this.getFileType(file.name),
                    url: result[0].src,
                    uploadDate: new Date(),
                    folder: this.currentFolder
                };

                this.files.push(newFile);
                this.renderFiles();

                // 移除上传项
                setTimeout(() => {
                    this.removeUploadItem(uploadId);
                }, 2000);

            } else {
                throw new Error('上传失败');
            }

        } catch (error) {
            console.error('上传错误:', error);
            this.updateUploadProgress(uploadId, -1); // -1 表示错误
            
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

    async initializeFolders() {
        try {
            const response = await fetch('/api/manage/folders');
            if (response.ok) {
                const folders = await response.json();
                this.folders.clear();
                folders.forEach(folder => {
                    this.folders.set(folder.id, folder);
                });
                this.updateSidebarFolders();
            } else {
                // 使用默认文件夹
                this.setDefaultFolders();
            }
        } catch (error) {
            console.error('加载文件夹失败:', error);
            this.setDefaultFolders();
        }
    }

    setDefaultFolders() {
        this.folders.set('all', { id: 'all', name: '全部文件', icon: 'fas fa-home', isSystem: true });
        this.folders.set('recent', { id: 'recent', name: '最近使用', icon: 'fas fa-clock', isSystem: true });
        this.folders.set('favorites', { id: 'favorites', name: '收藏夹', icon: 'fas fa-star', isSystem: true });
        this.folders.set('images', { id: 'images', name: '图片', icon: 'fas fa-image', isSystem: true });
        this.folders.set('documents', { id: 'documents', name: '文档', icon: 'fas fa-file-alt', isSystem: true });
        this.folders.set('videos', { id: 'videos', name: '视频', icon: 'fas fa-video', isSystem: true });
        this.folders.set('audio', { id: 'audio', name: '音频', icon: 'fas fa-music', isSystem: true });
    }

    updateSidebarFolders() {
        // 更新侧边栏显示的文件夹
        const customSection = document.querySelector('.nav-section:last-child');

        // 清除现有的自定义文件夹
        const existingCustomFolders = customSection.querySelectorAll('.nav-item[data-custom="true"]');
        existingCustomFolders.forEach(item => item.remove());

        // 添加自定义文件夹
        this.folders.forEach(folder => {
            if (folder.isCustom) {
                this.addFolderToSidebar(folder.id, folder.name, folder.color);
            }
        });
    }

    async loadFiles() {
        try {
            const response = await fetch('/api/manage/list');
            if (response.ok) {
                const data = await response.json();
                this.files = data.map(item => ({
                    id: item.name,
                    name: item.metadata?.fileName || item.name,
                    size: item.metadata?.fileSize || 0,
                    type: this.getFileType(item.name),
                    url: `/file/${item.name}`,
                    uploadDate: new Date(item.metadata?.TimeStamp || Date.now()),
                    folder: 'all'
                }));
                this.renderFiles();
            }
        } catch (error) {
            console.error('加载文件失败:', error);
        }
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
            return 'image';
        } else if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) {
            return 'video';
        } else if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
            return 'audio';
        } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
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

    switchFolder(folderId) {
        this.currentFolder = folderId;
        
        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-folder="${folderId}"]`).classList.add('active');

        // 更新面包屑
        const folderName = this.folders.get(folderId)?.name || '未知文件夹';
        document.querySelector('.breadcrumb-item.current').textContent = folderName;

        this.renderFiles();
    }

    renderFiles() {
        const fileGrid = document.getElementById('fileGrid');
        let filesToShow = this.files;

        // 根据当前文件夹过滤文件
        if (this.currentFolder !== 'all') {
            if (this.currentFolder === 'recent') {
                filesToShow = this.files
                    .sort((a, b) => b.uploadDate - a.uploadDate)
                    .slice(0, 20);
            } else if (this.currentFolder === 'favorites') {
                filesToShow = this.files.filter(file => file.favorite);
            } else {
                filesToShow = this.files.filter(file => file.type === this.currentFolder.slice(0, -1));
            }
        }

        fileGrid.innerHTML = filesToShow.map(file => `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-icon ${file.type}">
                    ${file.type === 'image' ? 
                        `<img src="${file.url}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px;" onerror="this.outerHTML='<i class=\\"${this.getFileIcon(file.type)}\\"></i>'">` :
                        `<i class="${this.getFileIcon(file.type)}"></i>`
                    }
                </div>
                <div class="file-name">${file.name}</div>
            </div>
        `).join('');

        // 添加文件项点击事件
        fileGrid.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openFile(item.dataset.fileId);
            });
        });
    }

    openFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            if (file.type === 'image') {
                this.showImagePreview(file);
            } else {
                window.open(file.url, '_blank');
            }
        }
    }

    showImagePreview(file) {
        // 创建图片预览模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.9); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
        `;
        
        modal.innerHTML = `
            <img src="${file.url}" style="max-width: 90%; max-height: 90%; object-fit: contain;">
        `;
        
        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        document.body.appendChild(modal);
    }

    async createNewFolder() {
        const folderName = prompt('请输入文件夹名称:');
        if (folderName && folderName.trim()) {
            try {
                const response = await fetch('/api/manage/folders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: folderName.trim(),
                        color: '#007aff'
                    })
                });

                if (response.ok) {
                    const newFolder = await response.json();
                    this.folders.set(newFolder.id, newFolder);
                    this.addFolderToSidebar(newFolder.id, newFolder.name, newFolder.color);
                    this.showNotification('文件夹创建成功', 'success');
                } else {
                    throw new Error('创建文件夹失败');
                }
            } catch (error) {
                console.error('创建文件夹失败:', error);
                this.showNotification('创建文件夹失败', 'error');
            }
        }
    }

    addFolderToSidebar(folderId, folderName, color = '#007aff') {
        const customSection = document.querySelector('.nav-section:last-child');
        const newFolderItem = document.createElement('a');
        newFolderItem.href = '#';
        newFolderItem.className = 'nav-item';
        newFolderItem.dataset.folder = folderId;
        newFolderItem.dataset.custom = 'true';
        newFolderItem.innerHTML = `
            <i class="fas fa-folder" style="color: ${color}"></i>
            <span>${folderName}</span>
        `;

        newFolderItem.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchFolder(folderId);
        });

        // 添加右键菜单支持
        newFolderItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showFolderContextMenu(e, folderId);
        });

        customSection.appendChild(newFolderItem);
    }

    switchViewMode(mode) {
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${mode}"]`).classList.add('active');

        const fileGrid = document.getElementById('fileGrid');
        if (mode === 'list') {
            fileGrid.style.display = 'block';
            // 实现列表视图样式
        } else {
            fileGrid.style.display = 'grid';
        }
    }

    searchFiles(query) {
        if (!query.trim()) {
            this.renderFiles();
            return;
        }

        const filteredFiles = this.files.filter(file => 
            file.name.toLowerCase().includes(query.toLowerCase())
        );

        const fileGrid = document.getElementById('fileGrid');
        fileGrid.innerHTML = filteredFiles.map(file => `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-icon ${file.type}">
                    ${file.type === 'image' ? 
                        `<img src="${file.url}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px;" onerror="this.outerHTML='<i class=\\"${this.getFileIcon(file.type)}\\"></i>'">` :
                        `<i class="${this.getFileIcon(file.type)}"></i>`
                    }
                </div>
                <div class="file-name">${file.name}</div>
            </div>
        `).join('');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 右键菜单功能
    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                e.preventDefault();
                this.showContextMenu(e, fileItem.dataset.fileId);
            }
        });
    }

    showContextMenu(event, fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        // 移除现有菜单
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
            background: white;
            border: 1px solid #e5e5e7;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            min-width: 150px;
        `;

        menu.innerHTML = `
            <div class="context-menu-item" data-action="preview">
                <i class="fas fa-eye"></i> 预览
            </div>
            <div class="context-menu-item" data-action="download">
                <i class="fas fa-download"></i> 下载
            </div>
            <div class="context-menu-item" data-action="copy-link">
                <i class="fas fa-link"></i> 复制链接
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="rename">
                <i class="fas fa-edit"></i> 重命名
            </div>
            <div class="context-menu-item" data-action="move">
                <i class="fas fa-folder-open"></i> 移动到文件夹
            </div>
            <div class="context-menu-item" data-action="favorite">
                <i class="fas fa-star"></i> ${file.favorite ? '取消收藏' : '添加收藏'}
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="info">
                <i class="fas fa-info-circle"></i> 文件信息
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="delete" style="color: #ff3b30;">
                <i class="fas fa-trash"></i> 删除
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .context-menu-item {
                padding: 8px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }
            .context-menu-item:hover {
                background: #f2f2f7;
            }
            .context-menu-divider {
                height: 1px;
                background: #e5e5e7;
                margin: 4px 0;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(menu);

        // 处理菜单项点击
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                this.handleContextMenuAction(action, file);
            }
            menu.remove();
        });

        // 点击其他地方关闭菜单
        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.remove();
            }, { once: true });
        }, 0);
    }

    handleContextMenuAction(action, file) {
        switch (action) {
            case 'preview':
                this.openFile(file.id);
                break;
            case 'download':
                this.downloadFile(file);
                break;
            case 'copy-link':
                this.copyFileLink(file);
                break;
            case 'rename':
                this.renameFile(file);
                break;
            case 'favorite':
                this.toggleFavorite(file);
                break;
            case 'delete':
                this.deleteFile(file);
                break;
            case 'info':
                this.showFileInfo(file);
                break;
            case 'move':
                this.showMoveFileDialog(file);
                break;
        }
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
            console.error('复制失败:', error);
            this.showNotification('复制失败', 'error');
        }
    }

    renameFile(file) {
        const newName = prompt('请输入新的文件名:', file.name);
        if (newName && newName.trim() && newName !== file.name) {
            file.name = newName.trim();
            this.renderFiles();
            this.showNotification('文件重命名成功', 'success');
        }
    }

    toggleFavorite(file) {
        file.favorite = !file.favorite;
        this.renderFiles();
        this.showNotification(
            file.favorite ? '已添加到收藏夹' : '已从收藏夹移除',
            'success'
        );
    }

    async deleteFile(file) {
        if (confirm(`确定要删除文件 "${file.name}" 吗？`)) {
            try {
                const response = await fetch(`/api/manage/delete/${file.id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.files = this.files.filter(f => f.id !== file.id);
                    this.renderFiles();
                    this.showNotification('文件删除成功', 'success');
                } else {
                    throw new Error('删除失败');
                }
            } catch (error) {
                console.error('删除文件失败:', error);
                this.showNotification('删除文件失败', 'error');
            }
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

    showFolderContextMenu(event, folderId) {
        const folder = this.folders.get(folderId);
        if (!folder || !folder.isCustom) return;

        // 移除现有菜单
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
            background: white;
            border: 1px solid #e5e5e7;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            min-width: 150px;
        `;

        menu.innerHTML = `
            <div class="context-menu-item" data-action="rename">
                <i class="fas fa-edit"></i> 重命名
            </div>
            <div class="context-menu-item" data-action="change-color">
                <i class="fas fa-palette"></i> 更改颜色
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="delete" style="color: #ff3b30;">
                <i class="fas fa-trash"></i> 删除文件夹
            </div>
        `;

        document.body.appendChild(menu);

        // 处理菜单项点击
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                this.handleFolderContextMenuAction(action, folder);
            }
            menu.remove();
        });

        // 点击其他地方关闭菜单
        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.remove();
            }, { once: true });
        }, 0);
    }

    async handleFolderContextMenuAction(action, folder) {
        switch (action) {
            case 'rename':
                await this.renameFolder(folder);
                break;
            case 'change-color':
                await this.changeFolderColor(folder);
                break;
            case 'delete':
                await this.deleteFolder(folder);
                break;
        }
    }

    async renameFolder(folder) {
        const newName = prompt('请输入新的文件夹名称:', folder.name);
        if (newName && newName.trim() && newName !== folder.name) {
            try {
                const response = await fetch('/api/manage/folders', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: folder.id,
                        name: newName.trim()
                    })
                });

                if (response.ok) {
                    const updatedFolder = await response.json();
                    this.folders.set(folder.id, updatedFolder);

                    // 更新侧边栏显示
                    const folderItem = document.querySelector(`[data-folder="${folder.id}"]`);
                    if (folderItem) {
                        folderItem.querySelector('span').textContent = newName.trim();
                    }

                    this.showNotification('文件夹重命名成功', 'success');
                } else {
                    throw new Error('重命名失败');
                }
            } catch (error) {
                console.error('重命名文件夹失败:', error);
                this.showNotification('重命名文件夹失败', 'error');
            }
        }
    }

    async changeFolderColor(folder) {
        const colors = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#ff2d92', '#5ac8fa', '#ffcc00'];
        const colorPicker = document.createElement('div');
        colorPicker.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 20px;
            z-index: 10000;
        `;

        colorPicker.innerHTML = `
            <h3 style="margin: 0 0 16px 0; text-align: center;">选择文件夹颜色</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                ${colors.map(color => `
                    <div class="color-option" data-color="${color}" style="
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: ${color};
                        cursor: pointer;
                        border: 3px solid ${color === folder.color ? '#000' : 'transparent'};
                    "></div>
                `).join('')}
            </div>
        `;

        document.body.appendChild(colorPicker);

        // 处理颜色选择
        colorPicker.addEventListener('click', async (e) => {
            const colorOption = e.target.closest('.color-option');
            if (colorOption) {
                const newColor = colorOption.dataset.color;

                try {
                    const response = await fetch('/api/manage/folders', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            id: folder.id,
                            color: newColor
                        })
                    });

                    if (response.ok) {
                        const updatedFolder = await response.json();
                        this.folders.set(folder.id, updatedFolder);

                        // 更新侧边栏显示
                        const folderItem = document.querySelector(`[data-folder="${folder.id}"]`);
                        if (folderItem) {
                            folderItem.querySelector('i').style.color = newColor;
                        }

                        this.showNotification('文件夹颜色更新成功', 'success');
                    } else {
                        throw new Error('更新颜色失败');
                    }
                } catch (error) {
                    console.error('更新文件夹颜色失败:', error);
                    this.showNotification('更新文件夹颜色失败', 'error');
                }

                colorPicker.remove();
            }
        });

        // 点击其他地方关闭
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!colorPicker.contains(e.target)) {
                    colorPicker.remove();
                }
            }, { once: true });
        }, 0);
    }

    async deleteFolder(folder) {
        if (confirm(`确定要删除文件夹 "${folder.name}" 吗？\n文件夹中的文件将移动到"全部文件"中。`)) {
            try {
                const response = await fetch(`/api/manage/folders?id=${folder.id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.folders.delete(folder.id);

                    // 从侧边栏移除
                    const folderItem = document.querySelector(`[data-folder="${folder.id}"]`);
                    if (folderItem) {
                        folderItem.remove();
                    }

                    // 如果当前在被删除的文件夹中，切换到全部文件
                    if (this.currentFolder === folder.id) {
                        this.switchFolder('all');
                    }

                    this.showNotification('文件夹删除成功', 'success');
                    this.loadFiles(); // 重新加载文件列表
                } else {
                    throw new Error('删除失败');
                }
            } catch (error) {
                console.error('删除文件夹失败:', error);
                this.showNotification('删除文件夹失败', 'error');
            }
        }
    }

    showFileInfo(file) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        const uploadDate = new Date(file.uploadDate);
        const fileSize = this.formatFileSize(file.size);

        dialog.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div class="file-icon ${file.type}" style="margin-right: 16px;">
                    ${file.type === 'image' ?
                        `<img src="${file.url}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px;" onerror="this.outerHTML='<i class=\\"${this.getFileIcon(file.type)}\\" style=\\"font-size: 32px;\\"></i>'">` :
                        `<i class="${this.getFileIcon(file.type)}" style="font-size: 32px;"></i>`
                    }
                </div>
                <div>
                    <h2 style="margin: 0 0 8px 0; font-size: 20px;">${file.name}</h2>
                    <p style="margin: 0; color: #8e8e93; font-size: 14px;">${file.type.toUpperCase()} 文件</p>
                </div>
            </div>

            <div style="border-top: 1px solid #e5e5e7; padding-top: 20px;">
                <div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #8e8e93;">文件大小:</span>
                    <span>${fileSize}</span>
                </div>
                <div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #8e8e93;">上传时间:</span>
                    <span>${uploadDate.toLocaleString('zh-CN')}</span>
                </div>
                <div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #8e8e93;">文件类型:</span>
                    <span>${file.type}</span>
                </div>
                <div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #8e8e93;">文件ID:</span>
                    <span style="font-family: monospace; font-size: 12px;">${file.id}</span>
                </div>
                <div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #8e8e93;">访问链接:</span>
                    <span style="font-family: monospace; font-size: 12px; word-break: break-all;">${window.location.origin}${file.url}</span>
                </div>
                ${file.favorite ? '<div class="info-row" style="display: flex; justify-content: space-between; margin-bottom: 12px;"><span style="color: #8e8e93;">状态:</span><span style="color: #ff9500;"><i class="fas fa-star"></i> 已收藏</span></div>' : ''}
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">关闭</button>
                <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${window.location.origin}${file.url}').then(() => {
                    window.fileManager.showNotification('链接已复制', 'success');
                    this.closest('.modal').remove();
                })">复制链接</button>
            </div>
        `;

        modal.className = 'modal';
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showMoveFileDialog(file) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
        `;

        const folderOptions = Array.from(this.folders.values())
            .filter(folder => folder.isCustom || folder.id === 'all')
            .map(folder => `
                <div class="folder-option" data-folder-id="${folder.id}" style="
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-bottom: 8px;
                    border: 1px solid #e5e5e7;
                ">
                    <i class="${folder.icon || 'fas fa-folder'}" style="color: ${folder.color || '#007aff'}; margin-right: 12px;"></i>
                    <span>${folder.name}</span>
                </div>
            `).join('');

        dialog.innerHTML = `
            <h2 style="margin: 0 0 20px 0;">移动文件到</h2>
            <p style="margin: 0 0 16px 0; color: #8e8e93;">选择要移动到的文件夹：</p>

            <div class="folder-list" style="max-height: 300px; overflow-y: auto;">
                ${folderOptions}
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
            </div>
        `;

        modal.className = 'modal';
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        // 处理文件夹选择
        dialog.addEventListener('click', async (e) => {
            const folderOption = e.target.closest('.folder-option');
            if (folderOption) {
                const folderId = folderOption.dataset.folderId;
                await this.moveFileToFolder(file, folderId === 'all' ? null : folderId);
                modal.remove();
            }
        });

        // 添加悬停效果
        dialog.querySelectorAll('.folder-option').forEach(option => {
            option.addEventListener('mouseenter', () => {
                option.style.background = '#f2f2f7';
            });
            option.addEventListener('mouseleave', () => {
                option.style.background = 'transparent';
            });
        });

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async moveFileToFolder(file, folderId) {
        try {
            const response = await fetch('/api/manage/move-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileId: file.id,
                    folderId: folderId
                })
            });

            if (response.ok) {
                // 更新本地文件信息
                file.folderId = folderId;

                // 重新渲染文件列表
                this.renderFiles();

                const folderName = folderId ? this.folders.get(folderId)?.name : '全部文件';
                this.showNotification(`文件已移动到 "${folderName}"`, 'success');
            } else {
                throw new Error('移动文件失败');
            }
        } catch (error) {
            console.error('移动文件失败:', error);
            this.showNotification('移动文件失败', 'error');
        }
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileUploadBtn = document.getElementById('mobileUploadBtn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }

        if (mobileUploadBtn) {
            mobileUploadBtn.addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeMobileSidebar();
            }
        });

        // 添加触摸手势支持
        this.setupTouchGestures();
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

    setupTouchGestures() {
        let startX = 0;
        let startY = 0;
        let isScrolling = false;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isScrolling = false;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = startX - currentX;
            const diffY = startY - currentY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                // 水平滑动
                if (!isScrolling) {
                    if (diffX > 50 && window.innerWidth <= 768) {
                        // 向左滑动，关闭侧边栏
                        this.closeMobileSidebar();
                    } else if (diffX < -50 && startX < 20 && window.innerWidth <= 768) {
                        // 从左边缘向右滑动，打开侧边栏
                        this.toggleMobileSidebar();
                    }
                }
            } else {
                // 垂直滑动，标记为滚动
                isScrolling = true;
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            startX = 0;
            startY = 0;
            isScrolling = false;
        }, { passive: true });
    }

    // 优化移动端的文件预览
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

        // 添加关闭按钮（移动端友好）
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

        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // 防止图片点击时关闭模态框
        img.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        document.body.appendChild(modal);
    }

    // 优化移动端的上下文菜单
    showContextMenu(event, fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        // 在移动端使用底部弹出菜单
        if (window.innerWidth <= 768) {
            this.showMobileActionSheet(file);
            return;
        }

        // 桌面端使用原有的右键菜单
        this.showDesktopContextMenu(event, file);
    }

    showMobileActionSheet(file) {
        const actionSheet = document.createElement('div');
        actionSheet.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            border-radius: 12px 12px 0 0;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            transform: translateY(100%);
            transition: transform 0.3s ease;
        `;

        actionSheet.innerHTML = `
            <div style="padding: 20px 0 10px; text-align: center; border-bottom: 1px solid #e5e5e7;">
                <div style="width: 36px; height: 4px; background: #c7c7cc; border-radius: 2px; margin: 0 auto;"></div>
                <h3 style="margin: 16px 0 0; font-size: 16px; color: #1d1d1f;">${file.name}</h3>
            </div>
            <div class="action-list">
                <div class="action-item" data-action="preview">
                    <i class="fas fa-eye"></i> 预览
                </div>
                <div class="action-item" data-action="download">
                    <i class="fas fa-download"></i> 下载
                </div>
                <div class="action-item" data-action="copy-link">
                    <i class="fas fa-link"></i> 复制链接
                </div>
                <div class="action-item" data-action="move">
                    <i class="fas fa-folder-open"></i> 移动到文件夹
                </div>
                <div class="action-item" data-action="favorite">
                    <i class="fas fa-star"></i> ${file.favorite ? '取消收藏' : '添加收藏'}
                </div>
                <div class="action-item" data-action="info">
                    <i class="fas fa-info-circle"></i> 文件信息
                </div>
                <div class="action-item" data-action="delete" style="color: #ff3b30;">
                    <i class="fas fa-trash"></i> 删除
                </div>
            </div>
            <div style="padding: 12px; border-top: 8px solid #f2f2f7;">
                <button class="cancel-btn" style="
                    width: 100%; padding: 16px; background: #f2f2f7; border: none;
                    border-radius: 8px; font-size: 16px; font-weight: 500; color: #007aff;
                ">取消</button>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .action-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 20px;
                font-size: 16px;
                cursor: pointer;
                border-bottom: 1px solid #f2f2f7;
            }
            .action-item:active {
                background: #f2f2f7;
            }
            .action-item:last-child {
                border-bottom: none;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(actionSheet);

        // 显示动画
        setTimeout(() => {
            actionSheet.style.transform = 'translateY(0)';
        }, 10);

        // 处理操作
        actionSheet.addEventListener('click', (e) => {
            const actionItem = e.target.closest('.action-item');
            const cancelBtn = e.target.closest('.cancel-btn');

            if (actionItem) {
                const action = actionItem.dataset.action;
                this.handleContextMenuAction(action, file);
                this.closeMobileActionSheet(actionSheet);
            } else if (cancelBtn) {
                this.closeMobileActionSheet(actionSheet);
            }
        });

        // 添加背景遮罩
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.3); z-index: 9999;
        `;
        overlay.addEventListener('click', () => {
            this.closeMobileActionSheet(actionSheet);
        });
        document.body.appendChild(overlay);
        actionSheet.overlay = overlay;
    }

    closeMobileActionSheet(actionSheet) {
        actionSheet.style.transform = 'translateY(100%)';
        setTimeout(() => {
            if (actionSheet.parentNode) {
                actionSheet.parentNode.removeChild(actionSheet);
            }
            if (actionSheet.overlay && actionSheet.overlay.parentNode) {
                actionSheet.overlay.parentNode.removeChild(actionSheet.overlay);
            }
        }, 300);
    }

    showDesktopContextMenu(event, file) {
        // 原有的桌面端右键菜单逻辑
        // ... (保持原有代码)
    }
}

// 添加动画样式
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(animationStyle);

// 初始化文件管理器
document.addEventListener('DOMContentLoaded', () => {
    const fileManager = new FileManager();
    fileManager.setupContextMenu();

    // 将文件管理器实例设为全局变量，供其他功能使用
    window.fileManager = fileManager;
});
