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
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.click();
            });
        }

        // 文件输入
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshImages();
            });
        }

        // 拖拽上传
        const fileArea = document.querySelector('.file-area');
        if (fileArea) {
            fileArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileArea.classList.add('drag-over');
            });

            fileArea.addEventListener('dragleave', () => {
                fileArea.classList.remove('drag-over');
            });

            fileArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileArea.classList.remove('drag-over');
                this.handleFileUpload(e.dataTransfer.files);
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

        // 更新统计信息
        this.updateStats();

        console.log(`✅ 渲染了 ${this.images.length} 张图片`);
    }

    updateStats() {
        const imageCount = document.getElementById('imageCount');
        if (imageCount) {
            const totalSize = this.images.reduce((sum, img) => sum + img.size, 0);
            imageCount.textContent = `共 ${this.images.length} 张图片，总大小 ${this.formatFileSize(totalSize)}`;
        }
    }

    async refreshImages() {
        console.log('🔄 刷新图片列表...');
        const refreshBtn = document.getElementById('refreshBtn');

        // 显示加载状态
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刷新中...';
            refreshBtn.disabled = true;
        }

        try {
            await this.loadImages();
            this.renderImages();
            console.log('✅ 刷新完成');
        } finally {
            // 恢复按钮状态
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新';
                refreshBtn.disabled = false;
            }
        }
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
        const a = document.createElement('a');
        a.href = image.url;
        a.download = image.name;
        a.click();
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

    handleFileUpload(files) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (this.isImageFile(file.name)) {
                this.uploadImage(file);
            } else {
                alert(`${file.name} 不是支持的图片格式`);
            }
        });
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('上传成功！');
                // 重新加载图片列表
                await this.loadImages();
                this.renderImages();
            } else {
                alert('上传失败，请重试');
            }
        } catch (error) {
            alert('上传失败：' + error.message);
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

// 启动应用
const imageViewer = new SimpleImageViewer();
