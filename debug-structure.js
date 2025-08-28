// 调试文件夹结构的辅助脚本

// 在浏览器控制台中运行这些函数来调试文件夹结构问题

window.debugFinder = {
    // 检查当前文件夹结构
    checkStructure() {
        console.log('=== 文件夹结构调试 ===');
        
        if (window.finder) {
            console.log('Finder实例存在');
            console.log('当前路径:', window.finder.currentPath);
            console.log('文件夹结构:', window.finder.folderStructure);
            console.log('文件夹映射:', window.finder.folders);
            console.log('文件列表:', window.finder.files);
        } else {
            console.log('Finder实例不存在');
        }
    },

    // 清理损坏的本地存储数据
    cleanLocalStorage() {
        console.log('清理本地存储数据...');
        
        // 清理文件夹结构
        localStorage.removeItem('finder_folder_structure');
        
        // 清理所有文件夹数据
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('folder_')) {
                localStorage.removeItem(key);
                i--; // 因为删除了一个项目，索引需要调整
            }
        }
        
        console.log('本地存储已清理，请刷新页面');
    },

    // 重置文件夹结构
    resetStructure() {
        if (window.finder) {
            console.log('重置文件夹结构...');
            
            // 重置为默认结构
            window.finder.folderStructure = new Map();
            window.finder.folderStructure.set('root', new Set());
            
            // 保存到本地存储
            window.finder.saveFolderStructure();
            
            // 重新渲染
            window.finder.renderCurrentView();
            
            console.log('文件夹结构已重置');
        }
    },

    // 测试创建文件夹
    testCreateFolder() {
        if (window.finder) {
            console.log('测试创建文件夹...');
            
            const testFolder = {
                id: 'test_folder_' + Date.now(),
                name: '测试文件夹',
                parentFolder: 'root',
                isFolder: true,
                isCustom: true,
                color: '#4A90E2',
                createdAt: new Date().toISOString()
            };
            
            // 添加到文件夹映射
            window.finder.folders.set(testFolder.id, testFolder);
            
            // 添加到文件夹结构
            if (!window.finder.folderStructure.has('root')) {
                window.finder.folderStructure.set('root', new Set());
            }
            window.finder.folderStructure.get('root').add(testFolder.id);
            
            // 保存和渲染
            window.finder.saveFolderStructure();
            localStorage.setItem(`folder_${testFolder.id}`, JSON.stringify(testFolder));
            window.finder.renderCurrentView();
            
            console.log('测试文件夹已创建:', testFolder);
        }
    },

    // 检查数据类型
    checkDataTypes() {
        console.log('=== 数据类型检查 ===');
        
        if (window.finder) {
            console.log('folderStructure类型:', window.finder.folderStructure.constructor.name);
            
            for (const [key, value] of window.finder.folderStructure) {
                console.log(`${key}:`, value.constructor.name, value);
                
                if (typeof value[Symbol.iterator] === 'function') {
                    console.log(`  ${key} 是可迭代的`);
                } else {
                    console.log(`  ${key} 不可迭代!`);
                }
            }
        }
    },

    // 修复数据结构
    fixStructure() {
        console.log('修复数据结构...');
        
        if (window.finder) {
            const newStructure = new Map();
            
            for (const [key, value] of window.finder.folderStructure) {
                if (value instanceof Set) {
                    newStructure.set(key, value);
                } else if (Array.isArray(value)) {
                    newStructure.set(key, new Set(value));
                } else if (value && typeof value === 'object') {
                    // 如果是对象，尝试转换
                    newStructure.set(key, new Set(Object.values(value)));
                } else {
                    newStructure.set(key, new Set());
                }
            }
            
            // 确保根目录存在
            if (!newStructure.has('root')) {
                newStructure.set('root', new Set());
            }
            
            window.finder.folderStructure = newStructure;
            window.finder.saveFolderStructure();
            window.finder.renderCurrentView();
            
            console.log('数据结构已修复');
        }
    },

    // 显示帮助信息
    help() {
        console.log(`
=== Telegraph Finder 调试工具 ===

可用命令:
- debugFinder.checkStructure()     检查当前文件夹结构
- debugFinder.cleanLocalStorage()  清理本地存储数据
- debugFinder.resetStructure()     重置文件夹结构
- debugFinder.testCreateFolder()   测试创建文件夹
- debugFinder.checkDataTypes()     检查数据类型
- debugFinder.fixStructure()       修复数据结构
- debugFinder.help()               显示此帮助信息

使用方法:
1. 打开浏览器开发者工具 (F12)
2. 在控制台中输入命令
3. 根据输出信息进行调试

常见问题解决:
1. 如果出现 "not iterable" 错误，运行 fixStructure()
2. 如果数据损坏，运行 cleanLocalStorage() 然后刷新页面
3. 如果需要重置，运行 resetStructure()
        `);
    }
};

// 自动运行检查
console.log('Telegraph Finder 调试工具已加载');
console.log('运行 debugFinder.help() 查看可用命令');

// 如果检测到错误，自动尝试修复
setTimeout(() => {
    if (window.finder) {
        try {
            // 测试是否可以正常获取文件夹项目
            window.finder.getCurrentFolderItems();
        } catch (error) {
            if (error.message.includes('not iterable')) {
                console.warn('检测到迭代错误，尝试自动修复...');
                window.debugFinder.fixStructure();
            }
        }
    }
}, 2000);
