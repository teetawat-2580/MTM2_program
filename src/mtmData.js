// MTM-2 TMU Lookup Table
export const tmuTable = {
  GA: { 5: 3, 15: 6, 30: 9, 45: 13, 80: 17 },
  GB: { 5: 7, 15: 10, 30: 14, 45: 18, 80: 23 },
  GC: { 5: 14, 15: 19, 30: 23, 45: 27, 80: 32 },
  PA: { 5: 3, 15: 6, 30: 11, 45: 15, 80: 20 },
  PB: { 5: 10, 15: 15, 30: 19, 45: 24, 80: 30 },
  PC: { 5: 21, 15: 26, 30: 30, 45: 36, 80: 41 },
};

// Single Action TMUs
export const singleActionTable = {
  A: 14,
  R: 6,
  E: 7,
  C: 15,
  S: 18,
  F: 9,
  BD: 29,
  AB: 32,
};

// Simultaneous Action Table (Symmetric matrix)
// Rows/Cols: GA, GB, GC, PA, PB, PC, S&B
// We will just use 'S' and 'B' separately pointing to same values.
// Values: '' (Allowed), 'P' (Practice), 'VP' (Visual/Practice), 'W' (Weight < 2kg), 'X' (Not allowed)
const simTableRaw = {
  GA: { GA: '', GB: '', GC: '', PA: '', PB: 'P', PC: 'P', S: '', B: '' },
  GB: { GA: '', GB: '', GC: '', PA: '', PB: 'P', PC: 'P', S: '', B: '' },
  GC: { GA: '', GB: '', GC: 'X', PA: 'P', PB: 'X', PC: 'X', S: 'X', B: 'X' },
  PA: { GA: '', GB: '', GC: 'P', PA: '', PB: 'P', PC: 'P', S: 'W', B: 'W' },
  PB: { GA: 'P', GB: 'P', GC: 'X', PA: 'P', PB: 'VP', PC: 'X', S: 'X', B: 'X' },
  PC: { GA: 'P', GB: 'P', GC: 'X', PA: 'P', PB: 'X', PC: 'X', S: 'X', B: 'X' },
  S: { GA: '', GB: '', GC: 'X', PA: 'W', PB: 'X', PC: 'X', S: '', B: '' },
  B: { GA: '', GB: '', GC: 'X', PA: 'W', PB: 'X', PC: 'X', S: '', B: '' },
};

export const getSimultaneousWarning = (code1, code2) => {
  if (!code1 || !code2 || code1 === '-' || code2 === '-') return null;
  
  // Extract base action (e.g., GA15 -> GA, S -> S, GW1 -> ignore for sim table)
  const getBaseAction = (code) => {
    if (code.startsWith('GW') || code.startsWith('PW')) return null;
    const match = code.match(/^[A-Z]+/);
    if (!match) return null;
    let base = match[0];
    if (base === 'BD' || base === 'AB') base = 'B'; // Map BD/AB to B for S&B rules? Actually let's assume body motions are B
    return base;
  };

  const action1 = getBaseAction(code1);
  const action2 = getBaseAction(code2);

  if (!action1 || !action2) return null;
  
  // Look up in table
  if (simTableRaw[action1] && simTableRaw[action1][action2] !== undefined) {
    const status = simTableRaw[action1][action2];
    if (status === '') return null; // No warning
    
    switch (status) {
      case 'P': return { type: 'warning', message: 'Requires Practice', raw: 'P' };
      case 'VP': return { type: 'warning', message: 'Requires Practice & Visual Area', raw: 'VP' };
      case 'W': return { type: 'info', message: 'Allowed if weight < 2kg', raw: 'W' };
      case 'X': return { type: 'error', message: 'Cannot be simultaneous', raw: 'X' };
    }
  }
  return null;
};

// Parse a code to get its TMU
export const calculateCodeTMU = (code) => {
  if (!code || code === '-') return 0;
  
  const upperCode = code.toUpperCase();
  
  // Check weight codes first (GW1, PW5, etc.)
  if (upperCode.startsWith('GW')) {
    const weight = parseInt(upperCode.substring(2)) || 0;
    return weight * 1; 
  }
  if (upperCode.startsWith('PW')) {
    const weight = parseInt(upperCode.substring(2)) || 0;
    return weight * 1; // "PW 5kg - 1" -> usually 1 per kg up to 5kg limit.
  }

  // Check single actions
  if (singleActionTable[upperCode] !== undefined) {
    return singleActionTable[upperCode];
  }

  // Check complex actions (GA15, PB30, etc.)
  const match = upperCode.match(/^([A-Z]{2})(\d+)?$/);
  if (match) {
    const action = match[1];
    let distanceStr = match[2];
    
    if (tmuTable[action]) {
      // Find closest distance class: 5, 15, 30, 45, 80
      const distance = distanceStr ? parseInt(distanceStr) : 5; // default if missing
      const classes = [5, 15, 30, 45, 80];
      let selectedClass = 80;
      for (const d of classes) {
        if (distance <= d) {
          selectedClass = d;
          break;
        }
      }
      return tmuTable[action][selectedClass] || 0;
    }
  }

  return 0; // Unknown code
};
