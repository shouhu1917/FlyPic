/**
 * 素材库服务层（Docker 优化版）
 * 
 * 关键优化：
 * 1. 当设置 FLYPIC_DATA_DIR 时，不要求素材库路径可写
 *    （数据库和缩略图存储在 FLYPIC_DATA_DIR 中）
 * 2. 错误消息适配 Docker 环境，不再只提示 fnOS
 * 3. 新增目录浏览功能
 */

const fs = require('fs');
const path = require('path');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { getFlypicPath, getDatabasePath, getThumbnailsPath } = require('../config');

// 检查是否使用独立数据目录模式（Docker 优化）
function isDataDirSeparate() {
  return !!process.env.FLYPIC_DATA_DIR;
}

class LibraryService {
  constructor(configManager, dbPool, scanManager, lightweightWatcher, io) {
    this.configManager = configManager;
    this.dbPool = dbPool;
    this.scanManager = scanManager;
    this.lightweightWatcher = lightweightWatcher;
    this.io = io;
  }

  /**
   * 获取所有素材库
   */
  getAllLibraries() {
    const config = this.configManager.load();
    return {
      libraries: config.libraries || [],
      currentLibraryId: config.currentLibraryId,
      theme: config.theme || 'light',
      preferences: config.preferences || {}
    };
  }

  /**
   * 创建新素材库
   * 
   * Docker 优化逻辑：
   * - 如果设置了 FLYPIC_DATA_DIR，则只要求素材库路径可读
   *   （数据库和缩略图存在 FLYPIC_DATA_DIR 中，不需要写素材库路径）
   * - 如果没有设置 FLYPIC_DATA_DIR，则要求素材库路径可读写
   *   （原始行为，数据存在素材库路径下的 .flypic 目录）
   */
  async createLibrary(name, libraryPath) {
    // 验证参数
    if (!name || !libraryPath) {
      throw new ValidationError('Name and path are required');
    }

    // 规范化路径
    const normalizedPath = path.normalize(libraryPath);
    console.log(`创建素材库: name=${name}, path=${normalizedPath}`);
    
    if (!fs.existsSync(normalizedPath)) {
      console.warn(`路径不存在: ${normalizedPath}`);
      throw new ValidationError(
        '路径不存在。请确认容器内该路径已正确挂载。',
        'path'
      );
    }

    // 检查文件夹访问权限
    try {
      // 检查读权限
      fs.readdirSync(normalizedPath);
      
      if (isDataDirSeparate()) {
        // Docker 独立数据目录模式：只要求读权限
        // 确保数据目录可写
        const dataDir = process.env.FLYPIC_DATA_DIR;
        if (!fs.existsSync(dataDir)) {
          try {
            fs.mkdirSync(dataDir, { recursive: true });
          } catch (err) {
            throw new ValidationError(
              `无法创建数据目录 ${dataDir}，请检查 FLYPIC_DATA_DIR 挂载是否正确。`,
              'permission'
            );
          }
        }
        // 测试数据目录写权限
        const testDataFile = path.join(dataDir, '.flypic-test');
        try {
          fs.writeFileSync(testDataFile, 'test');
          fs.unlinkSync(testDataFile);
        } catch (writeError) {
          throw new ValidationError(
            `数据目录 ${dataDir} 无写入权限，请检查 Docker 卷挂载权限。` +
            `建议在 docker-compose.yml 中添加 PUID/PGID 环境变量。`,
            'permission'
          );
        }
        console.log(`✅ Docker 模式：数据将存储到 ${dataDir}`);
      } else {
        // 原始模式：要求素材库路径可写
        const testFile = path.join(normalizedPath, '.flypic-test');
        try {
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
        } catch (writeError) {
          console.warn(`无写入权限: ${normalizedPath}`);
          throw new ValidationError(
            '无法访问该文件夹。' +
            'Docker 用户：请在 docker-compose.yml 中设置 FLYPIC_DATA_DIR 环境变量，' +
            '将数据存储到可写的目录。' +
            'fnOS 用户：请在"数据共享"中将此文件夹添加到 FlyPic 应用的访问权限。',
            'permission'
          );
        }
      }
    } catch (readError) {
      if (readError.code === 'EACCES' || readError.code === 'EPERM') {
        console.warn(`无访问权限: ${normalizedPath}`);
        throw new ValidationError(
          '无法访问该文件夹，请检查文件权限。' +
          'Docker 用户：请确认卷挂载路径正确，并尝试设置 PUID/PGID 环境变量。',
          'permission'
        );
      }
      // 如果不是权限错误，继续抛出
      if (readError.name !== 'ValidationError') {
        throw readError;
      }
      throw readError;
    }

    // 检查路径是否已存在
    const config = this.configManager.load();
    const existingLib = config.libraries.find(lib => lib.path === normalizedPath);
    if (existingLib) {
      throw new ValidationError('Library path already exists', 'path');
    }

    // 创建素材库
    const id = this.configManager.addLibrary(name, normalizedPath);

    // 检查是否有现有索引
    const flypicDir = getFlypicPath(normalizedPath);
    const dbPath = getDatabasePath(normalizedPath);
    const hasExistingIndex = fs.existsSync(flypicDir) && fs.existsSync(dbPath);

    return { 
      id, 
      hasExistingIndex,
      dataDir: isDataDirSeparate() ? flypicDir : null,
      message: hasExistingIndex 
        ? 'Library created with existing index' 
        : 'Library created, please scan to build index'
    };
  }

