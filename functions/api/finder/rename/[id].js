// Telegraph Finder - 重命名文件API
// Cloudflare Workers版本

export async function onRequest(context) {
    const { request, env, params } = context;

    try {
        // 只允许PUT请求
        if (request.method !== 'PUT') {
            return new Response('Method not allowed', { status: 405 });
        }

        const fileId = params.id;
        if (!fileId) {
            return new Response(JSON.stringify({ 
                error: '文件ID不能为空' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 解析请求体
        const requestBody = await request.json();
        const { newName } = requestBody;

        if (!newName || newName.trim() === '') {
            return new Response(JSON.stringify({ 
                error: '新文件名不能为空' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 检查文件是否存在
        const fileData = await env.img_url.get(fileId);
        if (!fileData) {
            return new Response(JSON.stringify({ 
                error: '文件不存在' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 解析现有文件数据
        let parsedData;
        try {
            parsedData = JSON.parse(fileData);
        } catch (parseError) {
            return new Response(JSON.stringify({ 
                error: '文件数据格式错误' 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 更新文件名
        parsedData.name = newName.trim();
        parsedData.updatedAt = Date.now();

        // 保存更新后的数据
        await env.img_url.put(fileId, JSON.stringify(parsedData));

        return new Response(JSON.stringify({ 
            success: true, 
            message: '文件重命名成功',
            fileId: fileId,
            newName: newName.trim()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('重命名文件失败:', error);
        return new Response(JSON.stringify({ 
            error: '重命名文件失败',
            message: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
