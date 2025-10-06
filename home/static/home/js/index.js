// === Seletores principais ===
const dropZone = document.getElementById('upload-display');
const fileInput = document.getElementById('file-pdf');
const previewZone = document.getElementById('preview-file-queue');
const listPdfView = document.getElementById('list-pdf');
const previewExtractDiv = document.querySelector('.preview-extracted-data');
const textDescription = document.getElementById('text-info');
const buttonExtract = document.getElementById('extract');
const buttonClean = document.getElementById('clean'); // botão Limpar

// === Criar barra de progresso ===
const progressContainer = document.createElement('div');
progressContainer.id = 'progress-container';
progressContainer.style.display = 'none';
progressContainer.innerHTML = `
  <div class="progress mt-2">
    <div id="progress-bar" class="progress-bar" role="progressbar" style="width: 0%">0%</div>
  </div>
`;
document.body.appendChild(progressContainer);

// === Div para dados extraídos ===
const extractedData = document.createElement('div');
extractedData.style.margin = "10px";
extractedData.id = 'extracted-data';
previewExtractDiv.appendChild(extractedData);

// === Lista de PDFs ===
let fileList = [];

// === Resumo de PDFs ===
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

// === Utilitários ===
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

// === Atualizar resumo de PDFs ===
const updatePdfSummary = () => {
  const totalFiles = fileList.length;
  const totalSize = fileList.reduce((acc,f)=>acc+f.size,0);
  pdfCountEl.textContent = `${totalFiles} PDF${totalFiles!==1?'s':''}`;
  pdfSizeEl.textContent = formatSize(totalSize);
};

// === Renderizar lista de PDFs ===
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

    // Remover arquivo
    slot.querySelector('button').addEventListener('click', ()=> {
      const idx = fileList.indexOf(file);
      if(idx>-1) fileList.splice(idx,1);
      renderFiles();
      updatePdfSummary();
    });
  });

  updatePdfSummary();
};

// === Animações ===
const hideUploadZone = () => {
  dropZone.style.animation = 'hidden-upload-display 1s ease forwards';
  textDescription.style.animation = 'hidden-text-description 1s ease forwards';
};

const showPreviewZone = () => {
  previewZone.style.animation = 'none';
  void previewZone.offsetWidth;        
  previewZone.style.animation = 'show-preview-file 0.5s ease forwards';
};

// === Upload para backend ===
const sendRequest = async (url, file) => {
  const formData = new FormData();
  formData.append('arquivo', file);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': csrftoken },
      body: formData
    });
    if(!res.ok) throw new Error(`Erro: ${res.status}`);
    return await res.json();
  } catch(err){ console.error('Falha no upload:', err); }
};

// === Processar arquivos selecionados ===
const handleFiles = async (files) => {
  const pdfFiles = Array.from(files).filter(isValidPDF);
  if(!pdfFiles.length) return alert('Nenhum PDF válido encontrado!');
  fileList.push(...pdfFiles);
  renderFiles();
  hideUploadZone();
  showPreviewZone();
};

// === Drag & Drop ===
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', async e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  await handleFiles(e.dataTransfer.files);
});

listPdfView.addEventListener('dragenter', e => { e.preventDefault(); e.stopPropagation(); listPdfView.classList.add('dragover'); });
listPdfView.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); listPdfView.classList.add('dragover'); });
listPdfView.addEventListener('dragleave', e => { e.preventDefault(); e.stopPropagation(); listPdfView.classList.remove('dragover'); });
listPdfView.addEventListener('drop', async e => {
  e.preventDefault();
  listPdfView.classList.remove('dragover');
  await handleFiles(e.dataTransfer.files);
});

previewExtractDiv.addEventListener('dragover', e => e.preventDefault());
previewExtractDiv.addEventListener('drop', async e => {
  e.preventDefault();
  await handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', async e => await handleFiles(e.target.files));

// === Função de tratamento dos dados extraídos ===
const tratarDados = (texto) => {
  texto = texto.replace(/\s+/g, ' ').trim(); // remove espaços múltiplos e trim
  texto = texto.replace(/\n/g, ' ');         // remove quebras de linha
  return texto;
};

// === Botão Extract com barra de progresso ===
buttonExtract.addEventListener('click', async () => {
  if(!fileList.length) return alert('Nenhum PDF na lista!');
  extractedData.innerHTML = '';
  progressContainer.style.display = 'block';
  const progressBarEl = document.getElementById('progress-bar');

  let processed = 0;
  for(const file of fileList){
    const data = await sendRequest('/upload/', file);
    processed++;
    const percent = Math.round((processed / fileList.length)*100);
    progressBarEl.style.width = percent + '%';
    progressBarEl.textContent = percent + '%';

    if(data && data.conteudo){
      const p = document.createElement('p');
      p.textContent = `Conteúdo de ${file.name}: ${data.conteudo.slice(0,500)}...`;
      extractedData.appendChild(p);
    }
  }

  progressContainer.style.display = 'none';
  alert('Extração concluída!');
});

// === Botão Limpar (tratar dados mantendo cada PDF separado) ===
buttonClean.addEventListener('click', () => {
  const paragrafos = extractedData.querySelectorAll('p');
  paragrafos.forEach(p => {
    p.textContent = tratarDados(p.textContent);
  });
});