  /**
   * 浏览目录（Docker 新增功能）
   * 返回指定路径下的子目录列表，帮助用户在容器内找到挂载的目录
   */
  browseDirectory(dirPath) {
    const normalizedPath = path.normalize(dirPath || '/');
    
    if (!fs.existsSync(normalizedPath)) {
      return {
        path: normalizedPath,
        parent: null,
        directories: [],
        error: '路径不存在'
      };
    }

    try {
      const entries = fs.readdirSync(normalizedPath, { withFileTypes: true });
      const directories = entries
        .filter(entry => entry.isDirectory())
        .filter(entry => !entry.name.startsWith('.'))
        .map(entry => ({
          name: entry.name,
          path: path.join(normalizedPath, entry.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
      
      const parent = path.dirname(normalizedPath);
      
      return {
        path: normalizedPath,
        parent: parent !== normalizedPath ? parent : null,
        directories
      };
    } catch (error) {
      return {
        path: normalizedPath,
        parent: null,
        directories: [],
        error: error.code === 'EACCES' ? '无权限访问' : error.message
      };
    }
  }

  /**
   * 更新素材库
   */
  updateLibrary(id, updates) {
    const config = this.configManager.load();
    const library = config.libraries.find(lib => lib.id === id);

    if (!library) {
      throw new NotFoundError('Library', id);
    }

    // 验证更新的路径是否存在
    if (updates.path && !fs.existsSync(updates.path)) {
      throw new ValidationError('Path does not exist', 'path');
    }

    const success = this.configManager.updateLibrary(id, updates);
    return { success };
  }

  /**
   * 删除素材库
   */
  async deleteLibrary(id, autoSelectNext = true) {
    const config = this.configManager.load();
    const library = config.libraries.find(lib => lib.id === id);

    if (!library) {
      throw new NotFoundError('Library', id);
    }

    // 清理资源
    await this._cleanupLibraryResources(id, library.path);

    // 删除配置
    this.configManager.removeLibrary(id, autoSelectNext);

    return { 
      success: true,
      path: library.path,
      message: 'Library deleted successfully'
    };
  }

  /**
   * 设置当前素材库
   */
  async setCurrentLibrary(id) {
    const config = this.configManager.load();
    const library = config.libraries.find(lib => lib.id === id);

    if (!library) {
      throw new NotFoundError('Library', id);
    }

    // 切换前清理旧素材库资源
    if (config.currentLibraryId && config.currentLibraryId !== id) {
      const oldLibrary = config.libraries.find(lib => lib.id === config.currentLibraryId);
      if (oldLibrary) {
        await this._cleanupLibraryResources(config.currentLibraryId, oldLibrary.path, false);
      }
    }

    // 设置新素材库
    this.configManager.setCurrentLibrary(id);

    // 预热数据库连接
    try {
      const db = this.dbPool.acquire(library.path);
      db.db.prepare('SELECT 1').get();
      this.dbPool.release(library.path);
    } catch (e) {
      // 忽略预热错误
    }

    // 启动文件监控
    if (this.lightweightWatcher && this.io) {
      try {
        this.lightweightWatcher.watch(id, library.path, library.name, this.io);
      } catch (e) {
        console.warn('启动文件监控失败:', e.message);
      }
    }

    return { 
      success: true,
      libraryId: id,
      message: 'Current library set successfully'
    };
  }

  /**
   * 更新偏好设置
   */
  updatePreferences(preferences) {
    this.configManager.updatePreferences(preferences);
    return { success: true };
  }

  /**
   * 更新主题
   */
  updateTheme(theme) {
    if (!['light', 'dark'].includes(theme)) {
      throw new ValidationError('Invalid theme, must be light or dark', 'theme');
    }

    this.configManager.updateTheme(theme);
    return { success: true, theme };
  }

  /**
   * 清理素材库资源
   * @private
   */
  async _cleanupLibraryResources(libraryId, libraryPath, deleteConfig = true) {
    // 停止扫描
    if (this.scanManager) {
      this.scanManager.clearState(libraryId);
    }

    // 停止文件监控
    if (this.lightweightWatcher) {
      this.lightweightWatcher.unwatch(libraryId);
    }

    // 关闭数据库连接
    if (this.dbPool) {
      this.dbPool.close(libraryPath);
    }

    // 等待资源释放
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * 验证素材库路径是否存在
   */
  validateLibraryPath(libraryId) {
    const config = this.configManager.load();
    const library = config.libraries.find(lib => lib.id === libraryId);

    if (!library) {
      throw new NotFoundError('Library', libraryId);
    }

    const folderExists = fs.existsSync(library.path);
    const flypicPath = getFlypicPath(library.path);
    const dbPath = getDatabasePath(library.path);
    const indexExists = fs.existsSync(flypicPath) && fs.existsSync(dbPath);
    
    let status = 'ok';
    if (!folderExists) {
      status = 'missing_folder';
    } else if (!indexExists) {
      status = 'missing_index';
    }
    
    return {
      libraryId,
      path: library.path,
      name: library.name,
      folderExists,
      indexExists,
      status
    };
  }

  /**
   * 获取素材库统计信息
   */
  async getLibraryStats(libraryId) {
    const config = this.configManager.load();
    const library = config.libraries.find(lib => lib.id === libraryId);

    if (!library) {
      throw new NotFoundError('Library', libraryId);
    }

    const db = this.dbPool.acquire(library.path);
    try {
      const imageCount = db.db.prepare('SELECT COUNT(*) as count FROM images').get().count;
      const folderCount = db.db.prepare('SELECT COUNT(*) as count FROM folders').get().count;
      
      const sizeResult = db.db.prepare('SELECT SUM(size) as totalSize FROM images').get();
      const totalSize = sizeResult.totalSize || 0;

      return {
        libraryId,
        imageCount,
        folderCount,
        totalSize,
        path: library.path,
        name: library.name
      };
    } finally {
      this.dbPool.release(library.path);
    }
  }
}

module.exports = LibraryService;
