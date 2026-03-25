import React, { useState } from 'react';

const TASK_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6'];
const TAG_PALETTE = ['#6366f1','#10b981','#f59e0b','#f43f5e','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16','#64748b','#a78bfa'];

export default function AddTaskModal({ initialData = {}, onSave, onDelete, onClose, allTags = [], onCreateTag }) {
  const isEdit = !!initialData.id;
  const [name, setName] = useState(initialData.name || '');
  const [dueDate, setDueDate] = useState(initialData.dueDate || '');
  const [color, setColor] = useState(initialData.color || '#6366f1');
  const [memo, setMemo] = useState(initialData.memo || '');
  const [selectedTagIds, setSelectedTagIds] = useState(initialData.tags || []);
  const [newTagName, setNewTagName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    const name = newTagName.trim();
    // Check duplicate
    const existing = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) setSelectedTagIds(prev => [...prev, existing.id]);
      setNewTagName('');
      return;
    }
    const newTag = onCreateTag?.(name);
    if (newTag) setSelectedTagIds(prev => [...prev, newTag.id]);
    setNewTagName('');
  };

  const toggleTag = (tagId) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: initialData.id || String(Date.now()),
      name: name.trim(),
      dueDate,
      color,
      memo,
      tags: selectedTagIds,
      done: initialData.done || false,
      createdAt: initialData.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">{isEdit ? 'edit task' : 'add task'}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">할 일 이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 과제 제출, 프로젝트..."
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              마감일 <span className="text-gray-300 normal-case font-normal">(선택)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">color</label>
            <div className="flex gap-3">
              {TASK_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                    transform: color === c ? 'scale(1.15)' : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              태그 <span className="text-gray-300 normal-case font-normal">(선택)</span>
            </label>
            {/* All tags as toggleable chips */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {allTags.map(tag => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all"
                      style={selected
                        ? { backgroundColor: tag.color, color: 'white' }
                        : { border: `1.5px solid ${tag.color}`, color: tag.color }
                      }
                    >
                      {tag.name}{selected && ' ✓'}
                    </button>
                  );
                })}
              </div>
            )}
            {/* New tag input */}
            <div className="flex gap-1.5">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="새 태그 입력..."
                className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
              />
              {newTagName.trim() && (
                <button
                  type="button"
                  onClick={handleCreateTag}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors flex-shrink-0"
                >
                  만들기
                </button>
              )}
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              메모 <span className="text-gray-300 normal-case font-normal">(선택)</span>
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모..."
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
          {isEdit && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
            >
              삭제
            </button>
          )}
          {isEdit && confirmDelete && (
            <button
              onClick={() => { onDelete?.(initialData.id); onClose(); }}
              className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-colors"
            >
              확인 삭제
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2 rounded-xl">
            취소
          </button>
          <button
            onClick={save}
            disabled={!name.trim()}
            className="text-sm bg-[#111] hover:bg-gray-800 disabled:bg-gray-200 text-white font-medium px-5 py-2 rounded-xl transition-colors"
          >
            {isEdit ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
