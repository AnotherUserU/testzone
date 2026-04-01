export function initEditor() {
  // Listeners for content editable updates and tracking unsaved changes.
  document.addEventListener('input', e => {
    if (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      window.hasUnsavedChanges = true;
      const ss = document.getElementById('saveStatus');
      if(ss) { ss.textContent = '✏️ Unsaved changes'; ss.classList.remove('ok','err'); }
      
      // Auto-save logic
      clearTimeout(window.autoSaveTimer);
      window.autoSaveTimer = setTimeout(() => {
        // Trigger save if we have the firebase save logic loaded
        if (window.saveToFirebase) {
          window.saveToFirebase();
        }
      }, 10000);
    }
  });

  window.addEventListener('beforeunload', e => {
    if (window.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes.';
    }
  });
}
