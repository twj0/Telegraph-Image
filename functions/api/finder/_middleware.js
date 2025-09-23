// Telegraph Finder 认证中间件 - Cloudflare Workers版本
// 适配现有的Basic Authentication系统

async function errorHandling(context) {
    try {
        return await context.next();
    } catch (err) {
        return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
}

function basicAuthentication(request) {
    const Authorization = request.headers.get('Authorization');

    if (!Authorization) {
        return null;
    }

    const [scheme, encoded] = Authorization.split(' ');

    // The Authorization header must start with Basic, followed by a space.
    if (!encoded || scheme !== 'Basic') {
        throw new BadRequestException('Malformed authorization header.');
    }

    // Decodes the base64 value and performs unicode normalization.
    const buffer = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(buffer).normalize();

    // The username & password are split by the first colon.
    const index = decoded.indexOf(':');

    // The user & password are split by the first colon and MUST NOT contain control characters.
    if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
        throw new BadRequestException('Invalid authorization value.');
    }

    return {
        user: decoded.substring(0, index),
        pass: decoded.substring(index + 1),
    };
}

function UnauthorizedException(reason) {
    return new Response(reason, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'Cache-Control': 'no-store',
            'Content-Length': reason.length,
        },
    });
}

function BadRequestException(reason) {
    return new Response(reason, {
        status: 400,
        statusText: 'Bad Request',
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'Cache-Control': 'no-store',
            'Content-Length': reason.length,
        },
    });
}

// Finder专用认证函数
function finderAuthentication(context) {
    // 检查是否启用了Finder功能
    if (typeof context.env.FINDER_ENABLED === "undefined" || context.env.FINDER_ENABLED !== "true") {
        return new Response('Finder功能未启用。请在环境变量中设置FINDER_ENABLED=true', { status: 403 });
    }

    // 检查KV绑定
    if (typeof context.env.img_url === "undefined" || context.env.img_url == null || context.env.img_url === "") {
        return new Response('Finder功能需要KV存储支持。请绑定KV命名空间。', { status: 500 });
    }

    // 使用现有的Basic Auth系统
    const finderUser = context.env.FINDER_USER || context.env.BASIC_USER || "admin";
    const finderPass = context.env.FINDER_PASS || context.env.BASIC_PASS || "admin";

    if (!finderUser || !finderPass) {
        return new Response('Finder认证未配置。请设置FINDER_USER和FINDER_PASS环境变量。', { status: 500 });
    }

    if (context.request.headers.has('Authorization')) {
        try {
            const credentials = basicAuthentication(context.request);
            if (!credentials) {
                return UnauthorizedException('认证信息无效。');
            }

            if (finderUser !== credentials.user || finderPass !== credentials.pass) {
                return UnauthorizedException('用户名或密码错误。');
            }

            // 认证成功，继续处理请求
            return context.next();
        } catch (error) {
            return UnauthorizedException('认证失败：' + error.message);
        }
    } else {
        // 返回登录提示
        return new Response('请登录以访问Finder功能。', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Telegraph Finder", charset="UTF-8"',
                'Content-Type': 'text/plain;charset=UTF-8',
            },
        });
    }
}

export const onRequest = [errorHandling, finderAuthentication];
