import React from 'react';
import CounselingLog from './CounselingLog';

export default function CounselingPage({ counselingLogs, resumeMaterials, apiKey, onSave, onUpdate, onDelete }) {
  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: '#f8f8f6' }}>
      <CounselingLog
        logs={counselingLogs}
        resumeMaterials={resumeMaterials}
        apiKey={apiKey}
        onSave={onSave}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
}
