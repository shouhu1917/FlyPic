/**
 * 配置管理入口（Docker 优化版）
 * 新增 FLYPIC_DATA_DIR 支持：将 .flypic 数据存储到独立目录，
 * 解决 NAS 挂载目录无写权限的问题
 */

const constants = require('./constants');
const path = require('path');

/**
 * 获取 FlyPic 目录路径
 * 
 * 默认行为：数据存储在素材库路径下的 .flypic 目录
 * Docker 优化：设置 FLYPIC_DATA_DIR 后，数据存储到独立目录
 *   例如：FLYPIC_DATA_DIR=/data/libraries
 *   素材库路径 /media/写真 → 数据存储在 /data/libraries/media_写真/
 * 
 * 这样即使素材库目录是只读挂载，应用也能正常工作
 */
function getFlypicPath(libraryPath) {
  const dataDir = process.env.FLYPIC_DATA_DIR;
  if (dataDir) {
    // 将素材库路径转为安全的目录名
    // /media/写真 → media_写真
    // /photos/2024 → photos_2024
    const safeName = libraryPath
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '')
      .replace(/\//g, '_');
    return path.join(dataDir, safeName);
  }
  return path.join(libraryPath, constants.PATHS.FLYPIC_DIR);
}

/**
 * 获取缩略图目录路径
 */
function getThumbnailsPath(libraryPath) {
  return path.join(getFlypicPath(libraryPath), constants.PATHS.THUMBNAILS_DIR);
}

/**
 * 获取数据库文件路径
 */
function getDatabasePath(libraryPath) {
  return path.join(getFlypicPath(libraryPath), constants.PATHS.DATABASE_FILE);
}

/**
 * 获取配置文件路径
 */
function getConfigPath(libraryPath) {
  return path.join(getFlypicPath(libraryPath), constants.PATHS.CONFIG_FILE);
}

module.exports = {
  constants,
  getFlypicPath,
  getThumbnailsPath,
  getDatabasePath,
  getConfigPath
};
