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

  // State
  let editMode = false;
  let currentModalMode = 'custom'; // 'shortcut' | 'custom'
  let currentSelectedShortcut = null;
  let isDragging = false;
  let activeDragCard = null;
  let activePointerId = null;

  // Load from LocalStorage
  function loadCountdowns() {
    try {
      const data = localStorage.getItem(COUNTDOWNS_KEY);
      return data ? JSON.parse(data) : [];
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
    eventTitleInput.placeholder = `${shortcut.label.replace('+', '')} Quota / Activity`;
    startCountdownBtn.textContent = `Start ${shortcut.label} Countdown`;

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
    eventTitleInput.placeholder = 'e.g. Project Launch, Trip to Tokyo';
    startCountdownBtn.textContent = 'Start Countdown';

    sheetBackdrop.classList.remove('hidden');
    setTimeout(() => eventTitleInput.focus(), 150);
  }

  function closeSheet() {
    sheetBackdrop.classList.add('hidden');
    addCountdownForm.reset();
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
    document.body.classList.toggle('edit-mode-active', editMode);
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
    if (isDragging) return; // Prevent DOM mutations while actively dragging
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
        card.className = 'countdown-card';
        card.dataset.id = item.id;

        card.innerHTML = `
          <div class="card-bg-gauge"></div>
          <div class="card-content">
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

        // Attach drag-and-drop listener to clock units on right
        const unitsEl = card.querySelector('.countdown-units');
        attachCardDragHandle(card, unitsEl);

        countdownList.appendChild(card);
      } else {
        existingCards.delete(item.id);
      }

      // Update Card Content
      const titleEl = card.querySelector('.card-title');
      if (document.activeElement !== titleEl) {
        titleEl.textContent = item.title;
      }

      // Edit Mode Behavior: Toggle contenteditable & delete button
      if (editMode) {
        titleEl.contentEditable = 'true';
        titleEl.title = 'Click to rename';
      } else {
        titleEl.contentEditable = 'false';
        titleEl.removeAttribute('title');
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
      const bgGauge = card.querySelector('.card-bg-gauge');
      if (bgGauge) {
        bgGauge.style.width = `${progressPercent.toFixed(2)}%`;
      }

      const unit1Val = card.querySelector('.unit1-val');
      const unit1Lbl = card.querySelector('.unit1-lbl');
      const unit2Val = card.querySelector('.unit2-val');
      const unit2Lbl = card.querySelector('.unit2-lbl');
      const resetOverlay = card.querySelector('.card-reset-overlay');

      const pad = (n) => String(n).padStart(2, '0');

      if (isCompleted) {
        card.classList.add('completed');
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

  // Drag-and-Drop Card Reordering (500ms hold on clock in Edit Mode)
  function attachCardDragHandle(card, unitsEl) {
    let startX = 0;
    let startY = 0;
    let holdTimer = null;

    unitsEl.addEventListener('pointerdown', (e) => {
      if (!editMode) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      startX = e.clientX;
      startY = e.clientY;
      const currentPointerId = e.pointerId;

      holdTimer = setTimeout(() => {
        startDraggingCard(card, startY, currentPointerId);
      }, 500);

      function onPointerMoveCheck(moveEvent) {
        if (moveEvent.pointerId !== currentPointerId) return;
        const dx = Math.abs(moveEvent.clientX - startX);
        const dy = Math.abs(moveEvent.clientY - startY);
        // If moved > 8px before 500ms, it is a scroll attempt -> cancel hold
        if (dx > 8 || dy > 8) {
          clearTimeout(holdTimer);
          cleanupCheck();
        }
      }

      function onPointerUpCheck(upEvent) {
        if (upEvent.pointerId !== currentPointerId) return;
        clearTimeout(holdTimer);
        cleanupCheck();
      }

      function cleanupCheck() {
        window.removeEventListener('pointermove', onPointerMoveCheck);
        window.removeEventListener('pointerup', onPointerUpCheck);
        window.removeEventListener('pointercancel', onPointerUpCheck);
      }

      window.addEventListener('pointermove', onPointerMoveCheck);
      window.addEventListener('pointerup', onPointerUpCheck);
      window.addEventListener('pointercancel', onPointerUpCheck);
    });
  }

  function startDraggingCard(card, initialClientY, currentPointerId) {
    isDragging = true;
    activeDragCard = card;
    activePointerId = currentPointerId;

    if (navigator.vibrate) {
      try { navigator.vibrate(40); } catch (err) {}
    }

    card.classList.add('dragging');

    let startY = initialClientY;

    function onDragMove(e) {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();

      const dy = e.clientY - startY;
      card.style.transform = `translateY(${dy}px) scale(1.03)`;

      const cardRect = card.getBoundingClientRect();
      const cardCenterY = cardRect.top + cardRect.height / 2;
      const siblings = Array.from(countdownList.querySelectorAll('.countdown-card:not(.dragging)'));

      for (const sibling of siblings) {
        const siblingRect = sibling.getBoundingClientRect();
        const siblingCenterY = siblingRect.top + siblingRect.height / 2;

        if (dy > 0 && cardCenterY > siblingCenterY && card.nextElementSibling === sibling) {
          countdownList.insertBefore(card, sibling.nextElementSibling);
          startY = e.clientY;
          card.style.transform = `translateY(0px) scale(1.03)`;
          break;
        } else if (dy < 0 && cardCenterY < siblingCenterY && card.previousElementSibling === sibling) {
          countdownList.insertBefore(card, sibling);
          startY = e.clientY;
          card.style.transform = `translateY(0px) scale(1.03)`;
          break;
        }
      }
    }

    function onDragEnd(e) {
      if (e.pointerId !== activePointerId) return;
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragEnd);
      window.removeEventListener('pointercancel', onDragEnd);

      card.classList.remove('dragging');
      card.style.transform = '';

      const newOrderIds = Array.from(countdownList.querySelectorAll('.countdown-card')).map(c => c.dataset.id);
      countdowns.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
      saveCountdowns();

      isDragging = false;
      activeDragCard = null;
      activePointerId = null;

      renderCountdowns();
    }

    window.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
  }

  // Real-time ticking loop
  setInterval(renderCountdowns, 1000);

  // Instant re-sync on mobile unlock
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderCountdowns();
  });
  window.addEventListener('focus', renderCountdowns);

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
