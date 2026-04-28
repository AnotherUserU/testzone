/*
  Firebase Integration for Loading and Saving Data
*/
import { ALL_MODES, PAGE_MAP, SECURITY, PV_MAP } from './config.js';
import { AppState } from './state.js';
import { showFbStatus, showToast } from './utils.js';
import { refreshAllCardCredits } from './renderer.js';

export async function saveToFirebase() {
  if (AppState.currentRole !== 'admin') { showToast('❌ Admin only!', true); return; }
  const token = localStorage.getItem('adminToken');
  if (!token) { showToast('❌ Auth token missing, please re-login.', true); return; }
  
  refreshAllCardCredits();
  showFbStatus('⛳ Saving...', 'loading');
  
  const data = { savedAt: new Date().toLocaleString() };
  ALL_MODES.forEach(m => {
    const html = document.getElementById(PAGE_MAP[m])?.innerHTML || '';
    data[m + 'HTML'] = DOMPurify.sanitize(html, SECURITY.CLOUD_CONFIG);
  });
  
  const pv = {};
  ALL_MODES.forEach(m => { 
    const el = document.getElementById(PV_MAP[m]); 
    pv[m] = el ? el.checked : true; 
  });
  data.pageVisibility = pv;

  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ data })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Server rejected save');
    }
    showFbStatus('✅ Saved!', 'ok');
    showToast('☁️ Saved to Cloud!');
    document.getElementById('saveStatus').textContent = '☁️ Saved at ' + data.savedAt;
  } catch (err) {
    showFbStatus('❌ ' + err.message, 'err');
    showToast('❌ Save failed!', true);
  }
}

export async function loadFromFirebase(callbacks = {}) {
  showFbStatus('⏳ Loading...', 'loading');
  try {
    const res = await fetch('/api/load');
    if (!res.ok) throw new Error('Cloud error');
    const data = await res.json();
    if (!data) { 
      showFbStatus('⚠ No cloud data', 'err'); 
      if (callbacks.onNoData) callbacks.onNoData();
      return; 
    }

    ALL_MODES.forEach(m => {
      if (data[m + 'HTML']) {
        const el = document.getElementById(PAGE_MAP[m]);
        if (el) el.innerHTML = DOMPurify.sanitize(data[m + 'HTML'], SECURITY.CLOUD_CONFIG);
      }
    });

    if (data.pageVisibility) {
      ALL_MODES.forEach(m => {
        const el = document.getElementById(PV_MAP[m]);
        if (el) el.checked = data.pageVisibility[m] !== false;
      });
      if (callbacks.onVisibilityLoaded) callbacks.onVisibilityLoaded();
    }

    if (callbacks.onSuccess) callbacks.onSuccess();
    
    refreshAllCardCredits();
    showFbStatus('✅ Loaded!', 'ok');
    document.getElementById('saveStatus').textContent = '☁️ Loaded (' + (data.savedAt || 'unknown') + ')';
  } catch (err) {
    showFbStatus('❌ ' + err.message, 'err');
    if (callbacks.onError) callbacks.onError(err);
  }
}
