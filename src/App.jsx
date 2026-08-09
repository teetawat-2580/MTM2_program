import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { calculateCodeTMU, getSimultaneousWarning } from './mtmData';

// Action Options
const ACTION_OPTIONS = [
  { value: '-', label: '- (Wait/Hold)' },
  { value: 'GA', label: 'GA (Get A)', hasDistance: true },
  { value: 'GB', label: 'GB (Get B)', hasDistance: true },
  { value: 'GC', label: 'GC (Get C)', hasDistance: true },
  { value: 'PA', label: 'PA (Put A)', hasDistance: true },
  { value: 'PB', label: 'PB (Put B)', hasDistance: true },
  { value: 'PC', label: 'PC (Put C)', hasDistance: true },
  { value: 'GW', label: 'GW (Get Weight)', hasWeight: true },
  { value: 'PW', label: 'PW (Put Weight)', hasWeight: true },
  { value: 'A', label: 'A (Action)' },
  { value: 'R', label: 'R (Regrasp)' },
  { value: 'E', label: 'E (Eye Action)' },
  { value: 'C', label: 'C (Crank)' },
  { value: 'S', label: 'S (Step)' },
  { value: 'F', label: 'F (Foot Motion)' },
  { value: 'BD', label: 'BD (Bend/Arise)' },
  { value: 'AB', label: 'AB (Arise/Bend)' },
];

const DISTANCE_OPTIONS = [5, 15, 30, 45, 80];

const getCodeThemeClass = (action) => {
  if (!action || action === '-') return 'theme-dim-gray';
  if (['GA', 'GB', 'GC'].includes(action)) return 'theme-get-cyan';
  if (['PA', 'PB', 'PC'].includes(action)) return 'theme-put-green';
  if (['A', 'R', 'E', 'C', 'S', 'F'].includes(action)) return 'theme-single-amber';
  return 'theme-other-rose';
};

