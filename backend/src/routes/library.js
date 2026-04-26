/**
 * 素材库路由
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 获取所有素材库
 */
router.get('/', asyncHandler(async (req, res) => {
  const service = req.app.get('libraryService');
  const result = service.getAllLibraries();
  res.json(result);
}));

/**
 * 浏览目录（Docker 优化：帮助用户找到挂载目录）
 */
router.get('/browse', asyncHandler(async (req, res) => {
  const service = req.app.get('libraryService');
  const dirPath = req.query.path || '/';
  const result = service.browseDirectory(dirPath);
  res.json(result);
}));

/**
 * 添加素材库
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, path } = req.body;
  const service = req.app.get('libraryService');
  const result = await service.createLibrary(name, path);
  res.status(201).json(result);
}));

/**
 * 更新素材库
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const service = req.app.get('libraryService');
  const result = service.updateLibrary(id, updates);
  res.json(result);
}));

/**
 * 删除素材库
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const autoSelectNext = req.query.autoSelectNext !== 'false';
  const service = req.app.get('libraryService');
  const result = await service.deleteLibrary(id, autoSelectNext);
  res.json(result);
}));

/**
 * 设置当前素材库
 */
router.post('/:id/set-current', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const service = req.app.get('libraryService');
  const result = await service.setCurrentLibrary(id);
  res.json(result);
}));

/**
 * 验证素材库路径
 */
router.get('/:id/validate', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const service = req.app.get('libraryService');
  const result = service.validateLibraryPath(id);
  res.json(result);
}));

/**
 * 获取素材库统计信息
 */
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const service = req.app.get('libraryService');
  const result = await service.getLibraryStats(id);
  res.json(result);
}));

/**
 * 更新偏好设置
 */
router.put('/preferences', asyncHandler(async (req, res) => {
  const preferences = req.body;
  const service = req.app.get('libraryService');
  const result = service.updatePreferences(preferences);
  res.json(result);
}));

/**
 * 更新主题
 */
router.put('/theme', asyncHandler(async (req, res) => {
  const { theme } = req.body;
  const service = req.app.get('libraryService');
  const result = service.updateTheme(theme);
  res.json(result);
}));

module.exports = router;
