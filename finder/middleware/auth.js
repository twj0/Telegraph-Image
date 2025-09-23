// Telegraph Finder 认证中间件
const dbManager = require('../utils/database');

/**
 * 检查用户是否已认证的中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function requireAuth(req, res, next) {
    // 检查会话中是否存在用户信息
    if (req.session && req.session.user) {
        // 用户已认证，继续处理请求
        return next();
    }

    // 用户未认证，重定向到登录页面
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        // AJAX请求，返回JSON错误
        return res.status(401).json({
            error: '未授权访问',
            message: '请先登录',
            redirectTo: '/finder/login'
        });
    } else {
        // 普通请求，重定向到登录页面
        return res.redirect('/finder/login');
    }
}

/**
 * 检查用户是否已登录，如果已登录则重定向到主页
 * 用于登录页面，避免已登录用户重复登录
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function redirectIfAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        // 用户已登录，重定向到主页
        return res.redirect('/finder');
    }
    
    // 用户未登录，继续处理请求
    next();
}

/**
 * 处理用户登录
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function handleLogin(req, res) {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: '用户名和密码不能为空'
            });
        }

        // 验证用户凭据
        const isValid = await dbManager.verifyPassword(username, password);
        
        if (!isValid) {
            // 登录失败，记录尝试（可选：添加防暴力破解机制）
            console.log(`🚫 登录失败尝试: ${username} from ${req.ip}`);
            
            return res.status(401).json({
                success: false,
                error: '用户名或密码错误'
            });
        }

        // 登录成功，创建会话
        req.session.regenerate((err) => {
            if (err) {
                console.error('❌ 会话重新生成失败:', err);
                return res.status(500).json({
                    success: false,
                    error: '登录过程中发生错误'
                });
            }

            // 存储用户信息到会话
            req.session.user = {
                username: username,
                loginTime: new Date().toISOString()
            };

            // 保存会话
            req.session.save((err) => {
                if (err) {
                    console.error('❌ 会话保存失败:', err);
                    return res.status(500).json({
                        success: false,
                        error: '登录过程中发生错误'
                    });
                }

                console.log(`✅ 用户登录成功: ${username} from ${req.ip}`);
                
                res.json({
                    success: true,
                    message: '登录成功',
                    user: {
                        username: username
                    },
                    redirectTo: '/finder'
                });
            });
        });

    } catch (error) {
        console.error('❌ 登录处理错误:', error);
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
}

/**
 * 处理用户登出
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function handleLogout(req, res) {
    const username = req.session?.user?.username || 'unknown';
    
    // 清除会话
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ 会话销毁失败:', err);
            return res.status(500).json({
                success: false,
                error: '登出过程中发生错误'
            });
        }

        console.log(`👋 用户登出: ${username} from ${req.ip}`);
        
        // 清除会话cookie
        res.clearCookie('connect.sid');
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            // AJAX请求，返回JSON响应
            res.json({
                success: true,
                message: '登出成功',
                redirectTo: '/finder/login'
            });
        } else {
            // 普通请求，重定向到登录页面
            res.redirect('/finder/login');
        }
    });
}

/**
 * 获取当前用户信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function getCurrentUser(req, res) {
    if (req.session && req.session.user) {
        res.json({
            success: true,
            user: req.session.user
        });
    } else {
        res.status(401).json({
            success: false,
            error: '未登录'
        });
    }
}

/**
 * 验证会话状态的中间件
 * 用于API端点，不重定向，只返回状态
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function checkAuthStatus(req, res, next) {
    if (req.session && req.session.user) {
        req.isAuthenticated = true;
        req.currentUser = req.session.user;
    } else {
        req.isAuthenticated = false;
        req.currentUser = null;
    }
    next();
}

/**
 * 输入验证和清理中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function validateLoginInput(req, res, next) {
    const { username, password } = req.body;

    // 基本验证
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: '用户名和密码不能为空'
        });
    }

    // 清理输入（去除首尾空格）
    req.body.username = username.trim();
    req.body.password = password; // 密码不清理，保持原样

    // 长度验证
    if (req.body.username.length < 3 || req.body.username.length > 50) {
        return res.status(400).json({
            success: false,
            error: '用户名长度必须在3-50个字符之间'
        });
    }

    if (req.body.password.length < 6 || req.body.password.length > 100) {
        return res.status(400).json({
            success: false,
            error: '密码长度必须在6-100个字符之间'
        });
    }

    // 字符验证（用户名只允许字母、数字、下划线）
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(req.body.username)) {
        return res.status(400).json({
            success: false,
            error: '用户名只能包含字母、数字和下划线'
        });
    }

    next();
}

module.exports = {
    requireAuth,
    redirectIfAuthenticated,
    handleLogin,
    handleLogout,
    getCurrentUser,
    checkAuthStatus,
    validateLoginInput
};
