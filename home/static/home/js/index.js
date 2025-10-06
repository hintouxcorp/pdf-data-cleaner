// === Main Selectors ===
const dropZone = document.getElementById('upload-display');
const fileInput = document.getElementById('file-pdf');
const previewZone = document.getElementById('preview-file-queue');
const listPdfView = document.getElementById('list-pdf');
const previewExtractDiv = document.querySelector('.preview-extracted-data');
const textDescription = document.getElementById('text-info');
const buttonExtract = document.getElementById('extract');
const buttonClean = document.getElementById('clean'); 
const buttonCSV = document.getElementById('export-csv'); 
const buttonXLSX = document.getElementById('export-xlsx');
const buttonAdd = document.getElementById('add');
const transferAPI = document.getElementById('api');

// === API Transfer ===
transferAPI.addEventListener('click', e => {
  e.preventDefault();
  alert('Functionality under maintenance');
});

// === Progress bar ===
const progressContainer = document.createElement('div');
progressContainer.id = 'progress-container';
progressContainer.style.display = 'none';

document.body.appendChild(progressContainer);

// === Div for extracted data ===
const extractedData = document.createElement('div');
extractedData.style.margin = "10px";
extractedData.id = 'extracted-data';
previewExtractDiv.appendChild(extractedData);

// === PDF list ===
let fileList = [];

// === PDF summary ===
const summaryDiv = document.createElement('div');
summaryDiv.className = 'ps-2 pt-2';
summaryDiv.id = 'pdf-summary';
const pdfCountEl = document.createElement('span');
pdfCountEl.id = 'pdf-count';
const pdfSizeEl = document.createElement('span');
pdfSizeEl.id = 'pdf-size';
summaryDiv.appendChild(pdfCountEl);
summaryDiv.appendChild(document.createTextNode(' | '));
summaryDiv.appendChild(pdfSizeEl);
listPdfView.appendChild(summaryDiv);

// === Utilities ===
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? decodeURIComponent(parts.pop().split(';').shift()) : null;
};
const csrftoken = getCookie('csrftoken');

const formatSize = (bytes) => {
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
};

const isValidPDF = (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

// === Update PDF summary ===
const updatePdfSummary = () => {
  const totalFiles = fileList.length;
  const totalSize = fileList.reduce((acc,f)=>acc+f.size,0);
  pdfCountEl.textContent = `${totalFiles} PDF${totalFiles!==1?'s':''}`;
  pdfSizeEl.textContent = formatSize(totalSize);
};

// === Render PDF list ===
const renderFiles = () => {
  listPdfView.querySelectorAll('.pdf-slot')?.forEach(el => el.remove());

  fileList.forEach(file => {
    const slot = document.createElement('div');
    slot.className = 'position-relative d-flex pt-2 pdf-slot';
    slot.innerHTML = `
      <i class="bi bi-filetype-pdf ps-2"></i>
      <div class="adjust-name-pdf ps-2"><span>${file.name}</span></div>
      <span class="fixed-bytes">${formatSize(file.size)}</span>
      <button class="fixed-btn">x</button>
    `;
    listPdfView.appendChild(slot);

    slot.querySelector('button').addEventListener('click', ()=> {
      const idx = fileList.indexOf(file);
      if(idx>-1) fileList.splice(idx,1);
      renderFiles();
      updatePdfSummary();
    });
  });

  updatePdfSummary();
};

// === Animations ===
const hideUploadZone = () => {
  dropZone.style.animation = 'hidden-upload-display 1s ease forwards';
  textDescription.style.animation = 'hidden-text-description 1s ease forwards';
};

const showPreviewZone = () => {
  previewZone.style.animation = 'none';
  void previewZone.offsetWidth;        
  previewZone.style.animation = 'show-preview-file 0.5s ease forwards';
};

// === Upload PDF to backend (preview/extraction) ===
const sendRequest = async (url, file) => {
  const formData = new FormData();
  formData.append('arquivo', file);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': csrftoken },
      body: formData
    });
    if(!res.ok) throw new Error(`Error: ${res.status}`);
    return await res.json();
  } catch(err){ console.error('Upload failed:', err); }
};

// === Handle selected files ===
const handleFiles = async (files) => {
  const pdfFiles = Array.from(files).filter(isValidPDF);
  if(!pdfFiles.length) return alert('No valid PDFs found!');
  fileList.push(...pdfFiles);
  renderFiles();
  hideUploadZone();
  showPreviewZone();
};

