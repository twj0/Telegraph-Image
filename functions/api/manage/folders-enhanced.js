// 增强版文件夹管理API - 支持多层级结构

export async function onRequestGet(context) {
    const { request, env } = context;
    
    try {
        if (!env.img_url) {
            return new Response(JSON.stringify({ error: 'KV storage not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const url = new URL(request.url);
        const folderId = url.searchParams.get('id');

        if (folderId) {
            // 获取特定文件夹信息
            const folderData = await env.img_url.get(`folder_${folderId}`);
            if (folderData) {
                return new Response(folderData, {
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                return new Response(JSON.stringify({ error: 'Folder not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else {
            // 获取所有文件夹
            const foldersList = await env.img_url.get('folders_list');
            const folders = foldersList ? JSON.parse(foldersList) : getDefaultFolders();
            
            return new Response(JSON.stringify(folders), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('获取文件夹失败:', error);
        return new Response(JSON.stringify({ error: 'Failed to get folders' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        if (!env.img_url) {
            return new Response(JSON.stringify({ error: 'KV storage not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { name, color, parentFolder } = await request.json();
        
        if (!name || !name.trim()) {
            return new Response(JSON.stringify({ error: 'Folder name is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const folderId = 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newFolder = {
            id: folderId,
            name: name.trim(),
            color: color || '#4A90E2',
            parentFolder: parentFolder || 'root',
            isCustom: true,
            isFolder: true,
            fileCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 保存文件夹数据
        await env.img_url.put(`folder_${folderId}`, JSON.stringify(newFolder));

        // 更新文件夹列表
        await updateFoldersList(env, newFolder);

        // 更新文件夹结构
        await updateFolderStructure(env, folderId, parentFolder || 'root');

        return new Response(JSON.stringify(newFolder), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('创建文件夹失败:', error);
        return new Response(JSON.stringify({ error: 'Failed to create folder' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPut(context) {
    const { request, env } = context;
    
    try {
        if (!env.img_url) {
            return new Response(JSON.stringify({ error: 'KV storage not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { id, name, color, parentFolder } = await request.json();
        
        if (!id) {
            return new Response(JSON.stringify({ error: 'Folder ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取现有文件夹数据
        const existingData = await env.img_url.get(`folder_${id}`);
        if (!existingData) {
            return new Response(JSON.stringify({ error: 'Folder not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const folder = JSON.parse(existingData);
        
        // 更新文件夹信息
        if (name !== undefined) folder.name = name.trim();
        if (color !== undefined) folder.color = color;
        if (parentFolder !== undefined && parentFolder !== folder.parentFolder) {
            // 移动文件夹到新的父文件夹
            await moveFolderToParent(env, id, folder.parentFolder, parentFolder);
            folder.parentFolder = parentFolder;
        }
        
        folder.updatedAt = new Date().toISOString();

        // 保存更新后的文件夹数据
        await env.img_url.put(`folder_${id}`, JSON.stringify(folder));

        // 更新文件夹列表
        await updateFoldersList(env, folder);

        return new Response(JSON.stringify(folder), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('更新文件夹失败:', error);
        return new Response(JSON.stringify({ error: 'Failed to update folder' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    
    try {
        if (!env.img_url) {
            return new Response(JSON.stringify({ error: 'KV storage not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const url = new URL(request.url);
        const folderId = url.searchParams.get('id');

        if (!folderId) {
            return new Response(JSON.stringify({ error: 'Folder ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取文件夹数据
        const folderData = await env.img_url.get(`folder_${folderId}`);
        if (!folderData) {
            return new Response(JSON.stringify({ error: 'Folder not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const folder = JSON.parse(folderData);

        // 删除文件夹数据
        await env.img_url.delete(`folder_${folderId}`);

        // 从文件夹结构中移除
        await removeFolderFromStructure(env, folderId, folder.parentFolder);

        // 更新文件夹列表
        await removeFolderFromList(env, folderId);

        // 将文件夹中的文件移动到根目录
        await moveFilesToRoot(env, folderId);

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('删除文件夹失败:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete folder' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 辅助函数
function getDefaultFolders() {
    return [
        { id: 'all', name: '全部文件', icon: 'fas fa-home', isSystem: true, fileCount: 0 },
        { id: 'recent', name: '最近使用', icon: 'fas fa-clock', isSystem: true, fileCount: 0 },
        { id: 'favorites', name: '收藏夹', icon: 'fas fa-star', isSystem: true, fileCount: 0 },
        { id: 'images', name: '图片', icon: 'fas fa-image', isSystem: true, fileCount: 0 },
        { id: 'documents', name: '文档', icon: 'fas fa-file-alt', isSystem: true, fileCount: 0 },
        { id: 'videos', name: '视频', icon: 'fas fa-video', isSystem: true, fileCount: 0 },
        { id: 'audio', name: '音频', icon: 'fas fa-music', isSystem: true, fileCount: 0 }
    ];
}

async function updateFoldersList(env, folder) {
    try {
        const foldersList = await env.img_url.get('folders_list');
        let folders = foldersList ? JSON.parse(foldersList) : getDefaultFolders();
        
        // 更新或添加文件夹
        const existingIndex = folders.findIndex(f => f.id === folder.id);
        if (existingIndex !== -1) {
            folders[existingIndex] = folder;
        } else {
            folders.push(folder);
        }
        
        await env.img_url.put('folders_list', JSON.stringify(folders));
    } catch (error) {
        console.error('更新文件夹列表失败:', error);
    }
}

async function updateFolderStructure(env, folderId, parentFolderId) {
    try {
        const structureData = await env.img_url.get('folder_structure');
        let structure = structureData ? JSON.parse(structureData) : {};
        
        if (!structure[parentFolderId]) {
            structure[parentFolderId] = [];
        }
        
        if (!structure[parentFolderId].includes(folderId)) {
            structure[parentFolderId].push(folderId);
        }
        
        await env.img_url.put('folder_structure', JSON.stringify(structure));
    } catch (error) {
        console.error('更新文件夹结构失败:', error);
    }
}

async function moveFolderToParent(env, folderId, oldParent, newParent) {
    try {
        const structureData = await env.img_url.get('folder_structure');
        let structure = structureData ? JSON.parse(structureData) : {};
        
        // 从旧父文件夹中移除
        if (structure[oldParent]) {
            structure[oldParent] = structure[oldParent].filter(id => id !== folderId);
        }
        
        // 添加到新父文件夹
        if (!structure[newParent]) {
            structure[newParent] = [];
        }
        structure[newParent].push(folderId);
        
        await env.img_url.put('folder_structure', JSON.stringify(structure));
    } catch (error) {
        console.error('移动文件夹失败:', error);
    }
}

async function removeFolderFromStructure(env, folderId, parentFolderId) {
    try {
        const structureData = await env.img_url.get('folder_structure');
        let structure = structureData ? JSON.parse(structureData) : {};
        
        // 从父文件夹中移除
        if (structure[parentFolderId]) {
            structure[parentFolderId] = structure[parentFolderId].filter(id => id !== folderId);
        }
        
        // 删除该文件夹的子结构
        delete structure[folderId];
        
        await env.img_url.put('folder_structure', JSON.stringify(structure));
    } catch (error) {
        console.error('从结构中移除文件夹失败:', error);
    }
}

async function removeFolderFromList(env, folderId) {
    try {
        const foldersList = await env.img_url.get('folders_list');
        let folders = foldersList ? JSON.parse(foldersList) : getDefaultFolders();
        
        folders = folders.filter(f => f.id !== folderId);
        
        await env.img_url.put('folders_list', JSON.stringify(folders));
    } catch (error) {
        console.error('从列表中移除文件夹失败:', error);
    }
}

async function moveFilesToRoot(env, folderId) {
    try {
        // 获取所有文件
        const filesList = await env.img_url.list();
        
        for (const file of filesList.keys) {
            if (file.metadata?.parentFolder === folderId) {
                // 更新文件的父文件夹为root
                const updatedMetadata = {
                    ...file.metadata,
                    parentFolder: 'root',
                    movedAt: new Date().toISOString()
                };
                
                await env.img_url.put(file.name, file.value || "", { metadata: updatedMetadata });
            }
        }
    } catch (error) {
        console.error('移动文件到根目录失败:', error);
    }
}
