export async function downloadImage(mode, sectionId) {
  const isDlMode = document.body.classList.contains('dl-mode');
  if (!isDlMode) document.body.classList.add('dl-mode');
  let hiddenElements = [];
  try {
    const watermark = document.getElementById('dlWatermark');
    if (watermark) watermark.style.display = 'block';

    // Hide elements that shouldn't appear in the download
    const dlBtn = document.getElementById('downloadBtn');
    if (dlBtn && dlBtn.parentElement) {
      hiddenElements.push({ el: dlBtn.parentElement, orig: dlBtn.parentElement.style.display });
      dlBtn.parentElement.style.display = 'none';
    }
    document.querySelectorAll('.nav-header, .float-xl, #roleBadge, .toast, .admin-link').forEach(el => {
      hiddenElements.push({ el, orig: el.style.display });
      el.style.display = 'none';
    });

    const target = mode === 'fullscreen' ? document.getElementById('pageBody') : document.getElementById(sectionId);

    // Create cloned target for clean rendering offscreen
    const clone = target.cloneNode(true);
    // Add default background for dark elements
    clone.style.background = getComputedStyle(document.body).backgroundColor;
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.width = target.offsetWidth + 'px';
    document.body.appendChild(clone);

    // Dynamic scale based on size to prevent crash
    // 1920x5000 * 4 = huge. For full screen use 1.5, for cards use 2
    let s = mode === 'fullscreen' ? 1.5 : 2.5;

    showToast('📸 Capturing image...', false);

    const canvas = await html2canvas(clone, {
      scale: s,
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      logging: false,
      onclone: (doc) => {
        // cleanup cloned DOM for snapshot
        const c = doc.body;
        c.querySelectorAll('.edit-btn,.add-banner-btn,.add-point-btn,.delete-box,.delete-mem,.delete-team-btn,.delete-pill,.color-dot,.clr-palette,.cred-edit-btn,.mod-add-row-btn,.cred-add-name-btn,.cred-add-section-btn,.save-btn,.card-drag-handle,.block-handle,.del-section-btn,.team-section-actions,.add-section-btn,.add-banner-bar,.float-xl,.download-node-btn,.save-bar,.nav-header,.toast,#fbStatus,.pv-ov,.dl-ov,.mod-modal-ov,.cred-ov,.xl-ov,.modal-ov').forEach(el => el.remove());
        c.querySelectorAll('[contenteditable="true"]').forEach(el => { el.style.border = 'none'; el.style.background = 'transparent'; });
      }
    });

    const url = canvas.toDataURL('image/png', 0.9);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SRE_Teams_${mode}_${new Date().getTime()}.png`;
    a.click();
    showToast('✅ Image downloaded');

    clone.remove();
    if (watermark) watermark.style.display = 'none';
  } catch (e) {
    console.error(e);
    showToast('❌ Capture failed. Try downloading a smaller section.', true);
  } finally {
    // Restore hidden elements
    hiddenElements.forEach(item => {
      if (item.el) item.el.style.display = item.orig;
    });
    
    if (!isDlMode) document.body.classList.remove('dl-mode');
    hideModal('dlModal');
  }
}

export function setupDownloadModal() {
  // Wire up DL modal interactions
  const inputs = document.querySelectorAll('input[name="dlType"]');
  const sectionSelect = document.getElementById('dlSectionSelect');

  inputs.forEach(r => r.addEventListener('change', () => {
    document.querySelectorAll('.dl-radio').forEach(lbl => lbl.classList.remove('active'));
    r.closest('.dl-radio').classList.add('active');

    // Toggle dropdown
    if (r.value === 'section') {
      // rebuild options based on current DOM
      sectionSelect.innerHTML = '';
      const sections = [];
      const blocks = document.querySelectorAll('.page-block');
      blocks.forEach((blk, i) => {
        // get title
        let t = blk.querySelector('.section-label')?.textContent || blk.querySelector('.team-section-label')?.textContent || 'Section ' + (i + 1);
        if (blk.id === 'dungeonSection') t = 'Dungeon - Core Teams';
        else if (blk.id === 'newDungeonSection') t = 'Dungeon - New Teams';
        else if (blk.id === 'storySection') t = 'Story - Core Teams';
        else if (blk.id === 'newStorySection') t = 'Story - New Teams';

        if (blk.id) sections.push({ id: blk.id, title: t });
      });
      sections.forEach(s => {
        const o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.title;
        sectionSelect.appendChild(o);
      });
      sectionSelect.style.display = 'block';
    } else {
      sectionSelect.style.display = 'none';
    }
  }));

  const btn = document.getElementById('startDlBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const v = document.querySelector('input[name="dlType"]:checked').value;
      if (v === 'fullscreen') downloadImage('fullscreen');
      else {
        const sel = sectionSelect.value;
        if (sel) downloadImage('section', sel);
        else showToast('Please select a section', true);
      }
    });
  }
}