// === Drag & Drop ===
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', async e => { e.preventDefault(); dropZone.classList.remove('dragover'); await handleFiles(e.dataTransfer.files); });

listPdfView.addEventListener('dragenter', e => { e.preventDefault(); e.stopPropagation(); listPdfView.classList.add('dragover'); });
listPdfView.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); listPdfView.classList.add('dragover'); });
listPdfView.addEventListener('dragleave', e => { e.preventDefault(); e.stopPropagation(); listPdfView.classList.remove('dragover'); });
listPdfView.addEventListener('drop', async e => { e.preventDefault(); listPdfView.classList.remove('dragover'); await handleFiles(e.dataTransfer.files); });

previewExtractDiv.addEventListener('dragover', e => e.preventDefault());
previewExtractDiv.addEventListener('drop', async e => { e.preventDefault(); await handleFiles(e.dataTransfer.files); });

fileInput.addEventListener('change', async e => await handleFiles(e.target.files));

// === Clean per cell ===
const cleanCell = (text) => text.replace(/\s+/g, ' ').trim();

// === Extract button ===
buttonExtract.addEventListener('click', async () => {
  if (!fileList.length) return alert('No PDFs in the list!');
  extractedData.innerHTML = '';
  progressContainer.style.display = 'block';
  const progressBarEl = document.getElementById('progress-bar');

  let processed = 0;
  for (const file of fileList) {
    const data = await sendRequest('/upload/', file);
    processed++;
    const percent = Math.round((processed / fileList.length) * 100);
    progressBarEl.style.width = percent + '%';
    progressBarEl.textContent = percent + '%';

    if (data) {
      // Tabelas
      if (data.rows && data.headers) {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        data.headers.forEach(h => {
          const th = document.createElement('th');
          th.textContent = h;
          th.style.border = '1px solid #ccc';
          th.style.padding = '4px';
          trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        data.rows.forEach(row => {
          const tr = document.createElement('tr');
          data.headers.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col] || '';
            td.style.border = '1px solid #ccc';
            td.style.padding = '4px';
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        extractedData.appendChild(table);
      }
      // Texto bruto
      else if (data.conteudo) {
        const lines = data.conteudo.split(/\n/).filter(Boolean);
        lines.forEach(line => {
          const p = document.createElement('p');
          p.textContent = cleanCell(line);
          extractedData.appendChild(p);
        });
      }
    }
  }

  progressContainer.style.display = 'none';
  extractedData.style.display = 'block';
  alert('Extraction completed!');
});

// === Clean button ===
buttonClean.addEventListener('click', () => {
  const tables = extractedData.querySelectorAll('table');
  if(tables.length){
    tables.forEach(table => {
      table.querySelectorAll('td, th').forEach(cell => {
        cell.textContent = cleanCell(cell.textContent);
      });
    });
  } else {
    const paragraphs = extractedData.querySelectorAll('p');
    paragraphs.forEach(p => {
      p.textContent = cleanCell(p.textContent);
    });
  }
  alert('Data cleaned successfully!');
});

// === Get cleaned data for backend export ===
const getCleanedData = () => {
  const rows = [];
  const tables = extractedData.querySelectorAll('table');
  if(tables.length){
    tables.forEach(table => {
      const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
      table.querySelectorAll('tbody tr').forEach(tr => {
        const row = {};
        Array.from(tr.children).forEach((td,i) => { row[headers[i]] = td.textContent; });
        rows.push(row);
      });
    });
  } else {
    const paragraphs = extractedData.querySelectorAll('p');
    paragraphs.forEach(p => {
      rows.push({ 'Texto': p.textContent });
    });
  }
  return rows;
};

// === Export to backend ===
const exportBackend = async (formato='csv') => {
  const rows = getCleanedData();
  if(!rows.length) return alert('No data to export!');

  try {
    const res = await fetch(`/export_data/?formato=${formato}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify({ rows })
    });

    if(!res.ok) throw new Error(`Error: ${res.status}`);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = formato === 'xlsx' ? 'extracted_data.xlsx' : 'extracted_data.csv';
    link.click();

  } catch(err) {
    console.error('Export failed:', err);
  }
};

// === Button events ===
buttonCSV.addEventListener('click', () => exportBackend('csv'));
buttonXLSX.addEventListener('click', () => exportBackend('xlsx'));