const CodeInput = ({ value, onChange }) => {
  // Parse initial value to state
  const parseValue = (val) => {
    if (!val || val === '-') return { action: '-', modifier: '' };
    if (val.startsWith('GW') || val.startsWith('PW')) {
      return { action: val.substring(0, 2), modifier: val.substring(2) };
    }
    const match = val.match(/^([A-Z]+)(\d+)?$/);
    if (match) {
      return { action: match[1], modifier: match[2] || '' };
    }
    return { action: '-', modifier: '' };
  };

  const [parsed, setParsed] = useState(parseValue(value));

  // Sync from props
  useEffect(() => {
    setParsed(parseValue(value));
  }, [value]);

  const handleActionChange = (e) => {
    const newAction = e.target.value;
    const opt = ACTION_OPTIONS.find(o => o.value === newAction);
    let newModifier = '';
    if (opt?.hasDistance) newModifier = '15'; // Default distance
    if (opt?.hasWeight) newModifier = '1';    // Default weight
    
    const newVal = newAction === '-' ? '-' : `${newAction}${newModifier}`;
    onChange(newVal);
  };

  const handleModifierChange = (e) => {
    const newModifier = e.target.value;
    const newVal = `${parsed.action}${newModifier}`;
    onChange(newVal);
  };

  const selectedOpt = ACTION_OPTIONS.find(o => o.value === parsed.action);
  const themeClass = getCodeThemeClass(parsed.action);

  return (
    <div className="code-input-group">
      <select 
        value={parsed.action} 
        onChange={handleActionChange} 
        className={`action-select ${themeClass}`}
      >
        {ACTION_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value} className={getCodeThemeClass(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
      
      {selectedOpt?.hasDistance && (
        <select 
          value={parsed.modifier || '15'} 
          onChange={handleModifierChange} 
          className={`modifier-select ${themeClass}`}
        >
          {DISTANCE_OPTIONS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      )}
      
      {selectedOpt?.hasWeight && (
        <input 
          type="number" 
          min="1" 
          value={parsed.modifier || '1'} 
          onChange={handleModifierChange} 
          className={`modifier-input ${themeClass}`}
          placeholder="kg"
        />
      )}
    </div>
  );
};


const EXAMPLE_ROWS = [
  { id: 1, lhDesc: 'หยิบสกรู M6 จากถาด (Get screw)', lhFreq: 1, lhCode: 'GA15', rhDesc: 'หยิบแหวนรองจากถาด (Get washer)', rhFreq: 1, rhCode: 'GA15' },
  { id: 2, lhDesc: 'หยิบชิ้นงาน A ระยะ 30ซม (Get Part A)', lhFreq: 1, lhCode: 'GA30', rhDesc: 'วางสกรูลงช่องหลวมๆ (Put screw in hole)', rhFreq: 1, rhCode: 'PB15' },
  { id: 3, lhDesc: 'ปรับใส่สลักซ้าย (Place left pin)', lhFreq: 1, lhCode: 'PB15', rhDesc: 'ปรับใส่สลักขวา (Place right pin)', rhFreq: 1, rhCode: 'PB15' },
  { id: 4, lhDesc: 'วางกล่องบรรจุภัณฑ์ (Place packing box)', lhFreq: 1, lhCode: 'PA15', rhDesc: 'ก้าวขาไปที่โต๊ะงาน (Step to work table)', rhFreq: 1, rhCode: 'S' },
  { id: 5, lhDesc: 'หยิบชิ้นงานเกี่ยวพันกัน (Get interlocked part - HIGH CONTROL)', lhFreq: 1, lhCode: 'GC30', rhDesc: 'หยิบสายไฟที่เกี่ยวพันกัน (Get tangled wire)', rhFreq: 1, rhCode: 'GC30' },
  { id: 6, lhDesc: 'สวมชิ้นส่วนพอดีเป๊ะซ้าย (Place tight fit LH)', lhFreq: 1, lhCode: 'PC15', rhDesc: 'สวมชิ้นส่วนพอดีเป๊ะขวา (Place tight fit RH)', rhFreq: 1, rhCode: 'PC15' },
  { id: 7, lhDesc: 'ยกกล่องชิ้นงานหนัก 3 kg (Get Weight 3kg)', lhFreq: 1, lhCode: 'GW3', rhDesc: '(ถือประคอง - Hold support)', rhFreq: 1, rhCode: '-' },
  { id: 8, lhDesc: 'ก้มหยิบชิ้นงานบนพื้นและลุกขึ้น (Bend & Arise)', lhFreq: 1, lhCode: 'BD', rhDesc: '(เคลื่อนที่ตามร่างกาย)', rhFreq: 1, rhCode: '-' },
  { id: 9, lhDesc: 'ส่องสายตาตรวจรอยเชื่อม (Eye Focus)', lhFreq: 1, lhCode: 'E', rhDesc: 'ปรับเปลี่ยนตำแหน่งมือจับ (Regrasp handle)', rhFreq: 1, rhCode: 'R' },
  { id: 10, lhDesc: 'ออกแรงกดล็อกสลัก (Apply Pressure)', lhFreq: 1, lhCode: 'A', rhDesc: 'ออกแรงกดฝาครอบ (Apply Pressure cover)', rhFreq: 1, rhCode: 'A' },
  { id: 11, lhDesc: 'กดแป้นเท้าปั๊มลม 3 ครั้ง (Foot Motion x3)', lhFreq: 3, lhCode: 'F', rhDesc: '(รอรอบปั๊มลม)', rhFreq: 1, rhCode: '-' },
  { id: 12, lhDesc: 'หมุนมือหมุน 2 รอบ (Crank x2)', lhFreq: 2, lhCode: 'C', rhDesc: 'ก้าวขาถอยหลัง 1 ก้าว (Step back)', rhFreq: 1, rhCode: 'S' },
];

function App() {
  const [activeTab, setActiveTab] = useState('calculator');
  const [viewMode, setViewMode] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768 ? 'card' : 'table';
  });
  const [rows, setRows] = useState([
    { id: 1, lhDesc: '', lhFreq: 1, lhCode: '-', tmu: 0, rhCode: '-', rhFreq: 1, rhDesc: '' }
  ]);
  const [totalTMU, setTotalTMU] = useState(0);
  const [showTrainingBanner, setShowTrainingBanner] = useState(false);
  const [highlightedRowIds, setHighlightedRowIds] = useState([]);

  // Project Manager States
  const [savedProjects, setSavedProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('mtm2_saved_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectName, setProjectName] = useState('Process Plan #1');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const calculateRow = useCallback((row) => {
    const lhTMU = calculateCodeTMU(row.lhCode) * (parseFloat(row.lhFreq) || 0);
    const rhTMU = calculateCodeTMU(row.rhCode) * (parseFloat(row.rhFreq) || 0);
    let finalTMU = Math.max(lhTMU, rhTMU);
    const warn = getSimultaneousWarning(row.lhCode, row.rhCode);
    
    return {
      ...row,
      tmu: finalTMU,
      warning: warn
    };
  }, []);

  const saveCurrentProject = () => {
    const title = projectName.trim() || 'Untitled Process';
    const now = new Date().toISOString();
    let updatedList = [];

    if (currentProjectId) {
      updatedList = savedProjects.map(p => {
        if (p.id === currentProjectId) {
          return {
            ...p,
            name: title,
            rows,
            totalTMU,
            updatedAt: now
          };
        }
        return p;
      });
    } else {
      const newId = Date.now().toString();
      const newProj = {
        id: newId,
        name: title,
        rows,
        totalTMU,
        createdAt: now,
        updatedAt: now
      };
      updatedList = [newProj, ...savedProjects];
      setCurrentProjectId(newId);
    }

    setSavedProjects(updatedList);
    localStorage.setItem('mtm2_saved_projects', JSON.stringify(updatedList));
    showToast(`💾 Saved "${title}" successfully!`);
  };

  const saveAsNewProject = () => {
    const title = (projectName.trim() || 'Untitled Process') + ' (Copy)';
    const now = new Date().toISOString();
    const newId = Date.now().toString();
    const newProj = {
      id: newId,
      name: title,
      rows,
      totalTMU,
      createdAt: now,
      updatedAt: now
    };
    const updatedList = [newProj, ...savedProjects];
    setSavedProjects(updatedList);
    setCurrentProjectId(newId);
    setProjectName(title);
    localStorage.setItem('mtm2_saved_projects', JSON.stringify(updatedList));
    showToast(`✨ Saved as new project "${title}"!`);
  };

  const handleSelectProject = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setCurrentProjectId(null);
      return;
    }
    const found = savedProjects.find(p => p.id === selectedId);
    if (found) {
      const recalculatedRows = (found.rows || []).map(r => calculateRow(r));
      setRows(recalculatedRows);
      setProjectName(found.name || 'Saved Process');
      setCurrentProjectId(found.id);
      showToast(`📁 Loaded "${found.name}"!`);
    }
  };

  const deleteCurrentProject = () => {
    if (!currentProjectId) return;
    const projToDelete = savedProjects.find(p => p.id === currentProjectId);
    const updatedList = savedProjects.filter(p => p.id !== currentProjectId);
    setSavedProjects(updatedList);
    localStorage.setItem('mtm2_saved_projects', JSON.stringify(updatedList));
    setCurrentProjectId(null);
    setProjectName('New Process Plan');
    showToast(`🗑️ Deleted "${projToDelete?.name || 'Project'}"!`);
  };

  const exportProjectJSON = () => {
    const data = {
      version: 'MTM2_v1',
      name: projectName || 'MTM2_Process',
      exportedAt: new Date().toISOString(),
      totalTMU,
      rows
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectName || 'MTM2_Process').replace(/[^a-z0-9_-]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📥 Exported "${projectName}.json"!`);
  };

  const importProjectJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported.rows)) {
          const recalculated = imported.rows.map(r => calculateRow(r));
          setRows(recalculated);
          const importedName = imported.name || file.name.replace('.json', '');
          setProjectName(importedName);
          setCurrentProjectId(null);
          showToast(`📤 Imported "${importedName}"!`);
        } else {
          alert('Invalid file format. Please upload a valid MTM-2 project JSON.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadExampleData = () => {
    const calculatedExamples = EXAMPLE_ROWS.map(row => calculateRow(row));
    setRows(calculatedExamples);
    setShowTrainingBanner(true);
  };

  const clearRows = () => {
    setRows([
      { id: 1, lhDesc: '', lhFreq: 1, lhCode: '-', tmu: 0, rhCode: '-', rhFreq: 1, rhDesc: '' }
    ]);
    setShowTrainingBanner(false);
    setHighlightedRowIds([]);
  };

  const reduceDistanceTo5 = (code) => {
    if (!code || code === '-') return '-';
    const match = code.match(/^([A-Z]{2})(\d+)?$/);
    if (match) {
      const action = match[1];
      if (['GA', 'GB', 'GC', 'PA', 'PB', 'PC'].includes(action)) {
        return `${action}5`;
      }
    }
    return code;
  };

  const fixConflictRow = (id) => {
    setRows(currentRows => {
      const index = currentRows.findIndex(r => r.id === id);
      if (index < 0) return currentRows;
      const targetRow = currentRows[index];

      const newLhCode = reduceDistanceTo5(targetRow.lhCode);
      const newRhCode = reduceDistanceTo5(targetRow.rhCode);

      const firstRow = calculateRow({
        ...targetRow,
        lhCode: newLhCode,
        rhCode: '-',
        rhDesc: '',
        rhFreq: 1
      });

      const nextId = Math.max(...currentRows.map(r => r.id)) + 1;
      const secondRow = calculateRow({
        id: nextId,
        lhDesc: '',
        lhFreq: 1,
        lhCode: '-',
        tmu: 0,
        rhCode: newRhCode,
        rhFreq: targetRow.rhFreq || 1,
        rhDesc: targetRow.rhDesc || ''
      });

      // Highlight both rows for 3 seconds
      setHighlightedRowIds([firstRow.id, nextId]);
      setTimeout(() => {
        setHighlightedRowIds([]);
      }, 3000);

      const updatedRows = [...currentRows];
      updatedRows.splice(index, 1, firstRow, secondRow);
      return updatedRows;
    });
  };

  const updateRow = (id, field, value) => {
    setRows(currentRows => 
      currentRows.map(row => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          return calculateRow(updatedRow);
        }
        return row;
      })
    );
  };

  const addRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    setRows([...rows, { id: newId, lhDesc: '', lhFreq: 1, lhCode: '-', tmu: 0, rhCode: '-', rhFreq: 1, rhDesc: '' }]);
  };

  const removeRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
  };
  
  const copyRow = (id) => {
    const rowToCopy = rows.find(r => r.id === id);
    if (!rowToCopy) return;
    
    const newId = Math.max(...rows.map(r => r.id)) + 1;
    const newRow = { ...rowToCopy, id: newId };
    
    const index = rows.findIndex(r => r.id === id);
    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    setRows(newRows);
  };
  
  const moveRow = (id, direction) => {
    const index = rows.findIndex(r => r.id === id);
    if (index < 0) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rows.length - 1) return;
    
    const newRows = [...rows];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newRows[index];
    newRows[index] = newRows[targetIndex];
    newRows[targetIndex] = temp;
    
    setRows(newRows);
  };

  useEffect(() => {
    const total = rows.reduce((acc, row) => acc + (row.tmu || 0), 0);
    setTotalTMU(total);
  }, [rows]);

  return (
    <div className="glass-panel">
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}

      <div className="header">
        <h1>MTM-2 Calculator</h1>
        <p>Methods-Time Measurement Analysis Tool</p>
        
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            Calculator
          </button>
          <button 
            className={`tab-btn ${activeTab === 'sim-table' ? 'active' : ''}`}
            onClick={() => setActiveTab('sim-table')}
          >
            Simultaneous & Reference Tables
          </button>
        </div>
      </div>

      {/* Project Management Bar */}
      <div className="project-bar">
        <div className="project-info">
          <span className="project-label">📁 Project Name:</span>
          <input 
            type="text" 
            value={projectName} 
            onChange={(e) => setProjectName(e.target.value)} 
            className="project-name-input"
            placeholder="Name your process..."
          />
        </div>
        
        <div className="project-actions">
          <button className="btn btn-sm" onClick={saveCurrentProject} title="Save current project to browser">
            💾 Save
          </button>
          <button className="btn btn-secondary-sm btn-sm" onClick={saveAsNewProject} title="Save as new copy">
            ➕ Save Copy
          </button>

          <select 
            value={currentProjectId || ''} 
            onChange={handleSelectProject} 
            className="project-select"
          >
            <option value="">-- Saved Projects ({savedProjects.length}) --</option>
            {savedProjects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.totalTMU} TMU)
              </option>
            ))}
          </select>

          {currentProjectId && (
            <button className="btn btn-danger-sm btn-sm" onClick={deleteCurrentProject} title="Delete this saved project">
              🗑️
            </button>
          )}

          <button className="btn btn-secondary-sm btn-sm" onClick={exportProjectJSON} title="Download JSON file backup">
            📥 Export
          </button>

          <label className="btn btn-secondary-sm btn-sm import-label" title="Upload JSON file from disk">
            📤 Import
            <input type="file" accept=".json" onChange={importProjectJSON} style={{ display: 'none' }} />
          </label>
        </div>
      </div>


      {activeTab === 'calculator' && (
        <>
          {showTrainingBanner && (
            <div className="training-banner">
              <div>
                <h4>🎓 Training Mode Active (โหมดการฝึกอบรม)</h4>
                <p>
                  Loaded 12 example motion sequences demonstrating standard motions, frequencies, weight rules, warnings (P / VP / W), and <strong>intentional input errors (Rows 5 & 6)</strong>. Click <strong>⚡ Fix Conflict</strong> on any red error row to auto-split into sequential rows & reduce distance to 5!
                </p>
              </div>
              <button className="close-banner" onClick={() => setShowTrainingBanner(false)} title="Close banner">✕</button>
            </div>
          )}

          <div className="view-mode-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📊 Table View
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
            >
              📱 Mobile Cards View
            </button>
          </div>

          {viewMode === 'card' ? (
            <div className="mobile-cards-container">
              {rows.map((row, index) => (
                <div 
                  key={row.id} 
                  className={`
                    motion-card 
                    ${row.warning && row.warning.raw === 'X' ? 'card-error' : ''} 
                    ${highlightedRowIds.includes(row.id) ? 'row-highlight-split' : ''}
                  `.trim()}
                >
                  <div className="card-header">
                    <div className="card-step-badge">
                      <span>Step #{index + 1}</span>
                      {highlightedRowIds.includes(row.id) && (
                        <span className="split-badge">✨ Split</span>
                      )}
                    </div>
                    
                    <div className="card-header-tmu">
                      <span className="tmu-val">{row.tmu} TMU</span>
                      {row.warning && (
                        <div className={`tooltip ${row.warning.type}`}>
                          <div className="icon">
                            {row.warning.raw === 'X' ? '!' : row.warning.raw === 'W' ? 'W' : row.warning.raw}
                          </div>
                          <span className="tooltip-text">{row.warning.message}</span>
                        </div>
                      )}
                    </div>

                    <div className="card-actions">
                      <button className="icon-btn" onClick={() => moveRow(row.id, 'up')} disabled={index === 0}>▲</button>
                      <button className="icon-btn" onClick={() => moveRow(row.id, 'down')} disabled={index === rows.length - 1}>▼</button>
                      <button className="icon-btn" onClick={() => copyRow(row.id)} title="Copy row">📋</button>
                      <button className="icon-btn delete" onClick={() => removeRow(row.id)} title="Remove row">✕</button>
                    </div>
                  </div>

                  {row.warning && row.warning.raw === 'X' && (
                    <div className="card-conflict-banner">
                      <button 
                        className="btn-fix-conflict" 
                        onClick={() => fixConflictRow(row.id)}
                      >
                        ⚡ Fix Conflict (Auto-Split)
                      </button>
                    </div>
                  )}

                  <div className="card-hands-grid">
                    {/* Left Hand */}
                    <div className="hand-box left">
                      <div className="hand-title">✋ Left Hand (มือซ้าย)</div>
                      <div className="input-field-group">
                        <label>Motion Code</label>
                        <CodeInput value={row.lhCode} onChange={(val) => updateRow(row.id, 'lhCode', val)} />
                      </div>
                      <div className="input-field-group">
                        <label>Frequency (ความถี่)</label>
                        <input type="number" min="0" value={row.lhFreq} onChange={(e) => updateRow(row.id, 'lhFreq', e.target.value)} />
                      </div>
                      <div className="input-field-group">
                        <label>Description (รายละเอียด)</label>
                        <textarea 
                          value={row.lhDesc} 
                          onChange={(e) => updateRow(row.id, 'lhDesc', e.target.value)} 
                          placeholder="Left hand action..." 
                          className="cell-desc-input"
                          rows={3} 
                        />
                      </div>
                    </div>

                    {/* Right Hand */}
                    <div className="hand-box right">
                      <div className="hand-title">🤚 Right Hand (มือขวา)</div>
                      <div className="input-field-group">
                        <label>Motion Code</label>
                        <CodeInput value={row.rhCode} onChange={(val) => updateRow(row.id, 'rhCode', val)} />
                      </div>
                      <div className="input-field-group">
                        <label>Frequency (ความถี่)</label>
                        <input type="number" min="0" value={row.rhFreq} onChange={(e) => updateRow(row.id, 'rhFreq', e.target.value)} />
                      </div>
                      <div className="input-field-group">
                        <label>Description (รายละเอียด)</label>
                        <textarea 
                          value={row.rhDesc} 
                          onChange={(e) => updateRow(row.id, 'rhDesc', e.target.value)} 
                          placeholder="Right hand action..." 
                          className="cell-desc-input"
                          rows={3} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-container">
              <table className="mtm-table">
                <thead>
                  <tr>
                    <th>Move</th>
                    <th>Description - Left Hand</th>
                    <th>Freq</th>
                    <th>LH Code</th>
                    <th>TMU</th>
                    <th>RH Code</th>
                    <th>Freq</th>
                    <th>Description - Right Hand</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr 
                      key={row.id} 
                      className={`
                        ${row.warning && row.warning.raw === 'X' ? 'row-error' : ''} 
                        ${highlightedRowIds.includes(row.id) ? 'row-highlight-split' : ''}
                      `.trim()}
                    >
                      <td className="cell-move">
                        <button className="icon-btn" onClick={() => moveRow(row.id, 'up')} disabled={index === 0}>▲</button>
                        <button className="icon-btn" onClick={() => moveRow(row.id, 'down')} disabled={index === rows.length - 1}>▼</button>
                        {highlightedRowIds.includes(row.id) && (
                          <span className="split-badge">✨ Split</span>
                        )}
                      </td>

                      <td>
                        <textarea 
                          value={row.lhDesc} 
                          onChange={(e) => updateRow(row.id, 'lhDesc', e.target.value)}
                          placeholder="Left hand action..."
                          className="cell-desc-input"
                          rows={3}
                        />
                      </td>
                      <td className="cell-freq">
                        <input 
                          type="number" 
                          min="0"
                          value={row.lhFreq} 
                          onChange={(e) => updateRow(row.id, 'lhFreq', e.target.value)}
                        />
                      </td>
                      <td className="cell-code">
                        <CodeInput 
                          value={row.lhCode}
                          onChange={(val) => updateRow(row.id, 'lhCode', val)}
                        />
                      </td>
                      <td className="cell-tmu">
                        {row.tmu}
                        {row.warning && (
                          <div className={`tooltip ${row.warning.type}`}>
                            <div className="icon">
                              {row.warning.raw === 'X' ? '!' : row.warning.raw === 'W' ? 'W' : row.warning.raw}
                            </div>
                            <span className="tooltip-text">{row.warning.message}</span>
                          </div>
                        )}
                        {row.warning && row.warning.raw === 'X' && (
                          <button 
                            className="btn-fix-conflict" 
                            onClick={() => fixConflictRow(row.id)}
                            title="Auto-split conflict to sequential rows & reduce distance to 5"
                          >
                            ⚡ Fix Conflict
                          </button>
                        )}
                      </td>

                      <td className="cell-code">
                        <CodeInput 
                          value={row.rhCode}
                          onChange={(val) => updateRow(row.id, 'rhCode', val)}
                        />
                      </td>
                      <td className="cell-freq">
                        <input 
                          type="number" 
                          min="0"
                          value={row.rhFreq} 
                          onChange={(e) => updateRow(row.id, 'rhFreq', e.target.value)}
                        />
                      </td>
                      <td>
                        <textarea 
                          value={row.rhDesc} 
                          onChange={(e) => updateRow(row.id, 'rhDesc', e.target.value)}
                          placeholder="Right hand action..."
                          className="cell-desc-input"
                          rows={3}
                        />
                      </td>

                      <td className="cell-actions">
                        <button className="icon-btn" onClick={() => copyRow(row.id)} title="Copy row">📋</button>
                        <button className="icon-btn delete" onClick={() => removeRow(row.id)} title="Remove row">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}


          <div className="actions-bar">
            <div className="btn-group">
              <button className="btn" onClick={addRow}>
                + Add Row
              </button>
              <button className="btn btn-secondary" onClick={loadExampleData}>
                📚 Load Training Example
              </button>
              <button className="btn btn-danger" onClick={clearRows}>
                🧹 Clear Table
              </button>
            </div>
            <div className="total-summary-panel">
              <div className="summary-card primary">
                <div className="label">Total TMU</div>
                <div className="value">{totalTMU}</div>
              </div>
              <div className="summary-card">
                <div className="label">Seconds (วินาที)</div>
                <div className="value">{(totalTMU * 0.036).toFixed(3)} <span className="unit">s</span></div>
              </div>
              <div className="summary-card">
                <div className="label">Minutes (นาที)</div>
                <div className="value">{(totalTMU * 0.036 / 60).toFixed(4)} <span className="unit">min</span></div>
              </div>
              <div className="summary-card">
                <div className="label">Hours (ชั่วโมง)</div>
                <div className="value">{(totalTMU * 0.00001).toFixed(5)} <span className="unit">hr</span></div>
              </div>
            </div>
          </div>
        </>
      )}


      {activeTab === 'sim-table' && (
        <div className="sim-table-container">
          {/* MTM Conversion Table */}
          <div className="ref-section">
            <h2>MTM Time Values Conversion Table (ตารางแปลงหน่วยเวลา MTM)</h2>
            <div className="ref-table-wrapper">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>TMU Unit</th>
                    <th className="center">=</th>
                    <th>Time Value Equivalent (ค่าเวลาในหน่วยต่างๆ)</th>
                    <th>Formula / Conversion Relation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="code-cell">1 TMU</td>
                    <td className="center">=</td>
                    <td className="tmu-val" style={{ textAlign: 'left' }}>0.036 SECOND</td>
                    <td>1 TMU = 0.036 วินาที (1 sec = 27.78 TMU)</td>
                  </tr>
                  <tr>
                    <td className="code-cell">100 TMU</td>
                    <td className="center">=</td>
                    <td className="tmu-val" style={{ textAlign: 'left' }}>3.6 SECOND</td>
                    <td>100 TMU = 3.6 วินาที</td>
                  </tr>
                  <tr>
                    <td className="code-cell">1,667 TMU</td>
                    <td className="center">=</td>
                    <td className="tmu-val" style={{ textAlign: 'left' }}>1.0 MINUTE</td>
                    <td>1,667 TMU ≈ 1.0 นาที (1 min = 1,666.67 TMU)</td>
                  </tr>
                  <tr>
                    <td className="code-cell">1 TMU</td>
                    <td className="center">=</td>
                    <td className="tmu-val" style={{ textAlign: 'left' }}>0.00001 HOUR</td>
                    <td>1 TMU = 0.00001 ชั่วโมง (1 hr = 100,000 TMU)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Distance Table */}
          <div className="ref-section">
            <h2>Distance & Motion TMU Table (ตาราง TMU ตามระยะทาง)</h2>

            <div className="ref-table-wrapper">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Motion Description (ลักษณะการเคลื่อนที่)</th>
                    <th className="center">≤ 5 cm</th>
                    <th className="center">≤ 15 cm</th>
                    <th className="center">≤ 30 cm</th>
                    <th className="center">≤ 45 cm</th>
                    <th className="center">≤ 80 cm</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="code-cell">GA</td>
                    <td>Get - Easy / Single Object (หยิบของง่าย/ชิ้นเดียว)</td>
                    <td className="tmu-val">3</td>
                    <td className="tmu-val">6</td>
                    <td className="tmu-val">9</td>
                    <td className="tmu-val">13</td>
                    <td className="tmu-val">17</td>
                  </tr>
                  <tr>
                    <td className="code-cell">GB</td>
                    <td>Get - Mixed / Grouped Objects (หยิบของปนกัน/เป็นกลุ่ม)</td>
                    <td className="tmu-val">7</td>
                    <td className="tmu-val">10</td>
                    <td className="tmu-val">14</td>
                    <td className="tmu-val">18</td>
                    <td className="tmu-val">23</td>
                  </tr>
                  <tr>
                    <td className="code-cell">GC</td>
                    <td>Get - Interlocked / Exact Control (หยิบของเกี่ยวพันกัน/ควบคุมสูง)</td>
                    <td className="tmu-val">14</td>
                    <td className="tmu-val">19</td>
                    <td className="tmu-val">23</td>
                    <td className="tmu-val">27</td>
                    <td className="tmu-val">32</td>
                  </tr>
                  <tr>
                    <td className="code-cell">PA</td>
                    <td>Put - Easy / No Exact Location (วางง่าย/ไม่ต้องตั้งตำแหน่ง)</td>
                    <td className="tmu-val">3</td>
                    <td className="tmu-val">6</td>
                    <td className="tmu-val">11</td>
                    <td className="tmu-val">15</td>
                    <td className="tmu-val">20</td>
                  </tr>
                  <tr>
                    <td className="code-cell">PB</td>
                    <td>Put - Loose Fit / Alignment Required (วางแบบหลวมๆ/ปรับทิศทาง)</td>
                    <td className="tmu-val">10</td>
                    <td className="tmu-val">15</td>
                    <td className="tmu-val">19</td>
                    <td className="tmu-val">24</td>
                    <td className="tmu-val">30</td>
                  </tr>
                  <tr>
                    <td className="code-cell">PC</td>
                    <td>Put - Exact Fit / Careful Placement (วางแบบพอดีเป๊ะ/ระมัดระวัง)</td>
                    <td className="tmu-val">21</td>
                    <td className="tmu-val">26</td>
                    <td className="tmu-val">30</td>
                    <td className="tmu-val">36</td>
                    <td className="tmu-val">41</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Weight & Single Actions Grid */}
          <div className="ref-grid">
            {/* Weight Table */}
            <div className="ref-section">
              <h2>Weight Table & Rules (ตารางและเงื่อนไขน้ำหนัก)</h2>
              <div className="ref-table-wrapper">
                <table className="ref-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Motion / Rule</th>
                      <th className="center">TMU Formula</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="code-cell">GW</td>
                      <td>Get Weight (แรงยกสถิต)</td>
                      <td className="tmu-val">+1 TMU / kg</td>
                      <td>คำนวณ TMU เพิ่มตามน้ำหนักวัตถุ (1 TMU ต่อ 1 กิโลกรัม)</td>
                    </tr>
                    <tr>
                      <td className="code-cell">PW</td>
                      <td>Put Weight (แรงยกระหว่างเคลื่อนที่)</td>
                      <td className="tmu-val">+1 TMU / kg</td>
                      <td>คำนวณ TMU เพิ่มตามน้ำหนักวัตถุระหว่างการวาง</td>
                    </tr>
                    <tr>
                      <td className="code-cell"><span className="badge-tag">Rule</span></td>
                      <td>Simultaneous Limit</td>
                      <td className="tmu-val">&lt; 2 kg</td>
                      <td>เคลื่อนที่พร้อมกันสองมือได้เฉพาะเมื่อน้ำหนักน้อยกว่า 2 กิโลกรัม</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Other Single Motions */}
            <div className="ref-section">
              <h2>Single & Body Motions (การเคลื่อนที่อื่น ๆ)</h2>
              <div className="ref-table-wrapper">
                <table className="ref-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Motion Name</th>
                      <th className="center">TMU</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="code-cell">A</td>
                      <td>Apply Pressure</td>
                      <td className="tmu-val">14</td>
                      <td>การกดหรือออกแรงดันเป็นพิเศษ</td>
                    </tr>
                    <tr>
                      <td className="code-cell">R</td>
                      <td>Regrasp</td>
                      <td className="tmu-val">6</td>
                      <td>การปรับเปลี่ยนตำแหน่งมือจับ</td>
                    </tr>
                    <tr>
                      <td className="code-cell">E</td>
                      <td>Eye Action</td>
                      <td className="tmu-val">7</td>
                      <td>การกวาดสายตาหรือโฟกัสจุดงาน</td>
                    </tr>
                    <tr>
                      <td className="code-cell">C</td>
                      <td>Crank</td>
                      <td className="tmu-val">15</td>
                      <td>การหมุนมือหมุนหรือพวงมาลัย 1 รอบ</td>
                    </tr>
                    <tr>
                      <td className="code-cell">S</td>
                      <td>Step</td>
                      <td className="tmu-val">18</td>
                      <td>การก้าวขาเดิน 1 ก้าว</td>
                    </tr>
                    <tr>
                      <td className="code-cell">F</td>
                      <td>Foot Motion</td>
                      <td className="tmu-val">9</td>
                      <td>การกดแป้นด้วยปลายเท้า/ส้นเท้า</td>
                    </tr>
                    <tr>
                      <td className="code-cell">BD</td>
                      <td>Bend & Arise</td>
                      <td className="tmu-val">29</td>
                      <td>การก้มตัวลงและลุกขึ้นยืนตรง</td>
                    </tr>
                    <tr>
                      <td className="code-cell">AB</td>
                      <td>Arise & Bend</td>
                      <td className="tmu-val">32</td>
                      <td>การยืนขึ้นตรงแล้วก้มตัวลง</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Simultaneous Actions Table */}
          <div className="ref-section">
            <h2>Simultaneous Actions Matrix (การเคลื่อนที่พร้อมกันของสองมือ)</h2>
            <div className="legend">
              <div className="legend-item"><span className="box orange"></span> เกิดขึ้นพร้อมกันได้ (Can happen simultaneously)</div>
              <div className="legend-item"><span className="box yellow">P</span> ต้องผ่านการฝึกฝน (Requires practice)</div>
              <div className="legend-item"><span className="box yellow">VP</span> ต้องผ่านการฝึกฝนและอยู่ในพื้นที่การมองเห็นปกติ (Practice + Visual area)</div>
              <div className="legend-item"><span className="box red">X</span> ต้องเหลื่อมเวลา (Cannot be simultaneous)</div>
              <div className="legend-item"><span className="box blue">W</span> เกิดขึ้นพร้อมกันได้แต่น้ำหนักต้องน้อยกว่า 2 กิโลกรัม (Weight {'<'} 2kg)</div>
            </div>
            
            <div className="sim-matrix-wrapper">
              <table className="sim-matrix">
                <thead>
                  <tr>
                    <th></th>
                    <th>GA</th>
                    <th>GB</th>
                    <th>GC</th>
                    <th>PA</th>
                    <th>PB</th>
                    <th>PC</th>
                    <th>S&B</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><th>GA</th><td className="orange"></td><td className="orange"></td><td className="orange"></td><td className="orange"></td><td className="yellow">P</td><td className="yellow">P</td><td className="orange"></td></tr>
                  <tr><th>GB</th><td className="disabled"></td><td className="orange"></td><td className="orange"></td><td className="orange"></td><td className="yellow">P</td><td className="yellow">P</td><td className="orange"></td></tr>
                  <tr><th>GC</th><td className="disabled"></td><td className="disabled"></td><td className="red">X</td><td className="yellow">P</td><td className="red">X</td><td className="red">X</td><td className="red">X</td></tr>
                  <tr><th>PA</th><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="orange"></td><td className="yellow">P</td><td className="yellow">P</td><td className="blue">W</td></tr>
                  <tr><th>PB</th><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="yellow">VP</td><td className="red">X</td><td className="red">X</td></tr>
                  <tr><th>PC</th><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="red">X</td><td className="red">X</td></tr>
                  <tr><th>S&B</th><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="disabled"></td><td className="orange"></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

