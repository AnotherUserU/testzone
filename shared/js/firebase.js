import { AppState } from './state.js';
import { renderApp } from './renderer.js';
import { showToast } from './utils.js';

let app, db, GUIDE_REF;

export async function initFirebase() {
  const st = document.getElementById('fbStatus');
  if(st) { st.textContent='⏳ Connecting to database...'; st.className='show loading'; }

  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to load Firebase config');
    const firebaseConfig = await res.json();

    // Dynamically load Firebase SDK if not present
    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js');
    }

    app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    GUIDE_REF = db.ref('guide');

    if(st) { st.textContent='✅ Database connected'; st.className='show ok'; setTimeout(()=>st.classList.remove('show'), 2000); }
    
    // Load data
    await loadFromFirebase();
    
    // Set up real-time listener
    GUIDE_REF.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // If we are admin and have unsaved changes, don't overwrite local state
        // unless we built a conflict resolution system. For now, simple approach:
        const isEditing = AppState.currentRole === 'admin' && document.querySelector('[contenteditable="true"]:focus');
        if (!isEditing) {
          AppState.updateData(data);
          renderApp(); // re-render on external change
        }
      }
    });

  } catch(e) {
    console.error('Firebase init failed:', e);
    if(st) { st.textContent='❌ Database connection failed'; st.className='show err'; }
    showToast('Failed to connect to database. Showing default data.', true);
    // Render defaults
    renderApp();
  }
}

export async function loadFromFirebase() {
  try {
    const snap = await GUIDE_REF.once('value');
    const dbData = snap.val();
    if(dbData) {
      AppState.updateData(dbData);
      renderApp();
      return true;
    }
  } catch(e) {
    console.error('Firebase load error:', e);
  }
  return false;
}

export async function saveToFirebase() {
  if (AppState.currentRole !== 'admin') {
    showToast('Unauthorized. Must be admin to save.', true);
    return;
  }
  
  const v = document.getElementById('saveStatus');
  if(v) { v.textContent = '⏳ Saving...'; v.classList.remove('err','ok'); }
  
  const token = localStorage.getItem('adminToken');
  if(!token) {
    if(v) { v.textContent = '❌ Not logged in'; v.classList.add('err'); }
    showToast('Admin token missing. Please log in again.', true);
    return;
  }

  try {
    const r = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Use standard Bearer token
      },
      body: JSON.stringify({ data: AppState.data }) // Send JSON state!
    });
    
    if(r.ok) {
      if(v) { v.textContent = '✅ Cloud Sync OK'; v.classList.add('ok'); }
      showToast('✅ Saved to cloud successfully');
      // Clear unsaved warning flag (implemented in editor.js)
      window.hasUnsavedChanges = false;
    } else {
      if(v) { v.textContent = '❌ Cloud Save Failed'; v.classList.add('err'); }
      showToast('❌ Failed to save to cloud', true);
    }
  } catch(e) {
    console.error('Save error:', e);
    if(v) { v.textContent = '❌ Network Error'; v.classList.add('err'); }
    showToast('❌ Network error during save', true);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
