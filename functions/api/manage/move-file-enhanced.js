// 增强版文件移动API - 支持多层级文件夹

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        if (!env.img_url) {
            return new Response(JSON.stringify({ error: 'KV storage not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { fileId, folderId, fileIds } = await request.json();
        
        // 支持单个文件或批量文件移动
        const filesToMove = fileIds || [fileId];
        
        if (!filesToMove || filesToMove.length === 0) {
            return new Response(JSON.stringify({ error: 'File ID(s) required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const results = [];
        const errors = [];

        for (const currentFileId of filesToMove) {
            try {
                const result = await moveFile(env, currentFileId, folderId);
                results.push(result);
            } catch (error) {
                console.error(`移动文件 ${currentFileId} 失败:`, error);
                errors.push({
                    fileId: currentFileId,
                    error: error.message
                });
            }
        }

        // 更新文件夹文件计数
        if (folderId) {
            await updateFolderFileCount(env, folderId);
        }

        const response = {
            success: results.length,
            errors: errors.length,
            results: results
        };

        if (errors.length > 0) {
            response.errors = errors;
        }

        return new Response(JSON.stringify(response), {
            status: errors.length === filesToMove.length ? 500 : 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('批量移动文件失败:', error);
        return new Response(JSON.stringify({ error: 'Failed to move files' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function moveFile(env, fileId, targetFolderId) {
    // 获取文件数据
    const fileData = await env.img_url.get(fileId);
    if (!fileData) {
        throw new Error(`File ${fileId} not found`);
    }

    // 获取文件元数据
    const fileInfo = await env.img_url.getWithMetadata(fileId);
    const currentMetadata = fileInfo.metadata || {};

    // 验证目标文件夹存在（如果不是移动到根目录）
    if (targetFolderId && targetFolderId !== 'root') {
        const folderData = await env.img_url.get(`folder_${targetFolderId}`);
        if (!folderData) {
            throw new Error(`Target folder ${targetFolderId} not found`);
        }
    }

    // 更新文件元数据
    const resolvedFolderId = targetFolderId && targetFolderId !== 'root' ? targetFolderId : null;
    const resolvedParentFolder = resolvedFolderId || 'root';

    const updatedMetadata = {
        ...currentMetadata,
        folderId: resolvedFolderId,
        parentFolder: resolvedParentFolder,
        movedAt: new Date().toISOString(),
        previousFolder: currentMetadata.parentFolder || currentMetadata.folderId || 'root'
    };

    // 保存更新后的文件
    await env.img_url.put(fileId, fileData, { metadata: updatedMetadata });

    return {
        fileId: fileId,
        previousFolder: currentMetadata.folderId || currentMetadata.parentFolder || 'root',
        newFolder: resolvedFolderId || 'root',
        movedAt: updatedMetadata.movedAt
    };
}

async function updateFolderFileCount(env, folderId) {
    try {
        if (!folderId || folderId === 'root') return;

        // 获取文件夹数据
        const folderData = await env.img_url.get(`folder_${folderId}`);
        if (!folderData) return;

        const folder = JSON.parse(folderData);

        // 计算文件夹中的文件数量
        const fileCount = await countFilesInFolder(env, folderId);
        
        // 更新文件夹信息
        folder.fileCount = fileCount;
        folder.updatedAt = new Date().toISOString();

        // 保存更新后的文件夹数据
        await env.img_url.put(`folder_${folderId}`, JSON.stringify(folder));

        // 更新文件夹列表中的计数
        await updateFolderInList(env, folder);

    } catch (error) {
        console.error('更新文件夹文件计数失败:', error);
    }
}

async function countFilesInFolder(env, folderId) {
    try {
        const filesList = await env.img_url.list();
        let count = 0;

        for (const file of filesList.keys) {
            const assignedFolderId = file.metadata?.folderId ?? file.metadata?.parentFolder ?? null;
            if (assignedFolderId === folderId) {
                count++;
            }
        }

        return count;
    } catch (error) {
        console.error('计算文件夹文件数量失败:', error);
        return 0;
    }
}

async function updateFolderInList(env, folder) {
    try {
        const foldersList = await env.img_url.get('folders_list');
        if (!foldersList) return;

        let folders = JSON.parse(foldersList);
        const folderIndex = folders.findIndex(f => f.id === folder.id);

        if (folderIndex !== -1) {
            folders[folderIndex] = folder;
            await env.img_url.put('folders_list', JSON.stringify(folders));
        }
    } catch (error) {
        console.error('更新文件夹列表失败:', error);
    }
}

// 获取文件夹结构API
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
        const action = url.searchParams.get('action');

        if (action === 'structure') {
            // 获取文件夹结构
            const structureData = await env.img_url.get('folder_structure');
            const structure = structureData ? JSON.parse(structureData) : { root: [] };

            return new Response(JSON.stringify(structure), {
                headers: { 'Content-Type': 'application/json' }
            });

        } else if (action === 'files') {
            // 获取指定文件夹中的文件
            const folderId = url.searchParams.get('folderId') || 'root';
            const files = await getFilesInFolder(env, folderId);

            return new Response(JSON.stringify(files), {
                headers: { 'Content-Type': 'application/json' }
            });

        } else {
            return new Response(JSON.stringify({ error: 'Invalid action' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('获取数据失败:', error);
        return new Response(JSON.stringify({ error: 'Failed to get data' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function getFilesInFolder(env, folderId) {
    try {
        const filesList = await env.img_url.list();
        const files = [];

        for (const file of filesList.keys) {
            // 跳过文件夹数据和系统数据
            if (file.name.startsWith('folder_') || 
                file.name === 'folders_list' || 
                file.name === 'folder_structure') {
                continue;
            }

            const assignedFolderId = file.metadata?.folderId ?? file.metadata?.parentFolder ?? null;
            const normalizedFolderId = assignedFolderId || 'root';

            if ((folderId === 'root' && normalizedFolderId === 'root') || normalizedFolderId === folderId) {
                files.push({
                    id: file.name,
                    name: file.metadata?.fileName || file.name,
                    size: file.metadata?.fileSize || 0,
                    type: getFileType(file.name),
                    uploadDate: file.metadata?.TimeStamp || Date.now(),
                    parentFolder: normalizedFolderId,
                    favorite: file.metadata?.liked || false,
                    url: `/file/${file.name}`
                });
            }
        }

        return files;
    } catch (error) {
        console.error('获取文件夹文件失败:', error);
        return [];
    }
}

function getFileType(filename) {
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
