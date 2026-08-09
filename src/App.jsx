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
  { value: 'PT', label: 'PT (Process Time - sec)', hasProcessTime: true },
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
  if (action === 'PT') return 'theme-pt-purple';
  return 'theme-other-rose';
};

const CodeInput = ({ value, onChange }) => {
  // Parse initial value to state
  const parseValue = (val) => {
    if (!val || val === '-') return { action: '-', modifier: '' };
    if (val.startsWith('GW') || val.startsWith('PW') || val.startsWith('PT')) {
      return { action: val.substring(0, 2), modifier: val.substring(2) };
    }
    const match = val.match(/^([A-Z]+)(\d+(\.\d+)?)?$/);
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
    if (opt?.hasDistance) newModifier = '15';    // Default distance
    if (opt?.hasWeight) newModifier = '1';       // Default weight
    if (opt?.hasProcessTime) newModifier = '1';  // Default 1 second
    
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
      
      {(selectedOpt?.hasWeight || selectedOpt?.hasProcessTime) && (
        <input 
          type="number" 
          min="0.1" 
          step={selectedOpt?.hasProcessTime ? "0.1" : "1"}
          value={parsed.modifier} 
          onChange={handleModifierChange} 
          onFocus={(e) => e.target.select()}
          className={`modifier-input ${themeClass}`}
          placeholder={selectedOpt?.hasProcessTime ? "sec" : "kg"}
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
  { id: 13, lhDesc: 'เวลารออบความร้อนเครื่องจักร 3.6 วินาที (Process Time 3.6s)', lhFreq: 1, lhCode: 'PT3.6', rhDesc: '(รอรอบเครื่องจักร - Machine Wait)', rhFreq: 1, rhCode: '-' },
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

  // Standard Time & Allowance Calculator States (ILO Standards)
  const [gender, setGender] = useState('men'); // 'men' | 'women'
  const [useSyncMTM, setUseSyncMTM] = useState(true);
  const [normalTimeVal, setNormalTimeVal] = useState('1000');
  const [normalTimeUnit, setNormalTimeUnit] = useState('TMU'); // 'TMU' | 'sec' | 'min' | 'hr'

  const [posture, setPosture] = useState('none');
  const [weightKg, setWeightKg] = useState('0');
  const [atmosphericPct, setAtmosphericPct] = useState('0');
  const [badLight, setBadLight] = useState('0');
  const [noiseLevel, setNoiseLevel] = useState('0');
  const [closeAttention, setCloseAttention] = useState('0');
  const [mentalStrain, setMentalStrain] = useState('0');
  const [monotony, setMonotony] = useState('0');
  const [tediousness, setTediousness] = useState('0');
  const [companyCustomPct, setCompanyCustomPct] = useState('0');
  const [companyCustomLabel, setCompanyCustomLabel] = useState('Company Delay / Safety PPE');

  // Daily Production Capacity Calculator States
  const [uphMode, setUphMode] = useState('sync'); // 'sync' | 'direct' | 'sub'
  const [uphDirect, setUphDirect] = useState('500');
  const [uphCycleTimeSec, setUphCycleTimeSec] = useState('12');

  const [yieldMode, setYieldMode] = useState('direct'); // 'direct' | 'sub'
  const [yieldDirect, setYieldDirect] = useState('98');
  const [yieldTotalParts, setYieldTotalParts] = useState('1000');
  const [yieldDefectiveParts, setYieldDefectiveParts] = useState('20');

  const [hoursMode, setHoursMode] = useState('direct'); // 'direct' | 'sub'
  const [hoursDirect, setHoursDirect] = useState('7.5');
  const [shiftMinutes, setShiftMinutes] = useState('480');
  const [breakMinutes, setBreakMinutes] = useState('30');

  const [utilMode, setUtilMode] = useState('direct'); // 'direct' | 'sub'
  const [utilDirect, setUtilDirect] = useState('85');
  const [actualPartsPerDay, setActualPartsPerDay] = useState('850');
  const [maxSpeedPartsPerDay, setMaxSpeedPartsPerDay] = useState('1000');

  const [customEfficiencyPct, setCustomEfficiencyPct] = useState('100');
  const [customEfficiencyLabel, setCustomEfficiencyLabel] = useState('Operator Efficiency / OEE');

  // Multi-step Process Flowchart & Bottleneck States
  const [processSteps, setProcessSteps] = useState([
    { id: 1, name: 'Prepare Cream Puff Batter', timeSec: 45 },
    { id: 2, name: 'Bake in Oven', timeSec: 120 },
    { id: 3, name: 'Inject Filling', timeSec: 30 },
    { id: 4, name: 'Package in Box', timeSec: 25 },
  ]);

  const addProcessStep = () => {
    const newId = processSteps.length > 0 ? Math.max(...processSteps.map(s => s.id)) + 1 : 1;
    setProcessSteps([
      ...processSteps,
      { id: newId, name: `Step ${processSteps.length + 1}`, timeSec: 30 }
    ]);
  };

  const updateProcessStep = (id, field, value) => {
    setProcessSteps(processSteps.map(step => {
      if (step.id === id) {
        return { ...step, [field]: value };
      }
      return step;
    }));
  };

  const removeProcessStep = (id) => {
    if (processSteps.length <= 1) {
      showToast('⚠️ Process line must have at least 1 step');
      return;
    }
    setProcessSteps(processSteps.filter(s => s.id !== id));
  };

  const moveProcessStep = (id, direction) => {
    const idx = processSteps.findIndex(s => s.id === id);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === processSteps.length - 1) return;
    const newSteps = [...processSteps];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = newSteps[idx];
    newSteps[idx] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setProcessSteps(newSteps);
  };

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

  // ILO Allowance Calculation Logic
  const getConstantAllowancePct = (g) => (g === 'women' ? 11 : 9);

  const getPostureAllowancePct = (pKey, g) => {
    switch (pKey) {
      case 'standing': return g === 'women' ? 4 : 2;
      case 'slightly_awkward': return g === 'women' ? 1 : 0;
      case 'awkward': return g === 'women' ? 3 : 2;
      case 'very_awkward': return g === 'women' ? 7 : 7;
      default: return 0;
    }
  };

  const getWeightAllowancePct = (w, g) => {
    const val = parseFloat(w) || 0;
    if (val <= 0) return 0;
    if (g === 'men') {
      if (val <= 2.5) return 0;
      if (val <= 5.0) return 1;
      if (val <= 10.0) return 3;
      if (val <= 12.5) return 4;
      if (val <= 15.0) return 6;
      if (val <= 20.0) return 10;
      const extra = Math.min(50, val) - 20;
      const scaled = 10 + Math.round((extra / 30) * 48);
      return Math.min(58, scaled);
    } else {
      if (val <= 2.5) return 1;
      if (val <= 5.0) return 2;
      if (val <= 10.0) return 4;
      if (val <= 12.5) return 6;
      if (val <= 15.0) return 9;
      if (val <= 20.0) return 15;
      return 15;
    }
  };

  const constPct = getConstantAllowancePct(gender);
  const posturePct = getPostureAllowancePct(posture, gender);
  const weightPct = getWeightAllowancePct(weightKg, gender);
  const atmosPct = Math.min(100, Math.max(0, parseFloat(atmosphericPct) || 0));
  const lightPct = parseFloat(badLight) || 0;
  const noisePct = parseFloat(noiseLevel) || 0;
  const closeAttPct = parseFloat(closeAttention) || 0;
  const mentalPct = parseFloat(mentalStrain) || 0;
  const monotonyPct = parseFloat(monotony) || 0;
  const tediousPct = parseFloat(tediousness) || 0;
  const companyPct = parseFloat(companyCustomPct) || 0;

  const totalAllowancePct = constPct + posturePct + weightPct + atmosPct + lightPct + noisePct + closeAttPct + mentalPct + monotonyPct + tediousPct + companyPct;

  let effectiveNormalTMU = 0;
  if (useSyncMTM) {
    effectiveNormalTMU = totalTMU;
  } else {
    const val = parseFloat(normalTimeVal) || 0;
    if (normalTimeUnit === 'TMU') effectiveNormalTMU = val;
    else if (normalTimeUnit === 'sec') effectiveNormalTMU = val / 0.036;
    else if (normalTimeUnit === 'min') effectiveNormalTMU = val * 1666.66667;
    else if (normalTimeUnit === 'hr') effectiveNormalTMU = val * 100000;
  }

  const standardTMU = effectiveNormalTMU * (1 + totalAllowancePct / 100);
  const allowanceTMU = standardTMU - effectiveNormalTMU;

  const stdSec = standardTMU * 0.036;
  const stdMin = stdSec / 60;
  const stdHr = stdSec / 3600;
  const unitsPerHour = stdSec > 0 ? (3600 / stdSec).toFixed(1) : '0';

  const isWomenWeightExceeded = gender === 'women' && parseFloat(weightKg) > 20;

  const resetAllAllowanceFactors = () => {
    setPosture('none');
    setWeightKg('0');
    setAtmosphericPct('0');
    setBadLight('0');
    setNoiseLevel('0');
    setCloseAttention('0');
    setMentalStrain('0');
    setMonotony('0');
    setTediousness('0');
    setCompanyCustomPct('0');
    showToast('🧹 All variable allowance factors reset to 0%!');
  };

  const copyStandardTimeSummary = () => {
    const summaryText = `
=== ILO STANDARD TIME & ALLOWANCE REPORT ===
Project Name: ${projectName || 'Untitled'}
Gender Operator: ${gender === 'men' ? 'Men (ชาย)' : 'Women (หญิง)'}
Normal Time: ${effectiveNormalTMU.toFixed(1)} TMU (${(effectiveNormalTMU * 0.036).toFixed(2)}s)
Total Allowance %: ${totalAllowancePct}%

--- ALLOWANCE BREAKDOWN ---
• Constant Allowance: ${constPct}% (Personal + Fatigue)
• Posture & Standing: ${posturePct}%
• Weightlifting (${weightKg || 0} kg): ${weightPct}% ${isWomenWeightExceeded ? '[⚠️ Exceeds ILO Limit >20kg]' : ''}
• Atmospheric Conditions: ${atmosPct}%
• Lighting Condition: ${lightPct}%
• Noise Level: ${noisePct}%
• Close Attention: ${closeAttPct}%
• Mental Strain: ${mentalPct}%
• Monotony: ${monotonyPct}%
• Tediousness: ${tediousPct}%
• ${companyCustomLabel || 'Company Custom'}: ${companyPct}%

--- FINAL STANDARD TIME & UPH ---
• Standard Time (Seconds): ${stdSec.toFixed(2)} sec
• Standard Time (Minutes): ${stdMin.toFixed(3)} min
• Standard Time (TMU): ${standardTMU.toFixed(1)} TMU
• UPH (Units Per Hour): ${unitsPerHour} UPH
============================================

`.trim();

    navigator.clipboard.writeText(summaryText);
    showToast('📋 Standard Time summary copied to clipboard!');
  };


  // Daily Capacity Effective Calculations
  let calcUPH = 0;
  if (uphMode === 'sync') {
    calcUPH = parseFloat(unitsPerHour) || 0;
  } else if (uphMode === 'direct') {
    calcUPH = parseFloat(uphDirect) || 0;
  } else if (uphMode === 'sub') {
    const ct = parseFloat(uphCycleTimeSec) || 0;
    calcUPH = ct > 0 ? 3600 / ct : 0;
  }

  let calcYieldPct = 0;
  if (yieldMode === 'direct') {
    calcYieldPct = parseFloat(yieldDirect) || 0;
  } else if (yieldMode === 'sub') {
    const tot = parseFloat(yieldTotalParts) || 0;
    const def = parseFloat(yieldDefectiveParts) || 0;
    calcYieldPct = tot > 0 ? (((tot - def) / tot) * 100) : 0;
  }

  let calcWorkingHours = 0;
  if (hoursMode === 'direct') {
    calcWorkingHours = parseFloat(hoursDirect) || 0;
  } else if (hoursMode === 'sub') {
    const shift = parseFloat(shiftMinutes) || 0;
    const brk = parseFloat(breakMinutes) || 0;
    calcWorkingHours = Math.max(0, (shift - brk) / 60);
  }

  let calcUtilPct = 0;
  if (utilMode === 'direct') {
    calcUtilPct = parseFloat(utilDirect) || 0;
  } else if (utilMode === 'sub') {
    const act = parseFloat(actualPartsPerDay) || 0;
    const maxp = parseFloat(maxSpeedPartsPerDay) || 0;
    calcUtilPct = maxp > 0 ? ((act / maxp) * 100) : 0;
  }

  const calcEfficiencyPct = parseFloat(customEfficiencyPct) || 100;

  // Multi-step Bottleneck Analysis Calculations
  let maxStepTimeSec = 0;
  let bottleneckStepObj = null;
  let totalLineWorkContentSec = 0;

  processSteps.forEach(s => {
    const t = parseFloat(s.timeSec) || 0;
    totalLineWorkContentSec += t;
    if (t > maxStepTimeSec) {
      maxStepTimeSec = t;
      bottleneckStepObj = s;
    }
  });

  const multiStepSystemUPH = maxStepTimeSec > 0 ? (3600 / maxStepTimeSec) : 0;
  const lineEfficiencyPct = (processSteps.length > 0 && maxStepTimeSec > 0)
    ? ((totalLineWorkContentSec / (processSteps.length * maxStepTimeSec)) * 100)
    : 0;

  const generateMermaidCode = () => {
    if (processSteps.length === 0) return '%% No steps defined';

    let code = `flowchart LR\n`;
    code += `    %% Class Styles\n`;
    code += `    classDef default fill:#1e293b,stroke:#475569,stroke-width:2px,color:#f8fafc;\n`;
    code += `    classDef bottleneck fill:#7f1d1d,stroke:#ef4444,stroke-width:3px,color:#fef2f2;\n`;
    code += `    classDef outputNode fill:#065f46,stroke:#34d399,stroke-width:3px,color:#ecfdf5;\n\n`;

    processSteps.forEach((step, idx) => {
      const stepNum = idx + 1;
      const isBottleneck = bottleneckStepObj && step.id === bottleneckStepObj.id;
      const cleanName = (step.name || `Step ${stepNum}`).replace(/["\n]/g, "'");
      
      if (isBottleneck) {
        code += `    S${step.id}["🔥 Step ${stepNum}: ${cleanName}<br/>⏱️ ${step.timeSec}s (BOTTLENECK)"]:::bottleneck\n`;
      } else {
        code += `    S${step.id}["Step ${stepNum}: ${cleanName}<br/>⏱️ ${step.timeSec}s"]\n`;
      }
    });

    code += `    OUT["⚡ Total System UPH<br/><b>${multiStepSystemUPH.toFixed(1)} UPH</b><br/>(3600 / ${maxStepTimeSec}s)"]:::outputNode\n\n`;

    for (let i = 0; i < processSteps.length - 1; i++) {
      code += `    S${processSteps[i].id} --> S${processSteps[i + 1].id}\n`;
    }

    if (processSteps.length > 0) {
      code += `    S${processSteps[processSteps.length - 1].id} --> OUT\n`;
    }

    return code;
  };

  const copyMermaidCodeToClipboard = () => {
    const code = generateMermaidCode();
    navigator.clipboard.writeText(code);
    showToast('📋 Mermaid.js flowchart code copied to clipboard!');
  };

  const applyMultiStepUPHToCapacity = () => {
    setUphDirect(multiStepSystemUPH.toFixed(1));
    setUphMode('direct');
    showToast(`⚡ Applied System UPH (${multiStepSystemUPH.toFixed(1)}) to Master Capacity Equation!`);
  };

  // Master Equation: Daily Capacity (Good Parts) = UPH * (Yield/100) * Working Hours * (Util/100) * (Eff/100)
  const rawDailyCapacity = calcUPH * (calcYieldPct / 100) * calcWorkingHours * (calcUtilPct / 100) * (calcEfficiencyPct / 100);
  const finalDailyCapacityParts = Math.round(rawDailyCapacity);


  const resetDailyCapacityInputs = () => {
    setUphMode('sync');
    setUphDirect('500');
    setUphCycleTimeSec('12');

    setYieldMode('direct');
    setYieldDirect('98');
    setYieldTotalParts('1000');
    setYieldDefectiveParts('20');

    setHoursMode('direct');
    setHoursDirect('7.5');
    setShiftMinutes('480');
    setBreakMinutes('30');

    setUtilMode('direct');
    setUtilDirect('85');
    setActualPartsPerDay('850');
    setMaxSpeedPartsPerDay('1000');

    setCustomEfficiencyPct('100');
    setCustomEfficiencyLabel('Operator Efficiency / OEE');

    showToast('🧹 Daily Capacity inputs reset to default values!');
  };

  const copyDailyCapacityReport = () => {

    const reportText = `
=== DAILY PRODUCTION CAPACITY REPORT (GOOD PARTS) ===
Project Name: ${projectName || 'Untitled'}
Final Daily Capacity: ${finalDailyCapacityParts.toLocaleString()} good parts / day

--- MASTER EQUATION VARIABLES ---
1. UPH (Units Per Hour): ${calcUPH.toFixed(1)} UPH [Mode: ${uphMode}]
2. Yield: ${calcYieldPct.toFixed(2)}% [Mode: ${yieldMode}]
3. Working Hours: ${calcWorkingHours.toFixed(2)} hrs [Mode: ${hoursMode}]
4. M/C Utilization: ${calcUtilPct.toFixed(2)}% [Mode: ${utilMode}]
5. ${customEfficiencyLabel || 'Custom Efficiency'}: ${calcEfficiencyPct}%

--- VERIFICATION MATH ---
${calcUPH.toFixed(1)} UPH × ${(calcYieldPct / 100).toFixed(4)} (Yield) × ${calcWorkingHours.toFixed(2)} hrs × ${(calcUtilPct / 100).toFixed(4)} (Util) × ${(calcEfficiencyPct / 100).toFixed(4)} (Eff)
= ${rawDailyCapacity.toFixed(2)} ➔ ${finalDailyCapacityParts.toLocaleString()} Good Parts/Day
======================================================
`.trim();

    navigator.clipboard.writeText(reportText);
    showToast('📋 Daily Capacity report copied to clipboard!');
  };

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
          <button 
            className={`tab-btn ${activeTab === 'std-time' ? 'active' : ''}`}
            onClick={() => setActiveTab('std-time')}
          >
            ⏱️ Standard Time & ILO Allowance
          </button>
          <button 
            className={`tab-btn ${activeTab === 'daily-capacity' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily-capacity')}
          >
            🏭 Daily Capacity (Good Parts)
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


      {/* LocalStorage Location Info Note */}
      <div className="storage-info-note">
        <span>💡</span>
        <span>
          <strong>Storage Info (ตำแหน่งที่เก็บบันทึก):</strong> Projects saved with <strong>💾 Save</strong> are stored inside your browser's internal Local Storage under key <code>mtm2_saved_projects</code>. To create permanent backup files on your hard drive or move projects to another device, use <strong>📥 Export (.json)</strong>.
        </span>
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
                      <th>Motion / Feature</th>
                      <th className="center">TMU Allowance</th>
                      <th className="center">Threshold / Limit</th>
                      <th>Purpose & Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="code-cell">GW</td>
                      <td>Get Weight (แรงยกสถิต)</td>
                      <td className="tmu-val">1 TMU per 1 kg</td>
                      <td className="center">≥ 2 kg (Max 20 kg)</td>
                      <td>ชดเชยแรงกล้ามเนื้อที่ใช้ในการเข้าควบคุมวัตถุหนัก (1 TMU / 2 lbs)</td>
                    </tr>
                    <tr>
                      <td className="code-cell">PW</td>
                      <td>Put Weight (แรงยกระหว่างเคลื่อนที่)</td>
                      <td className="tmu-val">1 TMU per 5 kg</td>
                      <td className="center">≥ 5 kg (Max 20 kg)</td>
                      <td>ชดเชยการชะลอตัวของการเคลื่อนที่ขณะเคลื่อนย้าย/วางวัตถุหนัก (1 TMU / 10 lbs)</td>
                    </tr>
                    <tr>
                      <td className="code-cell"><span className="badge-tag">Rule</span></td>
                      <td>Simultaneous Limit</td>
                      <td className="tmu-val">&lt; 2 kg</td>
                      <td className="center">Threshold &lt; 2 kg</td>
                      <td>เคลื่อนที่พร้อมกันสองมือได้เฉพาะเมื่อน้ำหนักวัตถุน้อยกว่า 2 kg</td>
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
                    <tr>
                      <td className="code-cell">PT</td>
                      <td>Process Time</td>
                      <td className="tmu-val">sec / 0.036</td>
                      <td>เวลาของกระบวนการเครื่องจักร/การรอคอย (ระบุเป็นวินาที แปลงเป็น TMU อัตโนมัติ: 1 sec ≈ 27.78 TMU)</td>
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

      {activeTab === 'std-time' && (
        <div className="std-time-container">

          {/* Top Bar Controls */}
          <div className="std-top-bar">
            <div className="std-time-input-group">
              <label>Normal Time (T_normal):</label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className={`btn-sm ${useSyncMTM ? 'btn' : 'btn-secondary'}`}
                  onClick={() => setUseSyncMTM(!useSyncMTM)}
                  title="Toggle sync from main MTM-2 calculator"
                >
                  {useSyncMTM ? '🔗 Synced from MTM-2' : '✏️ Custom Input'}
                </button>

                {!useSyncMTM && (
                  <>
                    <input 
                      type="number" 
                      min="0" 
                      step="any"
                      value={normalTimeVal} 
                      onChange={(e) => setNormalTimeVal(e.target.value)} 
                      className="std-num-input"
                      placeholder="Normal time"
                    />
                    <select 
                      value={normalTimeUnit} 
                      onChange={(e) => setNormalTimeUnit(e.target.value)}
                      className="std-unit-select"
                    >
                      <option value="TMU">TMU</option>
                      <option value="sec">Seconds (sec)</option>
                      <option value="min">Minutes (min)</option>
                      <option value="hr">Hours (hr)</option>
                    </select>
                  </>
                )}
              </div>
            </div>

            <div className="gender-toggle-group">
              <span className="project-label">Operator Gender:</span>
              <button 
                className={`gender-btn men ${gender === 'men' ? 'active' : ''}`}
                onClick={() => setGender('men')}
              >
                👨 Men (ชาย - 9% Base)
              </button>
              <button 
                className={`gender-btn women ${gender === 'women' ? 'active' : ''}`}
                onClick={() => setGender('women')}
              >
                👩 Women (หญิง - 11% Base)
              </button>

              <button className="btn btn-danger-sm btn-sm" onClick={resetAllAllowanceFactors} title="Reset all variable allowance factors to 0%">
                🧹 Clear All Factors
              </button>
            </div>
          </div>

          {/* 6 Category Allowance Cards Grid */}
          <div className="std-cards-grid">
            {/* 1. Constant Allowance */}
            <div className="std-allowance-card">
              <h3>
                1. Constant Allowance
                <span className="badge-percent">+{constPct}%</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Applied to base time ({gender === 'men' ? 'Men' : 'Women'}):
              </p>
              <ul style={{ fontSize: '0.85rem', paddingLeft: '18px', margin: 0, color: 'var(--text-primary)' }}>
                <li>Personal Needs: <strong>{gender === 'men' ? '5%' : '7%'}</strong></li>
                <li>Basic Fatigue: <strong>4%</strong></li>
              </ul>
            </div>

            {/* 2. Posture & Standing */}
            <div className="std-allowance-card">
              <h3>
                2. Posture & Standing
                <span className="badge-percent">+{posturePct}%</span>
              </h3>
              <div className="form-field">
                <label>Working Posture / Position:</label>
                <select value={posture} onChange={(e) => setPosture(e.target.value)}>
                  <option value="none">Normal Sitting (นั่งปกติ - 0%)</option>
                  <option value="standing">Standing continuously (ยืนทำงานต่อเนื่อง - {gender === 'women' ? '4%' : '2%'})</option>
                  <option value="slightly_awkward">Slightly awkward (เอียงเล็กน้อย - {gender === 'women' ? '1%' : '0%'})</option>
                  <option value="awkward">Awkward / Bending (ก้มตัว/เอียงมาก - {gender === 'women' ? '3%' : '2%'})</option>
                  <option value="very_awkward">Very awkward / Lying / Stretching (นอน/เอื้อมสุดตัว - 7%)</option>
                </select>
              </div>
            </div>

            {/* 3. Weightlifting */}
            <div className="std-allowance-card">
              <h3>
                3. Weightlifting & Force
                <span className="badge-percent">+{weightPct}%</span>
              </h3>
              <div className="form-field">
                <label>Handled Weight / Force (kg):</label>
                <input 
                  type="number" 
                  min="0" 
                  max="50" 
                  step="0.5"
                  value={weightKg} 
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Weight in kg..."
                />
              </div>
              {isWomenWeightExceeded && (
                <div className="weight-alert-banner">
                  ⚠️ Exceeds ILO Recommended Weight Limit for Women (&gt; 20 kg). Heavy lifting above 20kg is not recommended.
                </div>
              )}
              {gender === 'men' && parseFloat(weightKg) > 20 && (
                <div style={{ fontSize: '0.78rem', color: '#60a5fa' }}>
                  ℹ️ Weight &gt; 20kg linearly scales up to 58% at 50kg per ILO standard.
                </div>
              )}
            </div>

            {/* 4. Environmental Factors */}
            <div className="std-allowance-card">
              <h3>
                4. Environmental Factors
                <span className="badge-percent">+{atmosPct + lightPct + noisePct}%</span>
              </h3>
              <div className="form-field">
                <label>Atmospheric Conditions (%):</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={atmosphericPct} 
                  onChange={(e) => setAtmosphericPct(e.target.value)}
                  placeholder="0% - 100%"
                />
              </div>
              <div className="form-field">
                <label>Bad Light (สภาพแสงสว่าง):</label>
                <select value={badLight} onChange={(e) => setBadLight(e.target.value)}>
                  <option value="0">Normal / Adequate (แสงสว่างพอดี - 0%)</option>
                  <option value="2">Well below recommended (ต่ำกว่ามาตรฐาน - 2%)</option>
                  <option value="5">Quite inadequate / Glare (มืดมาก/แสงสะท้อน - 5%)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Noise Level (ระดับเสียงรบกวน):</label>
                <select value={noiseLevel} onChange={(e) => setNoiseLevel(e.target.value)}>
                  <option value="0">Normal / Quiet (เสียงปกติ - 0%)</option>
                  <option value="2">Intermittent / Loud (เสียงดังเป็นพักๆ - 2%)</option>
                  <option value="5">Very loud / High-pitched (เสียงดังมาก/แหลมสูง - 5%)</option>
                </select>
              </div>
            </div>

            {/* 5. Mental and Visual Strain */}
            <div className="std-allowance-card">
              <h3>
                5. Mental & Visual Strain
                <span className="badge-percent">+{closeAttPct + mentalPct + monotonyPct + tediousPct}%</span>
              </h3>
              <div className="form-field">
                <label>Close Attention (ความเพ่งสายตา):</label>
                <select value={closeAttention} onChange={(e) => setCloseAttention(e.target.value)}>
                  <option value="0">Normal (ปกติ - 0%)</option>
                  <option value="2">Fine (เพ่งสายตาวิจิตร - 2%)</option>
                  <option value="5">Very fine / Exacting (เพ่งละเอียดสูงสุด - 5%)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Mental Strain (ความเครียดสมอง):</label>
                <select value={mentalStrain} onChange={(e) => setMentalStrain(e.target.value)}>
                  <option value="0">Normal (ปกติ - 0%)</option>
                  <option value="4">Complex (ซับซ้อน - 4%)</option>
                  <option value="8">Very complex (ซับซ้อนมาก - 8%)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Monotony (ความซ้ำซากจำเจ):</label>
                <select value={monotony} onChange={(e) => setMonotony(e.target.value)}>
                  <option value="0">Normal (ปกติ - 0%)</option>
                  <option value="1">Medium (ปานกลาง - 1%)</option>
                  <option value="4">High (สูง - 4%)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Tediousness (ความน่าเบื่อหน่าย):</label>
                <select value={tediousness} onChange={(e) => setTediousness(e.target.value)}>
                  <option value="0">Normal (ปกติ - 0%)</option>
                  <option value="2">Tedious (น่าเบื่อ - 2%)</option>
                  <option value="5">Very tedious (น่าเบื่อมาก - 5%)</option>
                </select>
              </div>
            </div>

            {/* 6. Self-Customized Company Factor */}
            <div className="std-allowance-card">
              <h3>
                6. Custom Company Allowance
                <span className="badge-percent">+{companyPct}%</span>
              </h3>
              <div className="form-field">
                <label>Custom Reason / Description:</label>
                <input 
                  type="text" 
                  value={companyCustomLabel} 
                  onChange={(e) => setCompanyCustomLabel(e.target.value)}
                  placeholder="Reason (e.g. PPE, Setup delay...)"
                />
              </div>
              <div className="form-field">
                <label>Custom Allowance (%):</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  value={companyCustomPct} 
                  onChange={(e) => setCompanyCustomPct(e.target.value)}
                  placeholder="Custom %..."
                />
              </div>
            </div>
          </div>

          {/* Results Dashboard & Detailed Breakdown Table */}
          <div className="std-results-dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>⏱️ Standard Time Results & Breakdown</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Standard Time = Normal Time × (1 + Total Allowance % / 100) | Capacity = 3,600 / Standard Time (sec)
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="btn btn-danger-sm btn-sm" onClick={resetAllAllowanceFactors} title="Reset all variable allowance factors to 0%">
                  🧹 Clear Factors
                </button>
                <button className="btn" onClick={copyStandardTimeSummary} title="Copy summary report">
                  📋 Copy Summary Report
                </button>
              </div>
            </div>

            <div className="results-metrics-grid">
              <div className="result-card primary">
                <span className="label">Normal Time (T_normal)</span>
                <span className="val">{effectiveNormalTMU.toFixed(1)} <small style={{ fontSize: '0.9rem' }}>TMU</small></span>
                <span className="sub">{(effectiveNormalTMU * 0.036).toFixed(2)} sec</span>
              </div>

              <div className="result-card">
                <span className="label">Total Allowance %</span>
                <span className="val" style={{ color: '#38bdf8' }}>+{totalAllowancePct}%</span>
                <span className="sub">ILO Standard Sum</span>
              </div>

              <div className="result-card">
                <span className="label">Allowance Time Added</span>
                <span className="val" style={{ color: '#fbbf24' }}>+{(allowanceTMU * 0.036).toFixed(2)} <small style={{ fontSize: '0.9rem' }}>sec</small></span>
                <span className="sub">+{(allowanceTMU).toFixed(1)} TMU equivalent</span>
              </div>

              <div className="result-card highlight">
                <span className="label">Final Standard Time (T_std)</span>
                <span className="val">{stdSec.toFixed(2)} <small style={{ fontSize: '0.9rem' }}>sec</small></span>
                <span className="sub">{stdMin.toFixed(3)} min ({standardTMU.toFixed(1)} TMU)</span>
              </div>

              <div className="result-card" style={{ background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.4)' }}>
                <span className="label">UPH (Units Per Hour)</span>
                <span className="val" style={{ color: '#4ade80' }}>{unitsPerHour} <small style={{ fontSize: '0.85rem' }}>UPH</small></span>
                <span className="sub">3,600 / {stdSec.toFixed(2)} sec</span>
              </div>
            </div>

            {/* Time Unit Breakdown Chips */}
            <div className="time-breakdown-units">
              <div className="unit-chip">
                <span className="u-val">{stdSec.toFixed(2)}s</span>
                <span className="u-lbl">Seconds (sec)</span>
              </div>
              <div className="unit-chip">
                <span className="u-val">{stdMin.toFixed(3)}m</span>
                <span className="u-lbl">Minutes (min)</span>
              </div>
              <div className="unit-chip">
                <span className="u-val">{stdHr.toFixed(5)}h</span>
                <span className="u-lbl">Hours (hr)</span>
              </div>
              <div className="unit-chip">
                <span className="u-val">{standardTMU.toFixed(1)}</span>
                <span className="u-lbl">TMU</span>
              </div>
              <div className="unit-chip" style={{ background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.4)' }}>
                <span className="u-val" style={{ color: '#4ade80' }}>{unitsPerHour}</span>
                <span className="u-lbl">UPH (Units Per Hour)</span>
              </div>
            </div>



            {/* Detailed Itemized Allowance Table */}
            <div className="ref-table-wrapper">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Selected Condition</th>
                    <th className="center">Allowance %</th>
                    <th className="center">Added Time (Seconds)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="code-cell">1. Constant Allowance</td>
                    <td>Constant Allowance ({gender === 'men' ? 'Men 9%' : 'Women 11%'})</td>
                    <td className="tmu-val">+{constPct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (constPct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">2. Posture & Standing</td>
                    <td>{posture === 'standing' ? 'Standing Continuously' : posture === 'slightly_awkward' ? 'Slightly Awkward' : posture === 'awkward' ? 'Awkward (Bending)' : posture === 'very_awkward' ? 'Very Awkward' : 'Normal Sitting'}</td>
                    <td className="tmu-val">+{posturePct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (posturePct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">3. Weightlifting</td>
                    <td>{parseFloat(weightKg) > 0 ? `Weightlifting ${weightKg} kg` : 'No Weight'} {isWomenWeightExceeded ? '(⚠️ Exceeds Women Limit)' : ''}</td>
                    <td className="tmu-val">+{weightPct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (weightPct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">4. Atmospheric</td>
                    <td>Atmospheric Conditions</td>
                    <td className="tmu-val">+{atmosPct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (atmosPct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">4. Lighting</td>
                    <td>{lightPct === 2 ? 'Well below recommended' : lightPct === 5 ? 'Quite inadequate/glare' : 'Normal Light'}</td>
                    <td className="tmu-val">+{lightPct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (lightPct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">4. Noise Level</td>
                    <td>{noisePct === 2 ? 'Intermittent/loud' : noisePct === 5 ? 'Very loud/high-pitched' : 'Normal Noise'}</td>
                    <td className="tmu-val">+{noisePct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (noisePct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">5. Close Attention</td>
                    <td>{closeAttPct === 2 ? 'Fine' : closeAttPct === 5 ? 'Very fine/exacting' : 'Normal'}</td>
                    <td className="tmu-val">+{closeAttPct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (closeAttPct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">5. Mental Strain</td>
                    <td>{mentalPct === 4 ? 'Complex' : mentalPct === 8 ? 'Very complex' : 'Normal'}</td>
                    <td className="tmu-val">+{mentalPct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (mentalPct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">5. Monotony</td>
                    <td>{monotonyPct === 1 ? 'Medium' : monotonyPct === 4 ? 'High' : 'Normal'}</td>
                    <td className="tmu-val">+{monotonyPct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (monotonyPct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">5. Tediousness</td>
                    <td>{tediousPct === 2 ? 'Tedious' : tediousPct === 5 ? 'Very tedious' : 'Normal'}</td>
                    <td className="tmu-val">+{tediousPct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (tediousPct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr>
                    <td className="code-cell">6. Custom Company</td>
                    <td>{companyCustomLabel || 'Company Custom Factor'}</td>
                    <td className="tmu-val">+{companyPct}%</td>
                    <td className="center">+{(effectiveNormalTMU * (companyPct / 100) * 0.036).toFixed(2)}s</td>
                  </tr>
                  <tr style={{ fontWeight: 'bold', background: 'rgba(59, 130, 246, 0.15)' }}>
                    <td colSpan="2" style={{ color: '#60a5fa' }}>TOTAL ALLOWANCE & TIME ADDED</td>
                    <td className="tmu-val" style={{ color: '#38bdf8', fontSize: '1rem' }}>+{totalAllowancePct}%</td>
                    <td className="center" style={{ color: '#fbbf24', fontSize: '1rem' }}>+{(allowanceTMU * 0.036).toFixed(2)} sec</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'daily-capacity' && (
        <div className="std-time-container">
          {/* Header Card */}
          <div className="std-top-bar">
            <div>
              <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>🏭 Daily Production Capacity Calculator (Good Parts)</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Master Equation: Daily Capacity = UPH × (Yield % / 100) × Working Hours × (M/C Utilization % / 100) × (Custom Efficiency % / 100)
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="btn btn-danger-sm btn-sm" onClick={resetDailyCapacityInputs} title="Reset all capacity inputs to default values">
                🧹 Reset Inputs
              </button>
              <button className="btn" onClick={copyDailyCapacityReport} title="Copy full report to clipboard">
                📋 Copy Capacity Report
              </button>
            </div>
          </div>


          {/* 5 Card Controls */}
          <div className="std-cards-grid">

            {/* Variable 1: UPH */}
            <div className="std-allowance-card">
              <h3>
                1. UPH (Units Per Hour)
                <span className="cap-result-badge">{calcUPH.toFixed(1)} UPH</span>
              </h3>
              
              <div className="cap-mode-selector">
                <button 
                  className={`cap-mode-btn ${uphMode === 'sync' ? 'active' : ''}`}
                  onClick={() => setUphMode('sync')}
                >
                  Option C: 🔗 Sync Standard Time
                </button>
                <button 
                  className={`cap-mode-btn ${uphMode === 'direct' ? 'active' : ''}`}
                  onClick={() => setUphMode('direct')}
                >
                  Option A: ✏️ Direct Input
                </button>
                <button 
                  className={`cap-mode-btn ${uphMode === 'sub' ? 'active' : ''}`}
                  onClick={() => setUphMode('sub')}
                >
                  Option B: 🧮 Cycle Time Sub-Calc
                </button>
              </div>

              {uphMode === 'sync' && (
                <div style={{ fontSize: '0.85rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  🔗 Synced from Standard Time page: <strong>{unitsPerHour} UPH</strong> (3,600 / {stdSec.toFixed(2)}s)
                </div>
              )}

              {uphMode === 'direct' && (
                <div className="form-field">
                  <label>Direct UPH Input (units/hour):</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="any"
                    value={uphDirect} 
                    onChange={(e) => setUphDirect(e.target.value)}
                    placeholder="e.g. 500 units/hr"
                  />
                </div>
              )}

              {uphMode === 'sub' && (
                <div className="cap-sub-calc-box">
                  <label>Sub-calculation: <code>3600 seconds / Cycle Time (sec)</code></label>
                  <div className="form-field">
                    <label>Cycle Time in Seconds:</label>
                    <input 
                      type="number" 
                      min="0.1" 
                      step="any"
                      value={uphCycleTimeSec} 
                      onChange={(e) => setUphCycleTimeSec(e.target.value)}
                      placeholder="Cycle time in seconds..."
                    />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#34d399' }}>
                    Formula: 3600 / {uphCycleTimeSec || '0'}s = <strong>{calcUPH.toFixed(1)} UPH</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Variable 2: Yield (%) */}
            <div className="std-allowance-card">
              <h3>
                2. Yield (%)
                <span className="cap-result-badge">{calcYieldPct.toFixed(2)}%</span>
              </h3>

              <div className="cap-mode-selector">
                <button 
                  className={`cap-mode-btn ${yieldMode === 'direct' ? 'active' : ''}`}
                  onClick={() => setYieldMode('direct')}
                >
                  Option A: ✏️ Direct Input
                </button>
                <button 
                  className={`cap-mode-btn ${yieldMode === 'sub' ? 'active' : ''}`}
                  onClick={() => setYieldMode('sub')}
                >
                  Option B: 🧮 Parts Sub-Calc
                </button>
              </div>

              {yieldMode === 'direct' && (
                <div className="form-field">
                  <label>Direct Yield Percentage (%):</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.1"
                    value={yieldDirect} 
                    onChange={(e) => setYieldDirect(e.target.value)}
                    placeholder="e.g. 98%"
                  />
                </div>
              )}

              {yieldMode === 'sub' && (
                <div className="cap-sub-calc-box">
                  <label>Sub-calculation: <code>((Total - Defective) / Total) × 100</code></label>
                  <div className="form-field">
                    <label>Total Parts Produced:</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={yieldTotalParts} 
                      onChange={(e) => setYieldTotalParts(e.target.value)}
                      placeholder="Total parts..."
                    />
                  </div>
                  <div className="form-field">
                    <label>Defective / Scrap Parts:</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={yieldDefectiveParts} 
                      onChange={(e) => setYieldDefectiveParts(e.target.value)}
                      placeholder="Defective parts..."
                    />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#34d399' }}>
                    Formula: (({yieldTotalParts || 0} - {yieldDefectiveParts || 0}) / {yieldTotalParts || 1}) × 100 = <strong>{calcYieldPct.toFixed(2)}%</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Variable 3: Working Hours */}
            <div className="std-allowance-card">
              <h3>
                3. Working Hours
                <span className="cap-result-badge">{calcWorkingHours.toFixed(2)} hrs</span>
              </h3>

              <div className="cap-mode-selector">
                <button 
                  className={`cap-mode-btn ${hoursMode === 'direct' ? 'active' : ''}`}
                  onClick={() => setHoursMode('direct')}
                >
                  Option A: ✏️ Direct Input
                </button>
                <button 
                  className={`cap-mode-btn ${hoursMode === 'sub' ? 'active' : ''}`}
                  onClick={() => setHoursMode('sub')}
                >
                  Option B: 🧮 Shift Minutes Sub-Calc
                </button>
              </div>

              {hoursMode === 'direct' && (
                <div className="form-field">
                  <label>Direct Working Hours (hours):</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.1"
                    value={hoursDirect} 
                    onChange={(e) => setHoursDirect(e.target.value)}
                    placeholder="e.g. 7.5 hrs"
                  />
                </div>
              )}

              {hoursMode === 'sub' && (
                <div className="cap-sub-calc-box">
                  <label>Sub-calculation: <code>(Shift Min - Break Min) / 60</code></label>
                  <div className="form-field">
                    <label>Total Shift Minutes (e.g. 480 min = 8 hrs):</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={shiftMinutes} 
                      onChange={(e) => setShiftMinutes(e.target.value)}
                      placeholder="Shift minutes..."
                    />
                  </div>
                  <div className="form-field">
                    <label>Planned Break / Downtime Minutes:</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={breakMinutes} 
                      onChange={(e) => setBreakMinutes(e.target.value)}
                      placeholder="Break minutes..."
                    />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#34d399' }}>
                    Formula: ({shiftMinutes || 0} - {breakMinutes || 0}) / 60 = <strong>{calcWorkingHours.toFixed(2)} hrs</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Variable 4: M/C Utilization (%) */}
            <div className="std-allowance-card">
              <h3>
                4. M/C Utilization (%)
                <span className="cap-result-badge">{calcUtilPct.toFixed(2)}%</span>
              </h3>

              <div className="cap-mode-selector">
                <button 
                  className={`cap-mode-btn ${utilMode === 'direct' ? 'active' : ''}`}
                  onClick={() => setUtilMode('direct')}
                >
                  Option A: ✏️ Direct Input
                </button>
                <button 
                  className={`cap-mode-btn ${utilMode === 'sub' ? 'active' : ''}`}
                  onClick={() => setUtilMode('sub')}
                >
                  Option B: 🧮 Actual vs Max Speed Sub-Calc
                </button>
              </div>

              {utilMode === 'direct' && (
                <div className="form-field">
                  <label>Direct M/C Utilization Percentage (%):</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.1"
                    value={utilDirect} 
                    onChange={(e) => setUtilDirect(e.target.value)}
                    placeholder="e.g. 85%"
                  />
                </div>
              )}

              {utilMode === 'sub' && (
                <div className="cap-sub-calc-box">
                  <label>Sub-calculation: <code>(Actual Parts / Max Continuous Parts) × 100</code></label>
                  <div className="form-field">
                    <label>Actual Parts Produced per Day:</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={actualPartsPerDay} 
                      onChange={(e) => setActualPartsPerDay(e.target.value)}
                      placeholder="Actual parts/day..."
                    />
                  </div>
                  <div className="form-field">
                    <label>Max Parts if M/C Runs Continuously at Max Speed:</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={maxSpeedPartsPerDay} 
                      onChange={(e) => setMaxSpeedPartsPerDay(e.target.value)}
                      placeholder="Max speed parts/day..."
                    />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#34d399' }}>
                    Formula: ({actualPartsPerDay || 0} / {maxSpeedPartsPerDay || 1}) × 100 = <strong>{calcUtilPct.toFixed(2)}%</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Variable 5: Custom Efficiency Modifier */}
            <div className="std-allowance-card">
              <h3>
                5. Custom Efficiency Modifier
                <span className="cap-result-badge">{calcEfficiencyPct}%</span>
              </h3>
              <div className="form-field">
                <label>Efficiency Factor Name / Reason:</label>
                <input 
                  type="text" 
                  value={customEfficiencyLabel} 
                  onChange={(e) => setCustomEfficiencyLabel(e.target.value)}
                  placeholder="e.g. Operator Efficiency, OEE..."
                />
              </div>
              <div className="form-field">
                <label>Custom Efficiency Multiplier (%):</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  value={customEfficiencyPct} 
                  onChange={(e) => setCustomEfficiencyPct(e.target.value)}
                  placeholder="e.g. 95%"
                />
              </div>
            </div>
          </div>

          {/* Multi-Step Flowchart & Bottleneck Visualizer Card */}
          <div className="flowchart-visualizer-card">

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem' }}>
                  🔀 Multi-Step Process Bottleneck Analysis & Mermaid Flowchart
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Define your sequential process steps to identify the bottleneck (CT_max) and calculate Total System UPH (3,600 / CT_max).
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={addProcessStep}>
                  + Add Process Step
                </button>
                <button className="btn btn-secondary btn-sm" onClick={applyMultiStepUPHToCapacity} title="Apply calculated System UPH to master equation">
                  ⚡ Apply System UPH ({multiStepSystemUPH.toFixed(1)})
                </button>
                <button className="btn btn-sm" onClick={copyMermaidCodeToClipboard} title="Copy GFM Mermaid.js code">
                  📋 Copy Mermaid Code
                </button>
              </div>
            </div>

            {/* IE Bottleneck Summary Bar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: 'rgba(30, 41, 59, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <div style={{ flex: '1 1 180px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>🔥 Line Bottleneck Step</span>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ef4444' }}>
                  {bottleneckStepObj ? `${bottleneckStepObj.name} (${bottleneckStepObj.timeSec}s)` : 'N/A'}
                </div>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>⚡ Total System UPH</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399' }}>
                  {multiStepSystemUPH.toFixed(1)} UPH
                </div>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>⏱️ Total Work Content</span>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#38bdf8' }}>
                  {totalLineWorkContentSec.toFixed(1)} sec
                </div>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>📊 Line Balance Efficiency</span>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#a78bfa' }}>
                  {lineEfficiencyPct.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Editable Steps Table */}
            <div className="ref-table-wrapper">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Order</th>
                    <th>Process Task Name</th>
                    <th style={{ width: '180px' }} className="center">Cycle Time (sec)</th>
                    <th style={{ width: '150px' }} className="center">Status</th>
                    <th style={{ width: '110px' }} className="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processSteps.map((step, index) => {
                    const isBottleneck = bottleneckStepObj && step.id === bottleneckStepObj.id;
                    return (
                      <tr key={step.id} style={isBottleneck ? { background: 'rgba(239, 68, 68, 0.12)' } : {}}>
                        <td className="center">
                          <button className="icon-btn" onClick={() => moveProcessStep(step.id, 'up')} disabled={index === 0}>▲</button>
                          <button className="icon-btn" onClick={() => moveProcessStep(step.id, 'down')} disabled={index === processSteps.length - 1}>▼</button>
                        </td>
                        <td>
                          <input 
                            type="text" 
                            value={step.name} 
                            onChange={(e) => updateProcessStep(step.id, 'name', e.target.value)}
                            placeholder="Task name..."
                            className="std-num-input"
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td className="center">
                          <input 
                            type="number" 
                            min="0.1" 
                            step="any"
                            value={step.timeSec} 
                            onChange={(e) => updateProcessStep(step.id, 'timeSec', e.target.value)}
                            className="std-num-input"
                            style={{ width: '100px', textAlign: 'center' }}
                          />
                        </td>
                        <td className="center">
                          {isBottleneck ? (
                            <span className="badge-tag" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                              🔥 BOTTLENECK
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Normal</span>
                          )}
                        </td>
                        <td className="center">
                          <button className="icon-btn delete" onClick={() => removeProcessStep(step.id)} title="Remove step">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Interactive Visual Flowchart Nodes */}
            <div style={{ marginTop: '10px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc', fontSize: '0.95rem' }}>🎨 Visual Process Line Flowchart:</h4>
              <div className="flowchart-nodes-wrapper">
                {processSteps.map((step, idx) => {
                  const isBottleneck = bottleneckStepObj && step.id === bottleneckStepObj.id;
                  return (
                    <React.Fragment key={step.id}>
                      <div className={`flowchart-node ${isBottleneck ? 'bottleneck' : ''}`}>
                        <span className="node-step-tag">Step {idx + 1} {isBottleneck ? '• BOTTLENECK 🔥' : ''}</span>
                        <div className="node-title">{step.name || `Step ${idx + 1}`}</div>
                        <div className="node-time">⏱️ {step.timeSec || '0'}s</div>
                      </div>
                      <div className="flowchart-arrow">➔</div>
                    </React.Fragment>
                  );
                })}

                <div className="flowchart-node output-node">
                  <span className="node-step-tag" style={{ color: '#6ee7b7' }}>System Output ⚡</span>
                  <div className="node-title">Total System UPH</div>
                  <div className="node-time" style={{ color: '#34d399' }}>{multiStepSystemUPH.toFixed(1)} UPH</div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>(3600 / {maxStepTimeSec}s)</span>
                </div>
              </div>
            </div>

            {/* Mermaid.js Code Syntax Block */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#60a5fa' }}>
                  💻 Mermaid.js Code (For GFM / Notion / Diagrams.net):
                </span>
                <button className="btn btn-sm" onClick={copyMermaidCodeToClipboard}>
                  📋 Copy Mermaid Code
                </button>
              </div>
              <pre className="mermaid-code-container">
                {generateMermaidCode()}
              </pre>
            </div>
          </div>

          {/* Master Output Result & Verification Card */}
          <div className="master-equation-card">

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="label" style={{ color: '#34d399', fontSize: '0.9rem', fontWeight: '700' }}>
                  🏆 FINAL CALCULATED DAILY CAPACITY (GOOD PARTS)
                </span>
                <div className="capacity-giant-val">
                  {finalDailyCapacityParts.toLocaleString()} <small style={{ fontSize: '1.4rem', fontWeight: '700', color: '#93c5fd' }}>good parts / day</small>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Unrounded capacity: <strong>{rawDailyCapacity.toFixed(2)}</strong> parts/day
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="btn btn-danger-sm btn-sm" onClick={resetDailyCapacityInputs} title="Reset all capacity inputs to default values">
                  🧹 Reset Inputs
                </button>
                <button className="btn" onClick={copyDailyCapacityReport} title="Copy detailed capacity report">
                  📋 Copy Full Capacity Report
                </button>
              </div>
            </div>


            {/* Verification Math Chain */}
            <div className="equation-chain">
              <div style={{ fontWeight: '700', color: '#f8fafc', marginBottom: '6px' }}>
                📐 Step-by-Step Master Verification Equation:
              </div>
              <div>
                Daily Capacity = UPH × (Yield / 100) × Working Hours × (Utilization / 100) × (Efficiency / 100)
              </div>
              <div style={{ color: '#34d399', marginTop: '6px', fontWeight: '700' }}>
                = {calcUPH.toFixed(1)} UPH × {(calcYieldPct / 100).toFixed(4)} (Yield) × {calcWorkingHours.toFixed(2)} hrs × {(calcUtilPct / 100).toFixed(4)} (Util) × {(calcEfficiencyPct / 100).toFixed(4)} (Eff)
              </div>
              <div style={{ color: '#a78bfa', fontWeight: '700', marginTop: '4px' }}>
                = {rawDailyCapacity.toFixed(2)} ➔ <strong>{finalDailyCapacityParts.toLocaleString()} Good Parts / Day</strong>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


export default App;

