import { useState, useEffect, useCallback } from 'react';
import { Folder, ChevronRight, HardDrive, ArrowUp } from 'lucide-react';
import { libraryAPI } from '../api';
import { createLogger } from '../utils/logger';
const logger = createLogger('DirectoryBrowser');
function DirectoryBrowser({ initialPath = '/media', onSelect, onCancel }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parentPath, setParentPath] = useState(null);
  const [manualPath, setManualPath] = useState(initialPath);
  const [selectedDir, setSelectedDir] = useState(null);
  const browseDirectory = useCallback(async (dirPath) => {
    setLoading(true); setError(null);
    try {
      const resp = await libraryAPI.browse(dirPath);
      const data = resp.data || resp;
      setDirectories(data.directories || []);
      setParentPath(data.parent || null);
      setCurrentPath(dirPath); setManualPath(dirPath); setSelectedDir(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || '无法浏览此目录');
      setDirectories([]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { browseDirectory(initialPath); }, [initialPath, browseDirectory]);
  const handleDirectoryClick = (dir) => browseDirectory(dir.path);
  const handleGoUp = () => { if (parentPath !== null) browseDirectory(parentPath); };
  const handleManualGo = () => { const p = manualPath.trim(); if (p) browseDirectory(p); };
  const handleConfirmSelection = () => onSelect(selectedDir || currentPath);
  const handleSelectDir = (dir) => setSelectedDir(dir.path);
  return (
    <div className='space-y-3'>
      <div className='flex gap-2'>
        <input type='text' value={manualPath} onChange={(e) => setManualPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleManualGo()}
          placeholder='输入路径浏览...'
          className='flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' />
        <button onClick={handleManualGo}
          className='px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600'>浏览</button>
      </div>
      <div className='border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto bg-white dark:bg-gray-800'>
        {parentPath !== null && (
          <div onClick={handleGoUp}
            className='flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600'>
            <ArrowUp className='w-4 h-4 mr-2 text-gray-400' />
            <span className='text-sm text-gray-500 dark:text-gray-400'>..</span>
          </div>
        )}
        {loading && (
          <div className='flex items-center justify-center py-8'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500'></div>
            <span className='ml-2 text-sm text-gray-500'>加载中...</span>
          </div>
        )}
        {error && (
          <div className='px-3 py-4 text-center'>
            <p className='text-sm text-red-500'>{error}</p>
            <p className='text-xs text-gray-400 mt-1'>请确认路径正确且容器已挂载该目录</p>
          </div>
        )}
        {!loading && !error && directories.length === 0 && (
          <div className='px-3 py-4 text-center'>
            <HardDrive className='w-6 h-6 mx-auto text-gray-400 mb-1' />
            <p className='text-sm text-gray-500'>当前目录没有子目录，可直接选择当前目录</p>
          </div>
        )}
        {!loading && !error && directories.map((dir) => (
          <div key={dir.path}
            className={'flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0' + (selectedDir === dir.path ? ' bg-blue-50 dark:bg-blue-900/30' : '')}>
            <div className='flex items-center flex-1 min-w-0' onClick={() => handleDirectoryClick(dir)}>
              <Folder className='w-4 h-4 mr-2 text-yellow-500 flex-shrink-0' />
              <span className='text-sm text-gray-700 dark:text-gray-300 truncate'>{dir.name}</span>
              <ChevronRight className='w-3 h-3 ml-1 text-gray-400 flex-shrink-0' />
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleSelectDir(dir); }}
              className={'ml-2 px-2 py-0.5 text-xs rounded flex-shrink-0 ' + (selectedDir === dir.path ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800')}>
              选择
            </button>
          </div>
        ))}
      </div>
      <div className='text-xs text-gray-500 dark:text-gray-400'>
        当前路径: <span className='font-mono text-blue-600 dark:text-blue-400'>{currentPath}</span>
        {selectedDir && <span> - 选择: <span className='font-mono text-green-600 dark:text-green-400'>{selectedDir}</span></span>}
      </div>
      <div className='flex gap-2'>
        <button onClick={onCancel}
          className='flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'>取消</button>
        <button onClick={handleConfirmSelection}
          className='flex-1 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600'>确认选择</button>
      </div>
    </div>
  );
}
export default DirectoryBrowser;
