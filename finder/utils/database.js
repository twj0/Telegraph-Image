// Telegraph Finder 数据库工具模块
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '..', 'auth.db');
        this.saltRounds = 12; // 高安全性的salt rounds
    }

    /**
     * 初始化数据库连接和表结构
     */
    initialize() {
        return new Promise((resolve, reject) => {
            try {
                // 创建数据库连接
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('❌ 数据库连接失败:', err);
                        reject(err);
                        return;
                    }

                    // 启用WAL模式以提高性能
                    this.db.run('PRAGMA journal_mode = WAL', (err) => {
                        if (err) {
                            console.error('❌ 设置WAL模式失败:', err);
                        }
                    });

                    // 创建用户表
                    this.createTables()
                        .then(() => this.createDefaultAdmin())
                        .then(() => {
                            console.log('✅ 数据库初始化成功:', this.dbPath);
                            resolve(true);
                        })
                        .catch(reject);
                });
            } catch (error) {
                console.error('❌ 数据库初始化失败:', error);
                reject(error);
            }
        });
    }

    /**
     * 创建数据库表结构
     */
    createTables() {
        return new Promise((resolve, reject) => {
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            this.db.run(createUsersTable, (err) => {
                if (err) {
                    console.error('❌ 创建用户表失败:', err);
                    reject(err);
                } else {
                    console.log('✅ 用户表创建成功');
                    resolve();
                }
            });
        });
    }

    /**
     * 创建默认管理员账户
     */
    createDefaultAdmin() {
        return new Promise((resolve, reject) => {
            // 检查是否已存在用户
            this.getUserByUsername('admin')
                .then(existingUser => {
                    if (existingUser) {
                        console.log('ℹ️ 管理员账户已存在');
                        resolve();
                        return;
                    }

                    // 生成默认密码或使用环境变量
                    const defaultPassword = process.env.ADMIN_PASSWORD || this.generateRandomPassword();

                    // 创建管理员账户
                    this.createUser('admin', defaultPassword)
                        .then(success => {
                            if (success) {
                                console.log('🎉 默认管理员账户创建成功!');
                                console.log('👤 用户名: admin');
                                console.log('🔑 密码:', defaultPassword);
                                console.log('⚠️ 请妥善保存密码信息!');

                                // 如果是生成的随机密码，建议用户修改
                                if (!process.env.ADMIN_PASSWORD) {
                                    console.log('💡 建议: 首次登录后请修改默认密码');
                                }
                            }
                            resolve();
                        })
                        .catch(reject);
                })
                .catch(reject);
        });
    }

    /**
     * 生成随机密码
     */
    generateRandomPassword() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * 创建新用户
     * @param {string} username - 用户名
     * @param {string} password - 明文密码
     * @returns {Promise<boolean>} - 创建是否成功
     */
    createUser(username, password) {
        return new Promise((resolve, reject) => {
            try {
                // 验证输入
                if (!username || !password) {
                    throw new Error('用户名和密码不能为空');
                }

                if (username.length < 3 || username.length > 50) {
                    throw new Error('用户名长度必须在3-50个字符之间');
                }

                if (password.length < 6) {
                    throw new Error('密码长度至少6个字符');
                }

                // 加密密码
                const passwordHash = bcrypt.hashSync(password, this.saltRounds);

                // 插入用户
                this.db.run(
                    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                    [username, passwordHash],
                    function(err) {
                        if (err) {
                            console.error('❌ 创建用户失败:', err.message);
                            resolve(false);
                        } else {
                            console.log(`✅ 用户 "${username}" 创建成功`);
                            resolve(true);
                        }
                    }
                );
            } catch (error) {
                console.error('❌ 创建用户失败:', error.message);
                resolve(false);
            }
        });
    }

    /**
     * 根据用户名获取用户信息
     * @param {string} username - 用户名
     * @returns {Promise<Object|null>} - 用户信息或null
     */
    getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    console.error('❌ 查询用户失败:', err);
                    resolve(null);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    /**
     * 验证用户密码
     * @param {string} username - 用户名
     * @param {string} password - 明文密码
     * @returns {Promise<boolean>} - 验证是否成功
     */
    verifyPassword(username, password) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await this.getUserByUsername(username);
                if (!user) {
                    resolve(false);
                    return;
                }

                const isValid = bcrypt.compareSync(password, user.password_hash);
                resolve(isValid);
            } catch (error) {
                console.error('❌ 密码验证失败:', error);
                resolve(false);
            }
        });
    }

    /**
     * 更新用户密码
     * @param {string} username - 用户名
     * @param {string} newPassword - 新密码
     * @returns {boolean} - 更新是否成功
     */
    updatePassword(username, newPassword) {
        try {
            if (newPassword.length < 6) {
                throw new Error('密码长度至少6个字符');
            }

            const passwordHash = bcrypt.hashSync(newPassword, this.saltRounds);
            
            const stmt = this.db.prepare(`
                UPDATE users 
                SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE username = ?
            `);

            const result = stmt.run(passwordHash, username);
            
            if (result.changes > 0) {
                console.log(`✅ 用户 "${username}" 密码更新成功`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ 更新密码失败:', error.message);
            return false;
        }
    }

    /**
     * 获取所有用户（不包含密码）
     * @returns {Array} - 用户列表
     */
    getAllUsers() {
        try {
            const stmt = this.db.prepare(`
                SELECT id, username, created_at, updated_at 
                FROM users 
                ORDER BY created_at DESC
            `);
            return stmt.all();
        } catch (error) {
            console.error('❌ 获取用户列表失败:', error);
            return [];
        }
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('✅ 数据库连接已关闭');
        }
    }

    /**
     * 获取数据库统计信息
     */
    getStats() {
        try {
            const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
            return {
                userCount: userCount.count,
                dbPath: this.dbPath,
                connected: this.db ? true : false
            };
        } catch (error) {
            console.error('❌ 获取数据库统计失败:', error);
            return null;
        }
    }
}

// 创建单例实例
const dbManager = new DatabaseManager();

module.exports = dbManager;
