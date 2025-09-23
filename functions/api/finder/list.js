// Telegraph Finder - 文件列表API
// Cloudflare Workers版本

export async function onRequest(context) {
    const { request, env } = context;

    try {
        // 只允许GET请求
        if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405 });
        }

        // 从KV存储获取文件列表
        const fileList = await getFileListFromKV(env);
        
        return new Response(JSON.stringify(fileList), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('获取文件列表失败:', error);
        return new Response(JSON.stringify({ 
            error: '获取文件列表失败',
            message: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// 从KV存储获取文件列表
async function getFileListFromKV(env) {
    try {
        // 获取所有文件的键
        const listResult = await env.img_url.list();
        const fileList = [];

        // 遍历每个文件，获取详细信息
        for (const key of listResult.keys) {
            try {
                const fileData = await env.img_url.get(key.name);
                if (fileData) {
                    const parsedData = JSON.parse(fileData);
                    
                    // 构建文件信息对象
                    const fileInfo = {
                        name: key.name,
                        metadata: {
                            fileName: parsedData.name || key.name,
                            fileSize: parsedData.size || 0,
                            TimeStamp: parsedData.TimeStamp || Date.now(),
                            parentFolder: parsedData.parentFolder || '/',
                            liked: parsedData.liked || false,
                            mimeType: parsedData.type || 'application/octet-stream',
                            url: parsedData.url || '',
                        }
                    };
                    
                    fileList.push(fileInfo);
                }
            } catch (parseError) {
                console.warn(`解析文件 ${key.name} 数据失败:`, parseError);
                // 如果解析失败，创建基本信息
                fileList.push({
                    name: key.name,
                    metadata: {
                        fileName: key.name,
                        fileSize: 0,
                        TimeStamp: Date.now(),
                        parentFolder: '/',
                        liked: false,
                        mimeType: 'application/octet-stream',
                        url: '',
                    }
                });
            }
        }

        // 按时间戳排序（最新的在前）
        fileList.sort((a, b) => b.metadata.TimeStamp - a.metadata.TimeStamp);

        return fileList;
    } catch (error) {
        console.error('从KV获取文件列表失败:', error);
        throw new Error('无法访问文件存储');
    }
}
