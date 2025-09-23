// Telegraph Finder 页面认证中间件 - Cloudflare Pages版本
// 保护finder页面访问，要求Basic Authentication

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
            'WWW-Authenticate': 'Basic realm="Telegraph Finder", charset="UTF-8"',
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

// Finder页面认证函数
function finderPageAuthentication(context) {
    // 临时启用Finder功能（用于开发测试）
    const finderEnabled = context.env.FINDER_ENABLED || "true"; // 默认启用

    // 检查是否启用了Finder功能
    if (finderEnabled !== "true") {
        return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Finder功能未启用</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #e74c3c; }
    </style>
</head>
<body>
    <h1 class="error">Finder功能未启用</h1>
    <p>请在环境变量中设置 FINDER_ENABLED=true 来启用此功能。</p>
</body>
</html>
        `, { 
            status: 403,
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
    }

    // 使用现有的Basic Auth系统
    const finderUser = context.env.FINDER_USER || context.env.BASIC_USER || "admin";
    const finderPass = context.env.FINDER_PASS || context.env.BASIC_PASS || "admin";

    if (!finderUser || !finderPass) {
        return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Finder认证未配置</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #e74c3c; }
    </style>
</head>
<body>
    <h1 class="error">Finder认证未配置</h1>
    <p>请设置 FINDER_USER 和 FINDER_PASS 环境变量。</p>
</body>
</html>
        `, { 
            status: 500,
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
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
        // 返回登录提示页面
        return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegraph Finder - 登录</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        .logo {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
            font-weight: 300;
        }
        .login-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .login-btn:hover {
            transform: translateY(-2px);
        }
        .info {
            margin-top: 20px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">📁</div>
        <h1>Telegraph Finder</h1>
        <p>请登录以访问文件管理系统</p>
        <button class="login-btn" onclick="showLogin()">登录</button>
        <div class="info">
            <p>使用您的用户名和密码进行身份验证</p>
        </div>
    </div>
    
    <script>
        function showLogin() {
            // 触发浏览器的Basic Auth对话框
            fetch(window.location.href, {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + btoa('dummy:dummy')
                }
            }).then(response => {
                if (response.status === 401) {
                    // 这会触发浏览器显示登录对话框
                    window.location.reload();
                }
            }).catch(() => {
                // 直接重新加载页面，让浏览器显示认证对话框
                window.location.reload();
            });
        }
    </script>
</body>
</html>
        `, {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Telegraph Finder", charset="UTF-8"',
                'Content-Type': 'text/html;charset=UTF-8',
            },
        });
    }
}

export const onRequest = [errorHandling, finderPageAuthentication];
