import React, { useState, useCallback } from 'react';
import { ChevronRight, Folder, ChevronLeft, Home, AlertCircle } from 'lucide-react';

function DirectoryBrowser({ initialPath = '/media', onSelect, onCancel }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [manualPath, setManualPath] = useState(initialPath);
  const [selectedDir, setSelectedDir] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const browseDirectory = useCallback(async (dirPath) => {
    setLoading(true);
    setErrorMsg('');
    setSelectedDir(null);
    try {
      const resp = await fetch(`/api/library/browse?path=${encodeURIComponent(dirPath)}`);
      const data = await resp.json();
      setCurrentPath(dirPath);
      setManualPath(dirPath);
      setSelectedDir(null);
      // 即使 HTTP 200，如果后端返回了 error 字段也要显示
      if (data.error) {
        setErrorMsg(data.error);
      }
    } catch (err) {
      setErrorMsg('无法连接服务器');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    browseDirectory(initialPath);
  }, [initialPath, browseDirectory]);

  const handleDirectoryClick = (dir) => {
    setSelectedDir(dir.path);
    browseDirectory(dir.path);
  };

  const handleGoUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    browseDirectory(parent);
  };

  const handleManualGo = () => {
    const p = manualPath.trim();
    if (p) browseDirectory(p);
  };

  const handleSelect = () => {
    const target = selectedDir || currentPath;
    if (target && target !== '/' && onSelect) {
      onSelect(target);
    }
  };

  // 点击面包屑的某个路径段
  const handleBreadcrumbClick = (idx) => {
    const target = '/' + currentPath.split('/').filter(Boolean).slice(0, idx + 1).join('/');
    browseDirectory(target);
  };

  const parts = currentPath.split('/').filter(Boolean);

  return (
    <div style={{ border: '1px solid #3b82f6', borderRadius: 8, padding: 16, background: '#f0f9ff', maxHeight: 400, overflowY: 'auto' }}>
      {/* 面包屑导航 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => browseDirectory('/media')} title="回到 /media" style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12 }}>
          /media
        </button>
        <span style={{ color: '#9ca3af' }}>/</span>
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            <button
              onClick={() => handleBreadcrumbClick(idx)}
              style={{ padding: '2px 6px', border: 'none', borderRadius: 4, background: idx === parts.length - 1 ? '#3b82f6' : '#e5e7eb', color: idx === parts.length - 1 ? '#fff' : '#374151', cursor: 'pointer', fontSize: 12 }}
            >
              {part}
            </button>
            {idx < parts.length - 1 && <span style={{ color: '#9ca3af' }}>/</span>}
          </React.Fragment>
        ))}
      </div>

      {/* 手动路径输入 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={manualPath}
          onChange={(e) => setManualPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleManualGo()}
          placeholder="输入路径后回车"
          style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
        />
        <button onClick={handleGoUp} disabled={currentPath === '/media' || currentPath === '/'} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }} title="上级目录">
          <ChevronLeft size={16} />
        </button>
        <button onClick={handleManualGo} style={{ padding: '6px 12px', border: '1px solid #3b82f6', borderRadius: 6, background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 13 }}>跳转</button>
      </div>

      {/* 错误提示 */}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, marginBottom: 10, color: '#dc2626', fontSize: 13 }}>
          <AlertCircle size={16} />
          <span><strong>访问失败：</strong>{errorMsg}</span>
        </div>
      )}

      {/* 目录列表 */}
      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>加载中...</div>
        ) : (
          <div>
            {errorMsg ? null : (
              <div style={{ padding: 12, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                {currentPath} 下没有子文件夹
              </div>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>取消</button>
        <button
          onClick={handleSelect}
          disabled={!selectedDir && !errorMsg}
          style={{ padding: '8px 16px', border: '1px solid #10b981', borderRadius: 6, background: !selectedDir ? '#9ca3af' : '#10b981', color: '#fff', cursor: selectedDir ? 'pointer' : 'not-allowed', fontSize: 13 }}
        >
          选择此目录
        </button>
      </div>
    </div>
  );
}

export default DirectoryBrowser;
