class TelegraphFinder {
    constructor() {
        this.currentFolder = 'all';
        this.files = [];
        this.folders = new Map();
        this.uploadQueue = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeFolders();
        this.loadFiles();
    }

    setupEventListeners() {
        // 拖拽上传
        this.setupDragAndDrop();
        
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

        // 右键菜单
        this.setupContextMenu();
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
                    folder: this.currentFolder,
                    favorite: false
                };

                this.files.push(newFile);
                this.renderFiles();

                // 移除上传项
                setTimeout(() => {
                    this.removeUploadItem(uploadId);
                }, 2000);

                this.showNotification('文件上传成功', 'success');

            } else {
                throw new Error('上传失败');
            }

        } catch (error) {
            console.error('上传错误:', error);
            this.updateUploadProgress(uploadId, -1); // -1 表示错误
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

    initializeFolders() {
        this.folders.set('all', { id: 'all', name: '全部文件', icon: 'fas fa-home', isSystem: true });
        this.folders.set('recent', { id: 'recent', name: '最近使用', icon: 'fas fa-clock', isSystem: true });
        this.folders.set('favorites', { id: 'favorites', name: '收藏夹', icon: 'fas fa-star', isSystem: true });
        this.folders.set('images', { id: 'images', name: '图片', icon: 'fas fa-image', isSystem: true });
        this.folders.set('documents', { id: 'documents', name: '文档', icon: 'fas fa-file-alt', isSystem: true });
        this.folders.set('videos', { id: 'videos', name: '视频', icon: 'fas fa-video', isSystem: true });
        this.folders.set('audio', { id: 'audio', name: '音频', icon: 'fas fa-music', isSystem: true });
    }

    async loadFiles() {
        try {
            // 使用现有的API端点
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
                    folder: item.metadata?.folderId || 'all',
                    favorite: item.metadata?.liked || false
                }));
                this.renderFiles();
            }
        } catch (error) {
            console.error('加载文件失败:', error);
            this.showNotification('加载文件失败', 'error');
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
        const emptyState = document.getElementById('emptyState');
        let filesToShow = this.files;

        // 根据当前文件夹过滤文件
        if (this.currentFolder !== 'all') {
            if (this.currentFolder === 'recent') {
                filesToShow = this.files
                    .sort((a, b) => b.uploadDate - a.uploadDate)
                    .slice(0, 20);
            } else if (this.currentFolder === 'favorites') {
                filesToShow = this.files.filter(file => file.favorite);
            } else if (['images', 'documents', 'videos', 'audio'].includes(this.currentFolder)) {
                const type = this.currentFolder.slice(0, -1); // 移除复数s
                filesToShow = this.files.filter(file => file.type === type);
            } else {
                // 自定义文件夹
                filesToShow = this.files.filter(file => file.folder === this.currentFolder);
            }
        }

        if (filesToShow.length === 0) {
            fileGrid.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            fileGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            
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
    }
