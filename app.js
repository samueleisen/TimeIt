/**
 * TimeKeeper - Minimalist Vertical Countdown Canvas
 * AI Token Quota & Rate Limit Tracker with Custom Shortcuts & 1-Tap Reset
 */

(() => {
  const COUNTDOWNS_KEY = 'timekeeper_canvas_v1';
  const SHORTCUTS_KEY = 'timekeeper_shortcuts_v1';

  // Default Shortcuts
  const DEFAULT_SHORTCUTS = [
    { id: 's_3h', label: '+3h', ms: 3 * 3600 * 1000 },
    { id: 's_5h', label: '+5h', ms: 5 * 3600 * 1000 },
    { id: 's_24h', label: '+24h', ms: 24 * 3600 * 1000 },
    { id: 's_7d', label: '+7d', ms: 7 * 24 * 3600 * 1000 }
  ];

  // State
  let countdowns = loadCountdowns();
  let shortcuts = loadShortcuts();
  let selectedShortcutMs = null;

  // DOM Elements
  const countdownList = document.getElementById('countdownList');
  const canvasEmpty = document.getElementById('canvasEmpty');
  const fabWrapper = document.getElementById('fabWrapper');
  const fabBackdrop = document.getElementById('fabBackdrop');
  const speedDialMenu = document.getElementById('speedDialMenu');
  const fabToggleBtn = document.getElementById('fabToggleBtn');
  const sheetBackdrop = document.getElementById('sheetBackdrop');
  const closeSheetBtn = document.getElementById('closeSheetBtn');
  const addCountdownForm = document.getElementById('addCountdownForm');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const dateTimeGroup = document.getElementById('dateTimeGroup');
  const eventTitleInput = document.getElementById('eventTitleInput');
  const eventDateInput = document.getElementById('eventDateInput');
  const startCountdownBtn = document.getElementById('startCountdownBtn');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const toggleShortcutsAccordionBtn = document.getElementById('toggleShortcutsAccordionBtn');
  const shortcutsAccordionBody = document.getElementById('shortcutsAccordionBody');
  const sidebarShortcutsList = document.getElementById('sidebarShortcutsList');
  const sidebarShortcutAmount = document.getElementById('sidebarShortcutAmount');
  const sidebarShortcutUnit = document.getElementById('sidebarShortcutUnit');
  const sidebarAddShortcutBtn = document.getElementById('sidebarAddShortcutBtn');
  const restoreDefaultsBtn = document.getElementById('restoreDefaultsBtn');
  const editModeToggle = document.getElementById('editModeToggle');
  const colorPickerRow = document.getElementById('colorPickerRow');
  const customColorBtn = document.getElementById('customColorBtn');
  const customColorInput = document.getElementById('customColorInput');

  // State
  let editMode = false;
  let currentModalMode = 'custom'; // 'shortcut' | 'custom'
  let currentSelectedShortcut = null;
  let selectedGaugeColor = '#6366f1';

  // Helper: Hex color to RGBA
  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(99, 102, 241, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Color Picker Setup in Modal
  if (colorPickerRow) {
    colorPickerRow.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        colorPickerRow.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        if (customColorBtn) {
          customColorBtn.classList.remove('active');
          customColorBtn.style.background = '';
        }
        dot.classList.add('active');
        selectedGaugeColor = dot.dataset.color;
      });
    });
  }

  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      selectedGaugeColor = e.target.value;
      if (colorPickerRow) {
        colorPickerRow.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      }
      if (customColorBtn) {
        customColorBtn.classList.add('active');
        customColorBtn.style.background = selectedGaugeColor;
      }
    });
  }

  function resetColorPickerUI() {
    selectedGaugeColor = '#6366f1';
    if (colorPickerRow) {
      colorPickerRow.querySelectorAll('.color-dot').forEach(d => {
        if (d.dataset.color === '#6366f1') d.classList.add('active');
        else d.classList.remove('active');
      });
    }
    if (customColorBtn) {
      customColorBtn.classList.remove('active');
      customColorBtn.style.background = '';
    }
    if (customColorInput) {
      customColorInput.value = '#6366f1';
    }
  }

  // Load from LocalStorage
  function loadCountdowns() {
    try {
      const data = localStorage.getItem(COUNTDOWNS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item => item && item.id && typeof item.targetTimestamp === 'number');
    } catch (e) {
      console.error('Failed to load countdowns', e);
      return [];
    }
  }

  function saveCountdowns() {
    try {
      localStorage.setItem(COUNTDOWNS_KEY, JSON.stringify(countdowns));
    } catch (e) {
      console.error('Failed to save countdowns', e);
    }
  }

  function loadShortcuts() {
    try {
      const data = localStorage.getItem(SHORTCUTS_KEY);
      return data ? JSON.parse(data) : [...DEFAULT_SHORTCUTS];
    } catch (e) {
      console.error('Failed to load shortcuts', e);
      return [...DEFAULT_SHORTCUTS];
    }
  }

  function saveShortcuts() {
    try {
      localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
    } catch (e) {
      console.error('Failed to save shortcuts', e);
    }
  }

  // Format Helper: ISO Local string for datetime-local
  function formatForInput(timestamp) {
    const d = new Date(timestamp);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  // Format Target Date (e.g. "Oct 15, 2026 • 2:30 PM")
  function formatTargetDate(timestamp) {
    const d = new Date(timestamp);
    const dateStr = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${dateStr} • ${timeStr}`;
  }

  function formatHumanDuration(ms) {
    const totalMins = Math.floor(ms / (60 * 1000));
    if (totalMins % (24 * 60) === 0) {
      const d = totalMins / (24 * 60);
      return `${d} ${d === 1 ? 'Day' : 'Days'}`;
    }
    if (totalMins % 60 === 0) {
      const h = totalMins / 60;
      return `${h} ${h === 1 ? 'Hour' : 'Hours'}`;
    }
    return `${totalMins} Mins`;
  }

  // Render Shortcuts in Sidebar
  function renderSidebarShortcuts() {
    sidebarShortcutsList.innerHTML = '';

    if (shortcuts.length === 0) {
      sidebarShortcutsList.innerHTML = `<p style="font-size: 0.75rem; color: var(--text-muted); padding: 0.5rem 0;">No shortcuts saved.</p>`;
      return;
    }

    shortcuts.forEach(s => {
      const item = document.createElement('div');
      item.className = 'sidebar-shortcut-item';

      item.innerHTML = `
        <div>
          <span class="sidebar-shortcut-label">${s.label}</span>
          <span class="sidebar-shortcut-human">(${formatHumanDuration(s.ms)})</span>
        </div>
        <button type="button" class="sidebar-delete-shortcut-btn" title="Delete Shortcut" aria-label="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      item.querySelector('.sidebar-delete-shortcut-btn').addEventListener('click', () => {
        shortcuts = shortcuts.filter(itemS => itemS.id !== s.id);
        saveShortcuts();
        renderAllShortcuts();
      });

      sidebarShortcutsList.appendChild(item);
    });
  }

  // Render Speed Dial Vertical Options Menu (Shortcuts Only)
  function renderSpeedDial() {
    speedDialMenu.innerHTML = '';

    shortcuts.forEach(s => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'speed-dial-item';
      item.innerHTML = `
        <span class="speed-dial-badge">${s.label}</span>
        <span class="speed-dial-label">${formatHumanDuration(s.ms)}</span>
      `;

      item.addEventListener('click', () => {
        closeSpeedDial();
        openShortcutTitleModal(s);
      });

      speedDialMenu.appendChild(item);
    });
  }

  function renderAllShortcuts() {
    renderSidebarShortcuts();
    renderSpeedDial();
  }

  // Speed Dial Toggle
  function openSpeedDial() {
    renderSpeedDial();
    speedDialMenu.classList.remove('hidden');
    fabBackdrop.classList.remove('hidden');
  }

  function closeSpeedDial() {
    speedDialMenu.classList.add('hidden');
    fabBackdrop.classList.add('hidden');
  }

  // FAB Click: 1st tap expands shortcuts upward; 2nd tap opens Custom Duration Modal
  fabToggleBtn.addEventListener('click', () => {
    if (speedDialMenu.classList.contains('hidden')) {
      openSpeedDial();
    } else {
      closeSpeedDial();
      openCustomModal();
    }
  });

  fabBackdrop.addEventListener('click', closeSpeedDial);

  // Add Shortcut from Sidebar
  sidebarAddShortcutBtn.addEventListener('click', () => {
    const amt = parseInt(sidebarShortcutAmount.value, 10);
    const unit = sidebarShortcutUnit.value;

    if (!amt || amt <= 0) {
      sidebarShortcutAmount.focus();
      return;
    }

    let multiplier = 3600 * 1000;
    let unitLabel = 'h';

    if (unit === 'days') {
      multiplier = 24 * 3600 * 1000;
      unitLabel = 'd';
    } else if (unit === 'minutes') {
      multiplier = 60 * 1000;
      unitLabel = 'm';
    }

    const ms = amt * multiplier;
    const label = `+${amt}${unitLabel}`;

    if (!shortcuts.some(s => s.ms === ms)) {
      shortcuts.push({ id: 's_' + Date.now(), label, ms });
      saveShortcuts();
    }

    sidebarShortcutAmount.value = '';
    renderAllShortcuts();
  });

  // Restore Default Shortcuts
  restoreDefaultsBtn.addEventListener('click', () => {
    shortcuts = [...DEFAULT_SHORTCUTS];
    saveShortcuts();
    renderAllShortcuts();
  });

  // Open Mini Modal to Title the Shortcut
  function openShortcutTitleModal(shortcut) {
    currentModalMode = 'shortcut';
    currentSelectedShortcut = shortcut;

    modalTitle.textContent = `${shortcut.label} Countdown`;
    const resetTimestamp = Date.now() + shortcut.ms;
    modalSubtitle.textContent = `Duration: ${formatHumanDuration(shortcut.ms)} • Resets: ${formatTargetDate(resetTimestamp)}`;
    modalSubtitle.style.display = 'block';

    dateTimeGroup.classList.add('hidden');
    eventTitleInput.value = '';
    eventTitleInput.placeholder = `${shortcut.label.replace('+', '')} Timer`;
    startCountdownBtn.textContent = `Start ${shortcut.label} Countdown`;
    resetColorPickerUI();

    sheetBackdrop.classList.remove('hidden');
    setTimeout(() => eventTitleInput.focus(), 150);
  }

  // Open Full Custom Countdown Modal (2nd tap on FAB)
  function openCustomModal() {
    currentModalMode = 'custom';
    currentSelectedShortcut = null;

    modalTitle.textContent = 'Custom Countdown';
    modalSubtitle.textContent = '';
    modalSubtitle.style.display = 'none';

    dateTimeGroup.classList.remove('hidden');
    eventDateInput.value = formatForInput(Date.now() + 24 * 3600 * 1000);
    eventDateInput.min = new Date().toISOString().slice(0, 16);
    eventTitleInput.value = '';
    eventTitleInput.placeholder = 'Countdown Title';
    startCountdownBtn.textContent = 'Start Countdown';
    resetColorPickerUI();

    sheetBackdrop.classList.remove('hidden');
    setTimeout(() => eventTitleInput.focus(), 150);
  }

  function closeSheet() {
    sheetBackdrop.classList.add('hidden');
    addCountdownForm.reset();
    resetColorPickerUI();
  }

  closeSheetBtn.addEventListener('click', closeSheet);

  sheetBackdrop.addEventListener('click', (e) => {
    if (e.target === sheetBackdrop) {
      closeSheet();
    }
  });

  // Sidebar Open / Close
  function openSidebar() {
    renderSidebarShortcuts();
    sidebarBackdrop.classList.remove('hidden');
  }

  function closeSidebar() {
    sidebarBackdrop.classList.add('hidden');
  }

  sidebarToggleBtn.addEventListener('click', openSidebar);

  sidebarBackdrop.addEventListener('click', (e) => {
    if (e.target === sidebarBackdrop) {
      closeSidebar();
    }
  });

  // Accordion Toggle inside Sidebar
  toggleShortcutsAccordionBtn.addEventListener('click', () => {
    const isHidden = shortcutsAccordionBody.classList.contains('hidden');
    if (isHidden) {
      shortcutsAccordionBody.classList.remove('hidden');
      toggleShortcutsAccordionBtn.classList.add('active');
      toggleShortcutsAccordionBtn.setAttribute('aria-expanded', 'true');
    } else {
      shortcutsAccordionBody.classList.add('hidden');
      toggleShortcutsAccordionBtn.classList.remove('active');
      toggleShortcutsAccordionBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Edit Mode Toggle Listener
  editModeToggle.addEventListener('change', (e) => {
    editMode = e.target.checked;
    renderCountdowns();
  });

  // Add Countdown Form Submit
  addCountdownForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let title = eventTitleInput.value.trim();
    let targetTimestamp = 0;
    let initialDurationMs = 0;

    if (currentModalMode === 'shortcut' && currentSelectedShortcut) {
      initialDurationMs = currentSelectedShortcut.ms;
      targetTimestamp = Date.now() + initialDurationMs;
      if (!title) {
        title = `${currentSelectedShortcut.label.replace('+', '')} Countdown`;
      }
    } else {
      // Custom mode
      const dateValue = eventDateInput.value;
      if (!dateValue) return;

      targetTimestamp = new Date(dateValue).getTime();
      if (isNaN(targetTimestamp)) return;

      initialDurationMs = Math.max(60000, targetTimestamp - Date.now());
      if (!title) {
        title = 'Custom Countdown';
      }
    }

    const newCountdown = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title,
      targetTimestamp: targetTimestamp,
      initialDurationMs: initialDurationMs,
      color: selectedGaugeColor || '#6366f1',
      createdAt: Date.now()
    };

    countdowns.unshift(newCountdown);
    saveCountdowns();
    closeSheet();
    renderCountdowns();
  });

  // 1-Tap Reset Countdown
  function resetCountdown(id) {
    const item = countdowns.find(c => c.id === id);
    if (!item) return;

    // Reset target timestamp to now + original duration
    const duration = item.initialDurationMs || (item.targetTimestamp - item.createdAt) || (5 * 3600 * 1000);
    item.targetTimestamp = Date.now() + duration;
    item.initialDurationMs = duration;

    saveCountdowns();
    renderCountdowns();
  }

  // Delete Countdown
  function deleteCountdown(id) {
    countdowns = countdowns.filter(c => c.id !== id);
    saveCountdowns();
    renderCountdowns();
  }

  // Render & Update Countdowns
  function renderCountdowns() {
    const now = Date.now();

    if (countdowns.length === 0) {
      canvasEmpty.style.display = 'flex';
    } else {
      canvasEmpty.style.display = 'none';
    }

    const existingCards = new Map();
    countdownList.querySelectorAll('.countdown-card').forEach(card => {
      existingCards.set(card.dataset.id, card);
    });

    countdowns.forEach((item) => {
      const remainingMs = item.targetTimestamp - now;
      const isCompleted = remainingMs <= 0;

      let days = 0, hours = 0, mins = 0, secs = 0;
      if (!isCompleted) {
        const totalSec = Math.floor(remainingMs / 1000);
        days = Math.floor(totalSec / 86400);
        hours = Math.floor((totalSec % 86400) / 3600);
        mins = Math.floor((totalSec % 3600) / 60);
        secs = totalSec % 60;
      }

      let card = existingCards.get(item.id);

      if (!card) {
        card = document.createElement('div');
        card.className = 'countdown-card card-enter';
        card.dataset.id = item.id;

        card.innerHTML = `
          <div class="card-bg-gauge"></div>
          <div class="card-content">
            <div class="card-drag-handle hidden" title="Drag to reorder" aria-label="Drag handle">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="5" r="1.8"/>
                <circle cx="9" cy="12" r="1.8"/>
                <circle cx="9" cy="19" r="1.8"/>
                <circle cx="15" cy="5" r="1.8"/>
                <circle cx="15" cy="12" r="1.8"/>
                <circle cx="15" cy="19" r="1.8"/>
              </svg>
            </div>
            <h3 class="card-title"></h3>
            <div class="card-actions">
              <div class="countdown-units">
                <div class="unit-block">
                  <span class="unit-value unit1-val">00</span>
                  <span class="unit-label unit1-lbl">D</span>
                </div>
                <div class="unit-block">
                  <span class="unit-value unit2-val">00</span>
                  <span class="unit-label unit2-lbl">H</span>
                </div>
              </div>
              <button class="card-delete-btn hidden" title="Delete" aria-label="Delete">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <button class="card-reset-overlay hidden" type="button" title="Click to reset timer" aria-label="Reset countdown"></button>
        `;

        const cardTitleEl = card.querySelector('.card-title');
        cardTitleEl.addEventListener('blur', () => {
          const currentItem = countdowns.find(c => c.id === card.dataset.id);
          if (!currentItem) return;
          const newTitle = cardTitleEl.textContent.trim() || currentItem.title;
          cardTitleEl.textContent = newTitle;
          if (currentItem.title !== newTitle) {
            currentItem.title = newTitle;
            saveCountdowns();
          }
          const titleLen = newTitle.length;
          cardTitleEl.classList.remove('title-md', 'title-sm');
          if (titleLen > 32) cardTitleEl.classList.add('title-sm');
          else if (titleLen > 16) cardTitleEl.classList.add('title-md');
        });

        cardTitleEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            cardTitleEl.blur();
          }
        });

        const resetOverlay = card.querySelector('.card-reset-overlay');
        if (resetOverlay) {
          resetOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            resetCountdown(item.id);
          });
        }

        card.querySelector('.card-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteCountdown(item.id);
        });

        countdownList.appendChild(card);
      } else {
        existingCards.delete(item.id);
      }

      // Update Card Content
      const titleEl = card.querySelector('.card-title');
      if (document.activeElement !== titleEl) {
        titleEl.textContent = item.title;
      }

      // Edit Mode Behavior: Toggle contenteditable, delete button, drag handle & draggable
      const dragHandle = card.querySelector('.card-drag-handle');
      if (editMode) {
        titleEl.contentEditable = 'true';
        titleEl.title = 'Click to rename';
        if (dragHandle) {
          dragHandle.classList.remove('hidden');
          dragHandle.setAttribute('draggable', 'true');
        }
      } else {
        titleEl.contentEditable = 'false';
        titleEl.removeAttribute('title');
        if (dragHandle) {
          dragHandle.classList.add('hidden');
          dragHandle.removeAttribute('draggable');
        }
      }

      const deleteBtn = card.querySelector('.card-delete-btn');
      if (editMode) {
        deleteBtn.classList.remove('hidden');
      } else {
        deleteBtn.classList.add('hidden');
      }

      // 16-character stepped font sizing
      const titleLen = (titleEl.textContent || item.title || '').length;
      titleEl.classList.remove('title-md', 'title-sm');
      if (titleLen > 32) {
        titleEl.classList.add('title-sm');
      } else if (titleLen > 16) {
        titleEl.classList.add('title-md');
      }

      // Background Progress Fill Gauge Calculation (0% -> 100%)
      const totalDuration = item.initialDurationMs || (item.targetTimestamp - item.createdAt) || 1;
      let progressPercent = 0;
      if (isCompleted) {
        progressPercent = 100;
      } else {
        const elapsed = totalDuration - remainingMs;
        progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      }
      const cardColor = item.color || '#6366f1';
      const bgGauge = card.querySelector('.card-bg-gauge');
      if (bgGauge) {
        bgGauge.style.width = `${progressPercent.toFixed(2)}%`;
        if (isCompleted) {
          bgGauge.style.background = `linear-gradient(90deg, ${hexToRgba(cardColor, 0.08)} 0%, ${hexToRgba(cardColor, 0.25)} 50%, ${hexToRgba(cardColor, 0.45)} 100%)`;
          bgGauge.style.borderRight = 'none';
          bgGauge.style.boxShadow = 'none';
        } else {
          bgGauge.style.background = `linear-gradient(90deg, ${hexToRgba(cardColor, 0.08)} 0%, ${hexToRgba(cardColor, 0.22)} 60%, ${hexToRgba(cardColor, 0.48)} 100%)`;
          bgGauge.style.borderRight = `2px solid ${hexToRgba(cardColor, 0.95)}`;
          bgGauge.style.boxShadow = `0 0 14px ${hexToRgba(cardColor, 0.55)}, inset -6px 0 14px ${hexToRgba(cardColor, 0.4)}`;
        }
      }

      const unit1Val = card.querySelector('.unit1-val');
      const unit1Lbl = card.querySelector('.unit1-lbl');
      const unit2Val = card.querySelector('.unit2-val');
      const unit2Lbl = card.querySelector('.unit2-lbl');
      const resetOverlay = card.querySelector('.card-reset-overlay');

      const pad = (n) => String(n).padStart(2, '0');

      if (isCompleted) {
        card.classList.add('completed');
        card.style.borderColor = hexToRgba(cardColor, 0.45);
        card.style.boxShadow = `0 0 16px ${hexToRgba(cardColor, 0.18)}`;
        if (resetOverlay) {
          if (editMode) {
            resetOverlay.classList.add('hidden');
          } else {
            resetOverlay.classList.remove('hidden');
          }
        }
        unit1Val.textContent = '00';
        unit1Lbl.textContent = 'H';
        unit2Val.textContent = '00';
        unit2Lbl.textContent = 'M';
      } else {
        card.classList.remove('completed');
        card.style.borderColor = '';
        card.style.boxShadow = '';
        if (resetOverlay) resetOverlay.classList.add('hidden');

        if (days >= 1) {
          // Case 1: >= 1 day left -> Display Days + Hours
          unit1Val.textContent = pad(days);
          unit1Lbl.textContent = 'D';
          unit2Val.textContent = pad(hours);
          unit2Lbl.textContent = 'H';
        } else {
          // Case 2: Under 24 hours (days == 0) -> Display Hours + Minutes
          unit1Val.textContent = pad(hours);
          unit1Lbl.textContent = 'H';
          unit2Val.textContent = pad(mins);
          unit2Lbl.textContent = 'M';
        }
      }
    });

    // Remove obsolete cards
    existingCards.forEach(card => card.remove());
  }

  // Drag and Drop Engine (Strictly Handle-Triggered Desktop Drag & Mobile Touch)
  let draggedCard = null;
  let activeTouchCard = null;

  function clearDragState() {
    if (draggedCard) {
      draggedCard.classList.remove('dragging');
      draggedCard = null;
    }
    if (activeTouchCard) {
      activeTouchCard.classList.remove('dragging');
      activeTouchCard = null;
    }
    countdownList.querySelectorAll('.countdown-card.dragging').forEach(card => {
      card.classList.remove('dragging');
    });
  }

  function initDragAndDrop() {
    // Desktop Drag: Only trigger when dragging directly from the drag handle
    countdownList.addEventListener('dragstart', (e) => {
      if (!editMode) {
        e.preventDefault();
        return;
      }
      const handle = e.target.closest('.card-drag-handle');
      if (!handle) {
        // Prevent accidental dragging on clock, title, or rest of card
        e.preventDefault();
        return;
      }
      const card = handle.closest('.countdown-card');
      if (!card) {
        e.preventDefault();
        return;
      }

      draggedCard = card;

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      }

      // Delay applying dragging class so browser captures a clean drag ghost
      setTimeout(() => {
        if (draggedCard) draggedCard.classList.add('dragging');
      }, 0);
    });

    countdownList.addEventListener('dragend', () => {
      clearDragState();
      persistCardOrder();
    });

    countdownList.addEventListener('dragover', (e) => {
      if (!editMode || !draggedCard) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      const afterElement = getDragAfterElement(countdownList, e.clientY);
      if (afterElement == null) {
        if (countdownList.lastElementChild !== draggedCard) {
          countdownList.appendChild(draggedCard);
        }
      } else if (afterElement !== draggedCard && afterElement !== draggedCard.nextElementSibling) {
        countdownList.insertBefore(draggedCard, afterElement);
      }
    });

    // Mobile Touch: Only trigger when touching the drag handle
    countdownList.addEventListener('touchstart', (e) => {
      if (!editMode) return;
      const handle = e.target.closest('.card-drag-handle');
      if (!handle) return;
      const card = handle.closest('.countdown-card');
      if (!card) return;

      activeTouchCard = card;
      activeTouchCard.classList.add('dragging');
    }, { passive: false });

    countdownList.addEventListener('touchmove', (e) => {
      if (!editMode || !activeTouchCard) return;
      e.preventDefault(); // Prevent page scrolling during card drag

      const touchY = e.touches[0].clientY;
      const afterElement = getDragAfterElement(countdownList, touchY);
      if (afterElement == null) {
        if (countdownList.lastElementChild !== activeTouchCard) {
          countdownList.appendChild(activeTouchCard);
        }
      } else if (afterElement !== activeTouchCard && afterElement !== activeTouchCard.nextElementSibling) {
        countdownList.insertBefore(activeTouchCard, afterElement);
      }
    }, { passive: false });

    const handleTouchEnd = () => {
      if (activeTouchCard) {
        clearDragState();
        persistCardOrder();
      }
    };

    countdownList.addEventListener('touchend', handleTouchEnd);
    countdownList.addEventListener('touchcancel', handleTouchEnd);

    // Global drag state safety resets
    window.addEventListener('mouseup', clearDragState);
    window.addEventListener('blur', clearDragState);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearDragState();
    });
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.countdown-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function persistCardOrder() {
    const currentCardElements = countdownList.querySelectorAll('.countdown-card');
    const newOrderIds = Array.from(currentCardElements).map(card => card.dataset.id).filter(Boolean);
    if (newOrderIds.length === 0) return;

    const ordered = [];
    newOrderIds.forEach(id => {
      const item = countdowns.find(c => c.id === id);
      if (item) ordered.push(item);
    });

    countdowns.forEach(item => {
      if (!ordered.includes(item)) ordered.push(item);
    });

    countdowns = ordered;
    saveCountdowns();
  }

  // Real-time ticking loop: Freezes time when Edit Mode is active
  setInterval(() => {
    if (editMode) return;
    renderCountdowns();
  }, 1000);

  // Instant re-sync on mobile unlock
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !editMode) renderCountdowns();
  });
  window.addEventListener('focus', () => {
    if (!editMode) renderCountdowns();
  });

  // Initialize Drag and Drop
  initDragAndDrop();

  // Initial render
  renderAllShortcuts();
  renderCountdowns();

  // Service Worker for 100% Offline PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('TimeKeeper Offline Ready'))
        .catch(err => console.warn('Service Worker registration failed:', err));
    });
  }
})();
