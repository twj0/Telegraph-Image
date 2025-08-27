export async function onRequestGet(context) {
    const { env } = context;
    
    try {
        if (!env.img_url) {
            return new Response(JSON.stringify({ error: 'KV storage not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取所有文件夹
        const foldersData = await env.img_url.get('folders_list');
        const folders = foldersData ? JSON.parse(foldersData) : getDefaultFolders();

        return new Response(JSON.stringify(folders), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

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

        const { name, parentId = null, color = '#007aff' } = await request.json();
        
        if (!name || !name.trim()) {
            return new Response(JSON.stringify({ error: 'Folder name is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取现有文件夹
        const foldersData = await env.img_url.get('folders_list');
        const folders = foldersData ? JSON.parse(foldersData) : getDefaultFolders();

        // 创建新文件夹
        const newFolder = {
            id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            parentId,
            color,
            createdAt: new Date().toISOString(),
            isCustom: true,
            fileCount: 0
        };

        folders.push(newFolder);

        // 保存到KV
        await env.img_url.put('folders_list', JSON.stringify(folders));

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

        const { id, name, color } = await request.json();
        
        if (!id) {
            return new Response(JSON.stringify({ error: 'Folder ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取现有文件夹
        const foldersData = await env.img_url.get('folders_list');
        const folders = foldersData ? JSON.parse(foldersData) : getDefaultFolders();

        // 查找并更新文件夹
        const folderIndex = folders.findIndex(f => f.id === id);
        if (folderIndex === -1) {
            return new Response(JSON.stringify({ error: 'Folder not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 不允许修改系统文件夹
        if (!folders[folderIndex].isCustom) {
            return new Response(JSON.stringify({ error: 'Cannot modify system folder' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (name) folders[folderIndex].name = name.trim();
        if (color) folders[folderIndex].color = color;
        folders[folderIndex].updatedAt = new Date().toISOString();

        // 保存到KV
        await env.img_url.put('folders_list', JSON.stringify(folders));

        return new Response(JSON.stringify(folders[folderIndex]), {
            status: 200,
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

        // 获取现有文件夹
        const foldersData = await env.img_url.get('folders_list');
        const folders = foldersData ? JSON.parse(foldersData) : getDefaultFolders();

        // 查找文件夹
        const folderIndex = folders.findIndex(f => f.id === folderId);
        if (folderIndex === -1) {
            return new Response(JSON.stringify({ error: 'Folder not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 不允许删除系统文件夹
        if (!folders[folderIndex].isCustom) {
            return new Response(JSON.stringify({ error: 'Cannot delete system folder' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 删除文件夹
        folders.splice(folderIndex, 1);

        // 将该文件夹中的文件移动到"全部文件"
        const filesList = await env.img_url.list();
        for (const file of filesList.keys) {
            if (file.metadata && file.metadata.folderId === folderId) {
                const updatedMetadata = { ...file.metadata };
                delete updatedMetadata.folderId;
                await env.img_url.put(file.name, "", { metadata: updatedMetadata });
            }
        }

        // 保存到KV
        await env.img_url.put('folders_list', JSON.stringify(folders));

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
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

function getDefaultFolders() {
    return [
        {
            id: 'all',
            name: '全部文件',
            icon: 'fas fa-home',
            isSystem: true,
            fileCount: 0
        },
        {
            id: 'recent',
            name: '最近使用',
            icon: 'fas fa-clock',
            isSystem: true,
            fileCount: 0
        },
        {
            id: 'favorites',
            name: '收藏夹',
            icon: 'fas fa-star',
            isSystem: true,
            fileCount: 0
        },
        {
            id: 'images',
            name: '图片',
            icon: 'fas fa-image',
            isSystem: true,
            fileCount: 0
        },
        {
            id: 'documents',
            name: '文档',
            icon: 'fas fa-file-alt',
            isSystem: true,
            fileCount: 0
        },
        {
            id: 'videos',
            name: '视频',
            icon: 'fas fa-video',
            isSystem: true,
            fileCount: 0
        },
        {
            id: 'audio',
            name: '音频',
            icon: 'fas fa-music',
            isSystem: true,
            fileCount: 0
        }
    ];
}
