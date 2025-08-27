export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        if (!env.img_url) {
            return new Response(JSON.stringify({ error: 'KV storage not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { fileId, folderId } = await request.json();
        
        if (!fileId) {
            return new Response(JSON.stringify({ error: 'File ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取文件信息
        const fileData = await env.img_url.getWithMetadata(fileId);
        if (!fileData) {
            return new Response(JSON.stringify({ error: 'File not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 更新文件的文件夹信息
        const updatedMetadata = {
            ...fileData.metadata,
            folderId: folderId || null,
            movedAt: new Date().toISOString()
        };

        await env.img_url.put(fileId, fileData.value || "", { metadata: updatedMetadata });

        // 更新文件夹的文件计数
        await updateFolderFileCounts(env);

        return new Response(JSON.stringify({ 
            success: true, 
            fileId, 
            folderId: folderId || null 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('移动文件失败:', error);
        return new Response(JSON.stringify({ error: 'Failed to move file' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 批量移动文件
export async function onRequestPut(context) {
    const { request, env } = context;
    
    try {
        if (!env.img_url) {
            return new Response(JSON.stringify({ error: 'KV storage not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { fileIds, folderId } = await request.json();
        
        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return new Response(JSON.stringify({ error: 'File IDs array is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const results = [];
        const errors = [];

        for (const fileId of fileIds) {
            try {
                // 获取文件信息
                const fileData = await env.img_url.getWithMetadata(fileId);
                if (!fileData) {
                    errors.push({ fileId, error: 'File not found' });
                    continue;
                }

                // 更新文件的文件夹信息
                const updatedMetadata = {
                    ...fileData.metadata,
                    folderId: folderId || null,
                    movedAt: new Date().toISOString()
                };

                await env.img_url.put(fileId, fileData.value || "", { metadata: updatedMetadata });
                results.push({ fileId, success: true });

            } catch (error) {
                console.error(`移动文件 ${fileId} 失败:`, error);
                errors.push({ fileId, error: error.message });
            }
        }

        // 更新文件夹的文件计数
        await updateFolderFileCounts(env);

        return new Response(JSON.stringify({ 
            results,
            errors,
            totalProcessed: fileIds.length,
            successCount: results.length,
            errorCount: errors.length
        }), {
            status: 200,
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

// 更新文件夹文件计数的辅助函数
async function updateFolderFileCounts(env) {
    try {
        // 获取所有文件
        const filesList = await env.img_url.list();
        
        // 获取文件夹列表
        const foldersData = await env.img_url.get('folders_list');
        const folders = foldersData ? JSON.parse(foldersData) : [];

        // 重置所有文件夹的计数
        folders.forEach(folder => {
            folder.fileCount = 0;
        });

        // 统计每个文件夹的文件数量
        const folderCounts = new Map();
        const typeCounts = new Map();
        let totalFiles = 0;
        let recentFiles = 0;
        let favoriteFiles = 0;

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        for (const file of filesList.keys) {
            totalFiles++;
            
            // 统计最近文件
            if (file.metadata?.TimeStamp && new Date(file.metadata.TimeStamp) > oneWeekAgo) {
                recentFiles++;
            }

            // 统计收藏文件
            if (file.metadata?.liked) {
                favoriteFiles++;
            }

            // 统计自定义文件夹
            if (file.metadata?.folderId) {
                folderCounts.set(file.metadata.folderId, (folderCounts.get(file.metadata.folderId) || 0) + 1);
            }

            // 统计文件类型
            const fileType = getFileTypeFromName(file.name);
            if (fileType) {
                typeCounts.set(fileType, (typeCounts.get(fileType) || 0) + 1);
            }
        }

        // 更新文件夹计数
        folders.forEach(folder => {
            switch (folder.id) {
                case 'all':
                    folder.fileCount = totalFiles;
                    break;
                case 'recent':
                    folder.fileCount = recentFiles;
                    break;
                case 'favorites':
                    folder.fileCount = favoriteFiles;
                    break;
                case 'images':
                    folder.fileCount = typeCounts.get('image') || 0;
                    break;
                case 'documents':
                    folder.fileCount = typeCounts.get('document') || 0;
                    break;
                case 'videos':
                    folder.fileCount = typeCounts.get('video') || 0;
                    break;
                case 'audio':
                    folder.fileCount = typeCounts.get('audio') || 0;
                    break;
                default:
                    if (folder.isCustom) {
                        folder.fileCount = folderCounts.get(folder.id) || 0;
                    }
                    break;
            }
        });

        // 保存更新后的文件夹列表
        await env.img_url.put('folders_list', JSON.stringify(folders));

    } catch (error) {
        console.error('更新文件夹计数失败:', error);
    }
}

function getFileTypeFromName(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
        return 'image';
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
        return 'video';
    } else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
        return 'audio';
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
        return 'document';
    }
    return null;
}
