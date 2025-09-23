// Telegraph Finder - 删除文件API
// Cloudflare Workers版本

export async function onRequest(context) {
    const { request, env, params } = context;

    try {
        // 只允许DELETE请求
        if (request.method !== 'DELETE') {
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

        // 从KV存储中删除文件记录
        await env.img_url.delete(fileId);

        // 可选：如果使用R2存储，也需要删除实际文件
        // 这里需要根据实际的存储方式进行调整
        try {
            const parsedData = JSON.parse(fileData);
            if (parsedData.r2Key && env.MY_BUCKET) {
                // 如果使用R2存储，删除实际文件
                await env.MY_BUCKET.delete(parsedData.r2Key);
            }
        } catch (r2Error) {
            console.warn('删除R2文件失败:', r2Error);
            // R2删除失败不影响KV记录的删除
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: '文件删除成功',
            fileId: fileId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('删除文件失败:', error);
        return new Response(JSON.stringify({ 
            error: '删除文件失败',
            message: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
